# Barber Shop Hub

**Barber Shop Hub** é uma plataforma online completa desenvolvida para conectar barbeiros e clientes de forma simples e eficiente. Oferece uma interface moderna e intuitiva para agendamento de horários, gerenciamento de serviços e descoberta das melhores barbearias.

## 🚀 Funcionalidades

## 💳 Integrações de Pagamento e Frete

O checkout foi integrado com **Mercado Pago** (meios de pagamento) e **Mercado Envios** (cotação de frete).

### Edge Functions criadas

- `mercado-envios-quote`
- `mercado-pago-create-preference`
- `mercado-pago-webhook`

### Secrets esperados no Supabase

- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_WEBHOOK_URL` (opcional)
- `MERCADO_PAGO_WEBHOOK_TOKEN` (opcional, recomendado para validar chamadas do webhook)
- `MERCADO_ENVIOS_API_URL` (opcional, padrão: API pública Mercado Envios)
- `MERCADO_ENVIOS_ACCESS_TOKEN` (opcional, quando o endpoint exigir autenticação)
- `FRONTEND_URL` (ex.: URL do Vercel/Netlify para retorno do pagamento)

### Como publicar funções

```bash
supabase functions deploy mercado-envios-quote
supabase functions deploy mercado-pago-create-preference
supabase functions deploy mercado-pago-webhook
```

### Para Clientes

- **Agendamento Fácil**: Encontre barbearias e agende horários instantaneamente.
- **Descoberta de Serviços**: Navegue por menus detalhados com preços e durações.
- **Perfis de Barbeiros**: Veja portfólios, avaliações e comentários dos barbeiros.
- **Notificações**: Receba lembretes para seus compromissos agendados.

### Para Barbearias

- **Gestão de Agendamentos**: Gerencie reservas, remarque e cancele horários.
- **Gestão de Serviços**: Crie e atualize os serviços oferecidos.
- **Personalização do Perfil**: Destaque sua marca com fotos e descrições detalhadas.
- **Gestão de Clientes**: Acompanhe o histórico dos seus clientes.

## 🛠️ Tecnologias Utilizadas

### Frontend

- **Framework**: [React](https://react.dev/)
- **Linguagem**: [TypeScript](https://www.typescriptlang.org/)
- **Estilização**: [Tailwind CSS](https://tailwindcss.com/)
- **Ícones**: [Lucide React](https://lucide.dev/)

### Backend

- **Framework**: [NestJS](https://nestjs.com/)
- **Linguagem**: [TypeScript](https://www.typescriptlang.org/)
- **Banco de Dados**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [Prisma](https://prisma.io/)
- **Autenticação**: [JWT](https://jwt.io/)

## 📂 Estrutura do Projeto

```
barber-shop-hub-1/
├── frontend/         # Aplicação cliente em React/TypeScript
├── backend/          # Aplicação servidor em NestJS/TypeScript
└── README.md         # Documentação do projeto
```

## 🚀 Como Começar

### Pré-requisitos

- [Node.js](https://nodejs.org/) (v18 ou superior)
- [PostgreSQL](https://www.postgresql.org/) (v14 ou superior)
- [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/)

### Instalação

1. **Clone o repositório**

   ```bash
   git clone <url-do-repositório>
   cd barber-shop-hub-1
   ```

2. **Configuração do Backend**

   ```bash
   cd backend
   npm install
   # Crie o arquivo .env baseado no .env.example
   # Configure a conexão com o banco de dados
   npx prisma migrate dev --name init
   npm run start:dev
   ```

3. **Configuração do Frontend**
   ```bash
   cd ../frontend
   npm install
   # Crie o arquivo .env baseado no .env.example
   # Configure a URL da API
   npm run dev
   ```

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir um Pull Request.

## 📄 Licença

Este projeto está licenciado sob a Licença MIT — veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Suporte

Para dúvidas ou problemas, por favor abra uma issue no repositório.

---

**Feito com ❤️ pela equipe Barber Shop Hub**
