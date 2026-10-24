# CoopServe — frontend

Interface React/Vite da cooperativa de serviços.

- Aplicação real (frontend estático): https://coopserve-web.onrender.com/
- API privada no Render: https://coopserve-app.onrender.com/api/health
- Demonstração Pages: https://joaoelima.github.io/cooperativadeservi-os/
- Backend: repositório privado joaoelima/backend_coopserve.

## Desenvolvimento
Node.js 24. npm ci, npm test, npm run dev.
npm run build gera a demonstração com base /cooperativadeservi-os/.
npm run build:render gera o site real em / com autenticação.

## Hospedagem estática
Render Static Site coopserve-web, repo público, main.
Build: npm ci && npm test && npm run build:render. Publish directory: dist. NODE_VERSION=24.
Rewrite /api/* para https://coopserve-app.onrender.com/api/*, sem redirect.
A interface é servida pela CDN e abre mesmo com o backend dormindo.
API recebe apenas origens explicitamente autorizadas; cookies HttpOnly/Secure/SameSite permanecem na origem do frontend por meio do proxy.
Nunca usar URI do MongoDB ou segredos em VITE_* ou arquivos versionados.

## Conexão inicial
ConnectionGate espera /api/health responder JSON status ok, com círculo animado e mensagem de preparação.
Após 8 segundos explica a espera; após aproximadamente 90 segundos oferece Tentar novamente.
Repete somente GET de saúde, sem reenviar cadastro, pedido ou outra escrita.
Testes simulam HTML do Render, erro temporário, timeout e cancelamento.
A preferência do tutorial é por navegador/origem; no novo endereço ele aparece na primeira visita.

## Publicação
O Static Site atualiza a cada push na main. Pages segue sendo demonstração.
O backend ainda oferece a interface no endereço antigo, mas esse endereço pode mostrar a tela de despertar do Render; use coopserve-web.
Para atualizar essa cópia antiga, atualizar frontend-ref.txt no backend para o novo SHA.

## Limites
A API Free ainda pode demorar para acordar. Frontend estático resolve a abertura da interface, sem garantir disponibilidade da API.
availability.yml contém checagem best effort; não representa garantia de execução nem disponibilidade contínua.
