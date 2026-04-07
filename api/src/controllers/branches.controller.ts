import { Request, Response } from 'express';
import * as BranchesService from '../services/branches.service';

export async function list(req: Request, res: Response) {
  try {
    const branches = await BranchesService.listBranches(req.user!.tenantId);
    res.json(branches);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function create(req: Request, res: Response) {
  try {
    const branch = await BranchesService.createBranch(req.user!.tenantId, req.body);
    res.status(201).json(branch);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function getById(req: Request, res: Response) {
  try {
    const branch = await BranchesService.getBranchById(req.user!.tenantId, req.params.id);
    res.json(branch);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
}

export async function update(req: Request, res: Response) {
  try {
    const branch = await BranchesService.updateBranch(req.user!.tenantId, req.params.id, req.body);
    res.json(branch);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function remove(req: Request, res: Response) {
  try {
    await BranchesService.deleteBranch(req.user!.tenantId, req.params.id);
    res.status(204).send();
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
}
