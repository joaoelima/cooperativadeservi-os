# CoopServe — frontend

Interface React/Vite da cooperativa de serviços.

- Aplicação integrada: https://coopserve-app.onrender.com/
- Demonstração Pages: https://joaoelima.github.io/cooperativadeservi-os/
- Backend: repositório privado joaoelima/backend_coopserve.

## Desenvolvimento
Node.js 24. Execute npm ci e npm run dev.
npm run build gera a demonstração com base /cooperativadeservi-os/.
npm run build:render gera a interface real em /, que deve ser servida junto da API.

O navegador chama /api. O frontend não conecta ao Atlas e não recebe credenciais do banco.
Nunca usar URI do MongoDB ou segredos em VITE_* ou arquivos versionados, mesmo em repositório privado.

## Publicação
GitHub Actions publica Pages a cada push na main.
Para publicar o frontend real, atualizar frontend-ref.txt no backend privado para o SHA desejado; o Render compila esse commit exato.
A separação dos repositórios preserva frontend e API na mesma origem para proteger e manter os cookies de sessão.

## Apresentação inicial
A apresentação aparece apenas no primeiro acesso de cada navegador/origem, usando coopserve:intro-seen no localStorage.
Nenhuma credencial é salva nessa preferência. Limpar dados do site, usar outro navegador ou outro domínio permite vê-la novamente.

## Disponibilidade
availability.yml verifica /api/health a cada 5 minutos. É uma tentativa de manter a instância Free ativa, sem garantia de pontualidade ou disponibilidade.
GitHub pode atrasar execuções e desativa agendamentos públicos após 60 dias sem atividade.
Render Free tem 750 horas compartilhadas por workspace por mês. Disponibilidade contínua requer avaliar instância paga; nenhuma contratação é feita pelo workflow.
