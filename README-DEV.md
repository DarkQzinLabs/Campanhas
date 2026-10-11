# Campanhas — fundação técnica

A aplicação original continua preservada em `index.html`. Esta branch inicia a migração de forma incremental; ela ainda não substitui o protótipo.

## Ferramentas
- Node.js 20+ recomendado.
- npm.
- TypeScript e Vitest como dependências de desenvolvimento.

## Comandos
```bash
npm install
npm run typecheck
npm test
```

## Domínio
- `src/domain/metrics.ts`: cálculos puros em centavos inteiros e criação de snapshots imutáveis em memória.
- `src/domain/metrics.test.ts`: testes de cálculo, validação e snapshot.
- `supabase/migrations/0001_initial_schema.sql`: proposta inicial de esquema PostgreSQL; apesar do caminho, o SQL é PostgreSQL e ainda não pressupõe que Supabase foi escolhido.

## Avisos
- Nenhuma migração foi aplicada a banco.
- Autenticação, autorização/RLS, endpoints e UI ainda não foram implementados.
- Não inserir dados reais até concluir políticas de acesso, validação e plano de backup.
- A imutabilidade em TypeScript protege apenas o objeto em memória; a proteção persistente do snapshot é implementada por trigger SQL, que ainda precisa ser testada num PostgreSQL descartável.
