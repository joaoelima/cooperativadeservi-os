import { build } from 'vite';
process.env.DEPLOY_TARGET = 'render';
process.env.VITE_AUTH_ENABLED = 'true';
await build();
