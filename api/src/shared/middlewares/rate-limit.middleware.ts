import rateLimit from 'express-rate-limit';

const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_MAX_REQUESTS = 10;

export const authRateLimit = rateLimit({
  windowMs: AUTH_WINDOW_MS,
  max:      AUTH_MAX_REQUESTS,
  message:  { error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders:   false,
  skip: () => process.env['NODE_ENV'] === 'test',
});
