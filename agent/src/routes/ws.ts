import { WebSocket, WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import type { 
  AgentMessage, 
  AgentResponse, 
  TransferRequest, 
  TransferUpdate,
  TransferItem,
  FileProgress,
  BrowseRequest,
  BrowseResponse,
  HistoryEntry,
  AgentSettings
} from '@shared/types';
import { transferEngine, TransferEngine } from '../services/transfer';
import { browseService } from '../services/browse';
import { settingsService } from '../services/settings';

type MessageHandler = (ws: WebSocket, message: AgentMessage) => Promise<void>;

export class WSServer {
  private wss: WebSocketServer | null = null;
  private clients: Map<WebSocket, { authenticated: boolean; id: string }> = new Map();
  private handlers: Map<string, MessageHandler> = new Map();
  private pendingRequests: Map<string, { resolve: (value: AgentResponse) => void; reject: (error: Error) => void }> = new Map();

  constructor(private transferEngine: TransferEngine) {
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.handlers.set('auth', this.handleAuth.bind(this));
    this.handlers.set('transfer', this.handleTransfer.bind(this));
    this.handlers.set('cancel', this.handleCancel.bind(this));
    this.handlers.set('pause', this.handlePause.bind(this));
    this.handlers.set('resume', this.handleResume.bind(this));
    this.handlers.set('browse', this.handleBrowse.bind(this));
    this.handlers.set('list', this.handleList.bind(this));
    this.handlers.set('history', this.handleHistory.bind(this));
    this.handlers.set('settings', this.handleSettings.bind(this));
    this.handlers.set('drives', this.handleDrives.bind(this));
    this.handlers.set('system', this.handleSystem.bind(this));
    this.handlers.set('ping', this.handlePing.bind(this));
    this.handlers.set('clear-history', this.handleClearHistory.bind(this));
  }

  start(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.wss = new WebSocketServer({ port, host: '127.0.0.1' });
      
      this.wss.on('listening', () => {
        console.log(`WebSocket server listening on ws://127.0.0.1:${port}`);
        resolve();
      });
      
      this.wss.on('error', (err) => {
        console.error('WebSocket server error:', err);
        reject(err);
      });

      this.wss.on('connection', (ws: WebSocket) => {
        const clientId = uuidv4();
        this.clients.set(ws, { authenticated: false, id: clientId });
        console.log(`Client connected: ${clientId}`);

        ws.on('message', (data: Buffer) => {
          try {
            const message: AgentMessage = JSON.parse(data.toString());
            this.handleMessage(ws, message);
          } catch (err) {
            console.error('Failed to parse message:', err);
            this.sendError(ws, 'Invalid message format');
          }
        });

        ws.on('close', () => {
          this.clients.delete(ws);
          console.log(`Client disconnected: ${clientId}`);
        });

        ws.on('error', (err) => {
          console.error(`Client error ${clientId}:`, err);
        });
      });

      this.startTransferUpdates();
    });
  }

  private startTransferUpdates(): void {
    this.transferEngine.on('progress', (transfer: TransferItem) => {
      this.broadcast({
        type: 'progress',
        payload: transfer
      });
    });

    this.transferEngine.on('file-start', (transferId: string, file: FileProgress) => {
      this.broadcast({
        type: 'file-start',
        payload: { transferId, file }
      });
    });

    this.transferEngine.on('file-complete', (transferId: string, file: FileProgress) => {
      this.broadcast({
        type: 'file-complete',
        payload: { transferId, file }
      });
    });

    this.transferEngine.on('file-error', (transferId: string, file: FileProgress, error: Error) => {
      this.broadcast({
        type: 'file-error',
        payload: { transferId, file, error: error.message }
      });
    });

    this.transferEngine.on('complete', (transfer: TransferItem) => {
      this.broadcast({
        type: 'transfer-complete',
        payload: transfer
      });
    });

    this.transferEngine.on('error', (transferId: string, error: Error) => {
      this.broadcast({
        type: 'transfer-error',
        payload: { transferId, error: error.message }
      });
    });
  }

  private async handleMessage(ws: WebSocket, message: AgentMessage): Promise<void> {
    const client = this.clients.get(ws);
    if (!client) return;

    if (message.type !== 'auth' && !client.authenticated) {
      this.sendResponse(ws, message.requestId!, false, undefined, 'Not authenticated');
      return;
    }

    const handler = this.handlers.get(message.type);
    if (handler) {
      try {
        await handler(ws, message);
      } catch (err) {
        this.sendResponse(ws, message.requestId!, false, undefined, err instanceof Error ? err.message : String(err));
      }
    } else {
      this.sendResponse(ws, message.requestId!, false, undefined, `Unknown message type: ${message.type}`);
    }
  }

  private async handleAuth(ws: WebSocket, message: AgentMessage): Promise<void> {
    const { token } = message.payload as { token: string };
    const valid = settingsService.verifyToken(token);
    
    if (valid) {
      const client = this.clients.get(ws);
      if (client) {
        client.authenticated = true;
      }
      this.sendResponse(ws, message.requestId!, true, { authenticated: true, token: settingsService.getToken() });
    } else {
      this.sendResponse(ws, message.requestId!, false, undefined, 'Invalid token');
    }
  }

  private async handleTransfer(ws: WebSocket, message: AgentMessage): Promise<void> {
    const request = message.payload as TransferRequest;
    const transfer = await this.transferEngine.createTransfer(
      request.sourcePath,
      request.destinationPath,
      request.operation,
      request.conflictResolution
    );
    this.sendResponse(ws, message.requestId!, true, transfer);
  }

  private async handleCancel(ws: WebSocket, message: AgentMessage): Promise<void> {
    const { transferId } = message.payload as { transferId: string };
    const result = this.transferEngine.cancelTransfer(transferId);
    this.sendResponse(ws, message.requestId!, true, { success: result });
  }

  private async handlePause(ws: WebSocket, message: AgentMessage): Promise<void> {
    const { transferId } = message.payload as { transferId: string };
    const result = this.transferEngine.pauseTransfer(transferId);
    this.sendResponse(ws, message.requestId!, true, { success: result });
  }

  private async handleResume(ws: WebSocket, message: AgentMessage): Promise<void> {
    const { transferId } = message.payload as { transferId: string };
    const result = this.transferEngine.resumeTransfer(transferId);
    this.sendResponse(ws, message.requestId!, true, { success: result });
  }

  private async handleBrowse(ws: WebSocket, message: AgentMessage): Promise<void> {
    const request = message.payload as BrowseRequest;
    const result = await browseService.browse(request.path, request.type);
    this.sendResponse(ws, message.requestId!, true, result);
  }

  private async handleList(ws: WebSocket, message: AgentMessage): Promise<void> {
    const { path } = message.payload as { path: string };
    const result = await browseService.listDirectory(path);
    this.sendResponse(ws, message.requestId!, true, result);
  }

  private async handleHistory(ws: WebSocket, message: AgentMessage): Promise<void> {
    const history = this.transferEngine.getHistory().map((t: TransferItem) => ({
      id: t.id,
      sourcePath: t.sourcePath,
      destinationPath: t.destinationPath,
      operation: t.operation,
      totalSize: t.totalSize,
      duration: (t.endTime || Date.now()) - t.startTime,
      averageSpeed: t.totalSize / (((t.endTime || Date.now()) - t.startTime) / 1000),
      status: t.status,
      timestamp: t.startTime,
      error: t.error,
      fileCount: t.files.length
    }));
    this.sendResponse(ws, message.requestId!, true, history);
  }

  private async handleSettings(ws: WebSocket, message: AgentMessage): Promise<void> {
    const updates = message.payload as Partial<AgentSettings>;
    const settings = settingsService.updateSettings(updates);
    
    if (updates.maxConcurrentTransfers) {
      this.transferEngine.setMaxConcurrent(updates.maxConcurrentTransfers);
    }
    
    if (updates.chunkSize) {
      this.transferEngine.setChunkSize(updates.chunkSize);
    }
    
    if (updates.allowedPaths) {
      browseService.setAllowedPaths(updates.allowedPaths);
    }
    
    this.sendResponse(ws, message.requestId!, true, settings);
  }

  private async handleDrives(ws: WebSocket, message: AgentMessage): Promise<void> {
    const drives = await browseService.getDrives();
    this.sendResponse(ws, message.requestId!, true, drives);
  }

  private async handleSystem(ws: WebSocket, message: AgentMessage): Promise<void> {
    const info = await browseService.getSystemInfo();
    this.sendResponse(ws, message.requestId!, true, info);
  }

  private async handlePing(ws: WebSocket, message: AgentMessage): Promise<void> {
    this.sendResponse(ws, message.requestId!, true, { pong: true, timestamp: Date.now() });
  }

  private async handleClearHistory(ws: WebSocket, message: AgentMessage): Promise<void> {
    this.transferEngine.clearHistory();
    this.sendResponse(ws, message.requestId!, true, { success: true });
  }

  private sendResponse(ws: WebSocket, requestId: string, success: boolean, data?: unknown, error?: string): void {
    const response: AgentResponse = { requestId, success, data, error };
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(response));
    }
  }

  private sendError(ws: WebSocket, error: string): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'error', payload: { error } }));
    }
  }

  private broadcast(message: AgentMessage): void {
    const data = JSON.stringify(message);
    for (const [ws, client] of this.clients.entries()) {
      if (ws.readyState === WebSocket.OPEN && client.authenticated) {
        ws.send(data);
      }
    }
  }

  stop(): void {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }
}