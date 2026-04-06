import { Router } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { Request } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import * as UploadsController from '../controllers/uploads.controller';

const storage = multer.diskStorage({
  destination: 'uploads/',
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
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router();

router.use(authMiddleware);

router.post('/',             upload.single('file'), UploadsController.upload);
router.get('/',              UploadsController.list);
router.get('/:id',           UploadsController.getById);
router.get('/:id/mapping',   UploadsController.getMapping);
router.post('/:id/mapping',  UploadsController.confirmMapping);

router.use((err: any, _req: Request, res: any, _next: any) => {
  if (err instanceof multer.MulterError || err.message) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: 'Erro interno no upload' });
});

export default router;
