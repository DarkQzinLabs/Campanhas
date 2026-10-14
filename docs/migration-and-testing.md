# Campanhas — migração do protótipo e estratégia de testes

Status: plano de execução; nenhum dado foi migrado.

## Inventário conhecido do protótipo
- O pacote analisado contém index.html, README.md e LICENSE.
- A aplicação é concentrada em um HTML grande com CSS/JavaScript embutidos e imagens/dados em base64.
- Há senha administrativa embutida no JavaScript e autenticação local por localStorage.
- Estado de aplicação é salvo em localStorage, sem fonte central compartilhada.
- A ausência de dados locais pode disparar criação de dados aleatórios de demonstração.
- A importação de planilha usa detecção limitada de cabeçalhos e correspondência aproximada por nome.
- A estrutura atual espera quatro times em parte da lógica.

## Plano de migração
1. **Congelar e preservar a referência:** manter main sem alterações durante a preparação; registrar commit base e guardar cópia do protótipo.
2. **Catalogar comportamentos:** listar telas, componentes visuais, regras de cálculo, interações e assets existentes.
3. **Separar dados de demonstração:** marcar claramente exemplos e impedir que sejam tratados como dados reais. Não migrar localStorage automaticamente sem revisão.
4. **Definir contrato de dados:** validar IDs estáveis, datas, valores, metas, estrutura de ilhas e composição dos grupos.
5. **Criar aplicação modular:** separar UI, serviços de domínio, acesso a dados e validação de entrada.
6. **Implementar autenticação e autorização antes de liberar edição:** migrar a administração para controles server-side.
7. **Criar importação em modo de prévia:** mapear colunas; mostrar linhas válidas, duplicadas, ambíguas e rejeitadas antes de gravar.
8. **Migrar por lote controlado:** usar arquivo de teste anonimizado; gerar resumo antes/depois e trilha de auditoria.
9. **Comparar cálculos antigos e novos:** investigar diferenças; não aceitar correspondência aproximada de nome como chave definitiva.
10. **Executar homologação:** validar em ambiente isolado, obter aprovação do responsável do negócio e planejar rollback.
11. **Publicar gradualmente:** apenas depois de configurar segredos reais, backups, acesso e critérios de aceitação.

## Estratégia de testes

### Unitários
- Meta do andar é a soma das metas dos membros incluídos.
- Restante = max(0, meta - realizado).
- Percentual para meta zero não causa divisão por zero.
- Ordenação de rankings com empates e valores nulos.
- Regras de elegibilidade por campanha/ciclo.
- Snapshot reproduz exatamente o ranking anunciado.

### Integração
- Papéis admin/viewer e políticas de acesso do banco.
- Criação, edição, desativação e encerramento de campanhas.
- Abrir/fechar ciclo e anunciar campeão apenas por ação autorizada.
- Snapshot não pode ser alterado após anúncio.
- Importação idempotente, validação de esquema e relatório de rejeições.
- Tratamento de conflito/duplicidade e transação atômica na importação.

### Interface / ponta a ponta
- Ranking público acessível sem privilégios de edição.
- Controles administrativos indisponíveis a viewer.
- Prévia de planilha antes da gravação.
- Fluxo de anúncio manual e reabertura do pódio.
- Responsividade em resolução de monitor e TV.
- Personalização visual e opção de pular animações.
- Estados vazios, erros, carregamento e conexão indisponível.

### Segurança
- Nenhum segredo embutido no bundle do cliente.
- Tentativas de edição direta via API por viewer são recusadas.
- Validação e escape de entradas usadas em HTML.
- Testes de acesso cruzado entre campanhas.
- Uploads limitados por tipo, tamanho e conteúdo.
- Proteção contra duplicação e repetição de requisições.
- Auditoria sem senhas, tokens ou dados pessoais desnecessários.

### Critérios para considerar uma versão candidata
- Testes automatizados críticos aprovados.
- Cálculos reconciliados com conjunto de referência aprovado.
- Nenhum defeito crítico de autorização.
- Importação de teste reproduzível com resumo e rollback definido.
- Cópia de segurança e plano de recuperação documentados.
- Homologação funcional antes de publicação.

## Comandos de teste previstos
Os comandos exatos serão definidos após a escolha e criação da estrutura da aplicação. Não declarar testes executados enquanto não houver projeto configurado e execução registrada.


## Auditoria estática do protótipo — commit `e6c5ca5dd1091b5d82285d175049965f85d3c229`

O blob `index.html` foi recuperado integralmente pelo GitHub e analisado estaticamente: 4.322.438 bytes, 162 linhas físicas, quatro ocorrências de imagens WebP embutidas em Base64. O checkout local não estava disponível nesta sessão (ambiente de contêiner retornou `ClientError`); portanto, nenhuma execução em navegador, lint, scanner local ou teste dinâmico foi realizado.

### Achados verificáveis

| Prioridade | Achado | Evidência estática | Consequência / ação |
|---|---|---|---|
| Crítica | Senha administrativa literal no JavaScript do cliente | Constante `ADMIN_PASSWORD` e comparação direta no handler do botão | Considerar a senha comprometida; removê-la do HTML e não reutilizá-la. Autenticação e autorização devem ser verificadas no servidor. |
| Crítica | Sessão administrativa falsificável | `dashboard_admin_auth` é gravado como `'1'` em `localStorage`; `checkAdmin()` confia apenas nesse valor | Qualquer usuário pode alterar o estado local pelo DevTools. Ocultar painel não protege dados nem operações. |
| Alta | Nomes de colaboradores e imagens embutidos no cliente | `TEAMS_RAW` contém roster nominal e quatro payloads de imagem Base64 no HTML | Confirmar autorização para publicação; remover dados pessoais do código e servir somente os dados necessários por API autorizada. |
| Alta | Dados de produção ficam no navegador | Estado completo em `dashboard_cobranca_final_v3`, sem API/fonte central no HTML | Dados não são compartilhados entre dispositivos e podem ser adulterados ou perdidos; não tratar como registro oficial. |
| Alta | Dados demonstrativos gerados automaticamente | `makeSeed()` usa `Math.random()`; `loadSaved()` recorre a ela quando não há dados locais válidos; botão Resetar também gera novos valores | Pode exibir números aleatórios como se fossem produção real. Desabilitar geração automática em qualquer versão operacional e marcar explicitamente fixtures de demonstração. |
| Alta | Importação grava sem etapa de prévia/confirmar | O handler processa todas as abas elegíveis, chama `save()` e `render()` logo após a leitura | Uma planilha incorreta pode substituir valores locais sem reconciliação linha a linha. Adicionar prévia, confirmação explícita, relatório de rejeições e opção de cancelar antes de gravar. |
| Alta | Importação pode atualizar a pessoa errada | Match por substring e pelo primeiro nome: `norm.includes(key)`, `key.includes(norm)` ou igualdade do primeiro token | Nomes parecidos/duplicados podem receber valores de outra pessoa. Usar ID estável; apresentar prévia com ambiguidades e rejeitar correspondência não única. |
| Alta | Renderização HTML usa valores persistidos | `render()` monta cartões por template string e escreve com `innerHTML`; dados podem vir do `localStorage` editável | Estado local adulterado pode provocar injeção de HTML/script conforme o contexto. Usar APIs DOM seguras/escape contextual e validar estrutura/URLs antes de renderizar. |
| Média | Conversão de números de planilha é frágil | Parser remove caracteres e usa `replace('.', '')` apenas uma vez antes de converter vírgula decimal | Valores com múltiplos separadores, formatos mistos ou números negativos podem ser interpretados incorretamente. Implementar parser de moeda explícito e testes por locale. |
| Média | Dependências executadas de CDN | Tailwind CSS, SheetJS 0.20.3 e fonte Inter via Google Fonts | Disponibilidade e integridade dependem de terceiros/rede. Fixar versões, avaliar instalação local e política CSP/SRI quando compatível. |
| Média | Validação de upload limitada | `accept=".xlsx,.xls"`, `file.arrayBuffer()` e `XLSX.read`, sem limite de tamanho visível no handler | Extensão não valida conteúdo; arquivos grandes/malformados podem consumir memória. Validar tamanho, conteúdo, número de linhas e tratar planilhas inválidas. |

A inspeção não encontrou chamada `fetch()` nem `XMLHttpRequest` no HTML. Isso não comprova ausência de todo comportamento de rede: há dependências externas carregadas pelo navegador. O HTML não apresenta uma política CSP no conteúdo examinado. Não foram executados testes dinâmicos nem scanners.

### Plano de correção de segurança

1. Tratar a senha exposta como comprometida; não a copiar para variáveis de ambiente do frontend nem para outro arquivo público.
2. Separar o ranking público das operações administrativas; exigir identidade autenticada e autorização no backend em cada endpoint mutável.
3. Não migrar o `localStorage` automaticamente. Primeiro exportar e validar dados manualmente em cópia de teste, se houver interesse comercial em recuperá-los.
4. Substituir correspondência aproximada por identificadores estáveis; importar primeiro para prévia, com contagens de válidos, duplicados, ambíguos e rejeitados.
5. Remover geração aleatória da inicialização operacional e garantir estado vazio explícito quando não houver dados.
6. Testar entradas manipuladas para nomes, imagens, arquivos e células; não usar valores importados/persistidos em `innerHTML` sem escape apropriado.

## Plano verificável: migration PostgreSQL em ambiente descartável

**Status: planejado, não executado.** Não usar credenciais de produção, não conectar a projeto Supabase real e não executar contra banco compartilhado. A migration contém `BEGIN/COMMIT`, uma restrição adicionada sem guarda de existência e trigger de imutabilidade; cada candidata deve ser aplicada uma única vez a um banco vazio.

### 1. Pré-requisitos e isolamento

- Checkout local com as branches e commits que serão comparados.
- Docker disponível e versão da imagem PostgreSQL registrada.
- Nenhuma variável `DATABASE_URL` de produção exportada; usar porta local dedicada e senha descartável.
- Guardar os logs e o SHA exato de cada arquivo SQL sob teste.

### 2. Criar PostgreSQL efêmero

Exemplo Bash, apenas quando o ambiente local estiver disponível:

```bash
docker run --rm -d --name campanhas-pg-audit \
  -e POSTGRES_PASSWORD=audit_only_disposable \
  -e POSTGRES_DB=campanhas_base_audit \
  -p 127.0.0.1:55432:5432 postgres:16-alpine

docker exec campanhas-pg-audit pg_isready -U postgres -d campanhas_base_audit
```

Para evitar mistura de resultados, criar um segundo banco vazio para a migration candidata:

```bash
docker exec campanhas-pg-audit createdb -U postgres campanhas_candidate_audit
```

### 3. Capturar versão e aplicar cada arquivo uma única vez

Executar no checkout correto e guardar o SQL exato antes da execução:

```bash
git rev-parse docs/architecture-foundation
git rev-parse fix/database-integrity-constraints
git show docs/architecture-foundation:supabase/migrations/0001_initial_schema.sql > /tmp/campanhas-base.sql
git show fix/database-integrity-constraints:supabase/migrations/0001_initial_schema.sql > /tmp/campanhas-candidate.sql
sha256sum /tmp/campanhas-base.sql /tmp/campanhas-candidate.sql
```

Aplicar a base e a candidata em bancos separados, preservando stdout/stderr e o código de saída:

```bash
set -o pipefail
docker exec -i campanhas-pg-audit psql -X -v ON_ERROR_STOP=1 -U postgres -d campanhas_base_audit < /tmp/campanhas-base.sql 2>&1 | tee /tmp/campanhas-base-migration.log
docker exec -i campanhas-pg-audit psql -X -v ON_ERROR_STOP=1 -U postgres -d campanhas_candidate_audit < /tmp/campanhas-candidate.sql 2>&1 | tee /tmp/campanhas-candidate-migration.log
```

**Critério de sucesso:** os dois comandos terminam com código zero e os logs mostram conclusão de transação. Se falhar, preservar log e estado do banco descartável; não corrigir silenciosamente o SQL durante a execução. Não executar o mesmo arquivo novamente no banco já migrado.

### 4. Verificações de catálogo

Executar em ambos os bancos e salvar o resultado:

```sql
SELECT current_database(), version();
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

SELECT conrelid::regclass AS tabela, conname, contype, pg_get_constraintdef(oid) AS definicao
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
ORDER BY conrelid::regclass::text, conname;

SELECT tgname, tgrelid::regclass AS tabela, pg_get_triggerdef(oid) AS definicao
FROM pg_trigger
WHERE NOT tgisinternal
ORDER BY tgrelid::regclass::text, tgname;

SELECT n.nspname AS schema, c.relname AS tabela, c.relrowsecurity AS rls_ativado
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname;
```

A saída esperada para o estado atual confirma que o trigger de snapshots existe e que RLS não está habilitada. A ausência de RLS é um **bloqueador de produção**, não um teste a ser “corrigido” automaticamente durante esta auditoria.

### 5. Testes negativos e de integridade

Criar fixtures descartáveis com campanhas, ciclos, grupos, negociadores e perfil fictícios; executar cada caso em transação separada com rollback quando apropriado.

- Inserção válida: campanha e ciclo coerentes, produção vinculada à combinação correta e snapshot válido.
- Integridade cruzada: tentar associar um grupo ou produção a uma campanha/ciclo diferente; a candidata deve rejeitar as combinações inválidas.
- Ciclo anunciado: testar combinações inconsistentes entre `status`, `champions_announced_at` e `announced_by`.
- Snapshots: UPDATE e DELETE em snapshot devem falhar pelo trigger; INSERT válido deve funcionar.
- Importação: chave externa repetida deve respeitar o índice único parcial; referência a `import_jobs` inexistente deve falhar.
- Domínio: valores negativos, estados não permitidos e payload de snapshot que não seja objeto devem ser rejeitados.
- Reaplicação: somente em um terceiro banco descartável já migrado, documentar o comportamento esperado de falha/não idempotência; nunca usar isso como procedimento operacional.
- Rollback/limpeza: destruir o contêiner descartável após guardar logs; não conectar ao banco real.

### 6. Artefatos e decisão

Guardar como evidência: SHAs dos arquivos, versão do PostgreSQL, logs completos, saída das consultas de catálogo, SQL dos testes negativos e resultado esperado/observado de cada caso. A migration candidata só pode ser recomendada para integração depois de todos os testes executáveis passarem, das diferenças em relação à base serem explicadas e do plano de RLS/autorização estar separado e aprovado. Este plano não afirma que qualquer teste foi executado.

## Registro de execução — auditoria de 14/10/2026

### Checkout e ferramentas locais

- Commit solicitado como referência: `e6c5ca5dd1091b5d82285d175049965f85d3c229`.
- Tentativa de checkout somente leitura: `git clone --filter=blob:none --no-checkout --single-branch --branch docs/architecture-foundation https://github.com/DarkQzinLabs/Campanhas.git /tmp/Campanhas`.
- Resultado observado: falha com `Could not resolve host: github.com`. Portanto, não existe checkout local nesta sessão e não foram executados testes de navegador, lint ou scanners locais.
- Ferramentas verificadas no contêiner: Git 2.47.3, Node.js 22.16.0 e npm 10.9.2 disponíveis; Docker, `psql` e `pg_isready` indisponíveis. Não foi possível executar a migration em PostgreSQL descartável nesta sessão.
- Como alternativa, o blob completo do `index.html` foi obtido pela API do GitHub e analisado estaticamente, sem modificar o protótipo. A árvore Git informa tamanho de 4.322.480 bytes; o conteúdo retornado tem 4.322.438 caracteres e 162 linhas físicas. O blob SHA é `3503f8ab3fb059ae861c5dea926cdbf8077ca279`.

### Confirmações adicionais a partir do HTML completo

- Linha física 75: `ADMIN_PASSWORD = "cobranca2026"` está literal no JavaScript do cliente. Tratar como comprometida; não a reutilizar.
- Linhas físicas 85–87: o estado `dashboard_cobranca_final_v3` é lido e escrito no `localStorage`; quando o estado não pode ser usado, `loadSaved()` retorna `makeSeed()`.
- Linha física 80: `makeSeed()` cria valores de meta e produção com `Math.random()`. O botão de reset também chama essa função.
- Linhas físicas 105–106 e 130–131: `checkAdmin()` considera administrador quem tiver `dashboard_admin_auth === '1'` no armazenamento local; o botão de senha compara a entrada com a constante embutida e grava esse sinal local. Não há validação server-side no protótipo.
- Linha física 97 e seguintes: `render()` injeta dados interpolados em templates HTML por `innerHTML`. Como parte desses dados pode vir do armazenamento local adulterável, validar e escapar os valores é requisito de segurança.
- Linhas físicas 149–151: a importação lê o arquivo completo em memória, percorre abas, detecta cabeçalhos entre as cinco primeiras linhas e associa pessoas por substring/primeiro nome. As alterações são salvas e renderizadas imediatamente, sem etapa de prévia/confirmação. O parser numérico usa substituições simplificadas.
- Linhas físicas 7–9: Tailwind é carregado de `cdn.tailwindcss.com`, SheetJS 0.20.3 de `cdn.sheetjs.com` e a fonte Inter do Google Fonts. O conteúdo examinado não declara CSP nem SRI para esses recursos.
- A busca textual não encontrou `fetch(`, `XMLHttpRequest`, `WebSocket` ou `sendBeacon` no HTML; isso não equivale a uma prova geral de ausência de comunicação indireta das bibliotecas externas.
- O HTML contém uma lista nominal de colaboradores e imagens de times em Base64. Confirmar autorização de publicação e minimizar dados pessoais no cliente antes de tornar o ranking acessível publicamente.

Esta rodada é uma **auditoria estática do blob completo**, não uma auditoria dinâmica. Não foram simulados arquivos malformados, entradas XSS em navegador, autenticação por API ou testes de performance.

### Próxima execução reproduzível

1. Restaurar conectividade de rede para GitHub ou disponibilizar um checkout local da branch e commit exatos.
2. Disponibilizar Docker/PostgreSQL descartável ou um ambiente isolado equivalente, sem credenciais de produção.
3. Executar o plano PostgreSQL descrito acima, guardando logs e resultados de cada caso negativo.
4. Só depois iniciar a correção do protótipo: retirar a senha do cliente e descontinuar a autenticação baseada em `localStorage`; não reutilizar dados aleatórios como produção; implementar prévia e correspondência por ID estável na importação; revisar os sinks HTML e as dependências externas.
