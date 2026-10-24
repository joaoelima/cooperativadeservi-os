# Arquitetura de hospedagem

Frontend público: joaoelima/cooperativadeservi-os.
Frontend real estático: https://coopserve-web.onrender.com, Static Site srv-dbej55hsrm7s73cag28g.
Backend privado: joaoelima/backend_coopserve, Web Service srv-dbee5ujrjlhs73fdoar0.
API: https://coopserve-app.onrender.com/api.

O navegador acessa /api pela origem do frontend. Render aplica rewrite /api/* para o Web Service. Não é um redirect.
O backend aceita a origem própria e a origem exata FRONTEND_ORIGIN=https://coopserve-web.onrender.com. Não foi habilitado CORS amplo.
Cookies continuam HttpOnly, Secure, SameSite=Lax, Path=/ e sem Domain; API usa Cache-Control no-store.
Nenhum segredo do banco é enviado ao frontend ou ao Static Site.

A interface estática responde pela CDN mesmo durante suspensão da API. ConnectionGate mantém uma tela de conexão animada e faz tentativas limitadas de GET /api/health. Falha persistente oferece nova tentativa manual.
Login e catálogo são carregados após prontidão. Operações de escrita não são repetidas automaticamente.

O endereço antigo coopserve-app ainda serve uma cópia da interface construída pelo backend usando frontend-ref.txt. Por depender do Web Service, esse endereço pode mostrar a página de despertar do Render. O acesso principal passa a ser coopserve-web.

Publicação estática automática pela main. Backend privado continua automático pela própria main. Pages permanece demonstração.
O código anterior da API continua em commits históricos públicos. Credenciais não devem estar em nenhum repositório.
