# Separação de frontend e backend

Frontend público: joaoelima/cooperativadeservi-os. React, CSS, catálogo demonstrativo e rótulos de status.
Backend privado: joaoelima/backend_coopserve. Express, Atlas, autenticação, autorização, pedidos, fotos e testes.
Segredos somente no ambiente do Render.

O Render mantém o endereço coopserve-app.onrender.com. Durante o build, o backend busca e compila o commit público listado em frontend-ref.txt. Somente dist é servido ao navegador.
As chamadas /api chegam ao backend na mesma origem. Não foi habilitado CORS amplo nem cookies entre sites.
Pages continua sendo demonstração sem cadastro/login real.

A remoção dos arquivos do backend da main pública não apaga commits antigos, cópias ou forks. A busca por padrões de credenciais em 65 blobs históricos não encontrou correspondências; não equivale a auditoria de segurança completa.
Não reescrever o histórico público nem trocar a visibilidade sem decisão específica do proprietário.

A checagem agendada da API é best effort. Render Free suspende após 15 minutos sem tráfego; GitHub Actions pode atrasar ou desativar agendamentos por inatividade.
Fontes: https://render.com/docs/free e https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
