import express, { Request, Response, NextFunction } from 'express';

import { env } from './config/env';
import { logger } from './config/logger';
import { AppError } from './shared/errors/app-error';
import authRoutes      from './routes/auth.routes';
import tenantRoutes    from './routes/tenant.routes';
import usersRoutes     from './routes/users.routes';
import branchesRoutes  from './routes/branches.routes';
import uploadsRoutes   from './routes/uploads.routes';
import dashboardRoutes from './routes/dashboard.routes';
import anomaliesRoutes from './routes/anomalies.routes';
import metricsRoutes   from './routes/metrics.routes';
import reportsRoutes   from './routes/reports.routes';
import auditLogsRoutes from './routes/audit-logs.routes';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  const start = Date.now();
  _res.on('finish', () => {
    logger.info(`${req.method} ${req.path} ${_res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

app.use('/api/auth',       authRoutes);
app.use('/api/tenant',     tenantRoutes);
app.use('/api/users',      usersRoutes);
app.use('/api/branches',   branchesRoutes);
app.use('/api/uploads',    uploadsRoutes);
app.use('/api/dashboard',  dashboardRoutes);
app.use('/api/anomalies',  anomaliesRoutes);
app.use('/api/metrics',    metricsRoutes);
app.use('/api/reports',    reportsRoutes);
app.use('/api/audit-logs', auditLogsRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }

  if (
    err instanceof Error &&
    'status' in err &&
    typeof (err as { status: unknown }).status === 'number'
  ) {
    const httpErr = err as Error & { status: number };
    res.status(httpErr.status).json({ error: err.message });
    return;
  }

  const isDev = env.NODE_ENV !== 'production';

  if (err instanceof Error) {
    logger.error(err.message, { stack: err.stack });
    res.status(500).json({ error: isDev ? err.message : 'Erro interno do servidor' });
  } else {
    logger.error('Erro desconhecido', { err });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default app;
