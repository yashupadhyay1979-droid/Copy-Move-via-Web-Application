export type TransferOperation = 'copy' | 'move';
export type ConflictResolution = 'overwrite' | 'skip' | 'rename';
export type TransferStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface TransferItem {
  id: string;
  sourcePath: string;
  destinationPath: string;
  operation: TransferOperation;
  conflictResolution: ConflictResolution;
  status: TransferStatus;
  totalSize: number;
  transferredSize: number;
  speed: number;
  startTime: number;
  endTime?: number;
  error?: string;
  files: FileProgress[];
  currentFileIndex: number;
}

export interface FileProgress {
  path: string;
  size: number;
  transferred: number;
  status: TransferStatus;
  error?: string;
  isDirectory?: boolean;
}

export interface TransferRequest {
  id: string;
  sourcePath: string;
  destinationPath: string;
  operation: TransferOperation;
  conflictResolution: ConflictResolution;
}

export interface TransferUpdate {
  type: 'progress' | 'complete' | 'error' | 'file-start' | 'file-complete' | 'file-error';
  transferId: string;
  data: Partial<TransferItem> & { currentFile?: FileProgress };
}

export interface AgentMessage {
  type: 'auth' | 'transfer' | 'cancel' | 'pause' | 'resume' | 'browse' | 'list' | 'history' | 'settings' | 'drives' | 'system' | 'ping' | 'clear-history' | 'progress' | 'file-start' | 'file-complete' | 'file-error' | 'transfer-complete' | 'transfer-error';
  payload: unknown;
  requestId?: string;
}

export interface AgentResponse {
  requestId: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface BrowseRequest {
  path: string;
  type: 'file' | 'folder';
}

export interface BrowseResponse {
  path: string;
  name: string;
  isDirectory: boolean;
  size: number;
  modified: number;
  children?: BrowseResponse[];
}

export interface HistoryEntry {
  id: string;
  sourcePath: string;
  destinationPath: string;
  operation: TransferOperation;
  totalSize: number;
  duration: number;
  averageSpeed: number;
  status: TransferStatus;
  timestamp: number;
  error?: string;
  fileCount: number;
}

export interface AgentSettings {
  port: number;
  token: string;
  allowedPaths: string[];
  maxConcurrentTransfers: number;
  chunkSize: number;
}

export interface SystemInfo {
  platform: string;
  arch: string;
  totalMemory: number;
  freeMemory: number;
  cpus: number;
}

export interface DriveInfo {
  letter: string;
  label: string;
  totalSpace: number;
  freeSpace: number;
  fileSystem: string;
  type: 'fixed' | 'removable' | 'network' | 'cdrom' | 'unknown';
}