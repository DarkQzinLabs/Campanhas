# Campanhas — contrato de autorização e auditoria

Status: contrato preventivo proposto com base em inspeção estática remota em 19/10/2026. **Não representa controles implementados, não fecha a escolha do provedor de identidade e não autoriza dados reais ou publicação.**

Este documento complementa `docs/security-threat-model.md`, `docs/application-foundation.md`, `docs/decisions-and-open-questions.md` e `supabase/migrations/0001_initial_schema.sql`.

## 1. Achados da inspeção remota

- A migration inicial prevê `profiles.auth_subject` único, `role` restrito a `admin` ou `viewer`, e `active` para habilitar/desabilitar um perfil.
- A migration contém `audit_events` com ator opcional, ação, tipo/ID da entidade, horário e `details` JSON.
- A migration inspecionada não apresenta políticas RLS nem regras que provem quem pode criar, promover, desativar ou editar perfis e eventos de auditoria.
- `auth_subject` é uma referência de identidade externa, mas o esquema não documenta ainda o formato canônico que será persistido nem o vínculo com tenant Microsoft.
- A tabela de auditoria não tem colunas explícitas para resultado, código de correlação, motivo da operação ou versão do esquema do evento; alguns desses valores poderiam caber em `details`, mas isso ainda não define um contrato verificável.
- A estrutura de aplicação documenta handlers de servidor e autorização por requisição como proposta. Os endpoints listados são planejados, não implementados.

Esses são achados da leitura dos arquivos remotos; não houve execução de SQL, testes, build, instalação ou alteração do banco.

## 2. Identidade: autenticação não é autorização

### Direção provisória

Microsoft Entra ID continua sendo o provedor preferido para avaliação, conforme a preferência do produto. Antes de implementar o fluxo, confirmar a disponibilidade do tenant e do registro de aplicação, os requisitos de consentimento e as permissões realmente concedidas. Não presumir que exista configuração ou aprovação administrativa.

A aplicação deverá:
1. validar no servidor a assinatura, emissor, audiência, validade temporal e demais claims relevantes do token/sessão;
2. restringir o tenant autorizado, quando o modelo de negócio for de tenant único;
3. mapear a identidade validada para um perfil interno por identificador estável e documentado; não usar nome de exibição como chave;
4. tratar autenticação válida apenas como prova de identidade, nunca como concessão automática de papel administrativo;
5. negar acesso por padrão se a identidade não estiver vinculada a perfil ativo ou se a verificação de autorização falhar.

O formato de `auth_subject` e o modelo de tenant devem ser decididos antes da primeira implementação. Não registrar tokens ou claims desnecessários nos logs.

## 3. Papéis e autorização

Matriz mínima proposta:

| Capacidade | Público anônimo | Perfil `viewer` ativo | Perfil `admin` ativo |
|---|---|---|---|
| Ler ranking publicado e campos públicos aprovados | Sim | Sim | Sim |
| Ler dados internos, prévias privadas ou relatórios de erro completos | Não | Não por padrão | Somente se necessário à operação e permitido |
| Criar/editar campanhas, ciclos, metas e composição | Não | Não | Sim, sujeito ao escopo e estado do recurso |
| Criar prévia, confirmar/cancelar importação | Não | Não | Sim, após revalidar estado e autorização |
| Anunciar campeões | Não | Não | Sim, por ação explícita, transacional e auditada |
| Conceder/remover papel administrativo | Não | Não | Não automaticamente; usar procedimento de provisionamento separado e controlado |
| Ler/exportar auditoria detalhada | Não | Não | Somente se houver necessidade operacional e autorização explícita |

A capacidade de administrar outros administradores deve ser separada da administração normal. Até existir um procedimento seguro e auditado de provisionamento, o sistema não deve oferecer autoelevação de papel pela interface.

### Regra obrigatória para cada operação

- Autorizar no servidor em cada requisição e para cada recurso; não confiar em botão oculto, rota não exibida, estado do cliente, `localStorage`, domínio de e-mail ou papel enviado pelo navegador.
- Aplicar princípio do menor privilégio e negar por padrão.
- Verificar estado `active` do perfil e permissão atual, inclusive em requisições já iniciadas quando houver risco de concorrência.
- Proteger operações mutáveis contra CSRF/replay conforme o mecanismo de sessão adotado.
- Retornar erro seguro e não expor dados protegidos em mensagens, logs ou respostas de falha.
- Não permitir que usuários comuns alterem `role`, `active`, `auth_subject` ou registros de auditoria.
- Definir a política de acesso no servidor e, se o banco puder ser acessado diretamente pelo cliente, implementar e validar RLS/policies antes de expor qualquer dado. Uma chave privilegiada nunca pode chegar ao navegador.

## 4. Concessão, alteração e revogação de acesso

O provisionamento de administradores deve ser um processo explícito, limitado e auditável. O contrato exige:
- identidade do solicitante e do aprovador, quando houver aprovação;
- identidade-alvo por identificador estável, papel anterior/novo e motivo;
- proteção contra autoelevação e contra alteração direta de perfil pelo usuário;
- registro do resultado da operação e tratamento de falhas parciais;
- procedimento de emergência para remover acesso sem depender da interface administrativa comprometida.

A desativação de um perfil (`active = false`) deve impedir novas operações protegidas assim que a mudança for efetiva. Definir como invalidar sessões e tokens ainda válidos, cache de autorização e tarefas em andamento. Não considerar apenas ocultar o usuário na UI como revogação.

O procedimento operacional de criação do primeiro administrador é uma decisão em aberto. Não embutir e-mail, senha, ID de usuário ou segredo de bootstrap no código ou em migrations.

## 5. Contrato de auditoria

### Eventos que exigem registro

No mínimo:
- concessão, alteração e revogação de papel/perfil;
- criação, edição, ativação/desativação e encerramento de campanhas/ciclos;
- alterações de metas, composição histórica e configurações visuais;
- upload, prévia, confirmação, cancelamento e falha de importação;
- correções de produção e tratamento de conflitos;
- anúncio de campeão e criação de snapshot;
- tentativas negadas em operações administrativas sensíveis, com volume controlado para evitar abuso de logs.

### Campos mínimos por evento

| Campo | Regra |
|---|---|
| Ator | Identificador interno estável, ou indicação explícita de ação anônima/sistema; não depender só de nome |
| Ação | Vocabulário controlado e estável, por exemplo `campaign.updated` ou `import.confirmed` |
| Alvo | Tipo e identificador da entidade, quando aplicável |
| Horário | Timestamp gerado pelo servidor/banco em UTC |
| Resultado | Sucesso, negado ou falha, com código seguro e sem segredos |
| Correlação | ID da requisição/operação para relacionar logs sem expor conteúdo sensível |
| Motivo | Obrigatório em operações excepcionais, correções manuais ou revogação emergencial, conforme política |
| Contexto mínimo | Alterações relevantes antes/depois ou campos alterados, minimizados e filtrados |

A estrutura atual de `audit_events` cobre apenas parte desses campos de forma explícita. Antes de alterar a migration, decidir se o contrato requer colunas dedicadas para resultado/correlação/motivo ou um esquema versionado em `details`. Evitar duplicar dados sensíveis em ambos.

### Integridade e acesso aos logs

- Usuários administrativos comuns não podem atualizar ou apagar eventos existentes.
- A escrita de auditoria deve ocorrer no servidor, com identidade do ator derivada da sessão validada, nunca do corpo da requisição.
- Para mutações críticas, a alteração de negócio e o evento de auditoria devem ser confirmados na mesma transação quando tecnicamente viável; falha de auditoria não pode passar silenciosamente como sucesso.
- Separar leitura de auditoria da capacidade de administrar campanhas e limitar exportações.
- Nunca registrar tokens, cookies, segredos, conteúdo completo de planilhas ou payloads pessoais sem necessidade aprovada.
- Definir retenção, acesso, exportação e descarte conforme requisitos internos e legais antes de usar dados reais.
- Se for necessária garantia forte contra adulteração por operadores com privilégios de banco, avaliar destino append-only ou armazenamento separado; uma tabela comum, isoladamente, não prova imutabilidade contra um administrador do banco.

## 6. Requisitos de banco e API antes de dados reais

- Definir políticas RLS e privilégios mínimos por tabela/ação, ou documentar por que o desenho impede acesso direto e como o servidor impõe autorização.
- Restringir operações sobre `profiles` e `audit_events` a serviços privilegiados do servidor com escopo mínimo.
- Impedir escrita de `actor_profile_id` arbitrário pelo cliente; derivar o ator do contexto de identidade validado.
- Validar o papel e o estado ativo no servidor em cada operação sensível, sem confiar exclusivamente em um claim antigo ou cache de longa duração.
- Assegurar que operações compostas (por exemplo, confirmar importação e anunciar campeão) revalidem permissão e estado do recurso no momento da transação.
- Criar testes negativos para anônimo, viewer, admin desativado, tenant inválido, usuário revogado, autoelevação, tentativa de editar auditoria e tentativa de acesso cruzado a recursos.
- Manter ambiente de teste isolado e sem credenciais/dados de produção.

## 7. Critérios de aceite futuros

A arquitetura de autorização/auditoria só poderá ser considerada pronta quando:
1. o fluxo de identidade, tenant e vínculo de perfil estiver documentado e configurado sem segredos no cliente;
2. houver um processo aprovado para provisionar e revogar administradores;
3. todas as operações protegidas verificarem autorização no servidor;
4. as políticas de banco/RLS estiverem implementadas e revisadas para o caminho real de acesso;
5. os eventos obrigatórios forem registrados com ator, ação, alvo, horário, resultado e correlação;
6. usuários comuns não puderem elevar privilégios nem alterar/apagar auditoria;
7. os testes negativos demonstrarem negação por padrão e revogação efetiva;
8. retenção, minimização e acesso à auditoria estiverem definidos;
9. as evidências forem registradas em ambiente isolado, após autorização para validação local.

## 8. Decisões ainda abertas

- Tenant Microsoft autorizado e disponibilidade de Entra ID para a organização.
- Identificador canônico a guardar em `auth_subject` e política para contas convidadas.
- Quem aprova o primeiro administrador e futuras concessões.
- Necessidade de papel `viewer` autenticado além do público.
- Escopo de administrador: global ou restrito a campanhas/ciclos.
- Campos finais e versionamento do evento de auditoria.
- Prazo de retenção, acesso a exportações e destino de logs resistentes a adulteração.
- Política de sessão e prazo máximo para que revogação invalide operações em andamento.

## 9. Próxima ação segura

Continuar a inspeção remota do esquema e das regras de acesso já existentes, sem alterar código de aplicação ou banco. Após confirmar o ambiente local e receber autorização para validações, converter este contrato em alterações pequenas, revisáveis e acompanhadas por testes negativos. Até lá, a proposta não deve ser descrita como implementada.
