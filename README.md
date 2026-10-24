# CoopServe

Protótipo mobile-first de uma plataforma cooperativa de serviços, conectando clientes a profissionais associados e verificados.

## Protótipo atual

Fluxo navegável com dados fictícios:

- Boas-vindas
- Login
- Home
- Categorias
- Serviços
- Lista de profissionais
- Perfil do associado
- Solicitação de orçamento
- Meus pedidos
- Favoritos
- Perfil do cliente

## Tecnologias

- React
- JavaScript
- Vite
- CSS
- Lucide React

## Executar localmente

```bash
npm install
npm run dev
```

O protótipo ainda não possui backend ou autenticação real. Nesta etapa, o objetivo é validar navegação, experiência e identidade visual antes da implementação da API e banco de dados.


## Publicação automática no GitHub Pages

O workflow `.github/workflows/deploy-pages.yml` compila e publica a cada push na branch `main`. Também pode ser iniciado em Actions > Deploy CoopServe to GitHub Pages > Run workflow.

1. Em Settings > Pages, selecione **GitHub Actions** em Build and deployment > Source.
2. Acompanhe o workflow na aba Actions. Se houver aprovação do ambiente github-pages, aprove o deployment.
3. Após o deploy concluir, acesse https://joaoelima.github.io/cooperativadeservi-os/.

O repositório deve permanecer privado. GitHub Pages em repositório privado requer um plano compatível (para conta pessoal, GitHub Pro). Se Pages solicitar upgrade, ajuste o plano sem mudar a visibilidade. O site publicado pode ser público mesmo com o código em repositório privado.

Para reproduzir o build: `npm ci` e `npm run build`. Para verificar localmente a versão compilada: `npm run preview` e abra o endereço com o caminho `/cooperativadeservi-os/`.


## Cadastro e login reais

A primeira integração utiliza MongoDB Atlas e um Web Service Node.js no Render, servindo a interface e a API na mesma origem. Veja [configuração, segurança e limites](docs/AUTENTICACAO.md). O GitHub Pages continua como demonstração.


## Fluxo funcional

Consulte docs/FLUXO_FUNCIONAL.md para as funcionalidades atuais, regras e limitações. O fluxo conectado usa Atlas e Render; o Pages é apenas demonstração.
