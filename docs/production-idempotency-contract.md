# Campanhas — contrato de identidade e idempotência da produção

Status: proposta documental baseada em inspeção estática de `supabase/migrations/0001_initial_schema.sql`, `docs/data-model.md` e `docs/import-safety-contract.md`. Não implementa nem aprova uma chave real de origem.

## 1. Objetivo

Definir como reconhecer um lançamento de produção já importado, sem:
- inserir o mesmo lançamento mais de uma vez;
- confundir identificadores que só são únicos dentro de uma conta, campanha ou arquivo;
- associar produção ao negociador errado;
- transformar silenciosamente uma correção em lançamento adicional;
- perder a trilha entre o lançamento, o arquivo importado e a operação administrativa.

Idempotência tem dois níveis diferentes: **identidade do lançamento** (deduplicação por linha de negócio) e **identidade da operação** (evitar que o mesmo trabalho de importação seja confirmado duas vezes). Um hash do arquivo pode auxiliar o segundo nível, mas não substitui a chave por lançamento.

## 2. Evidência observada na migration

A tabela `production_entries` possui `source_system` com padrão `manual`, `external_key` opcional, `source_import_id` opcional, `source_payload` opcional e referência ao negociador. A migration cria um índice único parcial em:

`(source_system, external_key) WHERE external_key IS NOT NULL`

Consequências da regra atual:
- quando `external_key` não é nula, a combinação com `source_system` é única globalmente na tabela;
- o escopo não inclui conta/tenant, campanha, ciclo ou identificador da origem dentro da conta;
- chaves nulas não são deduplicadas por esse índice;
- a migration não define normalização de espaços/capitalização nem validação de conteúdo não vazio para essas chaves;
- `import_jobs` não contém hash do arquivo nem token de idempotência da operação;
- `source_import_id` rastreia o trabalho de origem, mas não impede sozinho que o mesmo trabalho seja processado duas vezes.

Esses são fatos do esquema lido, não prova de comportamento de um serviço de importação. Nenhuma validação dinâmica foi executada.

## 3. Contrato proposto para identidade de lançamento

Antes de importar dados reais, registrar para cada fonte autorizada uma definição de chave que responda:
1. Qual sistema e conta fornecem o dado?
2. Qual identificador é estável e único na origem?
3. A unicidade é global ou limitada à conta, empresa, carteira, campanha ou período?
4. O mesmo ID pode ser reutilizado após exclusão, arquivamento ou migração?
5. Uma alteração no valor/data do registro mantém o mesmo ID?
6. O dado representa um estado atual mutável ou um evento imutável?
7. Como são representados cancelamentos, estornos e retificações?

Formato conceitual candidato (não é esquema aprovado): `source_system + source_account_scope + source_record_key`. Incluir campanha/ciclo apenas se a semântica real da origem exigir isso; não usar esses campos como compensação para uma chave de negócio desconhecida.

A chave deve ser extraída da fonte, validada e normalizada de acordo com contrato documentado. Não fabricar uma chave usando nome, valor e data sem evidência de unicidade. Se a origem não fornece identificador estável, a linha deve ser tratada como não resolvida e encaminhada para revisão, não deduplicada por aproximação.

## 4. Contrato proposto para identidade da operação

Cada confirmação de importação precisa de um identificador idempotente criado no servidor ou aceito e validado sob contrato explícito. O serviço deve:
- associar a chave ao trabalho, ator autorizado, fonte e escopo de destino;
- reivindicar atomicamente o processamento, impedindo duas confirmações concorrentes;
- devolver o resultado existente se a mesma operação já tiver sido concluída;
- responder com conflito explícito se a mesma chave for reutilizada para conteúdo/escopo incompatível;
- manter o estado consistente se houver falha antes ou durante o commit;
- não aceitar que um cliente altere status diretamente para contornar a transição;
- registrar contagens e resultado final de forma coerente com a transação.

O hash criptográfico do arquivo pode detectar reenvio byte a byte, mas arquivos equivalentes podem ter metadados/ordem diferentes; por outro lado, o mesmo arquivo pode precisar de importação deliberada em outro ciclo. Portanto, hash de arquivo não deve ser a única proteção contra duplicação de lançamento nem a única identidade da operação.

## 5. Correção, duplicata e conflito

Até que a semântica comercial seja aprovada, aplicar comportamento conservador:
- **Mesma chave e mesmo conteúdo semântico:** classificar como duplicata; não inserir novamente.
- **Mesma chave e conteúdo diferente:** registrar conflito; não sobrescrever silenciosamente.
- **Sem chave estável:** classificar como ambígua/não resolvida; solicitar revisão conforme política autorizada.
- **Correção legítima na fonte:** usar fluxo explícito de atualização versionada ou evento de retificação, conforme decisão de negócio; manter autor, horário, valor anterior/novo e motivo quando permitido.
- **Cancelamento/estorno:** não inventar lançamento negativo nem apagar o original até decidir a semântica e a modelagem.
- **Reimportação de trabalho concluído:** retornar resultado existente ou conflito explícito, sem nova gravação.

O contrato de importação deve separar “duplicado” de “mesma chave com conteúdo divergente”; são situações diferentes e precisam de relatórios distintos.

## 6. Integridade no banco e no serviço

A garantia final deve ser concorrente e server-side. Depois de definir a chave real:
- criar constraint/índice único com o escopo correto e documentar tratamento de registros históricos sem chave;
- normalizar e validar os componentes antes de persistir, sem alterar silenciosamente a identidade;
- definir comportamento para chaves nulas/vazias e fontes legadas;
- coordenar o registro do trabalho e os lançamentos em transação coerente;
- tratar violação de unicidade como resultado de deduplicação/conflito conhecido, não como sucesso genérico;
- garantir que duas requisições concorrentes não ultrapassem a proteção;
- manter auditoria minimizada e proteger dados pessoais/sensíveis da origem.

Não alterar o índice atual até confirmar com amostras anonimizadas se a chave é realmente global ou se deve incluir escopo de conta/origem. Uma mudança prematura pode tanto bloquear dados legítimos quanto permitir duplicatas.

## 7. Critérios de aceite futuros

- [ ] A chave de cada fonte foi comprovada com amostras anonimizadas e documentação da origem.
- [ ] Reimportar o mesmo lançamento não cria nova linha.
- [ ] Chave repetida com conteúdo divergente gera conflito revisável, sem sobrescrita silenciosa.
- [ ] Duas confirmações simultâneas da mesma operação não gravam em duplicidade.
- [ ] Repetir a mesma requisição retorna resultado determinístico.
- [ ] Falha de transação não deixa trabalho marcado como concluído com dados incompletos.
- [ ] Arquivo idêntico reenviado é detectado quando aplicável, sem impedir importação legítima em outro escopo autorizado.
- [ ] Correção, cancelamento e estorno seguem política aprovada e auditável.
- [ ] Linhas sem identidade confiável não são associadas por nome aproximado.
- [ ] A auditoria registra trabalho, fonte, ator, horário, resultado e motivo sem guardar segredos desnecessários.

Nenhum critério foi executado nesta etapa. São requisitos futuros, não evidência de implementação.

## 8. Decisões necessárias

1. Fonte oficial e escopo de conta para cada planilha/sistema.
2. Chave real e seu escopo de unicidade.
3. Tratamento de registros sem chave ou com chave alterada.
4. Semântica de atualização, correção, cancelamento e estorno.
5. Política para reimportar arquivo em outro ciclo/campanha.
6. Retenção e minimização de `source_payload`, arquivos originais e relatórios.
7. Se a gravação é totalmente atômica ou permite aceitação parcial.

Até que essas decisões sejam fechadas, manter importação em prévia e não conectar a produção real. Não executar testes, typecheck, build ou instalação até o usuário avisar que está em casa.
