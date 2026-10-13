# Branch assessment — Campanhas

**Data da verificação:** 2026-10-13  
**Branch de referência para o trabalho atual:** `docs/architecture-foundation`  
**Conta GitHub usada:** `MatheusPassos07`

## Decisão operacional

Não integrar nem excluir as branches `campaign-management-platform` ou `fix/database-integrity-constraints` nesta etapa. Ambas divergem da branch de referência e precisam de revisão de commits/diffs antes de qualquer cherry-pick, merge ou encerramento. A branch `main` permanece fora do escopo de alteração.

## Comparação atual das branches

A comparação mais recente do GitHub entre `docs/architecture-foundation` (base) e `campaign-management-platform` (head) reportou `diverged`: 2 commits exclusivos da branch head e 5 commits exclusivos da base. Para `fix/database-integrity-constraints`, reportou `diverged`: 4 commits exclusivos da branch head e 5 exclusivos da base. Esses números substituem os números de uma consulta anterior registrados em versões anteriores deste documento; divergências podem mudar conforme as branches avançam.

### `campaign-management-platform`

O commit mais recente é `7e16afe7f372f36ccb640ed4a7910489979bd96a`, mensagem `revert: remove unrequested local roadmap dashboard`. O diff confirma a remoção de `dashboard.html`, um painel de acompanhamento local que armazenava o progresso em `localStorage` e avisava que não consultava automaticamente o GitHub. A remoção é coerente com a decisão de manter o painel interativo do projeto na conversa, não dentro do repositório, sem aprovação específica. Não reintroduzir esse dashboard.

A comparação resumida não retornou lista de arquivos para essa branch. O histórico exclusivo restante ainda precisa ser revisado antes de qualquer integração; o fato de haver commits exclusivos não é, por si só, motivo para incorporá-los.

### `fix/database-integrity-constraints`

Arquivos identificados na diferença:
- `.gitignore` adicionado: ignora `node_modules/` e arquivos `.env`, preservando `.env.example`. É uma alteração útil em princípio, mas deve ser integrada seletivamente após confirmar o conteúdo completo do arquivo.
- `package-lock.json` adicionado (1.235 linhas): melhora a reprodutibilidade das dependências em princípio; ainda precisa ser validado contra o `package.json` e instalado/testado em ambiente com dependências disponíveis.
- `package.json` alterado: a versão de Vitest difere da branch de referência. Não escolher uma versão por suposição; confirmar compatibilidade do lockfile e do ambiente.
- `docs/data-model.md` atualizado: revisar alinhamento com o modelo atual antes de integrar.
- `supabase/migrations/0001_initial_schema.sql` atualizado: inclui chaves estrangeiras compostas para manter a consistência campanha/ciclo, restrições de domínio e trigger para impedir alteração/exclusão de snapshots de campeões.

Revisão estática dos diffs de commits encontrados:
- `5ac54de87494e5b399f29d3300ba1441a41b1f9b` adiciona chave única composta em ciclos e chave estrangeira composta em snapshots, evitando relacionar um snapshot a um ciclo de outra campanha.
- `6539cd714f422ca15519e5b88dd887493ac23036` exige timestamp com fuso explícito ISO 8601 e rejeita IDs de negociador duplicados em snapshots; os testes correspondentes foram atualizados em `e9fb92480c011d1e3d38e9c6abcda5dc071e7cb0`.
- `546bd76e0202099920c99816bc81210f4d8a68c0` adiciona regras de exclusão de dependências e arquivos de ambiente ao `.gitignore`.

Essas mudanças parecem direcionadas a integridade e segurança, mas **ainda não são aprovadas para merge**. A migration está apenas em revisão estática, não foi executada. Ela declara explicitamente que RLS/autorização ainda precisam ser concluídas antes de expor dados pela API. Não aplicar em banco real; revisar e testar primeiro em PostgreSQL descartável. A migration é de execução única e contém `ALTER TABLE ... ADD CONSTRAINT`, portanto não deve ser presumida idempotente apenas por conter alguns `IF NOT EXISTS`.

## Diagnóstico da apresentação e validação

Na branch de referência, `index.html` está vazio e as buscas pelos caminhos comuns `src/main.tsx`, `src/App.tsx`, `src/main.ts` e `src/App.vue` não localizaram uma entrada de apresentação nesses caminhos. Isso não prova ausência absoluta de interface em qualquer caminho; a árvore completa ainda precisa ser inspecionada antes de concluir o inventário do frontend.

O `package.json` declara os scripts `npm run typecheck` e `npm test`, mas não há lockfile na branch de referência. A instalação anterior falhou por `EAI_AGAIN` ao acessar o registry, e Vitest não estava disponível no ambiente. Nenhum resultado de teste completo deve ser tratado como aprovado.

## Próximas ações

1. Completar o inventário da árvore de arquivos e do histórico exclusivo das três branches.
2. Revisar integralmente os diffs exclusivos restantes, incluindo `package.json`, lockfile, modelo de dados e migration.
3. Validar a migration em ambiente descartável e documentar requisitos pendentes de RLS/autorização.
4. Disponibilizar dependências de forma reproduzível e executar typecheck/testes registrando os resultados reais.
5. Confirmar se existe frontend funcional; se não existir, registrar uma arquitetura mínima antes de criar a primeira tela.
6. Só então propor integração seletiva das mudanças úteis, sem merge automático.

## Limites de segurança

- Não alterar `main`.
- Não executar migrations em banco real.
- Não publicar/deployar.
- Não apagar branches nem descartar commits antes de revisar diferenças.
- Não reintroduzir o painel local de roadmap no repositório sem aprovação.
- Não afirmar que testes passaram sem logs verificáveis.
