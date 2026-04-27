const isDev = process.env['NODE_ENV'] !== 'production';

function ts() {
  return new Date().toISOString();
}

function structured(level: string, msg: string, meta?: unknown) {
  return JSON.stringify({ level, timestamp: ts(), msg, ...(meta !== undefined && { meta }) });
}

export const logger = {
  info(msg: string, meta?: unknown) {
    if (isDev) {
      console.log(`\x1b[32m[${ts()}] INFO\x1b[0m ${msg}`, meta ?? '');
    } else {
      console.log(structured('info', msg, meta));
    }
  },
  warn(msg: string, meta?: unknown) {
    if (isDev) {
      console.warn(`\x1b[33m[${ts()}] WARN\x1b[0m ${msg}`, meta ?? '');
    } else {
      console.warn(structured('warn', msg, meta));
    }
  },
  error(msg: string, meta?: unknown) {
    if (isDev) {
      console.error(`\x1b[31m[${ts()}] ERROR\x1b[0m ${msg}`, meta ?? '');
    } else {
      console.error(structured('error', msg, meta));
    }
  },
};
