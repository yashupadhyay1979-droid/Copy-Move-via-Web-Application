import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import type { 
  TransferItem, 
  TransferOperation, 
  ConflictResolution, 
  TransferStatus,
  FileProgress 
} from '@shared/types';
import { 
  exists, 
  isDirectory, 
  isFile, 
  getStats, 
  copyFileWithProgress, 
  moveFile, 
  getFileList, 
  getDirectorySize,
  getDestinationPath,
  resolveConflict,
  ensureDir,
  normalizeInputPath 
} from '../utils/fs';

export interface TransferEngineEvents {
  'progress': (transfer: TransferItem) => void;
  'file-start': (transferId: string, file: FileProgress) => void;
  'file-complete': (transferId: string, file: FileProgress) => void;
  'file-error': (transferId: string, file: FileProgress, error: Error) => void;
  'complete': (transfer: TransferItem) => void;
  'error': (transferId: string, error: Error) => void;
}

export class TransferEngine extends EventEmitter {
  private transfers: Map<string, TransferItem> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();
  private chunkSize: number;
  private maxConcurrent: number;
  private runningCount: number = 0;
  private queue: string[] = [];

  constructor(chunkSize: number = 64 * 1024, maxConcurrent: number = 3) {
    super();
    this.chunkSize = chunkSize;
    this.maxConcurrent = maxConcurrent;
  }

  setChunkSize(size: number): void {
    this.chunkSize = size;
  }

  setMaxConcurrent(count: number): void {
    this.maxConcurrent = count;
    this.processQueue();
  }

  async createTransfer(
    sourcePath: string,
    destinationPath: string,
    operation: TransferOperation,
    conflictResolution: ConflictResolution
  ): Promise<TransferItem> {
    const id = uuidv4();
    sourcePath = normalizeInputPath(sourcePath);
    destinationPath = normalizeInputPath(destinationPath);
    const sourceExists = await exists(sourcePath);
    
    if (!sourceExists) {
      throw new Error(`Source path does not exist: ${sourcePath}`);
    }

    const sourceIsDir = await isDirectory(sourcePath);
    const sourceIsFile = await isFile(sourcePath);
    
    if (!sourceIsDir && !sourceIsFile) {
      throw new Error(`Source is not a file or directory: ${sourcePath}`);
    }

    let files: FileProgress[] = [];
    let totalSize = 0;

    if (sourceIsFile) {
      const stats = await getStats(sourcePath);
      files = [{ path: sourcePath, size: stats.size, transferred: 0, status: 'pending' }];
      totalSize = stats.size;
    } else {
      const fileList = await getFileList(sourcePath);
      // Filter out directories - they're created implicitly by ensureDir
      const fileEntries = fileList.filter((f: { isDirectory: boolean }) => !f.isDirectory);
      files = fileEntries.map((f: { path: string; size: number }) => ({ 
        path: f.path, 
        size: f.size, 
        transferred: 0, 
        status: 'pending' as TransferStatus 
      }));
      totalSize = fileEntries.reduce((sum: number, f: { size: number }) => sum + f.size, 0);
    }

    const transfer: TransferItem = {
      id,
      sourcePath,
      destinationPath,
      operation,
      conflictResolution,
      status: 'pending',
      totalSize,
      transferredSize: 0,
      speed: 0,
      startTime: Date.now(),
      files,
      currentFileIndex: 0
    };

    this.transfers.set(id, transfer);
    this.queue.push(id);
    this.processQueue();

    return transfer;
  }

  private async processQueue(): Promise<void> {
    while (this.queue.length > 0 && this.runningCount < this.maxConcurrent) {
      const transferId = this.queue.shift()!;
      const transfer = this.transfers.get(transferId);
      
      if (transfer && transfer.status === 'pending') {
        this.runningCount++;
        this.executeTransfer(transferId).catch(err => {
          this.emit('error', transferId, err);
        }).finally(() => {
          this.runningCount--;
          this.processQueue();
        });
      }
    }
  }

  private async executeTransfer(transferId: string): Promise<void> {
    const transfer = this.transfers.get(transferId);
    if (!transfer) return;

    const controller = new AbortController();
    this.abortControllers.set(transferId, controller);

    transfer.status = 'running';
    this.emit('progress', { ...transfer });

    try {
      const sourceIsDir = await isDirectory(transfer.sourcePath);
      
      for (let i = 0; i < transfer.files.length; i++) {
        if (controller.signal.aborted) {
          transfer.status = 'cancelled';
          transfer.endTime = Date.now();
          this.emit('progress', { ...transfer });
          return;
        }

        transfer.currentFileIndex = i;
        const file = transfer.files[i];
        file.status = 'running';
        this.emit('file-start', transferId, { ...file });

        let destPath: string;
        if (sourceIsDir) {
          const relativePath = path.relative(transfer.sourcePath, file.path);
          const sourceName = path.basename(transfer.sourcePath);
          destPath = path.join(transfer.destinationPath, sourceName, relativePath);
        } else {
          const destIsDir = await isDirectory(transfer.destinationPath);
          if (destIsDir || !path.extname(transfer.destinationPath)) {
            destPath = path.join(transfer.destinationPath, path.basename(transfer.sourcePath));
          } else {
            destPath = transfer.destinationPath;
          }
        }

        const resolvedPath = await resolveConflict(destPath, transfer.conflictResolution, file.isDirectory ?? false);
        
        if (!resolvedPath) {
          file.status = 'completed';
          file.transferred = file.size;
          transfer.transferredSize += file.size;
          this.emit('file-complete', transferId, { ...file });
          continue;
        }

        await ensureDir(path.dirname(resolvedPath));

        let lastTransferred = 0;
        const speedInterval = setInterval(() => {
          const now = Date.now();
          const elapsed = (now - (file as any)._startTime) / 1000;
          if (elapsed > 0) {
            transfer.speed = (file.transferred - lastTransferred) / elapsed;
            lastTransferred = file.transferred;
          }
        }, 1000);

        (file as any)._startTime = Date.now();

        const progressCallback = (transferred: number) => {
          file.transferred = transferred;
          transfer.transferredSize = transfer.files
            .slice(0, i)
            .reduce((sum: number, f: FileProgress) => sum + f.size, 0) + transferred;
          this.emit('progress', { ...transfer });
        };

        try {
          if (transfer.operation === 'move') {
            await moveFile(file.path, resolvedPath);
            file.transferred = file.size;
          } else {
            await copyFileWithProgress(file.path, resolvedPath, progressCallback, controller.signal, this.chunkSize);
          }
          file.status = 'completed';
          file.transferred = file.size;
          this.emit('file-complete', transferId, { ...file });
        } catch (fileErr) {
          file.status = 'failed';
          file.error = fileErr instanceof Error ? fileErr.message : String(fileErr);
          this.emit('file-error', transferId, { ...file }, fileErr instanceof Error ? fileErr : new Error(String(fileErr)));
          throw fileErr;
        } finally {
          clearInterval(speedInterval);
        }
      }

      transfer.status = 'completed';
      transfer.endTime = Date.now();
      transfer.transferredSize = transfer.totalSize;
      this.emit('complete', { ...transfer });
    } catch (error) {
      if (controller.signal.aborted) {
        if ((transfer.status as string) !== 'paused') {
          transfer.status = 'cancelled';
        }
      } else {
        transfer.status = 'failed';
        transfer.error = error instanceof Error ? error.message : String(error);
      }
      transfer.endTime = Date.now();
      if ((transfer.status as string) !== 'paused') {
        this.emit('error', transferId, error instanceof Error ? error : new Error(String(error)));
      }
    } finally {
      this.abortControllers.delete(transferId);
      this.emit('progress', { ...transfer });
    }
  }

  cancelTransfer(transferId: string): boolean {
    const controller = this.abortControllers.get(transferId);
    if (controller) {
      controller.abort();
      return true;
    }
    
    const transfer = this.transfers.get(transferId);
    if (transfer && transfer.status === 'pending') {
      transfer.status = 'cancelled';
      transfer.endTime = Date.now();
      const index = this.queue.indexOf(transferId);
      if (index !== -1) this.queue.splice(index, 1);
      this.emit('progress', { ...transfer });
      return true;
    }
    
    return false;
  }

  pauseTransfer(transferId: string): boolean {
    const controller = this.abortControllers.get(transferId);
    if (controller) {
      const transfer = this.transfers.get(transferId);
      if (transfer) {
        transfer.status = 'paused';
      }
      controller.abort();
      if (transfer) {
        this.emit('progress', { ...transfer });
      }
      return true;
    }
    return false;
  }

  resumeTransfer(transferId: string): boolean {
    const transfer = this.transfers.get(transferId);
    if (transfer && transfer.status === 'paused') {
      transfer.status = 'pending';
      this.queue.push(transferId);
      this.processQueue();
      this.emit('progress', { ...transfer });
      return true;
    }
    return false;
  }

  getTransfer(transferId: string): TransferItem | undefined {
    return this.transfers.get(transferId);
  }

  getAllTransfers(): TransferItem[] {
    return Array.from(this.transfers.values());
  }

  getHistory(): TransferItem[] {
    return Array.from(this.transfers.values())
      .filter(t => t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled')
      .sort((a, b) => b.startTime - a.startTime);
  }

  clearHistory(): void {
    const toDelete = Array.from(this.transfers.entries())
      .filter(([, t]) => t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled')
      .map(([id]) => id);
    
    toDelete.forEach(id => this.transfers.delete(id));
  }
}

export const transferEngine = new TransferEngine();