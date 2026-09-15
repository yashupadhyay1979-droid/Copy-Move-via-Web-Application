import { useState, useCallback, useEffect } from 'react';
import { 
  FolderOpen, Copy, Scissors, X, Pause, Play, Trash2, 
  AlertCircle, CheckCircle, ChevronDown, ChevronUp,
  ExternalLink
} from 'lucide-react';
import { clsx } from 'clsx';
import type { TransferItem, TransferOperation, ConflictResolution, BrowseResponse } from '../types';
import { formatBytes, formatSpeed, formatDuration, formatETA, getStatusBadgeColor, truncatePath, getFileIcon } from '../utils/format';

interface TransferPanelProps {
  drives: Array<{ letter: string; label: string }>;
  currentPath: string;
  directoryContents: BrowseResponse[];
  browseLoading: boolean;
  activeTransfers: TransferItem[];
  allTransfers: TransferItem[];
  externalSourcePath?: string;
  externalDestPath?: string;
  onListDirectory: (path: string) => Promise<BrowseResponse[] | null>;
  onGoUp: () => Promise<void>;
  onLoadDrives: () => Promise<void>;
  onStartTransfer: (sourcePath: string, destinationPath: string, operation: TransferOperation, conflictResolution: ConflictResolution) => Promise<{ success: boolean; id?: string; error?: string } | void>;
  onCancelTransfer: (transferId: string) => Promise<boolean>;
  onPauseTransfer: (transferId: string) => Promise<boolean>;
  onResumeTransfer: (transferId: string) => Promise<boolean>;
  onClearCompleted?: () => void;
  onShowBrowseSource: () => void;
  onShowBrowseDest: () => void;
}

export function TransferPanel({
  activeTransfers,
  allTransfers,
  externalSourcePath = '',
  externalDestPath = '',
  onLoadDrives,
  onGoUp,
  onStartTransfer,
  onCancelTransfer,
  onPauseTransfer,
  onResumeTransfer,
  onClearCompleted,
  onShowBrowseSource,
  onShowBrowseDest
}: TransferPanelProps) {
  const [sourcePath, setSourcePath] = useState(externalSourcePath);
  const [destPath, setDestPath] = useState(externalDestPath);
  const [transferError, setTransferError] = useState<string | null>(null);

  useEffect(() => {
    if (externalSourcePath) setSourcePath(externalSourcePath);
  }, [externalSourcePath]);

  useEffect(() => {
    if (externalDestPath) setDestPath(externalDestPath);
  }, [externalDestPath]);
  const [operation, setOperation] = useState<TransferOperation>('copy');
  const [conflictResolution, setConflictResolution] = useState<ConflictResolution>('rename');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dragOverSource, setDragOverSource] = useState(false);
  const [dragOverDest, setDragOverDest] = useState(false);

  const handleSourceDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOverSource(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      // Note: Browser drag & drop doesn't provide full paths for security
      // User needs to enter path manually or use Browse button
      setSourcePath(files[0].name);
    }
  }, []);

  const handleDestDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOverDest(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setDestPath(files[0].name);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>, setter: (v: boolean) => void) => {
    e.preventDefault();
    setter(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>, setter: (v: boolean) => void) => {
    e.preventDefault();
    setter(false);
  }, []);

  const canTransfer = sourcePath && destPath && sourcePath !== destPath;

  const handleTransfer = async () => {
    if (!canTransfer) return;
    setTransferError(null);
    const res = await onStartTransfer(sourcePath, destPath, operation, conflictResolution);
    if (res && !res.success) {
      setTransferError(res.error || 'Failed to start transfer');
    } else {
      setSourcePath('');
      setDestPath('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-black dark:text-white mb-4">New Transfer</h2>
        
        {transferError && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{transferError}</span>
            </div>
            <button onClick={() => setTransferError(null)} className="p-1 hover:opacity-75">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="label">Source Path</label>
            <div className="relative">
              <div
                className={clsx(
                  'input pr-12 min-h-[48px]',
                  dragOverSource && 'border-black dark:border-white bg-gray-100 dark:bg-gray-800'
                )}
                onDrop={handleSourceDrop}
                onDragOver={(e) => handleDragOver(e, setDragOverSource)}
                onDragLeave={(e) => handleDragLeave(e, setDragOverSource)}
              >
                <input
                  type="text"
                  value={sourcePath}
                  onChange={(e) => setSourcePath(e.target.value)}
                  placeholder="C:\\FolderA\\file.pdf or drag & drop here"
                  className="w-full bg-transparent border-none focus:ring-0 px-0 py-2 text-black dark:text-white placeholder-gray-400"
                />
              </div>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <button
                  onClick={onShowBrowseSource}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  aria-label="Browse for source"
                >
                  <FolderOpen className="w-5 h-5" />
                </button>
                {dragOverSource && <span className="text-black dark:text-white text-sm">Drop file here</span>}
              </div>
            </div>
          </div>

          <div>
            <label className="label">Destination Path</label>
            <div className="relative">
              <div
                className={clsx(
                  'input pr-12 min-h-[48px]',
                  dragOverDest && 'border-black dark:border-white bg-gray-100 dark:bg-gray-800'
                )}
                onDrop={handleDestDrop}
                onDragOver={(e) => handleDragOver(e, setDragOverDest)}
                onDragLeave={(e) => handleDragLeave(e, setDragOverDest)}
              >
                <input
                  type="text"
                  value={destPath}
                  onChange={(e) => setDestPath(e.target.value)}
                  placeholder="D:\\FolderB\\ or drag & drop folder here"
                  className="w-full bg-transparent border-none focus:ring-0 px-0 py-2 text-black dark:text-white placeholder-gray-400"
                />
              </div>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <button
                  onClick={onShowBrowseDest}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  aria-label="Browse for destination"
                >
                  <FolderOpen className="w-5 h-5" />
                </button>
                {dragOverDest && <span className="text-black dark:text-white text-sm">Drop folder here</span>}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Operation:</span>
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                {(['copy', 'move'] as TransferOperation[]).map(op => (
                  <button
                    key={op}
                    onClick={() => setOperation(op)}
                    className={clsx(
                      'px-4 py-2 rounded-md text-sm font-medium transition-all',
                      operation === op
                        ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white'
                    )}
                  >
                    {op === 'copy' ? <Copy className="w-4 h-4 mr-1" /> : <Scissors className="w-4 h-4 mr-1" />}
                    {op.charAt(0).toUpperCase() + op.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Conflicts:</span>
              <select
                value={conflictResolution}
                onChange={(e) => setConflictResolution(e.target.value as ConflictResolution)}
                className="input w-auto flex-1 max-w-xs"
              >
                <option value="rename">Rename (keep both)</option>
                <option value="overwrite">Overwrite</option>
                <option value="skip">Skip</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="btn-ghost text-sm"
          >
            <ChevronDown className={clsx('w-4 h-4 mr-2 transition-transform', showAdvanced && 'rotate-180')} />
            Advanced Options
          </button>

          {showAdvanced && (
            <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-800 animate-slide-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Quick Actions</label>
                  <div className="flex gap-2">
                    <button onClick={onLoadDrives} className="btn-secondary text-sm flex-1">
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Load Drives
                    </button>
                    <button onClick={onGoUp} className="btn-secondary text-sm flex-1">
                      <ChevronUp className="w-4 h-4 mr-1" />
                      Go Up
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleTransfer}
            disabled={!canTransfer}
            className="btn-primary w-full py-3 text-lg mt-2"
          >
            <Copy className="w-5 h-5 mr-2" />
            Start Transfer
          </button>
        </div>
      </div>

      {(activeTransfers.length > 0 || allTransfers.length > 0) && (
        <div className="card">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-black dark:text-white">
              Transfers ({activeTransfers.length} active, {allTransfers.length} total)
            </h2>
            {allTransfers.length > 0 && onClearCompleted && (
              <button onClick={onClearCompleted} className="btn-ghost text-sm text-gray-500 hover:text-red-600">
                <Trash2 className="w-4 h-4 mr-1" />
                Clear Completed
              </button>
            )}
          </div>
          
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {allTransfers.map(transfer => (
              <TransferItemComponent
                key={transfer.id}
                transfer={transfer}
                onCancel={onCancelTransfer}
                onPause={onPauseTransfer}
                onResume={onResumeTransfer}
              />
            ))}
            
            {allTransfers.length === 0 && (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No transfers yet. Add a source and destination to get started.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TransferItemComponent({ 
  transfer, 
  onCancel, 
  onPause, 
  onResume 
}: { 
  transfer: TransferItem; 
  onCancel: (id: string) => Promise<boolean>; 
  onPause: (id: string) => Promise<boolean>; 
  onResume: (id: string) => Promise<boolean>; 
}) {
  const [expanded, setExpanded] = useState(false);
  const progress = transfer.totalSize > 0 ? (transfer.transferredSize / transfer.totalSize) * 100 : 0;
  const isActive = transfer.status === 'running' || transfer.status === 'pending' || transfer.status === 'paused';
  const elapsed = (transfer.endTime || Date.now()) - transfer.startTime;

  return (
    <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', getStatusBadgeColor(transfer.status))}>
              {transfer.status.charAt(0).toUpperCase() + transfer.status.slice(1)}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
              {transfer.operation === 'copy' ? <Copy className="w-3 h-3 inline mr-1" /> : <Scissors className="w-3 h-3 inline mr-1" />}
              {transfer.operation}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {transfer.files.length} file{transfer.files.length !== 1 ? 's' : ''} • {formatBytes(transfer.totalSize)}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm mb-2">
            <div className="truncate" title={transfer.sourcePath}>
              <span className="text-gray-500 dark:text-gray-400">From: </span>
              <span className="font-mono text-black dark:text-white">{truncatePath(transfer.sourcePath)}</span>
            </div>
            <div className="truncate" title={transfer.destinationPath}>
              <span className="text-gray-500 dark:text-gray-400">To: </span>
              <span className="font-mono text-black dark:text-white">{truncatePath(transfer.destinationPath)}</span>
            </div>
          </div>

          {isActive && (
            <div className="space-y-2">
              <div className="progress-bar">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{formatBytes(transfer.transferredSize)} / {formatBytes(transfer.totalSize)} ({progress.toFixed(1)}%)</span>
                <span>{formatSpeed(transfer.speed)}</span>
                <span>ETA: {formatETA(transfer.transferredSize, transfer.totalSize, transfer.speed)}</span>
                <span>Elapsed: {formatDuration(elapsed)}</span>
              </div>
              
              {transfer.currentFileIndex < transfer.files.length && (
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate" title={transfer.files[transfer.currentFileIndex]?.path}>
                  Current: {transfer.files[transfer.currentFileIndex]?.path.split(/[\\/]/).pop()}
                </div>
              )}
            </div>
          )}

          {transfer.status === 'completed' && (
            <div className="flex items-center gap-4 text-sm text-green-600 dark:text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span>Completed in {formatDuration(elapsed)} • Avg: {formatSpeed(transfer.totalSize / (elapsed / 1000))}</span>
            </div>
          )}

          {transfer.status === 'failed' && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 mt-2">
              <AlertCircle className="w-4 h-4" />
              <span>{transfer.error || 'Unknown error'}</span>
            </div>
          )}

          {transfer.status === 'cancelled' && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-2">
              <X className="w-4 h-4" />
              <span>Cancelled after {formatDuration(elapsed)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isActive && transfer.status !== 'paused' && (
            <button
              onClick={() => onPause(transfer.id)}
              className="btn-secondary p-2"
              aria-label="Pause transfer"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}
          
          {isActive && transfer.status === 'paused' && (
            <button
              onClick={() => onResume(transfer.id)}
              className="btn-secondary p-2"
              aria-label="Resume transfer"
            >
              <Play className="w-4 h-4" />
            </button>
          )}
          
          {isActive && (
            <button
              onClick={() => onCancel(transfer.id)}
              className="btn-danger p-2"
              aria-label="Cancel transfer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          
          <button
            onClick={() => setExpanded(!expanded)}
            className="btn-ghost p-2"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && transfer.files.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 animate-slide-in">
          <div className="max-h-60 overflow-y-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                  <th className="pb-2 pr-4">File</th>
                  <th className="pb-2 pr-4 w-24">Size</th>
                  <th className="pb-2 pr-4 w-32">Progress</th>
                  <th className="pb-2 w-24">Status</th>
                </tr>
              </thead>
              <tbody>
                {transfer.files.map((file) => (
                  <tr key={file.path} className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-2 pr-4 truncate max-w-xs" title={file.path}>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">
                          {getFileIcon(file.path, file.isDirectory || false)}
                        </span>
                        <span className="font-mono text-black dark:text-white">
                          {file.path.split(/[\\/]/).pop()}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-gray-600 dark:text-gray-300 font-mono">
                      {formatBytes(file.size)}
                    </td>
                    <td className="py-2 pr-4">
                      <div className="progress-bar w-full">
                        <div 
                          className="progress-bar-fill" 
                          style={{ width: file.size > 0 ? `${(file.transferred / file.size) * 100}%` : '0%' }}
                        />
                      </div>
                    </td>
                    <td className="py-2">
                      <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', getStatusBadgeColor(file.status))}>
                        {file.status.charAt(0).toUpperCase() + file.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}