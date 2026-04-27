import path from 'node:path';

import { Router, Request } from 'express';
import multer, { FileFilterCallback } from 'multer';

import { env } from '../config/env';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../shared/middlewares/validate.middleware';
import { confirmMappingSchema } from '../schemas/upload.schema';
import * as UploadsController from '../controllers/uploads.controller';

const storage = multer.diskStorage({
  destination: env.UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

function fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback) {
  const allowed = ['.csv', '.xlsx', '.xls'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos CSV, XLS e XLSX são permitidos'));
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024 },
});

const router = Router();

router.use(authMiddleware);

router.post('/',            upload.single('file'), UploadsController.upload);
router.get('/',             UploadsController.list);
router.get('/:id',          UploadsController.getById);
router.get('/:id/mapping',  UploadsController.getMapping);
router.post('/:id/mapping', validate(confirmMappingSchema), UploadsController.confirmMapping);

router.use((err: unknown, _req: Request, res: any, _next: any) => {
  if (err instanceof multer.MulterError || err instanceof Error) {
    res.status(400).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: 'Erro interno no upload' });
});

export default router;
