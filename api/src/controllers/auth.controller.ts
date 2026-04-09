import { Request, Response } from 'express';
import * as AuthService from '../services/auth.service';

export async function register(req: Request, res: Response) {
  try {
    const result = await AuthService.register(req.body);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const result = await AuthService.login(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
}

export async function logout(_req: Request, res: Response) {
  res.json({ message: 'Logout realizado com sucesso' });
}

export async function me(req: Request, res: Response) {
  try {
    const user = await AuthService.getMe(req.user!.userId);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
