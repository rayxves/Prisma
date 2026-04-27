import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn(),
      create:     vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $connect:    vi.fn(),
    $disconnect: vi.fn(),
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash:    vi.fn().mockResolvedValue('$hashed$'),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

import app from '../../app';
import { prisma } from '../../lib/prisma';

const mPrisma = prisma as unknown as {
  tenant: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  user:   { findUnique: ReturnType<typeof vi.fn> };
  auditLog: { create: ReturnType<typeof vi.fn> };
};

const VALID_CNPJ    = '11222333000181';
const VALID_PAYLOAD = {
  companyName: 'Empresa Teste',
  cnpj:        VALID_CNPJ,
  adminName:   'Admin Teste',
  email:       'admin@empresa.com',
  password:    'Senha123!',
};

beforeEach(() => {
  vi.clearAllMocks();
  mPrisma.auditLog.create.mockResolvedValue({});
});

describe('POST /api/auth/register', () => {
  it('returns 201 with tenantId and userId on success', async () => {
    mPrisma.tenant.findUnique.mockResolvedValue(null);
    mPrisma.tenant.create.mockResolvedValue({
      id:    'tenant-1',
      users: [{ id: 'user-1', name: 'Admin', email: 'admin@empresa.com', role: 'ADMIN' }],
    });

    const res = await request(app).post('/api/auth/register').send(VALID_PAYLOAD);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('tenantId');
    expect(res.body).toHaveProperty('userId');
  });

  it('returns 409 when CNPJ already exists', async () => {
    mPrisma.tenant.findUnique.mockResolvedValue({ id: 'existing' });

    const res = await request(app).post('/api/auth/register').send(VALID_PAYLOAD);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CONFLICT');
  });

  it('returns 422 when required fields are missing', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Dados inválidos');
  });

  it('returns 422 for invalid CNPJ format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...VALID_PAYLOAD, cnpj: '00000000000000' });
    expect(res.status).toBe(422);
  });

  it('returns 422 for weak password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...VALID_PAYLOAD, password: 'weak' });
    expect(res.status).toBe(422);
  });

  it('returns 422 for invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...VALID_PAYLOAD, email: 'not-an-email' });
    expect(res.status).toBe(422);
  });
});

describe('POST /api/auth/login', () => {
  const LOGIN_PAYLOAD = {
    cnpj:     VALID_CNPJ,
    email:    'admin@empresa.com',
    password: 'Senha123!',
  };

  it('returns 200 with token on valid credentials', async () => {
    mPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' });
    mPrisma.user.findUnique.mockResolvedValue({
      id:       'user-1',
      name:     'Admin',
      email:    'admin@empresa.com',
      role:     'ADMIN',
      password: '$hashed$',
      tenantId: 'tenant-1',
    });

    const res = await request(app).post('/api/auth/login').send(LOGIN_PAYLOAD);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.split('.').length).toBe(3);
  });

  it('returns 401 for unknown tenant (CNPJ not found)', async () => {
    mPrisma.tenant.findUnique.mockResolvedValue(null);

    const res = await request(app).post('/api/auth/login').send(LOGIN_PAYLOAD);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 for wrong email in tenant', async () => {
    mPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' });
    mPrisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app).post('/api/auth/login').send(LOGIN_PAYLOAD);
    expect(res.status).toBe(401);
  });

  it('returns 401 for wrong password', async () => {
    const bcrypt = (await import('bcryptjs')).default;
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never);

    mPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' });
    mPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1', email: 'admin@empresa.com', role: 'ADMIN',
      password: '$hashed$', tenantId: 'tenant-1',
    });

    const res = await request(app).post('/api/auth/login').send(LOGIN_PAYLOAD);
    expect(res.status).toBe(401);
  });

  it('returns 422 for missing cnpj field', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@empresa.com', password: 'Senha123!',
    });
    expect(res.status).toBe(422);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 when no token provided', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 403 when token is malformed', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not.a.valid.token');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('TOKEN_INVALID');
  });
});
