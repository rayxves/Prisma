import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    tenant:   { findUnique: vi.fn().mockResolvedValue(null) },
    user:     { findUnique: vi.fn() },
    branch:   { findMany: vi.fn().mockResolvedValue([]) },
    auditLog: { create: vi.fn() },
  },
}));

import app from '../../app';

const SECRET     = process.env['JWT_SECRET'] ?? '';
const VALID_CNPJ = '11222333000181';

function userToken() {
  return jwt.sign({ userId: 'u1', tenantId: 't1', role: 'USER' }, SECRET);
}

describe('Security: authentication checks', () => {
  const PROTECTED_ROUTES = [
    { method: 'get', path: '/api/branches' },
    { method: 'get', path: '/api/auth/me' },
    { method: 'get', path: '/api/dashboard/kpis' },
    { method: 'get', path: '/api/anomalies' },
    { method: 'get', path: '/api/audit-logs' },
  ] as const;

  type AgentFn = (path: string) => request.Test;

  function call(method: string, path: string): request.Test {
    const agent = request(app) as unknown as Record<string, AgentFn>;
    const fn    = agent[method];
    if (!fn) throw new Error(`supertest has no method: ${method}`);
    return fn(path);
  }

  for (const { method, path } of PROTECTED_ROUTES) {
    it(`${method.toUpperCase()} ${path} — rejects missing token with 401`, async () => {
      const res = await call(method, path);
      expect(res.status).toBe(401);
    });

    it(`${method.toUpperCase()} ${path} — rejects garbage token with 403`, async () => {
      const res = await call(method, path)
        .set('Authorization', 'Bearer garbage.token.here');
      expect(res.status).toBe(403);
    });
  }

  it('rejects expired token with 401 TOKEN_EXPIRED', async () => {
    const expired = jwt.sign(
      { userId: 'u1', tenantId: 't1', role: 'ADMIN' },
      SECRET,
      { expiresIn: -1 },
    );
    const res = await request(app)
      .get('/api/branches')
      .set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_EXPIRED');
  });

  it('rejects token signed with wrong secret with 403', async () => {
    const badToken = jwt.sign(
      { userId: 'u1', tenantId: 't1', role: 'ADMIN' },
      Buffer.from('mismatch').toString(),
    );
    const res = await request(app)
      .get('/api/branches')
      .set('Authorization', `Bearer ${badToken}`);
    expect(res.status).toBe(403);
  });

  it('rejects Bearer with empty token with 401', async () => {
    const res = await request(app)
      .get('/api/branches')
      .set('Authorization', 'Bearer ');
    expect(res.status).toBe(401);
  });
});

describe('Security: input validation (injection attempts)', () => {
  it('does not return 500 for SQL-injection-like password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ cnpj: VALID_CNPJ, email: 'a@b.com', password: "' OR '1'='1" });
    expect(res.status).not.toBe(500);
  });

  it('rejects oversized JSON body with 413', async () => {
    const huge = 'A'.repeat(2 * 1024 * 1024);
    const res  = await request(app)
      .post('/api/auth/register')
      .send({ companyName: huge, cnpj: VALID_CNPJ, adminName: 'X', email: 'a@b.com', password: 'Pass123!' });
    expect(res.status).toBe(413);
  });

  it('health endpoint requires no auth', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Security: admin-only endpoints', () => {
  it('POST /api/branches returns 403 for non-admin', async () => {
    const res = await request(app)
      .post('/api/branches')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({ name: 'X', city: 'SP', state: 'SP', monthlyGoal: 1000 });
    expect(res.status).toBe(403);
  });

  it('DELETE /api/branches/:id returns 403 for non-admin', async () => {
    const res = await request(app)
      .delete('/api/branches/some-id')
      .set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(403);
  });
});
