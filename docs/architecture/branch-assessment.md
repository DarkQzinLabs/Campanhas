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

Limitação desta inspeção: o conector não conseguiu recuperar o HTML completo de 4,3 MB para análise linha a linha; não se deve declarar que toda a lógica do protótipo foi auditada. O controle de administrador visível no HTML é apenas evidência de interface; não constitui prova de autenticação segura. A proteção administrativa deve ser aplicada e testada no servidor/backend antes de usar dados reais.

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

### Avaliação técnica

As constraints relacionais propostas fortalecem a integridade entre campanhas, ciclos, grupos e negociadores. A documentação e o lockfile também podem ser úteis. Entretanto, **nenhuma dessas mudanças está aprovada automaticamente para integração**. É necessário revisar o diff completo da migration e o manifesto/lockfile em conjunto, executar testes em ambiente descartável e verificar políticas de acesso.

A migration atual na branch de trabalho declara explicitamente que RLS/autorização precisa ser concluída antes de expor dados pela API. Não aplicar a migration a banco real. Também não presumir que ela é idempotente só porque algumas instruções usam `IF NOT EXISTS`.

## 5. Estado verificável e lacunas

- A árvore completa da branch de trabalho foi recuperada sem truncamento e inventariada.
- O protótipo HTML existe; a arquitetura de apresentação modular ainda não está demonstrada.
- O domínio TypeScript tem módulos e arquivos de teste versionados.
- O esquema SQL é uma proposta, não uma migration executada.
- A instalação anterior não conseguiu baixar dependências; testes completos e typecheck permanecem sem resultado comprovado.
- O conteúdo completo do HTML monolítico não pôde ser recuperado pelo conector nesta inspeção; uma auditoria de segurança linha a linha do protótipo permanece pendente.
- Nenhuma branch foi excluída ou integrada nesta ação. `main` e banco real não foram alterados.

## 6. Próxima ação concreta

1. Auditar o protótipo HTML em um checkout local, com busca estática por senha/segredos no cliente, manipulação de DOM, importação de planilhas, persistência local e dependências externas.
2. Fazer revisão completa da migration e validar a proposta em PostgreSQL descartável; registrar os requisitos de RLS/autorização como bloqueadores para dados reais.
3. Resolver a reprodutibilidade das dependências e executar typecheck/testes com logs verificáveis.
4. Depois dessas verificações, propor um plano de migração gradual do protótipo HTML para módulos de apresentação, domínio, aplicação e infraestrutura, sem reescrever tudo às cegas.

## 7. Limites de segurança

- Não alterar `main`.
- Não publicar/deployar.
- Não executar migrations em banco real.
- Não excluir branches ou descartar commits.
- Não introduzir credenciais falsas nem armazenar segredos no cliente.
- Não afirmar que testes passaram sem logs verificáveis.
