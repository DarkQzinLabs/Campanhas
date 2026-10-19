# Campanhas — contrato de segurança para importação

Status: contrato proposto para orientar implementação futura. Não representa uma funcionalidade já implementada nem autoriza conexão com dados reais.

## 1. Objetivo e limites

A importação precisa transformar dados de uma fonte autorizada em registros de produção sem atribuições silenciosas, duplicação ou perda de rastreabilidade. O fluxo deve funcionar com mapeamento configurável de colunas, mas não deve prometer compatibilidade automática com qualquer planilha: cada arquivo precisa passar por validação e prévia explícita.

Este contrato complementa:
- `docs/data-model.md` — entidades e questões de modelagem;
- `docs/migration-and-testing.md` — plano de migração e critérios de homologação;
- `docs/decisions-and-open-questions.md` — decisões de negócio ainda abertas.

## 2. Ciclo de vida proposto

Estados permitidos para um trabalho de importação:

`uploaded → previewed → processing → completed`

Saídas de erro/cancelamento:

- `uploaded → cancelled`
- `previewed → cancelled`
- `processing → failed` quando a operação não puder concluir de forma segura;
- `uploaded | previewed | processing → failed` apenas quando a falha e o estado resultante forem registrados de forma coerente.

Regras:
1. A transição para `processing` deve ser atômica e impedir que duas solicitações processem o mesmo trabalho simultaneamente.
2. Um trabalho `completed` não deve ser processado novamente como se fosse novo.
3. A repetição de uma requisição deve retornar o resultado do trabalho existente ou uma resposta explícita de conflito; não deve criar lançamentos adicionais.
4. O cancelamento só pode ocorrer antes do ponto de commit. Depois de efetivada a gravação, correções devem seguir fluxo auditável próprio.
5. O status deve refletir a transação real. Não marcar `completed` se a gravação transacional falhar.

Os estados atuais da migration são um ponto de partida; a transição exata e os campos de idempotência precisam ser definidos antes da implementação.

## 3. Prévia obrigatória antes de gravar

A prévia deve mostrar, no mínimo:

- arquivo e fonte selecionados, com metadados relevantes;
- aba/folha selecionada e quantidade de linhas consideradas;
- mapeamento de cada campo de destino para coluna de origem;
- amostra legível de linhas já interpretadas;
- contagens de linhas válidas, duplicadas, ambíguas e rejeitadas;
- motivos de rejeição por linha, sem expor segredos;
- conflitos com registros existentes e regra proposta para resolvê-los;
- resumo de quantos registros serão criados, atualizados ou ignorados;
- aviso explícito de que nada foi gravado ainda.

Não inferir uma pessoa apenas pelo primeiro nome, substring ou similaridade aproximada. A correspondência deve usar identificador estável validado; quando não existir ou houver mais de uma correspondência possível, a linha deve ser marcada como ambígua/rejeitada para revisão humana.

O usuário autorizado precisa confirmar o resumo antes de iniciar a gravação. Deve existir uma opção clara de cancelar sem alteração de dados.

## 4. Categorias de linha

Cada linha avaliada deve terminar em uma categoria mutuamente exclusiva, com motivo rastreável:

| Categoria | Significado | Comportamento padrão |
|---|---|---|
| Válida | Campos obrigatórios, tipos e referências conferidos | Elegível para confirmação |
| Duplicada | Já existe uma linha equivalente conforme chave de idempotência aprovada | Não inserir novamente; mostrar registro correspondente quando permitido |
| Ambígua | Mais de uma interpretação ou correspondência possível | Não gravar automaticamente |
| Rejeitada | Inválida, incompleta ou fora das regras do domínio | Não gravar; apresentar motivo acionável |

A política de atualização de um registro já existente não está definida. Até decisão formal, não sobrescrever silenciosamente valores existentes: apresentar conflito e exigir política explícita.

## 5. Identidade e idempotência

Antes de ativar importação real, definir a chave única a partir da semântica da fonte. Não assumir que nome, data e valor formam uma chave segura, nem assumir que `external_key` é globalmente única entre todas as contas/campanhas.

O contrato de idempotência precisa responder:
- Qual sistema/conta origina o registro?
- Qual campo ou combinação identifica de forma estável o lançamento?
- O identificador pode se repetir em campanhas, arquivos ou contas diferentes?
- Correções na fonte atualizam o registro original ou chegam como novo evento?
- Como representar cancelamentos e estornos?
- Como detectar repetição do mesmo arquivo ou da mesma operação?

A proteção deve existir no servidor e no banco, não apenas na interface. Um hash do arquivo pode ajudar a detectar reenvio idêntico, mas não substitui uma chave idempotente por lançamento nem resolve alterações no mesmo arquivo.

## 6. Atomicidade e falhas

- Validar e preparar a prévia sem modificar os registros oficiais de produção.
- No commit, gravar as linhas aceitas e o resultado do trabalho em uma transação coerente.
- Se o contrato aprovado for de lote atômico, falha em qualquer linha bloqueante deve reverter o lote; se houver aceitação parcial, essa política precisa ser explícita e refletida nas contagens/relatório.
- Não misturar transações de campanhas/ciclos diferentes sem regra autorizada.
- Proteger contra cliques repetidos, retries de rede e duas sessões administrativas concorrentes.
- Preservar relatório suficiente para auditoria: identificador do trabalho, autor, fonte, horário, mapeamento, contagens, resultado e erros. Minimizar dados pessoais e nunca registrar tokens ou segredos.
- Definir o que acontece se a importação falhar depois de parte do processamento externo, antes de permitir escrita em múltiplos sistemas.

## 7. Segurança e permissões

- Upload, leitura de arquivos, prévia, confirmação, cancelamento e consulta de relatório são operações administrativas autenticadas e autorizadas no servidor.
- Não considerar papel de administrador válido apenas por domínio de e-mail, campo enviado pelo cliente ou valor em `localStorage`.
- Verificar autorização para a campanha/ciclo alvo em cada operação, inclusive no momento do commit.
- Limitar tamanho do arquivo, quantidade de linhas, número de abas, tempo de processamento e tipos de conteúdo aceitos.
- Tratar extensão e nome do arquivo como metadados não confiáveis; validar conteúdo e tratar planilhas malformadas sem derrubar o serviço.
- Escapar valores apresentados na prévia e no relatório; não renderizar fórmulas ou conteúdo importado como HTML executável.
- Guardar arquivos de origem em armazenamento privado com retenção definida; evitar links públicos permanentes.
- Não registrar dados pessoais desnecessários, segredos ou conteúdo integral da planilha nos logs.
- Aplicar proteção contra CSRF/replay conforme a estratégia de sessão/API adotada e limitar tentativas concorrentes.

## 8. Critérios de aceite antes de homologar

- [ ] Reimportar o mesmo arquivo/operação não cria duplicatas.
- [ ] Duas confirmações concorrentes não processam o mesmo trabalho duas vezes.
- [ ] A prévia não altera dados oficiais.
- [ ] Linhas ambíguas ou rejeitadas não são gravadas silenciosamente.
- [ ] Toda alteração tem autor, horário, fonte e resultado auditáveis.
- [ ] Falha transacional deixa estado consistente e resultado identificável.
- [ ] Um usuário sem permissão não consegue obter prévia nem confirmar importação por chamada direta à API.
- [ ] A política de atualização, cancelamento, estorno e aceitação parcial está aprovada.
- [ ] A chave idempotente foi validada com amostras anonimizadas da fonte real.
- [ ] Validação dinâmica ocorre apenas em ambiente isolado, com dados fictícios controlados, depois de autorizada a fase local.

## 9. Pendências de negócio relacionadas

Este documento não resolve por inferência as decisões DEC-01, DEC-02 e DEC-03 de `docs/decisions-and-open-questions.md`: fonte oficial, chave única e semântica de correções/estornos continuam abertas. Também não define ainda a escrita de volta na planilha; sincronização bidirecional requer contrato separado de conflitos, permissões e recuperação.

Nenhum teste, typecheck, build ou instalação de dependências foi executado para produzir este documento. A aplicação e o fluxo de importação não devem ser considerados implementados.
