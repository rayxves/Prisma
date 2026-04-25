import { Request, Response, NextFunction } from 'express';

import * as UploadsService from '../services/uploads.service';

export async function upload(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Nenhum arquivo enviado' });
      return;
    }
    const result = await UploadsService.createUpload(
      req.user!.tenantId,
      req.user!.userId,
      req.file.filename,
      req.file.originalname,
    );
    res.status(202).json({ message: 'Arquivo recebido e enfileirado para processamento', uploadId: result.id });
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const uploads = await UploadsService.listUploads(req.user!.tenantId);
    res.json(uploads);
  } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const upload = await UploadsService.getUploadById(req.user!.tenantId, req.params['id'] as string);
    res.json(upload);
  } catch (err) { next(err); }
}

export async function getMapping(req: Request, res: Response, next: NextFunction) {
  try {
    const mapping = await UploadsService.getColumnMapping(req.user!.tenantId, req.params['id'] as string);
    res.json(mapping);
  } catch (err) { next(err); }
}

export async function confirmMapping(req: Request, res: Response, next: NextFunction) {
  try {
    const { mapping, branchId } = req.body as { mapping: Record<string, string>; branchId: string };
    const result = await UploadsService.confirmMapping(
      req.user!.tenantId,
      req.params['id'] as string,
      mapping,
      branchId,
    );
    res.json(result);
  } catch (err) { next(err); }
}
