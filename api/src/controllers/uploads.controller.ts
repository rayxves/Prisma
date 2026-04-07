import { Request, Response } from 'express';
import * as UploadsService from '../services/uploads.service';

export async function upload(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const result = await UploadsService.createUpload(
      req.user!.tenantId,
      req.user!.userId,
      req.file.filename,
      req.file.originalname
    );

    res.status(202).json({
      message: 'Arquivo recebido e enfileirado para processamento',
      uploadId: result.id,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function list(req: Request, res: Response) {
  try {
    const uploads = await UploadsService.listUploads(req.user!.tenantId);
    res.json(uploads);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function getById(req: Request, res: Response) {
  try {
    const upload = await UploadsService.getUploadById(req.user!.tenantId, req.params.id);
    res.json(upload);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
}

export async function getMapping(req: Request, res: Response) {
  try {
    const mapping = await UploadsService.getColumnMapping(req.user!.tenantId, req.params.id);
    res.json(mapping);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function confirmMapping(req: Request, res: Response) {
  try {
    if (!req.body.mapping || typeof req.body.mapping !== 'object') {
      return res.status(400).json({ error: 'Campo "mapping" é obrigatório e deve ser um objeto' });
    }

    const result = await UploadsService.confirmMapping(
      req.user!.tenantId,
      req.params.id,
      req.body.mapping
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
