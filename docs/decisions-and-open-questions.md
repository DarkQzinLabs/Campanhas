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
