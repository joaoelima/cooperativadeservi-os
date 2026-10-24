# Fluxo funcional do CoopServe — 24/10/2026

## Entregue
- Cadastro/login/sessões e alteração de senha, mantendo cadastro público somente como cliente.
- Central: recebimento, análise, orçamento, revisão após recusa, agendamento, profissional responsável, início de execução e conclusão.
- Cliente: solicitação com descrição/endereço/data e até 3 fotos, lista/detalhes/histórico, aprovação ou recusa de proposta exata, cancelamento antes da aprovação e avaliação única após conclusão.
- Central pode responder uma vez à avaliação. Avaliações ficam no pedido, acessíveis ao cliente dono e à central; não existe vitrine pública de profissionais.
- Perfil: nome, telefone opcional e endereço padrão persistidos; e-mail permanece somente leitura.
- Atualizações internas dos pedidos com marcação de leitura; sem envio externo de mensagens.
- Catálogo persistido no MongoDB: cadastro/edição/ativação/desativação de especialidades e serviços pelo administrador. O catálogo inicial é semeado apenas quando não existe.
- Busca por especialidades e serviços; atalhos sem implementação foram removidos ou conectados a funções reais.
- Central pode abrir a visão do cliente e voltar ao painel.
- Pedido de teste interno só pode ser marcado por administrador. Exibe identificação de teste sem atendimento/cobrança em ambos os lados.

## Regras
Estados: received > in_review > awaiting_approval > approved > scheduled > in_progress > completed.
Caminho alternativo: awaiting_approval > rejected; uma proposta nova tem outro ID e pode ser enviada após recusa.
Cancelamento do cliente: received, in_review ou awaiting_approval > cancelled.
Aprovação exige proprietário, estado awaiting_approval e ID da proposta atual.
Agendamento exige approved. Execução exige scheduled. Conclusão exige in_progress.
Avaliação: somente proprietário, pedido completed, nota inteira 1 a 5, comentário opcional; uma por pedido.
Todas as transições são condicionais e atômicas no MongoDB. A decisão repetida ou stale retorna 409.
Histórico registra data, responsável e snapshot da proposta enviada; o cliente não recebe IDs internos dos responsáveis.
Valores monetários são inteiros em centavos, validados no servidor. Não existe cobrança/pagamento online nesta entrega.
A confirmação de aprovação no aplicativo registra aceitação da proposta, mas não cobra cartão nem realiza transação bancária.

## Fotos
Até 3 imagens JPEG reduzidas a no máximo 400 KB cada e dimensões máximas 2048x2048 validadas no servidor.
Navegador aceita JPEG/PNG/WebP, reduz resolução e reencoda JPEG antes de enviar.
Sem SVG, HTML, URL remota ou nome de arquivo fornecido pelo cliente.
Armazenamento no pedido; consultas de listas excluem bytes. Acesso à foto exige dono ou administrador.
Fotos não são disponibilizadas publicamente e respostas usam no-store.

## Catálogo
Um documento main na collection catalog, com revisão otimista para impedir sobrescrita de edições concorrentes.
Máximo 30 categorias, 30 serviços por categoria, 200 serviços totais e 48 mil caracteres serializados.
Itens inativos não aceitam novas solicitações. Pedidos anteriores preservam descrição e nomes do momento da solicitação.

## Permissões e privacidade
As rotas /api/admin exigem admin no servidor.
Perfil não aceita alteração de e-mail, papel ou ID pelo payload.
Fotos, pedidos e avisos são limitados à conta do cliente, com acesso administrativo separado.
Não incluir senhas, URIs ou tokens no repositório ou no histórico técnico.

## Testes
npm test: 5 testes agregados com múltiplas asserções de autenticação, isolamento, catálogo, concorrência, proposta revisada, agendamento, avaliação única, fotos privadas, perfil e avisos.
Armazenamento de testes é simulado. Completar com validação online usando pedido marcado TESTE INTERNO.
npm run build:render e npm run build para as duas hospedagens.
GitHub Pages continua demonstração sem autenticação; produto conectado em https://coopserve-app.onrender.com/.

## Ainda não implementado
Recuperação de senha por e-mail, confirmação de e-mail, MFA do administrador, pagamentos online, push/e-mail/WhatsApp, cadastro dedicado de profissionais e gestão de cancelamentos depois da aprovação.
Essas etapas exigem decisões/configuração adicionais. Não apresentar o sistema como lançamento público concluído antes de revisar privacidade, retenção, operação e monitoramento.
