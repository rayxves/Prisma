import { Request, Response, NextFunction } from 'express';

import jwt from 'jsonwebtoken';

import { env } from '../config/env';

export interface AuthPayload {
  userId:   string;
  tenantId: string;
  role:     string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Token não fornecido' });
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expirado', code: 'TOKEN_EXPIRED' });
    } else {
      res.status(403).json({ error: 'Token inválido', code: 'TOKEN_INVALID' });
    }
  }
}
