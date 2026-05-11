# Torneio das Garrafas

Jogo web para equipes tentarem acertar a ordem secreta das garrafas.

## Paginas

- `index.html`: tela principal para jogadores e telao.
- `admin.html`: atalho para abrir o painel do administrador.

## Render

Crie um **Web Service** no Render apontando para este repositorio.

- Runtime: Node
- Build Command: deixe vazio ou use `npm install`
- Start Command: `npm start`

Depois de publicar:

- Jogadores: URL principal do Render
- Admin: `https://seu-site.onrender.com/admin.html`

Senha padrao do admin: `admin123`

Observacao: precisa ser Web Service, nao Static Site, porque jogadores e admin
compartilham o mesmo estado do jogo pelo servidor.

## Diagnostico rapido

Abra no navegador:

`https://seu-site.onrender.com/api/health`

Se aparecer um JSON com `"ok": true`, o servidor esta correto.
Se aparecer 404, pagina HTML, ou baixar arquivo, o Render ainda esta como Static Site
ou nao redeployou o Web Service.
