import { Request, Response, NextFunction } from 'express';

import * as AuthService from '../services/auth.service';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await AuthService.register(req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await AuthService.login(req.body);
    res.json(result);
  } catch (err) { next(err); }
}

export async function logout(_req: Request, res: Response) {
  res.json({ message: 'Logout realizado com sucesso' });
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await AuthService.getMe(req.user!.userId);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }
    res.json(user);
  } catch (err) { next(err); }
}
