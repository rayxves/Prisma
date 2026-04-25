process.env['DATABASE_URL']  = 'postgresql://test:test@localhost:5432/test';
process.env['JWT_SECRET']    = 'super-secret-test-key-32chars!!';
process.env['REDIS_HOST']    = 'localhost';
process.env['REDIS_PORT']    = '6379';
process.env['NODE_ENV']      = 'test';
process.env['PORT']          = '3099';
process.env['JWT_EXPIRES_IN'] = '1h';
process.env['UPLOAD_DIR']    = '/tmp/prisma-test-uploads';
