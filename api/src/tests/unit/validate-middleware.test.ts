import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../../shared/middlewares/validate.middleware';

function makeReqRes(body: unknown) {
  const req = { body } as Request;
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const res = { status, json } as unknown as Response;
  const next: NextFunction = vi.fn();
  return { req, res, status, json, next };
}

const schema = z.object({
  name:  z.string().min(1),
  email: z.email(),
  age:   z.number().int().positive(),
});

describe('validate middleware', () => {
  it('calls next() and sets req.body when valid', () => {
    const { req, res, next } = makeReqRes({ name: 'Ana', email: 'ana@test.com', age: 25 });
    validate(schema)(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.body).toEqual({ name: 'Ana', email: 'ana@test.com', age: 25 });
  });

  it('returns 422 when body is invalid', () => {
    const { req, res, status, next } = makeReqRes({ name: '', email: 'not-an-email', age: -1 });
    validate(schema)(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(422);
  });

  it('422 response includes error details array', () => {
    const { req, res, status, json, next } = makeReqRes({ name: '', age: 'x' });
    validate(schema)(req, res, next);
    expect(status).toHaveBeenCalledWith(422);
    const body = json.mock.calls[0]?.[0] as { error: string; details: unknown[] };
    expect(body.error).toBe('Dados inválidos');
    expect(Array.isArray(body.details)).toBe(true);
    expect((body.details as { field: string }[]).length).toBeGreaterThan(0);
  });

  it('strips unknown fields (Zod strips by default)', () => {
    const { req, res, next } = makeReqRes({
      name: 'Bob', email: 'bob@test.com', age: 30, extra: 'hacker',
    });
    validate(schema)(req, res, next);
    expect(next).toHaveBeenCalled();
    expect((req.body as Record<string, unknown>)['extra']).toBeUndefined();
  });

  it('returns 422 for missing required fields', () => {
    const { req, res, status, next } = makeReqRes({});
    validate(schema)(req, res, next);
    expect(status).toHaveBeenCalledWith(422);
    expect(next).not.toHaveBeenCalled();
  });

  it('detail field path matches failing key', () => {
    const { req, res, json } = makeReqRes({ name: 'ok', email: 'ok@test.com', age: -5 });
    validate(schema)(req, res, vi.fn());
    const body = json.mock.calls[0]?.[0] as { details: { field: string }[] };
    const fields = body.details.map((d) => d.field);
    expect(fields).toContain('age');
  });
});
