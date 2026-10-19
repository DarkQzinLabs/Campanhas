# Campanhas — contrato de composição histórica e metas por ciclo

Status: proposta documental baseada na leitura remota do modelo de dados, da migration SQL e das funções de domínio. Não representa comportamento implementado nem altera o esquema.

## 1. Objetivo

Definir os requisitos para reconstruir com consistência o ranking de um ciclo passado mesmo quando:
- uma pessoa muda de ilha física ou equipe competitiva;
- o nome de uma equipe ou de um negociador é alterado;
- metas são corrigidas ou modificadas em ciclos posteriores;
- a campanha continua em um novo ciclo;
- dados de produção são importados ou corrigidos após o fechamento.

O documento separa fatos observados no repositório de regras propostas que ainda precisam de decisão de negócio.

## 2. Fatos observados na estrutura atual

A leitura estática encontrou:
- `campaign_members` com `campaign_id`, `negotiator_id`, `target_cents` e datas opcionais de inclusão, com unicidade em `(campaign_id, negotiator_id)`;
- `campaign_group_members` com `group_id`, `negotiator_id` e intervalo opcional de validade, mas sem chave de ciclo;
- `competitive_group_members` com grupo, negociador e intervalo opcional de validade;
- `campaign_cycles` com datas e estado, mas sem snapshot explícito de composição/metas;
- `champion_snapshots` com um payload JSON para preservar o resultado anunciado;
- funções de domínio que recebem IDs e valores já preparados pelo chamador, sem consultar o banco ou resolver o histórico de composição.

Limite: a inspeção remota não comprova que exista serviço de aplicação, rotina de consulta histórica ou interface que aplique essas regras.

## 3. Regras de identidade e tempo

1. **Ilha física não é grupo competitivo.** A ilha indica a posição física/operacional; o agrupamento competitivo usado no ranking deve ser resolvido de acordo com o modelo de campanha.
2. **Identidade não é nome.** Nomes podem mudar e podem se repetir. Use identificadores estáveis para relacionamentos; armazene o nome exibido no snapshot quando necessário para preservar a apresentação histórica.
3. **Datas de validade precisam de semântica explícita.** Definir se `valid_from` e `valid_to` são inclusivos e qual fuso/data determina o início e o fim do ciclo. Evitar intervalos ambíguos na fronteira entre dois ciclos.
4. **Composição histórica precisa ser reconstituível.** Uma consulta ao ranking de um ciclo antigo não pode usar automaticamente a associação vigente hoje.
5. **Metas precisam ter escopo temporal definido.** Se uma meta muda durante um ciclo, a regra deve dizer se vale a meta no início, a meta vigente em cada instante ou uma revisão explícita com auditoria.

## 4. Contrato proposto de congelamento por ciclo

Antes de ativar um ciclo, o serviço deve gerar ou confirmar uma composição efetiva para aquele ciclo, contendo no mínimo:
- campanha e ciclo;
- identificador estável do negociador;
- identificador do grupo competitivo aplicado, quando pertinente;
- meta aprovada para o ciclo;
- intervalo de elegibilidade ou regra equivalente;
- versão/data de origem da configuração;
- metadados necessários para auditar quem aprovou a composição.

Após o início do ciclo, mudanças cadastrais globais não devem alterar silenciosamente a composição efetiva já aprovada. Se o negócio permitir alteração durante o ciclo, deve existir uma operação administrativa explícita, com vigência, autor, motivo e impacto auditável.

Há duas opções de implementação a avaliar; nenhuma é aprovada por este documento:

**Opção A — snapshot materializado por ciclo**
- Gravar cópia da composição, metas e identificadores/nome de exibição no início do ciclo.
- Consultas históricas leem a cópia efetiva do ciclo.
- Correções usam uma nova revisão/versionamento, sem sobrescrever a evidência anterior quando já houve anúncio.

**Opção B — histórico temporal versionado**
- Manter alterações de composição e meta com intervalos de validade e regra consistente de não sobreposição.
- Consultas reconstruem o estado no instante relevante.
- Exige constraints e consultas mais cuidadosas; alterações retroativas precisam de auditoria e política explícita.

A opção final depende da frequência de mudanças, do nível de auditoria desejado e da capacidade de manter regras temporais corretas.

## 5. Regra de cálculo e elegibilidade

O serviço de ranking deve receber um conjunto efetivo e validado, com uma única contribuição elegível por negociador para cada tipo de ranking individual/equipe aplicável, segundo a regra aprovada. Antes do cálculo, deve:
- resolver a composição do ciclo, não a associação atual por conveniência;
- garantir que a meta corresponda ao mesmo negociador e ciclo;
- rejeitar IDs vazios, duplicados ou inconsistentes segundo um formato canônico;
- validar valores em centavos como inteiros seguros e não negativos enquanto a política de estornos não for decidida;
- detectar somas que ultrapassem o limite seguro do domínio;
- definir como tratar negociadores sem produção, metas iguais a zero e entradas sem meta;
- registrar a versão dos dados/configuração utilizada para o resultado.

As funções puras atuais calculam rankings a partir dos candidatos recebidos. Elas não conseguem, isoladamente, garantir que o chamador carregou a composição histórica correta.

## 6. Alterações durante e após o ciclo

| Situação | Comportamento proposto | Decisão ainda necessária |
|---|---|---|
| Pessoa muda de ilha física | Não alterar automaticamente a classificação de ciclos passados | Se ilha é apenas visual ou também critério de agrupamento em algum ranking |
| Pessoa muda de equipe competitiva | Aplicar a composição efetiva do ciclo; mudanças futuras valem no escopo temporal aprovado | Data de vigência e tratamento de mudança no meio da quinzena |
| Meta muda antes do início | Atualizar a composição/configuração ainda não ativada e registrar a aprovação | Quem aprova e quando a configuração fica congelada |
| Meta muda durante ciclo ativo | Não alterar silenciosamente; exigir ação versionada ou manter meta congelada | Se mudanças intra-ciclo são permitidas e como recalcular |
| Produção é corrigida antes do anúncio | Recalcular ranking atual conforme política de correção e registrar a alteração | Semântica de correção, cancelamento e estorno |
| Produção é corrigida após anúncio | Preservar snapshot original e usar processo auditável de retificação | Se retificação cria novo snapshot/evento e como é exibida |
| Campanha inicia novo ciclo | Criar composição efetiva própria; preservar a anterior | Copiar automaticamente valores ou exigir revisão administrativa |

## 7. Integridade e prevenção de ambiguidades

Antes de implementar, definir e validar:
- se um negociador pode pertencer a mais de um grupo competitivo simultaneamente;
- se intervalos de associação usam limites inclusivos ou semiabertos;
- se períodos sobrepostos são proibidos e em qual escopo;
- se cada campanha/ciclo exige uma única meta efetiva por negociador;
- se a composição deve ser congelada na ativação ou em outra etapa;
- como uma alteração retroativa é autorizada e auditada;
- se o nome histórico deve ser congelado junto com o ID;
- se a ilha física entra em algum ranking ou serve somente à organização visual.

Constraints simples de `valid_to >= valid_from` não bastam, por si sós, para proibir sobreposição temporal entre registros diferentes. A solução poderá exigir constraints adicionais, versionamento, transação ou validação no serviço; não escolher uma estratégia antes de fechar as regras acima.

## 8. Relação com snapshots de campeões

O snapshot anunciado deve conter todos os dados necessários para exibir o resultado histórico sem recalcular a partir de cadastros atuais. No mínimo, o contrato futuro deve considerar:
- campanha/ciclo e tipo de ranking;
- posição e identificador estável de cada participante/equipe;
- nome exibido no momento do anúncio;
- meta, produção e percentual usados no cálculo, quando aplicáveis;
- instante do corte dos dados;
- identificador/versionamento da composição utilizada;
- autor e horário do anúncio;
- versão da regra de cálculo ou do formato do snapshot, se necessária para auditoria futura.

O payload existente é JSON e a função de snapshot atualmente recebe uma classificação preparada pelo chamador. O formato definitivo e os campos acima ainda precisam ser definidos e validados; não se afirma que todos estejam presentes hoje.

## 9. Critérios de aceite futuros

- [ ] Alterar o nome atual de um negociador/equipe não muda nomes já congelados em snapshots.
- [ ] Mover uma pessoa para outra equipe não altera o ranking de um ciclo histórico.
- [ ] Cada negociador tem no máximo uma meta efetiva por ciclo, conforme regra aprovada.
- [ ] Não há sobreposição ambígua de composição no escopo em que o negócio a proíbe.
- [ ] As datas de validade e o fuso de corte estão definidos e cobertos por casos de fronteira.
- [ ] Alterações durante ciclo ativo são bloqueadas ou versionadas conforme política aprovada.
- [ ] Uma correção pós-anúncio preserva a evidência original e gera trilha de auditoria.
- [ ] O ranking histórico pode ser reconstruído a partir de dados/versionamento documentados.

Nenhum critério foi executado nesta etapa; esta lista serve para uma fase futura de validação.

## 10. Decisões necessárias antes de implementar

Prioridade:
1. congelar composição e metas no início do ciclo ou manter histórico temporal versionado;
2. definir se meta/composição podem mudar durante a quinzena;
3. definir o corte temporal e a semântica de datas;
4. definir política de correção/estorno antes e depois do anúncio;
5. definir se ilha física participa de algum cálculo ou apenas da apresentação.

Manter o trabalho como documentação reversível até que o checkout local seja conferido e essas decisões sejam tratadas. Não executar testes, typecheck, build ou instalação até o usuário avisar que está em casa.
