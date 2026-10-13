# Campanhas — inventário e avaliação das branches

**Verificação:** 2026-10-13  
**Branch de trabalho:** `docs/architecture-foundation`  
**Conta usada para alterações:** `MatheusPassos07`  
**Repositório:** `DarkQzinLabs/Campanhas`

## 1. Regras operacionais

- Trabalhar somente em `docs/architecture-foundation`.
- Não alterar `main`, não publicar/deployar, não executar migration em banco real.
- Não apagar branches nem descartar commits sem revisão.
- Não declarar testes aprovados sem resultado executado e verificável.
- O painel interativo de acompanhamento permanece na conversa; não reintroduzir um painel local de roadmap no repositório sem aprovação específica.

## 2. Inventário da árvore da branch de trabalho

A árvore Git recursiva foi consultada diretamente e retornou `truncated: false`. O inventário contém os seguintes arquivos:

| Caminho | Observação |
|---|---|
| `LICENSE` | Licença do repositório |
| `README.md` | Arquivo de 16 bytes; documentação pública insuficiente |
| `README-DEV.md` | Orientações para desenvolvimento e limitações conhecidas |
| `docs/architecture.md` | Documento de arquitetura |
| `docs/architecture/branch-assessment.md` | Este inventário e avaliação |
| `docs/data-model.md` | Modelo de dados conceitual |
| `docs/migration-and-testing.md` | Plano inicial de migration e testes |
| `index.html` | Protótipo visual monolítico, 4.322.480 bytes |
| `package.json` | Scripts e dependências de desenvolvimento |
| `src/domain/metrics.ts` | Cálculos e regras de domínio |
| `src/domain/metrics.test.ts` | Testes de métricas |
| `src/domain/ranking.ts` | Classificação individual determinística |
| `src/domain/ranking.test.ts` | Testes de classificação individual |
| `supabase/migrations/0001_initial_schema.sql` | Migration proposta para PostgreSQL; não executada |
| `tsconfig.json` | Configuração do TypeScript |

### Correção importante do diagnóstico anterior

A afirmação anterior de que `index.html` estava vazio estava incorreta. A árvore Git mostra um arquivo com 4.322.480 bytes e a leitura do início confirma uma interface HTML em português para o ranking, incluindo painel administrativo, seleção de planilha e uso de Tailwind CSS e SheetJS por CDN. O arquivo inclui dados/imagens embutidos em Base64 e concentra a interface num único HTML grande.

Portanto, **há uma camada de apresentação prototípica existente**. O que ainda não foi comprovado é a existência de uma aplicação front-end modular e integrada ao backend. O README de desenvolvimento informa que autenticação, autorização/RLS, endpoints e UI da nova arquitetura ainda não foram implementados.

**Auditoria estática do blob completo realizada nesta ação:** o conector `fetch_blob` recuperou os 4.322.438 bytes do arquivo (162 linhas físicas; quatro ocorrências de imagem WebP Base64) no commit de referência. O checkout local não está disponível nesta sessão: a chamada ao ambiente de contêiner falhou com `ClientError`, e a execução Python não iniciou; portanto não foi possível rodar ferramentas locais, browser tests ou lint sobre o arquivo. A revisão estática completa do conteúdo acessível identificou senha administrativa literal em `ADMIN_PASSWORD`, autenticação baseada em `localStorage`, persistência local, geração de dados aleatórios, importação XLSX com correspondência aproximada de nomes e interpolação de dados persistidos em `innerHTML`. O valor literal da senha não é reproduzido nesta documentação. A análise é estática; não equivale a executar o protótipo nem a um teste dinâmico de segurança.

### Configuração de desenvolvimento observada

O `package.json` declara:
- `npm test` → `vitest run`;
- `npm run typecheck` → `tsc --noEmit`;
- TypeScript `^5.8.3`;
- Vitest `^3.2.4`.

Não existe `package-lock.json` nesta branch. A tentativa anterior de instalação falhou com erro de rede `EAI_AGAIN` ao acessar o registry, e Vitest não estava disponível naquele ambiente. **Não há evidência de execução bem-sucedida do conjunto completo de testes ou do typecheck.**

## 3. Branch `campaign-management-platform`

### Histórico exclusivo revisado

A comparação com a branch de trabalho indica divergência. Os dois commits exclusivos da branch são:

1. [`b2c081a` — feat: add interactive project progress dashboard](https://github.com/DarkQzinLabs/Campanhas/commit/b2c081ad30dc2cb92aea33e2b1097770b5eeb475)
   - Adicionou `dashboard/acompanhamento.html`, um painel local de roadmap.
2. [`7e16afe` — revert: remove unrequested local roadmap dashboard](https://github.com/DarkQzinLabs/Campanhas/commit/7e16afe7f372f36ccb640ed4a7910489979bd96a)
   - Removeu o arquivo adicionado pelo commit anterior.

Os dois commits são um par de adição/remoção do painel local. O estado final da branch não contém esse dashboard. Não há motivo para reaplicar nenhum deles na branch de trabalho. O histórico e o diff de ambos foram consultados.

A comparação do GitHub reportou `diverged`, com 2 commits exclusivos dessa branch e 7 commits exclusivos da branch de trabalho desde o merge-base atual. Esses números são relativos à referência consultada e podem mudar com novos commits.

## 4. Branch `fix/database-integrity-constraints`

A comparação reportou `diverged`, com 4 commits exclusivos dessa branch e 7 commits exclusivos da branch de trabalho desde o merge-base. Os quatro commits exclusivos foram identificados e revisados por diff:

1. [`3e6a8cc` — fix(db): enforce campaign group and cycle integrity](https://github.com/DarkQzinLabs/Campanhas/commit/3e6a8ccbb826693d8bb7bd5f4a89fbbb82981afd)
   - Altera a migration para usar chaves estrangeiras compostas em associações de grupo/campanha e em entradas de produção/ciclo/campanha.
   - Acrescenta verificações de consistência para o estado de anúncio de campeões.
   - **Risco/validação pendente:** constraints compostas dependem de chaves únicas correspondentes nas tabelas referenciadas e da ordem correta de criação. Não executar sem validar a migration inteira em PostgreSQL descartável.
2. [`cf56489` — docs(db): document campaign group membership integrity](https://github.com/DarkQzinLabs/Campanhas/commit/cf564895173264c0a4fdf4fe42220c301ca3340c)
   - Atualiza o modelo conceitual para documentar `campaign_id` e as garantias de consistência entre campanha, grupo e negociador.
3. [`ca797c4` — chore: update Vitest security fixes](https://github.com/DarkQzinLabs/Campanhas/commit/ca797c4eaf94ba270bf4a9e8af393d3050cb7d2d)
   - Atualiza Vitest de `^3.2.4` para `^4.1.11` e adiciona `package-lock.json` (1.235 linhas).
   - **Risco/validação pendente:** validar compatibilidade do major do Vitest com Node.js, scripts, testes e dependências; validar que lockfile e manifesto estão sincronizados e que a instalação reproduzível funciona.
4. [`546bd76` — chore: ignore dependencies and environment files](https://github.com/DarkQzinLabs/Campanhas/commit/546bd76e0202099920c99816bc81210f4d8a68c0)
   - Adiciona regras ao `.gitignore` para `node_modules/`, `.env` e `.env.*`, preservando `.env.example`.
   - Mudança útil em princípio, mas a integração deve continuar seletiva e incluir verificação de que nenhum arquivo de ambiente já versionado está sendo tratado incorretamente.

### Avaliação técnica estática da migration

A leitura completa da migration da branch de trabalho (9.884 caracteres) e da candidata (10.333 caracteres) confirma:
- A candidata acrescenta uma chave única composta em `campaign_groups(id, campaign_id)` e chaves estrangeiras compostas para impedir que a associação de grupo ou a produção referencie uma campanha/ciclo incompatível.
- A candidata exige coerência entre `campaign_cycles.status = 'champions_announced'` e `champions_announced_at`, e impede `cycle_id` não nulo sem `campaign_id` em `production_entries`.
- A candidata preserva o trigger que rejeita UPDATE/DELETE em `champion_snapshots`.
- A migration não contém declarações `CREATE POLICY` nem `ENABLE ROW LEVEL SECURITY` (verificação textual estática). O cabeçalho também afirma que RLS/autorização ainda precisa ser concluída. Logo, o esquema não está pronto para exposição por API com dados reais.
- A migration inclui `ALTER TABLE public.production_entries ADD CONSTRAINT production_entries_source_import_fk` sem guarda de existência. É explicitamente uma migration inicial de execução única; reaplicá-la manualmente pode falhar. `CREATE TABLE IF NOT EXISTS` não torna, por si só, a migration inteira idempotente.

As constraints candidatas parecem melhorar a integridade relacional, mas ainda exigem validação executável em PostgreSQL descartável, inclusive de ordem de criação, constraints compostas, trigger, rollback e comportamento com dados inválidos. A inspeção estática não prova que a migration executa com sucesso. **Nenhuma mudança está aprovada automaticamente para integração**.

### Avaliação do lockfile e dependências

A branch de referência declara Vitest `^3.2.4` sem lockfile; a branch candidata altera para `^4.1.11` e inclui lockfile v3. O lockfile declara Node.js `^20.19.0 || >=22.12.0` para alguns pacotes opcionais, mas isso não substitui uma execução real do conjunto de testes. Não é possível afirmar compatibilidade completa apenas pela leitura do manifesto. Antes de adotar a mudança, executar instalação reproduzível e `npm run typecheck`/`npm test` com logs. A tentativa anterior de instalação falhou por rede e não houve resultado de testes completo.

## 5. Estado verificável e lacunas

- A árvore completa da branch de trabalho foi recuperada sem truncamento e inventariada.
- O protótipo HTML existe; a arquitetura de apresentação modular ainda não está demonstrada.
- O domínio TypeScript tem módulos e arquivos de teste versionados.
- O esquema SQL é uma proposta, não uma migration executada.
- A instalação anterior não conseguiu baixar dependências; testes completos e typecheck permanecem sem resultado comprovado.
- O blob completo do HTML foi recuperado e revisado estaticamente; auditoria dinâmica, validação em navegador e execução local permanecem bloqueadas pela indisponibilidade do checkout/ambiente local.
- Nenhuma branch foi excluída ou integrada nesta ação. `main` e banco real não foram alterados.

## 6. Próxima ação concreta

1. Remover a senha embutida e qualquer decisão de autorização do cliente; especificar autenticação/autorização server-side antes de liberar escrita.
2. Validar a migration base e a candidata em bancos PostgreSQL descartáveis separados, com logs, asserts de constraints e teste de imutabilidade.
3. Quando o checkout local estiver disponível, validar importação com planilhas de teste, incluindo nomes ambíguos, valores brasileiros, planilha malformada e arquivo grande; substituir fuzzy matching por IDs estáveis e prévia de importação.
4. Resolver a reprodutibilidade das dependências e executar typecheck/testes com logs verificáveis.
5. Depois dessas verificações, propor migração gradual do protótipo para módulos de apresentação, domínio, aplicação e infraestrutura.

## 7. Limites de segurança

- Não alterar `main`.
- Não publicar/deployar.
- Não executar migrations em banco real.
- Não excluir branches ou descartar commits.
- Não introduzir credenciais falsas nem armazenar segredos no cliente.
- Não afirmar que testes passaram sem logs verificáveis.
