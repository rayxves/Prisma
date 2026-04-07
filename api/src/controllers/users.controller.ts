import { Request, Response } from 'express';
import * as UsersService from '../services/users.service';

export async function list(req: Request, res: Response) {
  try {
    const users = await UsersService.listUsers(req.user!.tenantId);
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function create(req: Request, res: Response) {
  try {
    const user = await UsersService.createUser(req.user!.tenantId, req.body);
    res.status(201).json(user);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function getById(req: Request, res: Response) {
  try {
    const user = await UsersService.getUserById(req.user!.tenantId, req.params.id);
    res.json(user);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
}

export async function update(req: Request, res: Response) {
  try {
    const user = await UsersService.updateUser(req.user!.tenantId, req.params.id, req.body);
    res.json(user);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function remove(req: Request, res: Response) {
  try {
    await UsersService.deleteUser(req.user!.tenantId, req.params.id);
    res.status(204).send();
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
}

export async function updatePassword(req: Request, res: Response) {
  try {
    const { currentPassword, newPassword } = req.body;
    await UsersService.updatePassword(
      req.user!.tenantId,
      req.params.id,
      req.user!.userId,
      req.user!.role,
      currentPassword,
      newPassword
    );
    res.json({ message: 'Senha atualizada com sucesso' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
