# Cadastro e login — primeira entrega funcional

## Arquitetura
- Node.js 24 + Express: API e frontend no mesmo Web Service do Render.
- MongoDB Atlas: collections users e sessions; índice único de e-mail e TTL para limpeza de sessões.
- GitHub Pages: demonstração sem autenticação real. Build normal conserva /cooperativadeservi-os/.
- npm run build:render: frontend em /, autenticação ativada e chamadas /api na mesma origem.

## Configurar o serviço existente no Render
Runtime Node; branch main; Root Directory vazio.
Build Command: npm ci && npm run build:render
Start Command: npm start
Health Check Path: /api/health

Variáveis em Render > Environment:
- NODE_ENV=production
- NODE_VERSION=24
- MONGODB_DB=coopserve
- APP_ORIGIN é opcional no Render: usa RENDER_EXTERNAL_URL automaticamente. Para domínio próprio, definir https://DOMINIO-REAL (sem barra final).
- MONGODB_URI: conexão do Atlas com usuário exclusivo desta aplicação e banco coopserve.

Nunca adicionar MONGODB_URI a VITE_*, ao GitHub, ao Drive ou a screenshots. O navegador não deve acessar Atlas diretamente.
No Atlas, criar usuário de banco limitado a readWrite em coopserve e permitir apenas os IPs de saída do Web Service. Não liberar 0.0.0.0/0 como solução padrão.
O render.yaml é referência opcional para nova implantação via Blueprint; não importar para duplicar serviço já configurado.
Plano free no YAML é para validação inicial, sujeito aos limites vigentes do provedor; não escolhe plano pago automaticamente.

## Desenvolvimento local
1. Copiar server/.env.example para server/.env (ignorado pelo Git).
2. Preencher a conexão localmente e usar APP_ORIGIN=http://localhost:5173 e NODE_ENV=development.
3. npm ci
4. npm run dev:api
5. Em outro terminal: npm run dev
Vite encaminha /api para localhost:3000. Não colocar a URI do Atlas em variáveis do Vite.

## Endpoints
- POST /api/auth/register: name, email, password. Cria apenas client.
- POST /api/auth/login: email, password.
- GET /api/auth/me: usuário da sessão.
- POST /api/auth/logout: revoga sessão.
- GET /api/admin/access: verificação de permissão; não é dashboard.
- GET /api/health: disponibilidade da aplicação.

## Proteções implementadas
- Hash scrypt com salt aleatório e parâmetros N=32768, r=8, p=3, sem senha em texto puro.
- Senhas de cadastro entre 15 e 128 caracteres; validação de tipos e normalização de e-mail.
- Sessão opaca aleatória de 256 bits, hash do token no banco, expiração absoluta de 8 horas.
- Cookie __Host-coopserve, HttpOnly, Secure e SameSite=Lax em produção; logout revoga no banco.
- Login troca a sessão e invalida a anterior no navegador.
- Origin exata obrigatória nas escritas, sem CORS aberto.
- Helmet/CSP, limite de JSON, respostas de autenticação sem cache e rate limit por IP.
- Cadastro ignora role enviado pelo cliente e bloqueia API administrativa no servidor.
- Erros genéricos de login e logs sem URI, senha ou token.

## Limites desta entrega
Não é lançamento completo para clientes. Confirmação de e-mail, recuperação de senha, MFA administrativo, políticas de retenção/privacidade, monitoramento e processo de moderação ainda precisam ser implementados antes de operação real.
Rate limit atual é por processo. Em múltiplas instâncias, usar armazenamento compartilhado e limites por conta, além de IP.
Cadastro duplicado retorna conflito e pode indicar existência de conta; unificar esse fluxo com verificação de e-mail em etapa posterior.
Não existe cadastro público de administrador. Provisionamento inicial deve ser definido antes do painel da central.
Solicitações, orçamento, agenda, notificações, fotos e avaliações ainda são demonstrações; a interface sinaliza isso. Login real não implica que os pedidos estejam integrados.
Sem coleta de endereço/telefone no cadastro desta etapa.
Testes HTTP usam um repositório em memória para validar a API; conexão, índices e persistência reais do Atlas exigem validação no ambiente implantado.

## Validação
npm test: hash, validação contra objetos MongoDB, cadastro, e-mail normalizado/duplicado, sessão, flags de cookie, origem, senha incorreta, bloqueio de admin, rotação, expiração, logout e limite de tentativas.
npm run build:render e npm run build: builds das duas hospedagens.

Fontes técnicas consultadas:
- https://render.com/docs/configure-environment-variables
- https://www.mongodb.com/docs/atlas/architecture/current/network-security/
- https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html

Repositório público conectado por URL no Render: não tem auto-deploy no formulário convencional. Usar Manual Deploy após alterações ou configurar integração GitHub/Blueprint posteriormente.
