import { Request, Response, NextFunction } from 'express';

import * as BranchesService from '../services/branches.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const branches = await BranchesService.listBranches(req.user!.tenantId);
    res.json(branches);
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const branch = await BranchesService.createBranch(req.user!.tenantId, req.body);
    res.status(201).json(branch);
  } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const branch = await BranchesService.getBranchById(req.user!.tenantId, req.params['id'] as string);
    res.json(branch);
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const branch = await BranchesService.updateBranch(req.user!.tenantId, req.params['id'] as string, req.body);
    res.json(branch);
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await BranchesService.deleteBranch(req.user!.tenantId, req.params['id'] as string);
    res.status(204).send();
  } catch (err) { next(err); }
}
