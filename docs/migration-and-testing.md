# Campanhas — migração do protótipo e estratégia de testes

Status: plano de execução; nenhum dado foi migrado.

## Inventário conhecido do protótipo
- O pacote analisado contém index.html, README.md e LICENSE.
- A aplicação é concentrada em um HTML grande com CSS/JavaScript embutidos e imagens/dados em base64.
- Há senha administrativa embutida no JavaScript e autenticação local por localStorage.
- Estado de aplicação é salvo em localStorage, sem fonte central compartilhada.
- A ausência de dados locais pode disparar criação de dados aleatórios de demonstração.
- A importação de planilha usa detecção limitada de cabeçalhos e correspondência aproximada por nome.
- A estrutura atual espera quatro times em parte da lógica.

## Plano de migração
1. **Congelar e preservar a referência:** manter main sem alterações durante a preparação; registrar commit base e guardar cópia do protótipo.
2. **Catalogar comportamentos:** listar telas, componentes visuais, regras de cálculo, interações e assets existentes.
3. **Separar dados de demonstração:** marcar claramente exemplos e impedir que sejam tratados como dados reais. Não migrar localStorage automaticamente sem revisão.
4. **Definir contrato de dados:** validar IDs estáveis, datas, valores, metas, estrutura de ilhas e composição dos grupos.
5. **Criar aplicação modular:** separar UI, serviços de domínio, acesso a dados e validação de entrada.
6. **Implementar autenticação e autorização antes de liberar edição:** migrar a administração para controles server-side.
7. **Criar importação em modo de prévia:** mapear colunas; mostrar linhas válidas, duplicadas, ambíguas e rejeitadas antes de gravar.
8. **Migrar por lote controlado:** usar arquivo de teste anonimizado; gerar resumo antes/depois e trilha de auditoria.
9. **Comparar cálculos antigos e novos:** investigar diferenças; não aceitar correspondência aproximada de nome como chave definitiva.
10. **Executar homologação:** validar em ambiente isolado, obter aprovação do responsável do negócio e planejar rollback.
11. **Publicar gradualmente:** apenas depois de configurar segredos reais, backups, acesso e critérios de aceitação.

## Estratégia de testes

### Unitários
- Meta do andar é a soma das metas dos membros incluídos.
- Restante = max(0, meta - realizado).
- Percentual para meta zero não causa divisão por zero.
- Ordenação de rankings com empates e valores nulos.
- Regras de elegibilidade por campanha/ciclo.
- Snapshot reproduz exatamente o ranking anunciado.

### Integração
- Papéis admin/viewer e políticas de acesso do banco.
- Criação, edição, desativação e encerramento de campanhas.
- Abrir/fechar ciclo e anunciar campeão apenas por ação autorizada.
- Snapshot não pode ser alterado após anúncio.
- Importação idempotente, validação de esquema e relatório de rejeições.
- Tratamento de conflito/duplicidade e transação atômica na importação.

### Interface / ponta a ponta
- Ranking público acessível sem privilégios de edição.
- Controles administrativos indisponíveis a viewer.
- Prévia de planilha antes da gravação.
- Fluxo de anúncio manual e reabertura do pódio.
- Responsividade em resolução de monitor e TV.
- Personalização visual e opção de pular animações.
- Estados vazios, erros, carregamento e conexão indisponível.

### Segurança
- Nenhum segredo embutido no bundle do cliente.
- Tentativas de edição direta via API por viewer são recusadas.
- Validação e escape de entradas usadas em HTML.
- Testes de acesso cruzado entre campanhas.
- Uploads limitados por tipo, tamanho e conteúdo.
- Proteção contra duplicação e repetição de requisições.
- Auditoria sem senhas, tokens ou dados pessoais desnecessários.

### Critérios para considerar uma versão candidata
- Testes automatizados críticos aprovados.
- Cálculos reconciliados com conjunto de referência aprovado.
- Nenhum defeito crítico de autorização.
- Importação de teste reproduzível com resumo e rollback definido.
- Cópia de segurança e plano de recuperação documentados.
- Homologação funcional antes de publicação.

## Comandos de teste previstos
Os comandos exatos serão definidos após a escolha e criação da estrutura da aplicação. Não declarar testes executados enquanto não houver projeto configurado e execução registrada.
