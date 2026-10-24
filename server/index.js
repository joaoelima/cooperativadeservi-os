import { MongoClient } from 'mongodb';
import { createApp } from './app.js';
import { createStore } from './store.js';
import { hashPassword, newToken } from './security.js';

const production = process.env.NODE_ENV === 'production';
const uri = process.env.MONGODB_URI;
const origin = process.env.APP_ORIGIN || (production ? process.env.RENDER_EXTERNAL_URL || '' : 'http://localhost:5173');
if (!uri || !origin) throw new Error('Configure MONGODB_URI e APP_ORIGIN no ambiente do servidor.');
const parsedOrigin = new URL(origin);
if (parsedOrigin.origin !== origin || (production && parsedOrigin.protocol !== 'https:')) {
  throw new Error('APP_ORIGIN deve conter somente a origem, sem caminho ou barra final, e HTTPS em produção.');
}
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000, maxPoolSize: 10 });
try {
  await client.connect();
  const store = await createStore(client.db(process.env.MONGODB_DB || 'coopserve'));
  const dummyHash = await hashPassword(newToken());
  const app = createApp({ store, origin, production, dummyHash });
  const server = app.listen(Number(process.env.PORT) || 3000, '0.0.0.0', () => console.log('CoopServe API ready'));
  const close = () => server.close(async () => { await client.close(); process.exit(0); });
  process.on('SIGTERM', close);
  process.on('SIGINT', close);
} catch (error) {
  console.error('API startup failed', { name: error.name, code: error.code });
  await client.close();
  process.exitCode = 1;
}
