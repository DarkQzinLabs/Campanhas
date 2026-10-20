# Campanhas — fundação executável e contratos entre camadas

Status: especificação técnica para implementação incremental. **Ainda não é prova de aplicação executável** e não autoriza implantação em produção.

## 1. Evidências do estado atual

Inspeção estática da branch docs/architecture-foundation em 19/10/2026:

- package.json declara apenas test, test:watch e typecheck; não declara scripts dev, build ou start. Dependências de desenvolvimento declaradas: TypeScript e Vitest.
- tsconfig.json usa modo estrito e inclui somente src/**/*.ts; arquivos TSX ainda não estão abrangidos.
- index.html existe, mas está vazio.
- Não foram encontrados vite.config.ts, src/main.tsx, src/App.tsx, configuração supabase/config.toml nem diretório de rotas de aplicação nos caminhos verificados.
- docs/architecture.md propõe Next.js + TypeScript, PostgreSQL gerenciado (Supabase como candidato), autenticação configurável e Microsoft Entra ID a avaliar.
- As funções puras de domínio em src/domain/ e a migration inicial devem ser preservadas e integradas, não reescritas sem necessidade.

Esta verificação foi feita por leitura do repositório remoto; não houve checkout local, instalação de dependências, build ou execução de testes.

## 2. Decisão de arquitetura proposta

Adotar **Next.js App Router + TypeScript** como direção inicial, alinhada à arquitetura já documentada. Usar PostgreSQL como modelo de persistência e manter Supabase como adaptador candidato, condicionado à validação de região, limites, segurança, custos e permissões. Microsoft Entra ID é o provedor preferido para avaliação, não uma dependência assumida como disponível.

A stack não deve ser considerada fechada nem executável até verificar o clone local, os arquivos não consultados, lockfile, versão de Node e compatibilidade das regras atuais. Não instalar ou atualizar dependências automaticamente antes dessa verificação.

## 3. Estrutura de diretórios-alvo

A estrutura é uma proposta incremental; diretórios só devem ser criados junto com código que tenha responsabilidade definida.

```text
src/
  app/
    (public)/
      page.tsx                 # ranking público, somente leitura
      podium/page.tsx          # pódio; sem anunciar campeão implicitamente
    admin/
      page.tsx                 # entrada da área administrativa
      campaigns/page.tsx       # gestão de campanhas/ciclos
      imports/page.tsx         # importação com prévia e relatório
    api/
      health/route.ts          # diagnóstico não sensível
      campaigns/route.ts       # leitura pública validada
      admin/
        campaigns/route.ts     # operações administrativas autorizadas
        imports/route.ts       # iniciar/consultar importações
        announcements/route.ts # anúncio explícito e snapshot
    components/
      ranking/
      podium/
      admin/
      shared/
    server/
      auth/                    # sessão e autorização no servidor
      repositories/            # persistência, sem regras de UI
      services/                # casos de uso e transações
      imports/                 # parsing, mapeamento e idempotência
      validation/              # schemas de entrada/saída
    domain/                    # regras puras já existentes
      metrics.ts
      ranking.ts
      team-ranking.ts
      podium.ts
  styles/
docs/
  architecture.md
  application-foundation.md
supabase/
  migrations/
  tests/
```

Não misturar lógica administrativa com componentes públicos. O cliente não deve importar módulos de servidor, chaves privilegiadas ou credenciais de banco.

## 4. Contratos entre camadas

### Interface → API

- A interface envia apenas dados necessários ao caso de uso; não envia papel administrativo confiável.
- Toda resposta usa JSON com formato previsível: sucesso com data; falha com error.code, mensagem segura e identificador de correlação quando disponível.
- Validar conteúdo, tamanho e tipos no servidor. Não expor stack traces, segredos ou dados pessoais desnecessários.
- A tela pública só recebe campos necessários para o ranking e não recebe capacidades de escrita.

### API → serviços de aplicação

- Handlers HTTP fazem autenticação, validação do request, chamada de caso de uso e tradução do resultado para status HTTP.
- Regras de negócio e transações ficam em serviços; handlers não calculam ranking nem decidem regras de campanha.
- Operações administrativas verificam sessão e permissão no servidor em cada requisição. Não confiar em domínio de e-mail, estado do navegador ou localStorage.
- Mutação sensível deve ser auditável e protegida contra repetição quando aplicável.

### Serviços → domínio

- Os módulos atuais de domínio permanecem puros e independentes de Next.js, HTTP, banco e provedor de identidade.
- Valores monetários são inteiros em centavos. Percentuais, empates, metas zero e regras de snapshot continuam centralizados no domínio.
- O serviço fornece entradas validadas ao domínio; persiste o resultado somente após validação das regras e autorização.
- O anúncio de campeão é uma ação administrativa explícita. A data final do ciclo não anuncia campeão automaticamente.
- O snapshot anunciado deve preservar classificação e métricas históricas; não pode ser alterado por edições posteriores.

### Serviços → repositórios/infraestrutura

- Serviços dependem de interfaces de repositório, não diretamente de detalhes de UI.
- A implementação de PostgreSQL deve respeitar constraints e transações; a autorização precisa ser aplicada no servidor e no banco conforme o desenho final.
- Nunca expor chave privilegiada do banco no bundle do navegador.
- Falhas de persistência não podem produzir confirmação falsa na interface.
- Importações devem começar em prévia, mostrar linhas válidas, duplicadas, ambíguas e rejeitadas, e só gravar após confirmação. A estratégia de idempotência depende da chave real confirmada da planilha.

## 5. Endpoints iniciais propostos

| Endpoint | Acesso | Responsabilidade |
|---|---|---|
| GET /api/health | Público, sem detalhes internos | Retornar estado mínimo da aplicação |
| GET /api/campaigns | Público | Listar campanhas publicáveis e ciclo visível |
| GET /api/campaigns/:id/rankings | Público | Entregar ranking calculado/validado sem poderes de escrita |
| GET /api/admin/campaigns | Administrador autenticado | Listar e administrar campanhas permitidas |
| POST /api/admin/imports/preview | Administrador autenticado | Validar arquivo e retornar prévia, sem persistir produção |
| POST /api/admin/imports/:id/confirm | Administrador autenticado | Confirmar uma prévia válida, com idempotência e transação |
| POST /api/admin/cycles/:id/announce | Administrador autenticado | Validar ciclo, gerar snapshot e registrar quem anunciou |

Os endpoints são contratos planejados, não rotas implementadas. Definir schemas e códigos HTTP detalhados junto da implementação de cada caso de uso; não criar todos os endpoints vazios apenas para aparentar completude.

## 6. Sequência segura de implementação

1. Confirmar no clone local a branch, estado do working tree, arquivos completos e lockfile; não alterar main.
2. Decidir a migração do pacote atual para Next.js com base na compatibilidade do domínio e dos arquivos existentes. Preservar Vitest e TypeScript estrito.
3. Introduzir os arquivos mínimos de Next.js, scripts dev/build/start, ajustes de TSConfig e dependências compatíveis, em uma alteração pequena.
4. Quando o usuário avisar que está em casa, instalar dependências e executar typecheck/build/testes, corrigindo problemas antes de ampliar a aplicação.
5. Fechar lacunas de integridade e acesso no banco antes de conectar dados reais.
6. Implementar identidade/autorização, repositórios e serviços.
7. Implementar importação com prévia e chave de idempotência confirmada com dados anonimizados.
8. Conectar ranking público, administração, ciclos, snapshots e pódio.
9. Revisar segurança, observabilidade, backups e fluxo de implantação antes de qualquer publicação autorizada.

## 7. Bloqueios e guardrails atuais

- **Bloqueio para criar uma aplicação executável nesta ação:** não foi possível verificar o clone local, lockfile e arquivos completos do protótipo. A migração para Next.js altera scripts, dependências, configuração TypeScript e forma de executar a aplicação; sem validar o estado local, o risco de sobrescrever ou quebrar trabalho existente não é suficientemente baixo.
- **Testes suspensos:** não executar Vitest, typecheck, build nem testes de banco até o usuário avisar que está em casa.
- **Sem credenciais fictícias:** não criar .env com valores de exemplo que possam parecer credenciais reais, nem incluir segredos no repositório.
- **Sem produção:** não publicar, configurar implantação ativa ou alterar main.
- **Conta e branch:** usar exclusivamente MatheusPassos07 e docs/architecture-foundation.

Próximo passo executável: após o usuário confirmar que o clone está acessível (ou fornecer acesso ao ambiente local), verificar estado e lockfile e então implementar a estrutura mínima em commit isolado. Até lá, esta especificação é o artefato reversível e verificável desta etapa.


## 8. Revisão cruzada F2 — alinhamento documental (20/10/2026)

Esta revisão compara `docs/architecture.md`, `docs/data-model.md`, `docs/decisions-and-open-questions.md`, os contratos de autorização/auditoria e importação, e os módulos de domínio consultados remotamente. É uma revisão estática; não altera o comportamento do sistema nem fecha decisões de negócio.

### Alinhamentos confirmados

- A direção de aplicação modular e backend como caminho principal é coerente entre arquitetura, fundação da aplicação e DEC-09; provedores e infraestrutura continuam provisórios.
- Microsoft Entra ID, PostgreSQL/Supabase e Vercel continuam opções a avaliar, não integrações aprovadas ou disponíveis.
- A importação exige prévia, confirmação explícita, autorização no servidor e idempotência definida a partir da fonte real; a chave e as regras de correção/estorno continuam pendentes.
- O anúncio de campeões é explícito, autorizado e auditável; fim de ciclo, por si só, não deve divulgar campeão.
- Ilha física e agrupamento competitivo são conceitos diferentes; a composição histórica deve ser preservada.
- A ausência de políticas RLS/GRANT/REVOKE na migration inspecionada continua bloqueadora para exposição direta do banco. Esta constatação descreve somente o arquivo versionado, não o estado de um banco remoto.

### Lacunas de contrato a resolver antes de implementar os fluxos correspondentes

| ID de acompanhamento | Divergência ou lacuna observada | Encaminhamento seguro |
|---|---|---|
| F2-DOM-01 | A arquitetura e o modelo usam `individual`, `squads` e `campaign_teams`, mas o modelo também define `competitive_groups.group_type = team | campaign_group` e uma entidade separada `campaign_groups`. O código de pódio aplica limites distintos por `squads` e `campaign_teams`; a correspondência exata com “equipe” e “time/ilha” não está formalmente definida. | Registrar um glossário canônico: entidade, finalidade, relação com ilha física, escopo por campanha e categoria de ranking. Não renomear tabelas/tipos nem alterar limites sem decisão de domínio. |
| F2-DOM-02 | `createChampionSnapshot()` usa `RankingEntry`, cuja identidade é `negotiatorId`; `buildTeamRanking()` devolve `TeamRankingEntry`, identificado por `teamId`. Assim, o contrato tipado do snapshot não representa diretamente um ranking agregado por equipe/time. | Definir uma união discriminada de entradas de snapshot ou contratos específicos por categoria, incluindo o identificador e nome corretos para cada tipo. Validar a escolha antes de implementação; não alterar o código nesta revisão. |
| F2-DOM-03 | `RankingEntry` guarda produção realizada e percentual, mas não a meta usada no cálculo; o modelo de dados descreve snapshots com métricas/valores calculados e a arquitetura exige preservar métricas históricas. | Decidir quais valores-base e métricas calculadas são congelados no snapshot para auditoria/reconciliação, sem depender dos dados correntes. |
| F2-DOM-04 | O modelo lista estados de campanha `draft/active/inactive/ended` e estados de ciclo `planned/active/closed/champions_announced`, mas a transição permitida entre encerramento do ciclo, anúncio e continuidade em novo ciclo não está definida como máquina de estados completa. | Documentar transições válidas, pré-condições, reabertura/continuidade e invariantes transacionais; não inferir anúncio automático nem permitir estados contraditórios. |
| F2-DOM-05 | A função de snapshot verifica posições positivas e não repetidas, mas a inspeção estática já registrou que não exige sequência contínua/ordem crescente; também não reconcilia percentual com meta e produção. O pódio, por sua vez, pressupõe ranking previamente ordenado. | Definir o contrato de entrada do anúncio e a camada responsável pela validação final, incluindo consistência dos valores, ordem/posições e dados provenientes do servidor. |
| F2-SEC-01 | O contrato de auditoria pede resultado, correlação e motivo em eventos relevantes, enquanto a migration atual tem ator/ação/alvo/horário/details sem campos dedicados para todos esses elementos. A própria especificação deixa em aberto usar colunas dedicadas ou esquema versionado em `details`. | Manter a decisão em aberto e resolvê-la antes de implementar auditoria persistente; não modificar migration nesta fase. |
| F2-DATA-01 | O índice atual de origem usa `(source_system, external_key)` quando a chave não é nula, mas a semântica e o escopo dessa chave, além de correções/estornos, ainda dependem de amostras anonimizadas e decisão de negócio. | Não afirmar idempotência completa nem habilitar importação real até fechar a chave e o tratamento de reenvios/correções. |

### Limites desta revisão

- Não foram alterados código, tipos de domínio, rotas, telas, dependências ou migrations.
- Não foram executados testes, typecheck, build, instalação, SQL ou validação local.
- Esta tabela é um registro documental de lacunas, não uma aprovação de arquitetura final. Os itens permanecem abertos até decisão explícita e validação posterior.
