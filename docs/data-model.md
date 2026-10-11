# Campanhas — modelo de dados inicial

Status: desenho conceitual. Os tipos/constraints definitivos devem ser validados antes de uma migração de banco.

## Convenções
- Chaves primárias UUID.
- Datas de evento armazenadas com fuso definido; usar timestamps UTC para auditoria.
- Valores monetários/produção armazenados em centavos inteiros (`BIGINT` no PostgreSQL e inteiros seguros no domínio TypeScript); formatar para moeda apenas na apresentação.
- Registros históricos são preservados; usar status/arquivamento em vez de exclusão destrutiva.
- Toda entidade mutável relevante deve ter created_at e updated_at; operações administrativas críticas devem gerar auditoria.

## Entidades

### profiles
- id (UUID, chave ligada à identidade do provedor)
- display_name
- role: admin | viewer
- active
- created_at, updated_at

### negotiators
- id
- external_key (identificador estável da origem, quando existir)
- name
- supervisor_id (opcional)
- island_id (opcional)
- active
- created_at, updated_at

### supervisors
- id
- name
- active
- created_at, updated_at

### islands
- id
- name
- sort_order
- active

### competitive_groups
- id
- name
- group_type (team | campaign_group)
- active

### competitive_group_members
- group_id
- negotiator_id
- valid_from, valid_to (opcionais para manter histórico de composição)
- chave única apropriada para associação vigente

### campaigns
- id
- name
- description
- ranking_type (individual | squads | campaign_teams)
- status (draft | active | inactive | ended)
- visual_config (JSON validado por esquema)
- created_by
- created_at, updated_at

### campaign_members
- campaign_id
- negotiator_id
- target_cents (BIGINT >= 0)
- included_from, included_to (opcionais)
- chave única campaign_id + negotiator_id

### campaign_groups
- id
- campaign_id
- name
- sort_order
- visual_config (JSON validado)
- active

### campaign_group_members
- campaign_id
- group_id
- negotiator_id
- valid_from, valid_to
- constraints compostas garantem que o grupo pertence à campanha e que o negociador está incluído nessa mesma campanha
- preservar composição usada em ciclos antigos por snapshot

### campaign_cycles
- id
- campaign_id
- name/label
- starts_at
- ends_at
- status (planned | active | closed | champions_announced)
- champions_announced_at (nulo até ação manual)
- announced_by (nulo até ação manual)
- created_at
- regra: no máximo um ciclo ativo por campanha, se essa for a regra operacional confirmada

### production_entries
- id
- negotiator_id
- campaign_id (opcional se a origem for geral)
- cycle_id (opcional conforme a origem dos dados)
- source_system (identifica o sistema de origem)
- external_key (ID estável do registro de origem, quando disponível)
- occurred_at
- amount_cents (BIGINT >= 0)
- source_import_id (opcional)
- source_payload (JSON restrito/opcional para rastreabilidade, sem segredos)
- created_at, updated_at

### champion_snapshots
- id
- campaign_id
- cycle_id
- announced_at
- announced_by
- ranking_type
- snapshot_payload (JSON com classificação e valores já calculados)
- immutable after creation

### import_jobs
- id
- source_name
- file_name
- status (uploaded | previewed | processing | completed | failed | cancelled)
- column_mapping (JSON)
- row_count, accepted_count, rejected_count
- error_report (JSON)
- created_by
- created_at, completed_at

### audit_events
- id
- actor_profile_id
- action
- entity_type
- entity_id
- occurred_at
- details (JSON minimizado; não registrar segredos)

## Relações e regras
- Uma campanha possui vários ciclos; cada ciclo pertence a uma campanha.
- O snapshot de campeão pertence a um ciclo e é criado apenas por ação autorizada.
- Metas pertencem à associação de negociador à campanha, não ao negociador global.
- Ilha representa posição física; grupo competitivo representa agrupamento para disputa. Não misturar os conceitos.
- Produção deve ter chave idempotente para impedir duplicação ao reimportar o mesmo registro.
- Corrigir/importar produção deve guardar origem e auditoria. Definir se correções serão versionadas ou registradas como eventos antes da implementação.
- Não usar nome como chave única de negociador; homônimos e variações de grafia são possíveis.

## Índices/constraints a planejar
- Índices em campaign_id/cycle_id/negotiator_id/occurred_at.
- CHECK amount_cents >= 0 e target_cents >= 0, salvo se o negócio confirmar estornos negativos.
- Constraints para estados válidos e relações coerentes.
- A migração inicial aplica unicidade parcial em `(source_system, external_key)` quando `external_key` não é nula; confirmar o escopo real da chave com amostras da origem antes de importar dados reais.
- Políticas de acesso para impedir edição por viewer e leitura não autorizada de dados sensíveis.

## Questões para validar com amostras de dados
- Qual é a chave única real de processo/pagamento?
- Um lançamento pode pertencer a mais de uma campanha/ciclo?
- Há estornos, cancelamentos ou pagamentos negativos?
- Metas mudam dentro de uma quinzena?
- Os registros históricos são atualizados na fonte ou chegam como eventos novos?
