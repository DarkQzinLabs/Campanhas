# Branch assessment — Campanhas

**Data da verificação:** 2026-10-13  
**Branch de referência para o trabalho atual:** `docs/architecture-foundation`  
**Conta GitHub usada:** `MatheusPassos07`

## Decisão operacional

Não integrar nem excluir as branches `campaign-management-platform` ou `fix/database-integrity-constraints` nesta etapa. Ambas divergem da branch de referência e precisam de revisão de commits/diffs antes de qualquer cherry-pick, merge ou encerramento. A branch `main` permanece fora do escopo de alteração.

## Evidências de comparação

A comparação do GitHub entre `docs/architecture-foundation` (base) e `campaign-management-platform` (head) reportou `diverged`, com 2 commits à frente e 2 atrás em relação à base de comparação. A comparação entre `docs/architecture-foundation` e `fix/database-integrity-constraints` reportou `diverged`, com 4 commits à frente e 2 atrás.

Arquivos identificados na diferença de `fix/database-integrity-constraints`:
- `.gitignore` adicionado (ignora `node_modules/` e arquivos `.env`, preservando `.env.example`);
- `package-lock.json` adicionado;
- `package.json` alterado: versão declarada do Vitest diferente da branch de referência;
- `docs/data-model.md` atualizado;
- `supabase/migrations/0001_initial_schema.sql` atualizado, com restrições relacionais e trigger de imutabilidade de snapshots.

A migration está apenas em revisão estática. **Não foi executada** e não deve ser aplicada a banco real sem revisão, testes em ambiente descartável e validação de segurança/RLS.

## Diagnóstico da apresentação e validação

Na branch de referência, `index.html` está vazio e as buscas pelos caminhos comuns `src/main.tsx`, `src/App.tsx`, `src/main.ts` e `src/App.vue` não localizaram uma entrada de apresentação nesses caminhos. Isso não prova ausência absoluta de interface em qualquer caminho; significa que a camada de apresentação ainda precisa ser inventariada pela árvore completa antes de se planejar a integração.

O `package.json` declara os scripts `npm run typecheck` e `npm test`, mas não há lockfile na branch de referência. A instalação anterior falhou por `EAI_AGAIN` no acesso ao registry, e Vitest não estava disponível no ambiente. Nenhum resultado de teste completo deve ser tratado como aprovado.

## Próximas ações

1. Obter inventário completo da árvore de arquivos e do histórico das três branches.
2. Comparar e revisar os commits únicos de cada branch, com atenção especial à migration e ao lockfile.
3. Disponibilizar dependências de forma reproduzível e executar typecheck/testes registrando os resultados.
4. Confirmar se existe frontend funcional; se não existir, registrar uma arquitetura mínima antes de criar a primeira tela.
5. Só então propor integração seletiva das mudanças úteis, sem merge automático.

## Limites de segurança

- Não alterar `main`.
- Não executar migrations em banco real.
- Não publicar/deployar.
- Não apagar branches nem descartar commits antes de revisar diferenças.
- Não afirmar que testes passaram sem logs verificáveis.
