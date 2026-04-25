# Prisma BI — API

Backend multi-tenant para análise de vendas no varejo. Processa uploads de planilhas CSV/Excel, detecta anomalias, calcula KPIs e expõe endpoints REST para um dashboard analítico.

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 24 + TypeScript 5 (strict) |
| Framework | Express 5 |
| ORM | Prisma 7 + `@prisma/adapter-pg` |
| Banco de dados | PostgreSQL |
| Filas | BullMQ 5 + Redis |
| Validação | Zod 4 |
| Autenticação | JWT (jsonwebtoken) + bcryptjs |
| Upload | Multer |
| Relatórios | PDFKit + ExcelJS |
| Testes | Vitest + supertest |

## Arquitetura

```
Requisição HTTP
  └─► Route         (src/routes/)
        └─► Middleware (auth, admin, validate)
              └─► Controller (src/controllers/)
                    └─► Service (src/services/)
                          └─► Prisma ORM
                                └─► PostgreSQL

Upload CSV/Excel
  └─► uploads.controller
        └─► BullMQ queue (upload-processing)
              └─► upload.worker
                    ├─► fuzzy column mapping (src/utils/fuzzy.ts)
                    ├─► Sale records (bulk upsert)
                    ├─► DailyMetrics (pre-computed)
                    └─► Anomaly detection
```

## Variáveis de ambiente

Crie um arquivo `.env` na raiz de `api/`:

```env
# Banco de dados
DATABASE_URL=postgresql://user:password@localhost:5432/prisma_bi

# Auth
JWT_SECRET=seu-segredo-com-no-minimo-16-chars
JWT_EXPIRES_IN=7d

# Redis (BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379

# Servidor
PORT=3001
NODE_ENV=development

# Upload
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=10
```

## Rodando localmente

```bash
# 1. Instalar dependências
npm install

# 2. Subir banco e Redis (Docker)
docker compose up -d

# 3. Rodar migrações
npm run db:migrate

# 4. Gerar o Prisma Client
npm run db:generate

# 5. Iniciar em modo desenvolvimento
npm run dev
```

A API estará disponível em `http://localhost:3001`.

## Testes

```bash
# Rodar todos os testes
npm test

# Modo watch
npm run test:watch

# Com cobertura
npm run test:coverage
```

Os testes de integração mockam o Prisma via `vi.mock` e usam um JWT real assinado com a chave de teste definida em `src/tests/setup.ts`.

## Build e produção

```bash
npm run build
npm start
```

O output compilado fica em `dist/`. O entry point é `dist/src/server.js`.

## Endpoints

Todos os endpoints (exceto `/health`, `/api/auth/register` e `/api/auth/login`) requerem o header:

```
Authorization: Bearer <token>
```

### Auth

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/api/auth/register` | Público | Registra novo tenant + usuário admin |
| POST | `/api/auth/login` | Público | Login com CNPJ + email + senha |
| GET | `/api/auth/me` | Autenticado | Dados do usuário logado |

### Tenant

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/api/tenant` | Autenticado | Dados do tenant |
| PUT | `/api/tenant` | Admin | Atualiza nome/plano do tenant |

### Usuários

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/api/users` | Autenticado | Lista usuários do tenant |
| GET | `/api/users/:id` | Autenticado | Busca usuário por ID |
| PUT | `/api/users/:id` | Admin | Atualiza usuário |
| DELETE | `/api/users/:id` | Admin | Remove usuário |

### Filiais

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/api/branches` | Autenticado | Lista filiais |
| POST | `/api/branches` | Admin | Cria filial |
| GET | `/api/branches/:id` | Autenticado | Busca filial por ID |
| PUT | `/api/branches/:id` | Admin | Atualiza filial |
| DELETE | `/api/branches/:id` | Admin | Remove filial |

### Uploads

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/api/uploads` | Autenticado | Envia arquivo CSV/Excel |
| GET | `/api/uploads` | Autenticado | Lista uploads do tenant |
| GET | `/api/uploads/:id` | Autenticado | Status de um upload |
| GET | `/api/uploads/:id/mapping` | Autenticado | Mapeamento sugerido de colunas |
| POST | `/api/uploads/:id/mapping` | Autenticado | Confirma mapeamento e processa |

### Dashboard

Todos aceitam query params: `?branchId=&from=YYYY-MM-DD&to=YYYY-MM-DD`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/dashboard/kpis` | Receita, custo, lucro, ROI, margem, anomalias |
| GET | `/api/dashboard/sales-timeline` | Vendas mensais: ano atual vs anterior |
| GET | `/api/dashboard/top-products` | Produtos mais rentáveis (Pareto 80%) |
| GET | `/api/dashboard/branches-ranking` | Ranking de filiais por receita |
| GET | `/api/dashboard/projection` | Projeção de fechamento do mês (regressão linear) |

### Anomalias

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/anomalies` | Lista anomalias (`?branchId=&from=&to=`) |
| GET | `/api/anomalies/:id` | Detalhes de uma anomalia |

### Métricas diárias

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/metrics/daily` | Métricas pré-computadas por dia (`?branchId=&from=&to=`) |

### Relatórios

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/reports/pdf` | Relatório em PDF (`?branchId=&from=&to=`) |
| GET | `/api/reports/excel` | Relatório em Excel (`?branchId=&from=&to=`) |

### Audit logs

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/api/audit-logs` | Admin | Histórico de ações (`?userId=&from=&to=&page=1&limit=50`) |

### Health check

```
GET /health  →  { "status": "ok" }
```

## Modelo de dados

```
Tenant  1──n  User
        1──n  Branch
        1──n  Sale
        1──n  RawUpload
        1──n  DailyMetrics
        1──n  Anomaly
        1──n  AuditLog
```

- **Tenant** — empresa cliente (multi-tenant por `tenant_id` em todas as tabelas)
- **Branch** — filial com meta mensal
- **Sale** — venda individual (importada via upload)
- **RawUpload** — controle de upload e mapeamento de colunas
- **DailyMetrics** — métricas pré-computadas por dia/filial
- **Anomaly** — venda com desvio estatístico detectado pelo worker
- **AuditLog** — registro de ações administrativas

## Segurança

- Rate limiting em todos os endpoints públicos (bypass em `NODE_ENV=test`)
- Validação de body com Zod em todas as rotas de escrita
- Senhas armazenadas com bcrypt (cost factor 12)
- Tokens JWT com expiração configurável
- Separação de roles: `ADMIN` (acesso total) e `EDITOR` (somente leitura em recursos sensíveis)
- Tamanho máximo de body: 1 MB (configura `MAX_FILE_SIZE_MB` para uploads)
