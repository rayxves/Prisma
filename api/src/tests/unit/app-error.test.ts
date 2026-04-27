import { describe, it, expect } from 'vitest';
import {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
} from '../../shared/errors/app-error';

describe('AppError hierarchy', () => {
  it('AppError stores message, statusCode and code', () => {
    const err = new AppError('something failed', 418, 'TEAPOT');
    expect(err.message).toBe('something failed');
    expect(err.statusCode).toBe(418);
    expect(err.code).toBe('TEAPOT');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it('NotFoundError defaults to 404 NOT_FOUND', () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Recurso não encontrado');
    expect(err).toBeInstanceOf(AppError);
  });

  it('NotFoundError accepts custom message', () => {
    const err = new NotFoundError('Filial não encontrada');
    expect(err.message).toBe('Filial não encontrada');
  });

  it('ValidationError is 422 VALIDATION_ERROR', () => {
    const err = new ValidationError('campo obrigatório');
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('UnauthorizedError defaults to 401 UNAUTHORIZED', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('ForbiddenError is 403 FORBIDDEN', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('ConflictError is 409 CONFLICT', () => {
    const err = new ConflictError('CNPJ já cadastrado');
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT');
    expect(err.message).toBe('CNPJ já cadastrado');
  });

  it('instanceof checks work across subclasses', () => {
    const errors = [
      new NotFoundError(),
      new ValidationError('x'),
      new UnauthorizedError(),
      new ForbiddenError(),
      new ConflictError('x'),
    ];
    for (const e of errors) {
      expect(e).toBeInstanceOf(AppError);
      expect(e).toBeInstanceOf(Error);
    }
  });

  it('name property matches constructor name', () => {
    expect(new NotFoundError().name).toBe('NotFoundError');
    expect(new ConflictError('x').name).toBe('ConflictError');
  });
});
