# Campanhas — contrato de ciclo de campanha e anúncio

Status: contrato proposto a partir da leitura estática da arquitetura, modelo de dados, domínio e migration. Não representa fluxo implementado nem autoriza alteração do banco ou publicação.

## 1. Objetivo

Definir fronteiras entre campanha, ciclo operacional, cálculo do ranking, snapshot histórico e divulgação de campeões. O objetivo é impedir que o encerramento de um período revele automaticamente um campeão, que um snapshot histórico seja refeito por mudanças posteriores ou que duas operações administrativas concorrentes produzam estados inconsistentes.

Documentos relacionados:
- `docs/architecture.md`
- `docs/application-foundation.md`
- `docs/data-model.md`
- `docs/decisions-and-open-questions.md`
- `docs/security-threat-model.md`

## 2. Conceitos distintos

- **Campanha:** configuração persistente da disputa, categoria de ranking, metas e apresentação.
- **Ciclo:** intervalo operacional dentro de uma campanha, com datas e estado próprios. Uma campanha pode continuar em outro ciclo sem ser recriada.
- **Ranking atual:** resultado calculado a partir dos dados elegíveis do ciclo; pode mudar enquanto os dados operacionais forem corrigidos conforme a política aprovada.
- **Snapshot de campeão:** registro histórico congelado de um anúncio autorizado. Não é uma consulta dinâmica do ranking atual.
- **Divulgação:** ação explícita que torna o resultado oficial/visível segundo a regra do produto. Atingir a data final não é, por si só, divulgação.

A distinção entre ilhas físicas e times/grupos competitivos permanece válida: a composição usada para um ranking precisa ser determinada pelo modelo de campanha e pelo período aplicável, não inferida apenas da ilha atual.

## 3. Estados documentados e limites atuais

A migration declara os estados de ciclo `planned`, `active`, `closed` e `champions_announced`; o modelo também prevê início/fim e metadados de anúncio. A leitura estática encontrou um CHECK que exige timestamp e autor de anúncio ambos nulos ou ambos preenchidos, mas não vincula essa condição ao status `champions_announced`.

Consequências:
- O esquema atual, sozinho, não impede todo estado incoerente entre status e metadados.
- Não existe evidência nesta inspeção de serviço transacional que faça a transição de estado e a criação do snapshot em uma única operação.
- O contrato abaixo é requisito para uma implementação futura, não uma afirmação sobre o comportamento atual.

## 4. Transições propostas

| Estado atual | Ação | Estado seguinte proposto | Condições |
|---|---|---|---|
| `planned` | Ativar ciclo | `active` | Administrador autorizado; datas/configuração válidas; verificar regra de no máximo um ciclo ativo por campanha |
| `active` | Chegar à data final | `active` ou `closed`, conforme política explícita | Nunca anunciar campeão automaticamente; definir se encerramento temporal é automático ou manual |
| `active` | Encerrar sem anunciar | `closed` | Ação autorizada; preservar ranking e dados históricos; não criar snapshot de campeão por inferência |
| `active` ou `closed` | Anunciar campeão | `champions_announced` | Ação explícita e autorizada; validar elegibilidade; criar snapshot e registrar autor/horário de forma atômica |
| `closed` | Reabrir/corrigir ciclo | **Pendente de decisão** | Não reabrir silenciosamente um ciclo anunciado; definir política de correção auditável |
| `champions_announced` | Editar ou apagar snapshot | Proibido | Snapshot imutável; correções exigem fluxo auditável separado, sem sobrescrever a evidência histórica |
| Ciclo fechado/anunciado | Continuar campanha | Criar novo ciclo | Preservar o ciclo anterior; definir se a nova composição/metas são copiadas ou configuradas novamente |

Estas transições são propostas conservadoras. Não adicionar automações de mudança de estado até a política de encerramento temporal e reabertura ser aprovada.

## 5. Pré-condições para anúncio

Antes de anunciar, o serviço de aplicação deve:
1. autenticar o ator e verificar permissão administrativa no servidor;
2. carregar campanha e ciclo canônicos do banco, confirmando que pertencem um ao outro;
3. bloquear ou serializar operações concorrentes no ciclo;
4. verificar estado permitido e regra de elegibilidade definida para o período;
5. obter dados de produção, metas e composição histórica conforme uma política consistente;
6. calcular e validar o ranking usando as funções de domínio existentes ou uma substituição explicitamente revisada;
7. criar o snapshot com ranking, posições, nomes exibidos, métricas, tipo de ranking, autor e horário;
8. atualizar o estado e metadados de anúncio na mesma transação;
9. registrar evento de auditoria sem segredos nem dados desnecessários;
10. retornar sucesso somente após commit confirmado.

Se qualquer etapa falhar, não deve existir um ciclo marcado como anunciado sem snapshot correspondente, nem snapshot parcial sem estado coerente. A implementação deverá definir uma constraint/estratégia transacional apropriada; este documento não prescreve alteração imediata da migration.

## 6. Imutabilidade e concorrência

- A criação de snapshot e a transição de estado precisam ser uma unidade atômica de trabalho.
- Requisições repetidas de anúncio devem retornar resultado já registrado ou conflito explícito, nunca criar anúncios duplicados.
- Duas sessões administrativas não podem anunciar duas vezes nem anunciar sobre dados diferentes de forma concorrente.
- O snapshot deve ser imutável após criação, tanto pela aplicação quanto por controles do banco.
- Alterações posteriores de metas, nomes, equipes, fotos ou lançamentos não podem recalcular o snapshot histórico.
- Definir se o snapshot guarda também identificadores de cada entidade além do nome exibido, para permitir auditoria sem reconstruir o passado a partir do cadastro atual.
- Uma ação corretiva deve preservar o snapshot original e registrar separadamente autor, motivo, horário e efeito da correção.

A migration atual já contém trigger para impedir UPDATE/DELETE em `champion_snapshots`, segundo a inspeção estática. Isso não comprova que a migration foi executada nem que o restante do fluxo é atômico; ainda requer validação em banco descartável.

## 7. Pódio antes e depois do anúncio

- Durante o ciclo ativo, o pódio pode mostrar a classificação atual conforme configuração, mas não deve rotular o líder como campeão.
- A ação “Ver pódio” é de apresentação e não deve, por si só, alterar estado ou divulgar um campeão oculto.
- A opção de cutscene/animação não altera permissões, elegibilidade ou estado do ciclo.
- O anúncio é uma operação distinta da abertura do pódio e precisa de confirmação/registro administrativo.
- Após o anúncio, a apresentação do campeão deve derivar do snapshot oficial, não de novo cálculo do ranking.
- Se a campanha continuar, o novo ciclo deve ter estado e ranking independentes; a divulgação anterior permanece consultável.

## 8. Questões de negócio que permanecem abertas

| Questão | Impacto |
|---|---|
| O ciclo muda para `closed` automaticamente na data final ou depende de ação administrativa? | Determina agendamento, estados e recuperação de falhas |
| Um ciclo `closed` pode ser anunciado depois? | Determina elegibilidade e tratamento de anúncio tardio |
| Pode existir mais de um ciclo ativo por campanha? | Define constraint e concorrência |
| Quais dados definem elegibilidade no momento do anúncio? | Evita divergência entre horário de corte e ranking |
| Como corrigir produção após anúncio? | Define se há retificação, novo snapshot ou evento de correção |
| A composição histórica e as metas são congeladas no início do ciclo? | Determina a reprodução correta de resultados |
| O que fazer quando não há entradas elegíveis? | Define se anúncio vazio é permitido ou bloqueado |

Essas perguntas estão ligadas às pendências já registradas em `docs/decisions-and-open-questions.md`; não devem ser resolvidas silenciosamente por conveniência de implementação.

## 9. Critérios de aceite futuros

- [ ] Data final não dispara divulgação automática.
- [ ] Usuário sem permissão não consegue anunciar por UI ou chamada direta à API.
- [ ] Duas requisições concorrentes não criam dois snapshots nem estados divergentes.
- [ ] Falha transacional não deixa estado de anúncio parcial.
- [ ] Snapshot anunciado não muda após alterações no cadastro ou produção.
- [ ] Repetição da mesma solicitação é idempotente ou retorna conflito explícito.
- [ ] Ciclo novo preserva a consulta histórica do ciclo anterior.
- [ ] Reabertura/correção segue política aprovada e gera auditoria.
- [ ] O comportamento de ranking sem entradas elegíveis está definido e testado.

Nenhum critério acima foi executado ou aprovado nesta etapa.

## 10. Próxima ação segura

Antes de implementar o fluxo, confirmar o checkout local e fechar as decisões sobre corte temporal, ciclo ativo, composição/metas históricas e correção após anúncio. Manter inspeção remota/documentação reversível; não executar testes, typecheck, build ou instalação até o usuário avisar que está em casa.
