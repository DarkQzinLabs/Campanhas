# Campanhas — arquitetura proposta

Status: proposta técnica; ainda não implementada em produção.

## Objetivos
- Preservar o protótipo visual atual enquanto a aplicação evolui.
- Ter dados centralizados e compartilhados entre usuários e dispositivos.
- Separar ranking público (somente leitura) da administração autenticada.
- Preservar campanhas, ciclos e resultados históricos.
- Permitir manutenção e importação de dados por telas do próprio sistema.
- Não depender de credenciais embutidas no frontend nem de dados fictícios em produção.

## Arquitetura sugerida
- **Frontend e rotas de aplicação:** Next.js + TypeScript, com componentes de interface separados de regras de negócio.
- **Dados:** PostgreSQL gerenciado; Supabase é uma opção inicial a avaliar, sujeito à confirmação de limites, região, segurança e custos antes da adoção.
- **Autenticação:** provedor configurável; considerar Microsoft Entra ID se o ambiente corporativo permitir. Não conceder papel de administrador apenas por domínio de e-mail.
- **Autorização:** papéis verificados no servidor e políticas de acesso no banco. O cliente nunca decide sozinho se uma operação é administrativa.
- **Arquivos:** armazenamento privado para arquivos de importação e imagens administrativas, com validação de tipo/tamanho e URLs controladas.
- **Versionamento:** GitHub; mudanças em branches de trabalho e revisão antes de mesclar em main.
- **Hospedagem:** Vercel é candidata para aplicação web; validar integração, limites gratuitos e configuração antes de ativar.
- **Observabilidade:** logs sem segredos ou dados pessoais desnecessários; registrar ações administrativas relevantes.

## Domínios principais
1. Identidade e permissões.
2. Negociadores, supervisores, ilhas e times.
3. Campanhas e configuração visual.
4. Ciclos e snapshots finais.
5. Produção e metas.
6. Importações e correções de dados.
7. Temas, imagens e animações do pódio.

## Regras de negócio que devem ser preservadas
- Ilhas físicas são diferentes de times competitivos.
- Modos de ranking: individual, equipes/squads e times de campanha.
- Meta do andar = soma das metas dos negociadores incluídos na campanha.
- Restante = máximo entre zero e (meta - realizado); percentual deve tratar meta zero sem divisão inválida.
- Ciclos têm início e fim configuráveis. A data final não anuncia campeões automaticamente.
- Apenas ação administrativa explícita anuncia os campeões.
- No anúncio, gravar snapshot imutável de classificação, nomes, métricas e percentuais.
- Campanha pode continuar em novo ciclo ou ser encerrada; ciclos antigos permanecem consultáveis.
- Pódio/cutscene é opcional; nunca chamar o líder de campeão antes do anúncio final.
- Desativar uma campanha não apaga seu histórico.

## Segurança mínima
- Remover autenticação baseada em senha hardcoded no JavaScript.
- Nunca usar localStorage como fonte autoritativa de permissões ou dados compartilhados.
- Validar entrada no servidor e escapar conteúdo apresentado em HTML.
- Usar autorização por função e políticas de banco com privilégio mínimo.
- Manter segredos apenas em variáveis de ambiente do servidor/gerenciador de segredos; nunca commitar .env.
- Não importar nem publicar dados reais até concluir controles de acesso, cópias de segurança e validação da migração.

## Decisões ainda abertas
- Provedor de login definitivo e disponibilidade de consentimento Microsoft.
- Banco/provedor definitivo e região de armazenamento.
- Se Excel será apenas fonte de importação ou se também haverá escrita de volta em SharePoint/OneDrive. Escrita direta exige desenho de sincronização, tratamento de conflitos e permissões Microsoft Graph.
- Campos e regras finais da planilha de produção, com base em exemplos reais anonimizados.
- Orçamento/limites operacionais dos serviços.

## Estratégia de entrega
1. Estrutura/documentação e branch isolada.
2. Modelo de dados e migração inicial.
3. Autenticação e autorização.
4. Central de dados e importação com prévia e relatório de erros.
5. Rankings e cálculo de metas.
6. Ciclos, snapshots e anúncio de campeões.
7. Personalização, pódio e animações.
8. Testes, revisão de segurança e implantação gradual.

Cada etapa deve ser pequena, verificável e reversível; nenhuma publicação em produção ocorre automaticamente.