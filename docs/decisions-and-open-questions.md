# Campanhas — registro de decisões e pendências

Status: documento de trabalho para orientar a fundação. Não substitui validação do negócio, revisão de segurança nem homologação. Nenhuma decisão abaixo autoriza implantação ou uso de dados reais.

## 1. Decisões de trabalho já estabelecidas

| Tema | Diretriz atual | Limite / condição |
|---|---|---|
| Branch de trabalho | `docs/architecture-foundation` | Não alterar `main`; não publicar em produção. |
| Conta GitHub | `MatheusPassos07` | Não alternar para a conta corporativa. |
| Fase atual | Inspeção remota e documentação reversível | Não executar testes, typecheck, build ou instalar dependências até o usuário avisar que está em casa. |
| Segurança administrativa | Autenticação e autorização verificadas no servidor | Não confiar em senha no cliente, `localStorage` ou controles apenas visuais. |
| Importação | Prévia antes de qualquer gravação | Mostrar válidos, duplicados, ambíguos e rejeitados; permitir cancelar e registrar resultado. |
| Ranking anunciado | Snapshot histórico imutável | Anúncio de campeão depende de ação autorizada; não revelar automaticamente durante campanha ativa. |
| Dados de demonstração | Não misturar com dados reais | Não gerar números aleatórios automaticamente em ambiente operacional. |

## 2. Direções técnicas provisórias

Estas são propostas de arquitetura, não escolhas irreversíveis já aprovadas:

- **Aplicação web:** Next.js + TypeScript é a direção documentada para uma aplicação modular, mas a estrutura final depende da inspeção do checkout local, do manifesto de pacotes e de arquivos não rastreados.
- **Persistência:** PostgreSQL é o modelo relacional em avaliação; Supabase é apenas candidato de hospedagem/serviços, ainda sem autorização para conexão a projeto real.
- **Identidade:** login Microsoft/Entra ID é preferência do produto, mas o fluxo, o tenant, os requisitos administrativos e a estratégia de autorização ainda precisam ser confirmados tecnicamente.
- **Fonte de produção:** planilha Excel na nuvem é a preferência inicial. OneDrive pessoal é o contexto atual; SharePoint corporativo depende de acesso/aprovação que não está disponível. Banco de dados continua como alternativa, com edição administrativa dentro do próprio sistema.
- **Compatibilidade de planilhas:** procurar um fluxo de seleção, mapeamento e prévia flexível; “qualquer planilha” não deve ser prometido sem limites, regras de mapeamento e amostras reais anonimizadas.

## 3. Pendências que bloqueiam decisões de implementação

| ID | Pendência | Por que importa | Evidência necessária para fechar |
|---|---|---|---|
| DEC-01 | Fonte oficial e acesso à planilha | Define integração, permissões, atualização e disponibilidade do ranking | Identificar arquivo/armazenamento permitido e como a aplicação poderá acessá-lo sem credenciais compartilhadas |
| DEC-02 | Chave única de produção | Evita duplicar lançamentos em reimportações | Amostra anonimizada e identificação do campo ou combinação de campos realmente única |
| DEC-03 | Semântica de correções e estornos | O esquema inicial restringe `amount_cents >= 0`; estornos podem exigir outra modelagem | Confirmar se há estornos, cancelamentos, correções ou eventos repetidos |
| DEC-04 | Regra temporal de campanhas/ciclos | Impacta elegibilidade, metas, datas e anúncio de campeões | Confirmar se metas mudam durante a quinzena e se pode existir mais de um ciclo ativo por campanha |
| DEC-05 | Identidade administrativa | A preferência Microsoft não define por si só quem será admin | Definir como administradores são autorizados e como revogar acesso |
| DEC-06 | Composição histórica de equipes | Afeta rankings históricos quando pessoas mudam de ilha/equipe | Confirmar se o ranking passado preserva a composição do período ou usa a composição atual |
| DEC-07 | Fonte e autorização de imagens | Fotos de equipes e avatares podem conter dados pessoais | Definir origem, permissões de uso, formato e política de remoção |
| DEC-08 | Política de retenção e auditoria | Produção e snapshots podem ter valor operacional/histórico | Definir prazo de retenção, acesso aos eventos e procedimento de correção auditável |

## 4. Riscos técnicos já identificados por inspeção estática

1. **Autorização:** o protótipo anterior continha senha administrativa no JavaScript e estado de sessão em `localStorage`. Tratar esses mecanismos como inseguros; não reutilizar a senha.
2. **Dados locais:** o protótipo guardava dados no navegador e podia criar valores aleatórios quando não havia estado válido. Não migrar automaticamente nem interpretar dados de demonstração como oficiais.
3. **Importação:** correspondência aproximada por nome pode atribuir produção à pessoa errada. Identificadores estáveis e revisão explícita são necessários.
4. **Idempotência:** o índice parcial inicial em `(source_system, external_key)` não define ainda o escopo real da chave de origem; não basta presumir que toda importação repetida será segura.
5. **Banco:** a migration inicial é descrita como migration de execução única; há uma restrição adicionada sem guarda de existência. Não a reaplicar manualmente em banco já migrado.
6. **Autorização de banco:** políticas RLS e autorização completa ainda são bloqueadores antes de expor dados por API.
7. **Validação local:** o ambiente desta conversa não consegue acessar `C:\Projetos`; por isso, estado do checkout, arquivos locais não rastreados, lockfile e compatibilidade real ainda não foram confirmados.

Os pontos acima são achados/restrições da inspeção remota existente, não resultados de testes dinâmicos. Nenhum teste, typecheck, build ou instalação foi executado nesta etapa.

## 5. Portões de segurança antes de avançar para implementação

- [ ] Usuário informa que está em casa; só então reconsiderar validação local.
- [ ] Inspecionar estado do checkout e preservar alterações locais antes de qualquer sincronização.
- [ ] Conferir branch, commit local/remoto e lockfile; não sobrescrever trabalho local.
- [ ] Definir como executar validações apenas em ambiente isolado e sem credenciais de produção.
- [ ] Resolver os bloqueios de autorização, chave idempotente e fonte de dados antes de integrar produção real.
- [ ] Validar a migration em banco descartável antes de considerar qualquer ambiente compartilhado.
- [ ] Obter revisão/autorização explícita antes de publicação; não publicar nesta fase.

## 6. Próxima ação segura

Continuar a inspeção remota de contratos de domínio, regras de integridade e documentação de importação. Manter qualquer correção de código como proposta até que o checkout local seja conferido. Nenhum teste ou comando de instalação deve ser executado antes do aviso do usuário de que está em casa.


## 7. Achados adicionais da inspeção estática do domínio

Arquivos lidos remotamente nesta etapa: `src/domain/metrics.ts`, `src/domain/ranking.ts`, `src/domain/team-ranking.ts`, `src/domain/podium.ts` e os respectivos arquivos de teste existentes. Os testes foram apenas lidos; não foram executados.

| Prioridade | Achado estático | Risco / encaminhamento |
|---|---|---|
| Média | `calculateCampaignMetrics()` rejeita IDs vazios após `trim()`, mas detecta duplicidade e cruza produção/meta usando o ID original, sem normalização uniforme. | IDs como `"neg-1"` e `" neg-1 "` podem passar como chaves diferentes em métricas. Padronizar o contrato de IDs (normalizar antes de validar/comparar ou exigir IDs canônicos e rejeitar espaços externos). |
| Média | `createChampionSnapshot()` valida ID não vazio com `trim()`, mas guarda e compara o valor original para detectar duplicatas. | Variantes de ID com espaços podem aparecer como entradas distintas no snapshot. Definir e aplicar a mesma regra de identidade usada pelo ranking. |
| Média | A função de snapshot valida posição positiva e ausência de posições repetidas, mas não exige sequência contínua nem ordem crescente. | Um snapshot com posições 1 e 3, ou com entradas fora da ordem de posição, pode ser aceito. Decidir se o contrato exige ranking ordenado e posições contíguas antes do anúncio. |
| Média | O snapshot valida `percentage` como finito e não negativo, mas não exige consistência com meta/produção nem limita o valor a um intervalo. | Pode congelar percentual divergente dos valores de origem. Definir se o snapshot deve receber somente ranking calculado e validado pelo servidor, ou incluir os dados-base necessários para reconciliação. |
| Baixa | `selectPodiumEntries()` corta a lista pela categoria e pressupõe que ela já esteja ordenada; não valida ordem, duplicidade ou posições. | A camada de aplicação deve fornecer ranking já validado, sem tratar essa função de apresentação como barreira de integridade ou autorização. |
| Baixa | Os testes lidos cobrem muitos casos negativos e desempates, mas não isolam todos os casos mencionados nos achados acima. | Acrescentar casos de regressão depois que o checkout local estiver confirmado e quando o usuário autorizar a fase de validação. |

### Escopo e cautela

Esses são achados por leitura de código remoto, não confirmação de defeitos em execução. Não alterei os arquivos de domínio nesta etapa porque a mudança pode afetar contratos de dados e resultados históricos; primeiro deve ser definido o contrato canônico de identificadores e snapshot. Nenhum teste, typecheck, build ou instalação foi executado.


## 8. Achados adicionais da inspeção estática do esquema SQL

Arquivos lidos remotamente: `supabase/migrations/0001_initial_schema.sql`, `supabase/tests/negative_integrity.sql`, `docs/data-model.md` e `docs/migration-and-testing.md`. O SQL de teste foi lido, não executado.

| Prioridade | Achado estático | Risco / encaminhamento |
|---|---|---|
| Alta | A migration inicial não define políticas RLS nem habilita RLS nas tabelas. | Não expor diretamente as tabelas a clientes autenticados/anônimos. Antes de qualquer API conectada ao banco, desenhar e validar autorização por papel, campanha e operação. |
| Alta | A FK composta de `production_entries(cycle_id, campaign_id)` não exige que ambos os campos sejam preenchidos juntos. Em PostgreSQL, uma FK composta padrão não rejeita o caso em que um dos campos é nulo. | O caso `cycle_id` preenchido e `campaign_id` nulo pode escapar da validação da relação. A regra esperada está documentada como pendente e o teste negativo 10 declara que deverá falhar até haver CHECK apropriado. |
| Alta | `campaign_cycles` permite status `champions_announced` sem metadados de anúncio: o CHECK atual apenas exige que timestamp e autor sejam ambos nulos ou ambos preenchidos. | Relacionar status e metadados na constraint ou numa transição transacional autorizada. O teste negativo 11 já descreve a lacuna esperada. |
| Média | `campaign_group_members` referencia um grupo de campanha e um negociador, mas não inclui chave/constraint temporal que impeça associações duplicadas ou períodos de validade sobrepostos. | A composição pode ficar ambígua ao reconstruir ranking histórico. Definir se a associação é versionada por intervalos e qual regra impede sobreposição. |
| Média | `competitive_group_members` e `campaign_group_members` verificam apenas que `valid_to >= valid_from` quando ambas as datas existem. Não há constraint de unicidade ou exclusão para intervalos concorrentes. | A aplicação precisará de uma regra explícita para evitar que a mesma pessoa pertença simultaneamente a composições incompatíveis, se isso for proibido pelo negócio. |
| Média | O índice de idempotência é global por `(source_system, external_key)` e ignora chaves nulas; `source_system` e `external_key` não têm normalização ou regra de conteúdo não vazio. | A chave pode ser restritiva demais se IDs se repetirem por campanha/conta, ou insuficiente se a origem não garantir unicidade. Definir escopo com amostra real anonimizada antes de mudar o índice. |
| Média | `import_jobs` registra contagens e status, mas o esquema não contém hash do arquivo, token idempotente da operação ou restrição que impeça reprocessamento concorrente do mesmo trabalho. | O serviço de importação precisa de transição de status atômica, idempotência e bloqueio contra repetição; o modelo pode precisar de campos adicionais após definição do fluxo. |
| Média | `production_entries.amount_cents` aceita zero e valores não negativos, mas não modela explicitamente estorno/cancelamento ou correção. | Confirmar a semântica comercial antes de manter essa regra como definitiva; não adicionar sinal negativo sem decisão do negócio. |
| Baixa | A migration cria tabelas com `IF NOT EXISTS`, mas o `ALTER TABLE ... ADD CONSTRAINT production_entries_source_import_fk` não é protegido por guarda de existência. | A migration não é idempotente como script de reaplicação. Tratar como migration versionada de execução única e usar histórico de migrations; não reaplicar manualmente. |

### Leitura dos testes SQL já escritos

O arquivo `supabase/tests/negative_integrity.sql` já inclui cenários para compatibilidade campanha/ciclo, imutabilidade de snapshots, valores negativos e duplicidade da chave de origem. Os casos 10 e 11 registram expressamente duas lacunas do esquema atual. O caso 3 reconhece que a tabela de associação de membros não permite verificar compatibilidade grupo/campanha porque não armazena `campaign_id` nessa associação.

A existência desses cenários não significa que foram aprovados: não foram executados nesta fase. Não alterei a migration nem os testes SQL, pois a solução correta depende das regras de composição histórica, estornos e idempotência ainda pendentes. Antes de qualquer integração real, o banco deve ser validado em ambiente descartável e a autorização precisa ser projetada explicitamente.

## 9. DEC-09 — Caminho de acesso ao banco (provisória)

**Status:** provisória; sujeita a revisão após definição do provedor, autenticação, modelo de autorização e fluxos reais de leitura/escrita. Este registro não autoriza conexão com banco real nem implementação.

**Diretriz provisória**
- Usar o backend como caminho principal para mutações e operações críticas: importação e confirmação de produção, cálculo/fechamento de ranking, criação de snapshots, anúncio de campeões, alterações administrativas e gravação de auditoria.
- O backend deve autenticar a identidade, autorizar cada operação no servidor, validar regras de domínio e executar mudanças relacionadas em transações quando necessário. Segredos privilegiados do banco nunca devem ser enviados ao cliente.
- Considerar acesso direto do cliente ao banco/Supabase somente para casos seletivos em que exista benefício concreto e documentado (por exemplo, uma leitura pública estritamente limitada), e apenas depois de definir e validar políticas RLS específicas para a tabela, operação, papel e escopo de dados. RLS não substitui validação de domínio nem autoriza automaticamente operações críticas.
- Se não houver benefício claro demonstrável, manter o acesso pelo backend. A decisão final sobre provedor e desenho híbrido permanece em aberto.

**Consequências esperadas**
1. Centraliza validações de negócio, autorização, auditoria, idempotência e tratamento consistente de erros no servidor.
2. Exige uma camada backend bem definida, proteção de credenciais, gestão de sessões/identidade e testes de autorização antes de operar com dados reais.
3. Pode adicionar latência e trabalho de implementação em comparação com chamadas diretas do cliente; endpoints devem ser estreitos, paginados quando aplicável e limitados ao necessário.
4. Acesso direto seletivo, se aprovado depois, exige contratos de leitura explícitos, privilégios mínimos e políticas RLS revisadas; não deve expor tabelas ou colunas administrativas por conveniência.
5. A arquitetura deve continuar separando interfaces públicas e administrativas, sem confiar em controles visuais como barreira de segurança.

**Privilégios mínimos e controles obrigatórios**
- A identidade usada pelo backend deve receber somente os privilégios SQL necessários às operações previstas; evitar privilégios amplos de proprietário/superusuário e não usar credenciais administrativas privilegiadas em código cliente.
- Separar, quando viável, identidades/credenciais de migração e de execução da aplicação; credenciais de migração não devem ser usadas em runtime.
- Para qualquer acesso direto do cliente, habilitar RLS nas tabelas expostas e definir políticas específicas por operação e papel, com escopo de campanha/registro quando aplicável; revisar também privilégios SQL de concessão/revogação, views e funções expostas.
- Tratar a ausência de RLS/políticas na migration atualmente inspecionada como bloqueio para expor diretamente suas tabelas; esta observação descreve os arquivos versionados, não o estado de um projeto Supabase remoto.
- Registrar ator, operação, resultado e contexto suficiente para auditoria sem armazenar segredos ou dados desnecessários; definir tratamento para falhas e tentativas negadas.

**Riscos principais**
- **Acesso excessivo:** privilégios amplos ou credenciais privilegiadas no cliente podem permitir leitura ou alteração não autorizada.
- **Políticas RLS incompletas:** uma política genérica, permissiva ou sem escopo pode expor dados entre campanhas ou permitir elevação de privilégios.
- **Autorização duplicada/inconsistente:** regras diferentes no frontend, backend e banco podem produzir resultados divergentes; a decisão de acesso deve ser aplicada no servidor e, em caminhos diretos, também no banco.
- **Confiança indevida em RLS:** políticas de linha não substituem validações de domínio, transações, idempotência, auditoria ou proteção de segredos.
- **Concentração no backend:** falha, indisponibilidade ou defeito de autorização no backend pode afetar todas as operações; reduzir o risco com endpoints mínimos, revisão e observabilidade.
- **Exposição de dados de ranking:** endpoints e views públicas devem revelar apenas os campos necessários, sem perfis, dados de auditoria ou metadados administrativos.

**Pendências antes da decisão definitiva**
- [ ] Confirmar provedor de banco/serviços e se Supabase será efetivamente adotado.
- [ ] Definir o provedor de identidade Microsoft/Entra ID, os requisitos de sessão e o processo de provisionamento/revogação de administradores.
- [ ] Definir o primeiro administrador e impedir autoelevação de papel por usuário comum.
- [ ] Classificar operações e dados em públicos, autenticados e administrativos; especificar endpoints/contratos necessários.
- [ ] Produzir matriz final de papéis × operações × tabelas/colunas e revisar privilégios SQL de execução.
- [ ] Se houver acesso direto, escrever políticas RLS específicas, revisar views/funções e testar casos positivos e negativos em ambiente descartável.
- [ ] Definir estratégia de transações, idempotência e auditoria para importações, fechamento de ciclos e snapshots.
- [ ] Validar arquitetura e permissões em revisão de segurança antes de qualquer conexão com dados reais.

**Critérios para reconsiderar**
A decisão pode mudar se uma necessidade concreta de acesso direto for demonstrada, o conjunto de dados exposto for mínimo, as políticas RLS e privilégios forem verificáveis e testados, e houver evidência de que a abordagem melhora a solução sem enfraquecer a autorização ou a auditoria. Até lá, backend-first permanece uma orientação provisória, não uma aprovação final.
