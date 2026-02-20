# Backend - Sistema de Gestão de Qualidade do Ar

API RESTful para o Sistema de Gestão de Qualidade do Ar da Acoem Brasil.

## 🚀 Início Rápido

### Pré-requisitos
- Node.js 18+
- SQL Server 2019+ (ou SQL Server Express)
- npm ou yarn

### Instalação

```bash
# 1. Entrar na pasta do backend
cd backend

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
# Edite o arquivo .env com suas credenciais do SQL Server

# 4. Criar o banco de dados no SQL Server
# Execute no SQL Server Management Studio:
CREATE DATABASE qualidade_ar;

# 5. Criar as tabelas
npm run db:sync

# 6. Popular com dados iniciais
npm run db:seed

# 7. Iniciar o servidor
npm run dev
```

## 📚 Documentação da API

### Base URL
```
http://localhost:3000/api
```

### Autenticação

A API usa JWT (JSON Web Token). Após login, inclua o token no header:
```
Authorization: Bearer <seu_token_aqui>
```

### Endpoints

#### 🔐 Autenticação

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/auth/login` | Login |
| POST | `/auth/refresh` | Renovar token |
| POST | `/auth/logout` | Logout |
| GET | `/auth/me` | Dados do usuário logado |
| PUT | `/auth/alterar-senha` | Alterar senha |

**Login:**
```json
POST /api/auth/login
{
  "email": "admin@acoem.com.br",
  "senha": "admin123"
}
```

#### 👥 Usuários

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/usuarios` | Listar usuários | admin, supervisor |
| GET | `/usuarios/:id` | Buscar por ID | admin, supervisor |
| POST | `/usuarios` | Criar usuário | admin |
| PUT | `/usuarios/:id` | Atualizar | admin |
| DELETE | `/usuarios/:id` | Desativar | admin |

#### 📡 Estações

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/estacoes` | Listar estações |
| GET | `/estacoes/mapa` | Dados para mapa |
| GET | `/estacoes/:id` | Buscar por ID |
| GET | `/estacoes/:id/status` | Status da estação |
| POST | `/estacoes` | Criar estação |
| PUT | `/estacoes/:id` | Atualizar |
| DELETE | `/estacoes/:id` | Desativar |

#### 📊 Medições

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/medicoes` | Listar medições |
| GET | `/medicoes/tempo-real` | Medições em tempo real |
| GET | `/medicoes/estatisticas` | Estatísticas |
| GET | `/medicoes/estacao/:id` | Medições de uma estação |
| POST | `/medicoes` | Registrar medição |
| POST | `/medicoes/batch` | Registrar em lote |

**Filtros disponíveis:**
```
GET /api/medicoes?estacao_id=1&parametro=PM2.5&data_inicio=2026-01-01&data_fim=2026-02-12&flag=valid
```

#### ⚠️ Alertas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/alertas` | Listar alertas |
| GET | `/alertas/ativos` | Alertas não resolvidos |
| GET | `/alertas/:id` | Buscar por ID |
| PUT | `/alertas/:id/ler` | Marcar como lido |
| PUT | `/alertas/:id/resolver` | Resolver alerta |
| POST | `/alertas` | Criar alerta |

#### 📈 Dashboard & IQAr

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/dashboard` | Dados consolidados |
| GET | `/dashboard/resumo` | Resumo rápido |
| GET | `/iqar` | IQAr de todas estações |
| GET | `/iqar/estacao/:id` | IQAr de uma estação |

#### 🏭 Unidades e Parâmetros

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/unidades` | Listar unidades |
| GET | `/parametros` | Listar parâmetros |

## 🔧 Scripts Disponíveis

```bash
npm start        # Inicia em produção
npm run dev      # Inicia com hot-reload
npm run db:sync  # Sincroniza/cria tabelas
npm run db:seed  # Popula dados iniciais
npm test         # Executa testes
```

## 👤 Usuários Padrão

Após executar os seeds:

| Email | Senha | Role |
|-------|-------|------|
| admin@acoem.com.br | admin123 | admin |
| analista@acoem.com.br | 123456 | analista |

## 🗃️ Estrutura do Banco de Dados

### Tabelas
- `usuarios` - Usuários do sistema
- `unidades` - Refinarias/unidades
- `estacoes` - Estações de monitoramento
- `parametros` - Parâmetros de qualidade (PM2.5, O3, etc.)
- `medicoes` - Dados de medições
- `alertas` - Alertas do sistema

## 📁 Estrutura de Pastas

```
backend/
├── src/
│   ├── config/          # Configurações
│   ├── controllers/     # Lógica dos endpoints
│   ├── database/        # Conexão e seeds
│   ├── middlewares/     # Auth, validação
│   ├── models/          # Modelos Sequelize
│   ├── routes/          # Definição de rotas
│   ├── services/        # Serviços (IQAr, etc.)
│   └── server.js        # Entrada principal
├── .env                 # Variáveis de ambiente
├── .env.example         # Exemplo de configuração
└── package.json
```

## 🌡️ Cálculo do IQAr

O IQAr é calculado seguindo as normas CONAMA:

```
IQAr = ((Imax - Imin) / (Cmax - Cmin)) × (C - Cmin) + Imin
```

### Faixas de Classificação

| Classificação | IQAr | Cor |
|---------------|------|-----|
| Bom | 0-40 | Verde |
| Moderado | 41-80 | Amarelo |
| Ruim | 81-120 | Laranja |
| Muito Ruim | 121-200 | Vermelho |
| Péssimo | >200 | Roxo |

## 🔒 Segurança

- Senhas hasheadas com bcrypt (12 rounds)
- JWT com expiração de 15 minutos
- Refresh token válido por 7 dias
- Rate limiting: 100 req/15min
- Helmet para headers de segurança
- CORS configurável

## 📝 Exemplo de Uso

```javascript
// Login
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@acoem.com.br',
    senha: 'admin123'
  })
});

const { dados } = await response.json();
const token = dados.accessToken;

// Buscar dashboard
const dashboard = await fetch('http://localhost:3000/api/dashboard', {
  headers: { 'Authorization': `Bearer ${token}` }
});

console.log(await dashboard.json());
```

## 🛠️ Tecnologias

- **Runtime:** Node.js
- **Framework:** Express.js
- **ORM:** Sequelize
- **Banco:** SQL Server
- **Auth:** JWT (jsonwebtoken)
- **Segurança:** bcryptjs, helmet, cors
- **Validação:** express-validator

## 📄 Licença

MIT - Acoem Brasil
