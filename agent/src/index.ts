import express from 'express';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { settingsService } from './services/settings';
import { WSServer } from './routes/ws';
import { transferEngine } from './services/transfer';
import { browseService } from './services/browse';

const currentDir = __dirname;

async function main() {
  const settings = settingsService.getSettings();
  
  const app = express();
  app.use(express.json());
  
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  app.get('/settings', (req, res) => {
    res.json(settingsService.getSettings());
  });

  app.post('/settings', (req, res) => {
    const updated = settingsService.updateSettings(req.body);
    res.json(updated);
  });

  app.get('/token', (req, res) => {
    res.json({ token: settingsService.getToken() });
  });

  app.post('/token/reset', (req, res) => {
    const token = settingsService.resetToken();
    res.json({ token });
  });

  const httpServer = createServer(app);
  
  const wsServer = new WSServer(transferEngine);
  
  await wsServer.start(settings.port);
  
  httpServer.listen(settings.port + 1, '127.0.0.1', () => {
    console.log(`HTTP server listening on http://127.0.0.1:${settings.port + 1}`);
    console.log('');
    console.log('========================================');
    console.log('File Transfer Agent Started');
    console.log('========================================');
    console.log(`WebSocket: ws://127.0.0.1:${settings.port}`);
    console.log(`HTTP API:  http://127.0.0.1:${settings.port + 1}`);
    console.log(`Auth Token: ${settings.token}`);
    console.log('========================================');
    console.log('');
    console.log('Add this token to the frontend to connect.');
  });

  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    wsServer.stop();
    httpServer.close();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\nShutting down...');
    wsServer.stop();
    httpServer.close();
    process.exit(0);
  });
}

main().catch(err => {
  console.error('Failed to start agent:', err);
  process.exit(1);
});