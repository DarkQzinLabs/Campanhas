# Campanhas — matriz de permissões por tabela e lacunas de RLS

Status: especificação preventiva baseada em leitura remota de `supabase/migrations/0001_initial_schema.sql` e dos contratos de arquitetura em 19/10/2026. **Não é uma configuração aplicada, não comprova segurança operacional e não autoriza conectar dados reais.** Nenhuma migration foi alterada nesta ação.

## 1. Resumo executivo

A migration inicial declara 15 tabelas no schema `public`. Na versão inspecionada, não há instruções `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, `CREATE POLICY`, `GRANT` ou `REVOKE`. Portanto, esta leitura não encontrou uma camada RLS explícita nem uma matriz de privilégios SQL no arquivo. Isso não permite concluir como um projeto Supabase remoto estaria configurado fora desta migration; o estado efetivo de qualquer projeto exigiria inspeção autorizada de sua configuração.

Até que o modelo de acesso seja implementado e validado, não expor as tabelas diretamente a clientes anônimos ou autenticados. A alternativa de manter o banco acessível somente por um backend confiável também exige privilégios mínimos, credenciais exclusivamente no servidor e autorização por operação. RLS e autorização no servidor são camadas complementares quando houver acesso direto ao banco.

## 2. Papéis considerados

- **Público:** sem sessão, pode ler apenas campos explicitamente publicados para ranking e pódio.
- **Viewer:** perfil interno autenticado e ativo; não recebe escrita administrativa. A necessidade desse papel ainda está aberta.
- **Admin:** perfil interno autenticado e ativo; pode executar operações de negócio autorizadas no servidor, mas não deve poder autoelevar privilégios nem alterar/apagar auditoria.
- **Serviço de backend:** identidade técnica usada somente no servidor para operações estritamente necessárias. Não é um papel de usuário e suas credenciais nunca podem ser expostas ao navegador.
- **Provisionamento privilegiado:** procedimento controlado, separado da administração diária, para criar o primeiro admin e conceder/revogar papéis. Ainda não definido.

A matriz abaixo é uma **proposta de política**, não um reflexo de permissões existentes. “Sem acesso direto” significa que as operações passam pelo backend e pelos seus casos de uso autorizados; não significa conceder privilégios amplos a qualquer usuário autenticado.

## 3. Matriz de acesso proposta por tabela

| Tabela | Público anônimo | Viewer ativo | Admin ativo | Backend/provisionamento | Observações e lacunas |
|---|---|---|---|---|---|
| `profiles` | Sem acesso direto | Sem acesso direto; no máximo dados próprios mínimos por endpoint aprovado | Sem escrita direta; consultar o mínimo necessário pelo backend | Backend lê o perfil para autorizar; provisionamento controlado cria/altera/desativa perfis | Impedir autoelevação e alteração de `role`, `active`, `auth_subject`; definir vínculo de identidade e primeiro admin |
| `supervisors` | Sem acesso direto; público recebe apenas rótulos aprovados via API | Leitura limitada via API se necessária | CRUD via backend se necessário à operação | Backend aplica validação e auditoria | Nomes e associações podem ser dados operacionais; decidir quais campos são públicos |
| `islands` | Apenas nome/ordem/estado publicados via API | Leitura via API | CRUD via backend | Backend | Não conceder escrita direta só porque os nomes aparecem no ranking |
| `negotiators` | Somente nome/avatar/campos públicos aprovados via API | Leitura pública aprovada; dados internos limitados | CRUD via backend | Backend valida identificadores e associações | Minimizar dados pessoais; `external_key` e metadados de origem não devem ser públicos por padrão |
| `competitive_groups` | Apenas representação publicada no ranking | Leitura via API | CRUD via backend | Backend | Separar grupos competitivos de ilhas físicas; validar escopo de campanha e tipo |
| `competitive_group_members` | Sem acesso direto; apenas resultado agregado/publicado | Sem acesso direto por padrão | Consulta e manutenção via backend | Backend valida intervalos e registra mudanças | Evitar composição histórica ambígua, duplicidade e sobreposição de vigência |
| `campaigns` | Apenas campanhas publicáveis e campos aprovados via API | Leitura via API | CRUD via backend, condicionado ao estado | Backend com validação de transição | A tabela contém `visual_config`; validar esquema e não devolver configurações internas por acidente |
| `campaign_members` | Sem acesso direto; API publica apenas os resultados necessários | Sem acesso direto por padrão | Consulta/manutenção via backend | Backend valida metas, datas e vínculos | Metas e associação individual são dados operacionais; evitar exposição de metas não publicadas |
| `campaign_groups` | Somente nome/ordem e aparência publicados via API | Leitura via API | CRUD via backend | Backend | `visual_config` precisa validação; confirmar escopo de grupo por campanha |
| `campaign_group_members` | Sem acesso direto; apenas agregados publicados | Sem acesso direto por padrão | Consulta/manutenção via backend | Backend valida associação, período e campanha | Não há proteção SQL inspecionada contra períodos sobrepostos/associações ambíguas; regra de negócio pendente |
| `campaign_cycles` | Apenas ciclo e estado publicáveis; nunca revelar campeão antes da autorização | Leitura via API conforme regra de divulgação | CRUD/transições via backend; anúncio é ação explícita separada | Backend faz transição transacional e valida autor | CHECK atual correlaciona presença de timestamp/autor, mas não exige que status `champions_announced` corresponda aos metadados |
| `production_entries` | Sem acesso direto; apenas valores agregados/campos públicos calculados via API | Sem acesso direto por padrão | Consultar/corrigir/importar via backend com auditoria | Backend grava em transação, impõe idempotência e autoriza | Tabela sensível; chave de origem tem escopo ainda não aprovado; definir correções/estornos e acesso por ciclo |
| `champion_snapshots` | Somente snapshot publicado após divulgação autorizada, por API | Igual à regra de divulgação pública, salvo decisão explícita | Leitura via backend; criação apenas no fluxo de anúncio; sem UPDATE/DELETE | Backend cria snapshot e evento de auditoria atomicamente | Trigger bloqueia UPDATE/DELETE na migration, mas não substitui controle de leitura/escrita/identidade nem prova imutabilidade contra superusuário do banco |
| `import_jobs` | Sem acesso | Sem acesso direto por padrão | Criar/consultar/cancelar/confirmar via backend conforme estado e autoria | Backend valida dono, status, idempotência e transação | `error_report`, mapeamento e nomes de arquivos podem conter dados internos; não publicar nem aceitar alteração arbitrária de status |
| `audit_events` | Sem acesso | Sem acesso | Leitura restrita via backend somente quando necessário; sem UPDATE/DELETE | Backend escreve ator derivado da sessão; provisionamento/serviço restrito | Estrutura não define resultado/correlação em colunas próprias; proteger contra falsificação do ator, alteração e exclusão |

## 4. Regras transversais obrigatórias

1. **Negar por padrão.** Nenhum usuário ganha permissão porque está autenticado; cada operação precisa de uma autorização explícita.
2. **Não confiar no cliente.** Papel, perfil, ator, escopo de campanha, estado de importação e permissão não podem ser aceitos como verdade apenas porque vieram no corpo da requisição, URL, cookie não validado ou armazenamento local.
3. **Verificação server-side em toda operação protegida.** Revalidar perfil ativo, papel, escopo do recurso e estado atual para cada requisição; considerar revogação e concorrência.
4. **Menor privilégio no banco.** Definir papéis SQL e privilégios por tabela/operação. Se houver acesso direto pelo cliente, implementar RLS com políticas explícitas; não expor credencial privilegiada.
5. **Dados públicos por projeção.** O ranking público deve receber uma projeção específica de campos aprovados, não acesso geral às tabelas de produção, membros, importações, perfis ou auditoria.
6. **Operações críticas atômicas.** Confirmação de importação, alteração de produção, mudança de estado do ciclo e anúncio de campeão devem validar autorização/estado e gravar auditoria na mesma transação quando tecnicamente viável.
7. **Auditoria protegida.** O ator deve ser derivado da sessão validada no servidor; usuários administrativos comuns não podem inserir eventos em nome de terceiros nem alterar/apagar eventos existentes.
8. **Escopo de recurso.** Se houver mais de uma campanha ou futura separação por unidade/tenant, a autorização deve verificar o recurso específico. O escopo global de admin ainda é decisão aberta.
9. **Segredos apenas no servidor.** Nunca incluir chave de serviço Supabase, segredo OAuth, token ou credencial de banco no bundle público, logs ou repositório.
10. **Ambientes isolados.** Validar políticas com contas e dados sintéticos em ambiente descartável; não usar produção para testar negações de acesso.

## 5. Lacunas concretas observadas na migration

| Prioridade | Lacuna observada por leitura | Risco | Próximo passo documental/técnico |
|---|---|---|---|
| Crítica | Nenhuma declaração explícita de RLS/policies no arquivo inspecionado | Se houver acesso direto ao banco, o comportamento pode não corresponder à matriz proposta | Manter backend como caminho principal; avaliar acesso direto seletivo apenas com benefício concreto documentado, projeção mínima, RLS específica, GRANTs mínimos e validação de segurança, conforme DEC-09 |
| Alta | `profiles.role` e `profiles.active` existem, mas a migration não define quem pode alterá-los | Elevação de privilégio ou revogação ineficaz se a aplicação aceitar alterações indevidas | Definir fluxo de provisionamento, primeiro admin, revogação e bloqueio de autoelevação |
| Alta | `audit_events.actor_profile_id` é anulável e a migration não garante que o ator venha da identidade autenticada | Falsificação ou perda de rastreabilidade se o cliente puder inserir eventos | Restringir escrita ao backend e derivar o ator da sessão validada; decidir política para eventos anônimos/sistema |
| Alta | `production_entries`, `import_jobs` e `champion_snapshots` não têm policies no arquivo | Exposição ou mutação de dados operacionais, importações e campeões | Definir permissões por ação e garantir transação/idempotência |
| Alta | O ranking público não deve ler diretamente tabelas operacionais inteiras | Exposição de payload de origem, IDs internos, metadados de importação ou dados pessoais | Definir endpoint/projeção de leitura pública com lista de campos aprovada |
| Média | `audit_events` não declara colunas próprias para resultado/correlação/motivo | Auditoria incompleta ou inconsistente | Fechar o esquema de evento antes de alterar migration |
| Média | A migration não declara GRANT/REVOKE explícitos | Não é possível inferir a política SQL pretendida a partir desse arquivo | Definir roles e privilégios conforme o caminho de acesso escolhido; verificar configuração efetiva só com autorização apropriada |
| Média | O escopo de admin e a necessidade de papel `viewer` autenticado ainda estão em aberto | Permissões podem ficar amplas demais ou complexas sem necessidade | Fechar decisões de negócio antes de codificar policies |

## 6. Diretriz provisória de acesso (DEC-09)

**Status: provisória.** O backend é o caminho principal para mutações, operações críticas e consultas operacionais ou com autorização complexa. Isso não significa proibir toda exceção de acesso direto: uma leitura pública direta só pode ser considerada se houver benefício concreto documentado, projeção mínima de dados e RLS específica por tabela/operação/escopo, além de GRANTs mínimos e validação de segurança.

### Padrão — backend confiável como caminho principal

O navegador chama a API; o backend valida sessão, perfil ativo, autorização e dados, e acessa o banco com credencial de servidor de escopo mínimo. Vantagem: centraliza regras de domínio e autorização. Risco: qualquer endpoint sem verificação vira uma porta de acesso; ainda é necessário limitar privilégios SQL e proteger a credencial.

### Exceção condicionada — cliente acessa diretamente o Supabase

Só considerar para casos seletivos em que o benefício seja demonstrado. Exige RLS habilitada e policies explícitas em todas as tabelas acessíveis, GRANTs mínimos e testes de negação/escopo para anônimo, viewer, admin, usuário desativado e identidade inválida. Funções privilegiadas precisam de desenho separado. Não é seguro ativar policies genéricas baseadas apenas em “usuário autenticado”. Se não houver benefício claro, manter a operação pelo backend.

A escolha final de provedor, identidade, sessão e configuração Supabase continua pendente. Esta diretriz não autoriza conectar um projeto real nem implementar policies nesta fase. Consulte também `docs/decisions-and-open-questions.md` (DEC-09) e `docs/database-access-architecture-comparison.md`.

## 7. Plano de validação futura (não executado)

Após o usuário confirmar que está em casa e autorizar a validação local:
- revisar o estado do checkout e a branch antes de sincronizar;
- validar em banco descartável, sem credenciais/dados reais;
- provar leitura pública apenas dos campos aprovados;
- provar negação de escrita para anônimo e viewer;
- provar negação para admin desativado, tenant/identidade inválida e perfil revogado;
- provar que usuário não consegue alterar seu próprio papel nem editar/excluir auditoria;
- provar isolamento entre campanhas/recursos;
- provar que confirmação de importação e anúncio de campeão exigem autorização atual e deixam trilha auditável;
- guardar evidências de execução sem divulgar tokens, dados pessoais ou segredos.

Nenhum teste foi executado ao criar este documento.

## 8. Próxima ação segura

Fechar documentalmente a escolha de acesso ao banco e os papéis SQL necessários, sem escrever policies nem alterar migrations até que o clone local, a compatibilidade da arquitetura e as decisões de identidade sejam confirmados. Manter todas as mudanças na branch `docs/architecture-foundation`; não alterar `main` nem publicar em produção.
