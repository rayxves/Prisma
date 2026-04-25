import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    branch: {
      findMany:  vi.fn(),
      create:    vi.fn(),
      findFirst: vi.fn(),
      update:    vi.fn(),
      delete:    vi.fn(),
    },
    auditLog: { create: vi.fn() },
  },
}));

import app from '../../app';
import { prisma } from '../../lib/prisma';

const mBranch = (prisma as unknown as {
  branch: {
    findMany:  ReturnType<typeof vi.fn>;
    create:    ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update:    ReturnType<typeof vi.fn>;
    delete:    ReturnType<typeof vi.fn>;
  };
}).branch;

const SECRET = process.env['JWT_SECRET'] ?? '';

function makeToken(role = 'ADMIN') {
  return jwt.sign({ userId: 'user-1', tenantId: 'tenant-1', role }, SECRET);
}

const SAMPLE_BRANCH = {
  id:          'branch-1',
  name:        'Filial Centro',
  city:        'São Paulo',
  state:       'SP',
  monthlyGoal: 50000,
  createdAt:   new Date().toISOString(),
};

const VALID_BRANCH_BODY = {
  name:        'Filial Centro',
  city:        'São Paulo',
  state:       'SP',
  monthlyGoal: 50000,
};

beforeEach(() => {
  vi.clearAllMocks();
  (prisma as unknown as { auditLog: { create: ReturnType<typeof vi.fn> } }).auditLog.create
    .mockResolvedValue({});
});

describe('GET /api/branches', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/branches');
    expect(res.status).toBe(401);
  });

  it('returns 200 with branch list', async () => {
    mBranch.findMany.mockResolvedValue([SAMPLE_BRANCH]);
    const res = await request(app)
      .get('/api/branches')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].name).toBe('Filial Centro');
  });
});

describe('POST /api/branches', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/branches').send(VALID_BRANCH_BODY);
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin role', async () => {
    const res = await request(app)
      .post('/api/branches')
      .set('Authorization', `Bearer ${makeToken('USER')}`)
      .send(VALID_BRANCH_BODY);
    expect(res.status).toBe(403);
  });

  it('returns 201 on success', async () => {
    mBranch.create.mockResolvedValue(SAMPLE_BRANCH);
    const res = await request(app)
      .post('/api/branches')
      .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
      .send(VALID_BRANCH_BODY);
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Filial Centro');
  });

  it('returns 422 for invalid state code', async () => {
    const res = await request(app)
      .post('/api/branches')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ ...VALID_BRANCH_BODY, state: 'XX' });
    expect(res.status).toBe(422);
  });

  it('returns 422 when monthlyGoal is negative', async () => {
    const res = await request(app)
      .post('/api/branches')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ ...VALID_BRANCH_BODY, monthlyGoal: -100 });
    expect(res.status).toBe(422);
  });

  it('returns 422 when required fields missing', async () => {
    const res = await request(app)
      .post('/api/branches')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({});
    expect(res.status).toBe(422);
  });
});

describe('GET /api/branches/:id', () => {
  it('returns 200 when branch exists for tenant', async () => {
    mBranch.findFirst.mockResolvedValue(SAMPLE_BRANCH);
    const res = await request(app)
      .get('/api/branches/branch-1')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('branch-1');
  });

  it('returns 404 when branch not found', async () => {
    mBranch.findFirst.mockResolvedValue(null);
    const res = await request(app)
      .get('/api/branches/nonexistent')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('PUT /api/branches/:id', () => {
  it('returns 200 on valid update', async () => {
    mBranch.findFirst.mockResolvedValue(SAMPLE_BRANCH);
    mBranch.update.mockResolvedValue({ ...SAMPLE_BRANCH, name: 'Filial Norte' });
    const res = await request(app)
      .put('/api/branches/branch-1')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: 'Filial Norte' });
    expect(res.status).toBe(200);
  });

  it('returns 404 when branch not found', async () => {
    mBranch.findFirst.mockResolvedValue(null);
    const res = await request(app)
      .put('/api/branches/ghost')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: 'Nova Filial' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/branches/:id', () => {
  it('returns 204 on success', async () => {
    mBranch.findFirst.mockResolvedValue(SAMPLE_BRANCH);
    mBranch.delete.mockResolvedValue(SAMPLE_BRANCH);
    const res = await request(app)
      .delete('/api/branches/branch-1')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(204);
  });

  it('returns 404 when branch not found', async () => {
    mBranch.findFirst.mockResolvedValue(null);
    const res = await request(app)
      .delete('/api/branches/ghost')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(404);
  });
});
