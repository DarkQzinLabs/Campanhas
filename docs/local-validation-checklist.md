# Campanhas — verificação local antes da migração da aplicação

Data do registro: 19/10/2026

## Resultado da verificação de acesso

O clone do usuário em `C:\Projetos` não está acessível pelo runtime atual do ChatGPT. O runtime disponível é um ambiente Linux separado; a verificação de diretório confirmou que o caminho Windows não existe nele. Os arquivos presentes em `/mnt/data` são anexos desta sessão, não evidência de um clone Git.

Consequências:
- Não foi possível verificar o estado do working tree, a branch local, arquivos não commitados ou o lockfile.
- Não foi feita instalação, build, typecheck ou execução de testes.
- Não se deve presumir que o clone local está sincronizado com o remoto.
- Nenhuma alteração foi feita em `main` ou em produção.

## Roteiro mínimo para quando o usuário estiver em casa

**Não executar este roteiro antes do usuário avisar que está em casa.** Até lá, ele é apenas uma lista de inspeção, não uma solicitação para executar testes.

### Etapa A — inspeção sem modificar arquivos

1. Abrir PowerShell na pasta `C:\Projetos`.
2. Identificar a pasta do repositório Campanhas e entrar nela.
3. Consultar a branch atual e o estado do working tree.
4. Confirmar que a branch de trabalho é `docs/architecture-foundation`; se não for, não trocar de branch nem descartar alterações automaticamente.
5. Conferir os arquivos de configuração e lockfiles presentes: `package.json`, `tsconfig.json`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock` e configurações de aplicação, quando existirem.
6. Conferir a lista de arquivos alterados e não rastreados. Não sobrescrever, limpar ou resetar arquivos locais.

### Etapa B — compatibilidade, ainda sem testes

1. Comparar a versão local de `package.json`, `tsconfig.json` e arquivos de entrada com a branch remota.
2. Identificar o gerenciador de pacotes pelo lockfile existente; não criar um segundo lockfile.
3. Verificar a versão instalada do Node e do gerenciador de pacotes.
4. Confirmar quais arquivos de frontend já existem antes de introduzir Next.js.
5. Criar um plano de alteração pequeno, isolado e reversível. Não instalar dependências até a inspeção ser concluída e o usuário autorizar o início da validação local.

### Etapa C — somente depois da inspeção e do aviso de que está em casa

1. Registrar o estado inicial e preservar qualquer trabalho local.
2. Implementar a fundação mínima em `docs/architecture-foundation`, sem tocar em `main`.
3. Instalar dependências usando o gerenciador e o lockfile confirmados.
4. Executar typecheck, build e testes de forma ordenada; relatar cada resultado real, incluindo falhas.
5. Corrigir os problemas antes de ampliar a implementação. Não publicar em produção.

## Comandos de inspeção previstos

Estes comandos são apenas uma referência para a futura inspeção; não foram executados e não são uma solicitação para executar agora:

```powershell
Get-Location
Get-ChildItem
git status --short --branch
git branch --show-current
git status --porcelain=v1
Get-ChildItem package.json,*lock*,tsconfig.json,next.config.*,vite.config.* -ErrorAction SilentlyContinue
node --version
npm.cmd --version
```

Os comandos Git devem ser usados dentro da pasta do repositório. Não executar `git reset`, `git clean`, checkout forçado, instalação, build ou testes durante esta inspeção inicial.

## Guardrails

- Conta GitHub: `MatheusPassos07` exclusivamente.
- Branch remota de trabalho: `docs/architecture-foundation`.
- Não alterar `main`.
- Não publicar ou implantar em produção.
- Não executar testes até o usuário avisar que está em casa.
- Não criar ou registrar credenciais fictícias.
- Se o estado local divergir do remoto ou houver alterações não commitadas, parar antes de modificar arquivos e reconciliar o estado de forma explícita.
