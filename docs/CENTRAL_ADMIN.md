# Central administrativa e solicitações

Implementação de 24/10/2026.

## Conta administradora
A conta escolhida pelo responsável é joaoedulimadev@gmail.com.
O usuário define e confirma sua senha pela tela de cadastro. O cadastro público cria somente client.
A promoção de uma conta existente é uma operação de manutenção do banco; não existe endpoint público, chave no frontend nem senha padrão de administrador.
Após confirmar que a conta foi criada pelo responsável, executar em ambiente seguro:
node scripts/promote-admin.js EMAIL_EXATO
MONGODB_URI e, opcionalmente, MONGODB_DB devem estar no ambiente. Não salvar credenciais no repositório.
O script altera apenas a conta exata existente, exige role client e invalida sessões antigas. Não cria contas nem define senhas.

O login do administrador é o mesmo da aplicação. A API retorna o papel real do banco e a interface abre o painel automaticamente.
A API verifica o papel em todas as operações administrativas; esconder botão não é a proteção de acesso.
Não usar a senha do usuário de banco coopserve_api como senha de conta da aplicação.

## Painel disponível
- Lista paginada de solicitações reais do banco.
- Filtros por recebidas e em análise.
- Detalhes do cliente, serviço, descrição, endereço e preferência de data.
- Iniciar análise com transição atômica received > in_review e histórico com responsável no banco.
- Botão Atualizar; não há atualização automática em tempo real nesta etapa.
- Alteração de senha e logout.

## Cliente
O formulário envia pedidos reais pela API, atribuídos ao usuário autenticado.
Os pedidos de cada conta são isolados no backend; IDs e status enviados pelo navegador são ignorados.
Meus pedidos exibe até 100 registros recentes com detalhes e histórico.
Orçamento, aprovação, agendamento, anexos e avaliação serão integrados em etapas seguintes.
A solicitação inicial não agenda nem confirma contratação.

## Alterar senha
Disponível para administrador e cliente, exige senha atual e nova senha diferente entre 15 e 128 caracteres.
A versão de autenticação é incrementada no banco e todas as sessões anteriores são invalidadas.
O usuário precisa entrar novamente. Não altera senha do MongoDB Atlas.
Recuperação de senha sem conhecer a atual e confirmação de e-mail continuam pendentes.

## Novos endpoints
POST /api/orders
GET /api/orders
GET /api/orders/:id
GET /api/admin/orders?status=received&page=1
POST /api/admin/orders/:id/review
POST /api/auth/password

## Testes
npm test verifica autenticação, isolamento entre clientes, bloqueio de não-admin, validação do catálogo e data, atribuição segura, origem, transição de análise, senha atual incorreta e invalidação das sessões após troca de senha.
O armazenamento dos testes é simulado; depois do deploy, validar o fluxo real no Atlas e Render.
