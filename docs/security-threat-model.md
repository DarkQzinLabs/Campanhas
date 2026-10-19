# Campanhas — modelo de ameaças e matriz de acesso

Status: análise estática e proposta preventiva. Este documento não comprova que os controles estejam implementados, não substitui revisão especializada e não autoriza integração com dados reais ou publicação.

## 1. Objetivo e escopo

Identificar os principais ativos, limites de confiança e riscos de segurança a considerar antes de implementar ranking público, administração, importação de planilhas, identidade Microsoft e persistência.

Este documento complementa:
- `docs/application-foundation.md` — separação de camadas e contratos;
- `docs/import-safety-contract.md` — fluxo seguro de importação;
- `docs/data-model.md` — entidades e dados;
- `docs/decisions-and-open-questions.md` — decisões de negócio e achados estáticos.

A matriz abaixo é um requisito de projeto proposto, não uma descrição de funcionalidades existentes.

## 2. Ativos a proteger

| Ativo | Impacto se comprometido | Proteção esperada |
|---|---|---|
| Lançamentos de produção e metas | Ranking incorreto, perda de confiança e possível exposição de dados operacionais | Validação no servidor, autorização por operação, integridade transacional e trilha de auditoria |
| Identidade e sessão administrativa | Alteração indevida de campanhas, importações ou anúncios | Provedor de identidade validado, sessão segura e autorização em cada requisição |
| Chaves e credenciais de infraestrutura | Acesso indevido a banco, planilhas ou armazenamento | Segredos somente no servidor, escopo mínimo, rotação e separação por ambiente |
| Arquivos e prévias de importação | Vazamento, atribuição errada ou processamento de conteúdo malicioso | Armazenamento privado, limites de processamento, validação e retenção definida |
| Snapshots e anúncio de campeões | Alteração retroativa ou divulgação antecipada | Snapshot imutável, ação explícita autorizada e registro de autor/horário |
| Fotos, avatares e nomes | Uso indevido ou exposição desnecessária de dados pessoais | Fonte autorizada, minimização, controle de acesso e política de remoção |
| Logs e relatórios | Vazamento de informações ou falta de rastreabilidade | Minimização, acesso restrito, retenção definida e ausência de tokens/segredos |

## 3. Limites de confiança

1. **Navegador público → API:** toda entrada do cliente é não confiável; esconder botões não é controle de acesso.
2. **Navegador administrativo → API:** sessão válida não implica permissão para toda campanha ou operação. Revalidar autorização no servidor a cada requisição.
3. **API → banco:** aplicar validação de domínio, autorização e transações; não expor credenciais privilegiadas ao cliente. Projetar RLS/políticas antes de qualquer exposição direta do banco.
4. **Fonte externa → importador:** planilha, nome de arquivo, abas, células, fórmulas e metadados são conteúdo não confiável, mesmo quando a origem é conhecida.
5. **Provedor Microsoft → aplicação:** autenticação confirma identidade conforme o fluxo configurado, mas não decide sozinha quem é administrador. O mapeamento de papéis e o tenant autorizado ainda precisam ser definidos.
6. **Ambiente de desenvolvimento → dados reais:** manter credenciais, dados, URLs e permissões separados; não usar produção para validação.

## 4. Matriz de acesso proposta

| Recurso/operação | Público sem sessão | Usuário autenticado comum | Administrador autorizado |
|---|---|---|---|
| Consultar ranking publicado | Leitura dos campos aprovados | Leitura dos campos aprovados | Leitura dos campos aprovados |
| Consultar pódio não sigiloso | Conforme regra de divulgação da campanha | Conforme regra de divulgação da campanha | Conforme regra de divulgação da campanha |
| Ver campeão antes da divulgação autorizada | Não | Não | Somente por fluxo explícito e auditável, conforme regra aprovada |
| Criar/editar campanha, ciclo, metas ou composição | Não | Não | Sim, apenas dentro do escopo autorizado |
| Enviar arquivo e gerar prévia | Não | Não | Sim, com validação e limites |
| Confirmar/cancelar importação | Não | Não | Sim, após revalidar permissão e estado do trabalho |
| Alterar configurações visuais e imagens | Não | Não | Sim, com validação e origem/permissão de uso |
| Anunciar campeão | Não | Não | Sim, ação explícita, transacional e auditável |
| Ler logs operacionais ou dados pessoais não públicos | Não | Não por padrão | Apenas quando necessário e autorizado |

A função de usuário comum é incluída para deixar explícito que “autenticado” e “administrador” são papéis diferentes. Se o produto não tiver esse papel, ele poderá ser removido após decisão, sem ampliar permissões por padrão.

## 5. Requisitos mínimos de controle

### Identidade, sessão e autorização
- Definir tenant, fluxo de autenticação Microsoft/Entra ID, papéis administrativos, processo de concessão e revogação.
- Não confiar em domínio de e-mail, papel enviado pelo navegador, segredo embutido no frontend ou `localStorage`.
- Verificar autorização no servidor em todas as operações de leitura não pública e escrita, incluindo confirmação de importação e anúncio.
- Aplicar proteção CSRF/replay conforme o modelo de sessão escolhido; configurar cookies seguros quando aplicável, expiração e revogação.
- Evitar mensagens de erro que revelem se uma conta existe ou detalhes internos.

### API e dados
- Validar esquema, tipos, limites, referências e regras de negócio no servidor.
- Limitar tentativas e concorrência em operações sensíveis; tornar as mutações repetíveis com segurança quando aplicável.
- Usar transações para confirmar importações e criar snapshots; não responder sucesso antes do commit.
- Projetar autorização no banco/RLS antes de expor acesso direto. O esquema inspecionado atualmente não contém políticas RLS; isso é bloqueador, não controle presente.
- Evitar endpoints públicos que revelem produção individual, dados pessoais ou metadados internos além do necessário para a tela pública.

### Arquivos e conteúdo importado
- Usar armazenamento privado e URLs temporárias se houver necessidade de armazenar arquivos.
- Definir limites de tamanho, linhas, abas e tempo; validar o conteúdo real e tratar arquivos malformados.
- Escapar conteúdo exibido e nunca executar fórmulas, macros, HTML ou links importados.
- Não registrar planilhas completas nos logs. Definir prazo de retenção e exclusão antes de armazenar arquivos reais.

### Segredos, observabilidade e operação
- Manter segredos fora do repositório e do bundle cliente; usar variáveis/gestor de segredos do ambiente autorizado.
- Separar ambientes e credenciais de desenvolvimento, preview e produção.
- Separar, quando viável, a identidade de runtime da aplicação da identidade usada para migrations/DDL; credenciais de migração não devem ser carregadas pelo processo da aplicação. Se uma credencial de runtime contornar RLS, tratá-la como alto privilégio e exigir autorização server-side antes de cada operação.
- Registrar ator, ação, alvo, horário, resultado e identificador de correlação para alterações administrativas, sem gravar tokens ou dados pessoais desnecessários.
- Definir procedimento de rotação/revogação de credenciais e resposta a incidentes antes da operação real.

## 6. Riscos prioritários e tratamento

| Prioridade | Risco | Tratamento requerido antes de liberar a funcionalidade |
|---|---|---|
| Crítica | API ou banco permite escrita sem autorização efetiva | Implementar e testar autorização server-side; definir RLS/políticas ou justificar formalmente a arquitetura sem acesso direto |
| Alta | Papel administrativo inferido de e-mail ou dado do cliente | Definir concessão explícita de papel, tenant e revogação; verificar em cada operação |
| Alta | Importação duplicada, concorrente ou atribuída à pessoa errada | Fechar a chave de origem; impor idempotência no servidor/banco; usar prévia e transação |
| Alta | Campeão revelado ou snapshot alterado sem autorização | Separar cálculo, snapshot e divulgação; exigir operação explícita auditada e imutabilidade |
| Alta | Segredo ou planilha expostos em repositório, navegador ou logs | Revisar variáveis por ambiente, acesso ao armazenamento, logs e política de retenção |
| Média | Arquivo malformado ou conteúdo ativo afeta o serviço/interface | Limites, parser seguro, escape de saída e tratamento de falhas |
| Média | Alterações administrativas sem rastreabilidade | Auditoria de mutações, retenção e acesso restrito aos registros |

## 7. Evidências e validações necessárias

Antes de considerar controles implementados, reunir evidência de:
- matriz de papéis aprovada e casos de autorização negada;
- configuração de identidade e sessão sem segredos no cliente;
- políticas de banco/RLS revisadas e validadas em ambiente descartável;
- testes de abuso para autorização, CSRF/replay, concorrência e idempotência;
- importação de arquivos malformados, grandes, duplicados e ambíguos sem gravação silenciosa;
- proteção e imutabilidade dos snapshots e divulgação somente por ação autorizada;
- logs sem segredos, política de retenção e procedimento de revogação.

Nenhuma dessas validações foi executada ao escrever este documento. A inspeção é documental; não houve teste dinâmico.

## 8. Decisões ainda abertas

Este documento não decide por conta própria:
- quais pessoas/grupos serão administradores e quem pode conceder esse papel;
- qual tenant Microsoft será permitido e quais aprovações serão necessárias;
- quais dados individuais podem aparecer no ranking público;
- por quanto tempo manter arquivos de origem, logs, imagens e histórico;
- se haverá papéis adicionais além de público e administrador;
- quais controles serão aplicados no banco versus exclusivamente na camada de serviço.

Fechar essas decisões antes de conectar fonte de produção real ou publicar a aplicação.

## 9. Próxima ação segura

Continuar a inspeção estática e documentar contratos específicos sem implementar autenticação, endpoints ou alterações de banco até que o checkout local seja conferido e as decisões bloqueadoras sejam resolvidas. Não executar testes, typecheck, build ou instalação antes do aviso do usuário de que está em casa.
