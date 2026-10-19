# Campanhas — comparação de arquitetura de acesso ao PostgreSQL/Supabase

Status: análise técnica documental baseada na inspeção remota da branch `docs/architecture-foundation` em 19/10/2026. **Nenhuma das opções está implementada ou aprovada para dados reais.** Este documento não altera migrations, privilégios, políticas RLS ou código da aplicação.

Referências internas:
- `docs/application-foundation.md`
- `docs/authorization-and-audit-contract.md`
- `docs/database-permission-matrix.md`
- `docs/security-threat-model.md`
- `supabase/migrations/0001_initial_schema.sql`

## 1. Resumo para decisão

Há duas arquiteturas viáveis em princípio:

- **Opção A — Backend como único caminho de acesso:** navegador chama a API; o backend autentica, autoriza, valida regras de negócio e acessa PostgreSQL. É a direção que melhor se alinha ao desenho atual documentado de handlers, serviços, repositórios e operações transacionais.
- **Opção B — Cliente acessa Supabase diretamente com RLS:** o navegador usa uma credencial pública e uma sessão de usuário; PostgreSQL/Supabase aplica políticas RLS por linha e operação. Exige uma matriz de políticas completa e testes negativos para todas as tabelas expostas.

**Recomendação provisória para Campanhas:** adotar a Opção A como caminho principal para mutações administrativas e operações críticas (importação, correção de produção, ciclo, snapshot/anúncio e auditoria). Não significa que a Opção A dispense RLS ou privilégios SQL mínimos. Se for necessário acesso direto do cliente para alguma leitura, essa exceção deve ser deliberada, limitada a dados públicos projetados e protegida por políticas RLS próprias.

Esta recomendação é uma inferência arquitetural com base nos contratos já documentados e na sensibilidade das operações. Não é uma decisão irreversível nem uma implementação.

## 2. Comparação direta

| Critério | A — Backend como único caminho | B — Cliente direto com RLS |
|---|---|---|
| Onde aplicar regras de negócio | Serviços/backend centralizam validação, transações e autorização | Parte das regras de acesso fica em policies SQL; regras complexas ainda precisam de serviços/RPC confiáveis |
| Exposição do banco | Banco não é chamado diretamente pelo navegador; endpoints públicos/administrativos são a superfície principal | Cliente conhece endpoint e usa chave pública; tabelas/views/RPC expostas precisam ser protegidas por RLS e grants |
| Controle de acesso por linha | Backend consulta e modifica somente o escopo autorizado; RLS pode ser camada adicional | RLS é barreira central para tabelas acessíveis diretamente |
| Privilégios mínimos | Papel SQL do backend limitado às operações necessárias; separar funções privilegiadas | Papel público/usuário autenticado com privilégios de tabela restritos; RLS restringe linhas, GRANT restringe operações/tabelas |
| Complexidade inicial | Mais código de API, serviços e repositórios; modelo de autorização centralizado | Menos endpoints para CRUD simples, mas exige políticas consistentes e domínio de SQL/RLS |
| Risco de omissão | Um endpoint sem autorização pode expor ou alterar dados | Uma tabela sem RLS, policy permissiva ou GRANT excessivo pode expor dados diretamente |
| Transações compostas | Mais natural coordenar mutação, idempotência e auditoria no serviço | Pode exigir RPC/funcões transacionais; sequência de chamadas do cliente não é uma transação de negócio confiável |
| Auditoria | Backend deriva ator da sessão validada e registra evento junto da operação | Policies protegem acesso; para atribuição de ator confiável e mutações compostas pode ser necessário RPC/trigger cuidadosamente desenhado |
| Revogação de usuário | Backend pode verificar perfil ativo e escopo em cada requisição; ainda precisa considerar sessões/cache | RLS depende de identidade/claims válidos e política atual; claims desatualizados podem complicar revogação se o papel ficar embutido no token |
| Testabilidade | Testar API, serviços, banco e cenários de autorização por caso de uso | Além da aplicação, testar policies por tabela/ação e claims, inclusive acesso anônimo |
| Observabilidade | Correlação e logs centralizados na API; evitar registrar dados sensíveis | Eventos distribuídos entre cliente, banco e funções; é necessário definir a origem confiável da auditoria |
| Adequação ao Campanhas | Alta para importação, produção, anúncio e auditoria | Possível para leituras públicas cuidadosamente limitadas; risco maior se usado como único mecanismo para todas as operações complexas |

## 3. Opção A — Backend como único caminho de acesso

### Fluxo esperado

1. Navegador envia uma requisição à API.
2. Backend valida sessão/token e identidade; não confia em papel, ator ou escopo enviado pelo cliente.
3. Serviço de autorização verifica perfil interno ativo, papel e permissão sobre o recurso/campanha.
4. Serviço de aplicação valida o contrato de domínio e executa a transação necessária.
5. Repositório acessa o banco usando identidade técnica restrita no servidor.
6. A operação e seu evento de auditoria são confirmados atomicamente quando tecnicamente viável.
7. API devolve somente os campos necessários, com mensagens de erro seguras e ID de correlação.

### Privilégios mínimos esperados

- A credencial de banco deve existir somente no servidor/ambiente seguro; nunca no bundle do navegador, logs ou repositório.
- Preferir papel SQL de runtime separado do papel de migrations/owner. O papel de runtime não deve ser proprietário das tabelas nem ter privilégios DDL.
- Conceder apenas SELECT/INSERT/UPDATE/DELETE necessários por tabela; evitar GRANT amplo no schema e não conceder mutações diretas em `profiles`, `audit_events` ou `champion_snapshots` sem fluxo específico.
- Para operações privilegiadas, preferir funções/RPC estreitas e revisadas em vez de dar acesso genérico à tabela inteira.
- Se o backend usar uma chave de serviço Supabase que contorne RLS, tratá-la como credencial de alto privilégio: manter apenas no servidor, limitar o número de módulos que podem usá-la, validar autorização antes de cada operação e nunca presumir que RLS ainda protege essa chamada.
- Avaliar manter RLS habilitada como defesa adicional, mas verificar como o papel real de conexão interage com as policies. RLS não substitui autorização da aplicação nem protege contra todo ator privilegiado.
- Separar credenciais por ambiente e ter procedimento de rotação/revogação.

### Riscos e responsabilidades

- **Risco principal:** endpoint/handler sem verificação, checagem incompleta de escopo ou serviço que confia em entrada do cliente.
- **Responsabilidade de engenharia:** manter middleware/serviços de autorização consistentes; testar cada operação negativa; limitar credenciais; auditar mutações; garantir transações e idempotência.
- **Limite importante:** backend-only não torna o sistema seguro automaticamente. A segurança depende do código, das credenciais e dos privilégios efetivos do banco.

## 4. Opção B — Cliente acessa Supabase diretamente com RLS

### Fluxo esperado

1. Navegador autentica o usuário e recebe uma sessão/token válido.
2. Cliente conecta ao endpoint público do Supabase usando apenas chave pública/client-side prevista para isso.
3. Cada consulta/mutação é limitada por GRANTs e políticas RLS avaliadas no banco.
4. Políticas usam identidade/claims validados e regras de escopo; não confiam em campos de papel enviados no corpo.
5. Operações complexas são encapsuladas em RPC/serviços confiáveis, com transações e auditoria definidas.
6. Dados públicos são expostos por views/endpoints/projeções com campos explicitamente aprovados.

### Privilégios mínimos esperados

- Ativar RLS em todas as tabelas expostas e criar policies explícitas para SELECT/INSERT/UPDATE/DELETE conforme o caso. A ausência de policy deve resultar em negação para tabelas protegidas.
- Aplicar GRANTs mínimos: RLS filtra linhas, mas não substitui privilégios SQL. Não conceder acesso a tabelas inteiras apenas porque o usuário está autenticado.
- Conceder acesso público somente à projeção necessária para ranking/pódio; não expor `production_entries`, `import_jobs`, `profiles` ou `audit_events` diretamente sem justificativa e política rigorosa.
- Definir policies específicas para `profiles` que impeçam autoelevação e alteração de `role`, `active` e `auth_subject`.
- Impedir que o cliente defina livremente `actor_profile_id` em `audit_events`; escrita de auditoria deve ocorrer por mecanismo confiável que derive o ator da identidade autenticada.
- Não colocar chave de serviço Supabase no navegador. A chave pública não é um segredo; a segurança precisa vir de GRANTs, RLS, funções e validação.
- Para `SECURITY DEFINER`/RPCs privilegiadas, restringir EXECUTE, fixar cuidadosamente o `search_path`, qualificar objetos, validar cada argumento e evitar que o chamador escolha o ator ou o papel. Usar somente quando a revisão de segurança confirmar a necessidade.

### Riscos e responsabilidades

- **Risco principal:** policy ausente/permissiva, GRANT excessivo, uso de claims desatualizados ou endpoint/RPC privilegiado mal protegido.
- **Responsabilidade de engenharia:** revisar cada policy por tabela e operação, provar acesso anônimo/usuário/admin, testar isolamento por recurso e garantir que migrations e configuração real estejam sincronizadas.
- **Limite importante:** RLS não valida automaticamente regras de domínio como idempotência de importação, transições de ciclo, integridade de snapshot ou consistência de metas. Essas regras precisam continuar no banco e/ou nos serviços.

## 5. Aplicação ao esquema atual de Campanhas

A migration remota inspecionada declara 15 tabelas e não contém instruções explícitas de RLS, policies, GRANT ou REVOKE. Isso é um achado do arquivo versionado, não uma inspeção da configuração de qualquer projeto Supabase existente.

Prioridades por grupo:

- **Identidade e administração:** `profiles` — leitura mínima para autorização; alterações de papel/desativação por procedimento de provisionamento restrito.
- **Catálogos:** `supervisors`, `islands`, `negotiators`, `competitive_groups` — público só recebe os campos efetivamente publicados; manutenção por serviço autorizado.
- **Composição e metas:** `competitive_group_members`, `campaign_members`, `campaign_groups`, `campaign_group_members` — acesso de escrita por serviço; leituras públicas devem retornar ranking/agregados, não associação operacional irrestrita.
- **Campanha e ciclo:** `campaigns`, `campaign_cycles` — público lê somente campanha/ciclo visível; mutações de estado e anúncio passam por serviço transacional.
- **Produção e importação:** `production_entries`, `import_jobs` — sem acesso direto público; prévia, confirmação, idempotência, correções e relatórios protegidos.
- **Snapshot:** `champion_snapshots` — criação por fluxo de anúncio; publicação somente após autorização explícita; sem edição/exclusão por usuário comum.
- **Auditoria:** `audit_events` — escrita controlada pelo backend ou função privilegiada; leitura limitada e sem mutação por administradores comuns.

A matriz completa por tabela permanece em `docs/database-permission-matrix.md`.

## 6. Critérios de escolha

Escolher backend-only como arquitetura principal se:
- regras de negócio são compostas e transacionais;
- importações exigem prévia, idempotência, correção e auditoria;
- anúncio de campeão exige autorização explícita e snapshot;
- o projeto precisa de autorização centralizada por recurso e trilha de auditoria uniforme;
- a equipe quer evitar duplicar regras complexas em policies SQL e cliente.

Considerar acesso direto seletivo com RLS se:
- houver benefício concreto de leitura direta ou sincronização em tempo real;
- as tabelas e operações puderem ser expostas com escopo estreito;
- houver capacidade de manter e testar policies por tabela/operação;
- operações compostas e privilegiadas permanecerem encapsuladas em backend/RPC confiável;
- o acesso direto reduzir complexidade sem duplicar ou enfraquecer a autorização.

Não escolher apenas por reduzir número de endpoints ou linhas de código. A decisão deve priorizar risco, auditabilidade, simplicidade operacional e capacidade de provar negação por padrão.

## 7. Recomendação provisória

Para a primeira versão de Campanhas, usar **backend como caminho principal para todas as mutações e para consultas que envolvam dados operacionais ou autorização complexa**. Considerar acesso direto pelo cliente somente para leituras públicas bem delimitadas se houver vantagem concreta; mesmo nesse caso, definir views/projeções e RLS específicas antes de expor qualquer tabela.

Manter privilégios SQL mínimos, separar papel de runtime do papel de migrations e avaliar RLS como defesa adicional conforme o caminho de acesso. Se for usado um papel privilegiado que contorne RLS, documentar explicitamente essa exceção e exigir autorização no backend em todas as operações.

Essa recomendação não fecha a decisão de provedor de identidade, tenant, configuração Supabase ou primeiro administrador. Não autoriza criar um projeto remoto, conectar dados reais ou publicar.

## 8. Critérios de aceite antes de implementar

- [ ] Confirmar checkout local, branch e alterações locais sem sobrescrever arquivos.
- [ ] Decidir a arquitetura de sessão/autenticação e como o backend identifica perfil ativo.
- [ ] Definir papéis SQL de migrations e runtime, com privilégios mínimos documentados.
- [ ] Definir quais endpoints/projeções são públicos e quais tabelas não podem ser acessadas diretamente.
- [ ] Documentar policies/RLS por tabela caso qualquer cliente tenha acesso direto.
- [ ] Criar testes negativos de acesso anônimo, viewer, admin desativado, revogação, autoelevação e acesso cruzado a campanhas.
- [ ] Provar atomicidade de importação, auditoria e anúncio em ambiente descartável.
- [ ] Revisar logs, segredos, rotação e separação de ambientes.
- [ ] Executar validações somente após o usuário informar que está em casa e autorizar essa etapa.

## 9. Limites desta ação

A análise foi baseada nos arquivos remotos versionados. Não houve conexão com banco/Supabase, leitura de configuração efetiva de um projeto, execução de SQL, teste, typecheck, build ou instalação. Nenhuma migration foi alterada.

Próxima ação segura: revisar este comparativo com os contratos existentes e atualizar o registro de decisões com a recomendação provisória, sem implementar policies até o checkout local e a identidade estarem confirmados.
