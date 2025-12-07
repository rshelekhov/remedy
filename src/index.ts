import './infrastructure/sso/client';
import app from './app';
import { config, NODE_ENV } from './config/config';

const env = config.isDev ? NODE_ENV.DEV : config.isProd ? NODE_ENV.PROD : NODE_ENV.LOCAL;

console.log(`Starting server in ${env} mode on port ${config.port}`);

Bun.serve({
  fetch: app.fetch,
  port: config.port,
});
