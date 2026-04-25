import { Request, Response, NextFunction } from 'express';

import * as UsersService from '../services/users.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const users = await UsersService.listUsers(req.user!.tenantId);
    res.json(users);
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await UsersService.createUser(req.user!.tenantId, req.user!.userId, req.body);
    res.status(201).json(user);
  } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await UsersService.getUserById(req.user!.tenantId, req.params['id'] as string);
    res.json(user);
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await UsersService.updateUser(
      req.user!.tenantId,
      req.params['id'] as string,
      req.user!.userId,
      req.body,
    );
    res.json(user);
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await UsersService.deleteUser(req.user!.tenantId, req.params['id'] as string, req.user!.userId);
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function updatePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
    await UsersService.updatePassword(
      req.user!.tenantId,
      req.params['id'] as string,
      req.user!.userId,
      req.user!.role,
      currentPassword,
      newPassword,
    );
    res.json({ message: 'Senha atualizada com sucesso' });
  } catch (err) { next(err); }
}
