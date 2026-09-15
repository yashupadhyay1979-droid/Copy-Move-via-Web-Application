import { useState, useCallback, useEffect, useRef } from 'react';
import type { TransferItem, FileProgress, HistoryEntry, TransferOperation, ConflictResolution } from '../types';
import { useWebSocket } from './useWebSocket';

interface TransferResponse {
  id?: string;
  success?: boolean;
}

interface SettingsResponse {
  maxConcurrentTransfers: number;
  chunkSize: number;
}

export function useTransfers(wsUrl: string, token: string) {
  const [transfers, setTransfers] = useState<Map<string, TransferItem>>(new Map());
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [settings, setSettings] = useState<SettingsResponse>({
    maxConcurrentTransfers: 3,
    chunkSize: 64 * 1024
  });

  const sendRef = useRef<((message: import('../types').AgentMessage) => Promise<import('../types').AgentResponse>) | null>(null);

  const handleMessage = useCallback((message: { type: string; payload: unknown }) => {
    setTransfers(prev => {
      const next = new Map(prev);
      
      switch (message.type) {
        case 'progress': {
          const transfer = message.payload as TransferItem;
          next.set(transfer.id, transfer);
          break;
        }
        case 'transfer-complete': {
          const transfer = message.payload as TransferItem;
          next.set(transfer.id, transfer);
          break;
        }
        case 'transfer-error': {
          const { transferId, error } = message.payload as { transferId: string; error: string };
          const existing = next.get(transferId);
          if (existing) {
            next.set(transferId, { ...existing, status: 'failed', error, endTime: Date.now() });
          }
          break;
        }
        case 'file-start': {
          const { transferId, file } = message.payload as { transferId: string; file: FileProgress };
          const existing = next.get(transferId);
          if (existing) {
            const files = [...existing.files];
            const idx = files.findIndex(f => f.path === file.path);
            if (idx >= 0) {
              files[idx] = { ...files[idx], ...file, status: 'running' };
            }
            next.set(transferId, { ...existing, files, currentFileIndex: idx });
          }
          break;
        }
        case 'file-complete': {
          const { transferId, file } = message.payload as { transferId: string; file: FileProgress };
          const existing = next.get(transferId);
          if (existing) {
            const files = [...existing.files];
            const idx = files.findIndex(f => f.path === file.path);
            if (idx >= 0) {
              files[idx] = { ...files[idx], ...file, status: 'completed', transferred: file.size };
            }
            next.set(transferId, { ...existing, files });
          }
          break;
        }
        case 'file-error': {
          const { transferId, file, error } = message.payload as { transferId: string; file: FileProgress; error: string };
          const existing = next.get(transferId);
          if (existing) {
            const files = [...existing.files];
            const idx = files.findIndex(f => f.path === file.path);
            if (idx >= 0) {
              files[idx] = { ...files[idx], ...file, status: 'failed', error };
            }
            next.set(transferId, { ...existing, files, status: 'failed', error, endTime: Date.now() });
          }
          break;
        }
      }
      
      return next;
    });
  }, []);

  const { send, isConnected, isAuthenticated, error: wsError, connect, disconnect, retryAuth } = useWebSocket({
    url: wsUrl,
    token,
    onMessage: handleMessage,
    onConnect: () => {
      sendRef.current = send;
      send({ type: 'history', payload: {} });
      loadSettings();
    }
  });

  const loadSettings = useCallback(async () => {
    try {
      const sendFn = (sendRef.current || send) as (msg: { type: string; payload: unknown }) => Promise<{ requestId: string; success: boolean; data?: unknown; error?: string }>;
      const response = await sendFn({ type: 'settings', payload: {} });
      if (response.data) {
        setSettings(response.data as SettingsResponse);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }, [send]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isAuthenticated) {
        send({ type: 'ping', payload: {} }).catch(() => {});
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, send]);

  const startTransfer = useCallback(async (
    sourcePath: string,
    destinationPath: string,
    operation: TransferOperation,
    conflictResolution: ConflictResolution
  ): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
      const response = await send({
        type: 'transfer',
        payload: { sourcePath, destinationPath, operation, conflictResolution }
      });
      if (response.success && response.data) {
        return { success: true, id: (response.data as TransferResponse)?.id };
      }
      return { success: false, error: response.error || 'Failed to start transfer' };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }, [send]);

  const cancelTransfer = useCallback(async (transferId: string): Promise<boolean> => {
    try {
      const response = await send({ type: 'cancel', payload: { transferId } });
      return (response.data as TransferResponse)?.success ?? false;
    } catch {
      return false;
    }
  }, [send]);

  const pauseTransfer = useCallback(async (transferId: string): Promise<boolean> => {
    try {
      const response = await send({ type: 'pause', payload: { transferId } });
      return (response.data as TransferResponse)?.success ?? false;
    } catch {
      return false;
    }
  }, [send]);

  const resumeTransfer = useCallback(async (transferId: string): Promise<boolean> => {
    try {
      const response = await send({ type: 'resume', payload: { transferId } });
      return (response.data as TransferResponse)?.success ?? false;
    } catch {
      return false;
    }
  }, [send]);

  const loadHistory = useCallback(async () => {
    try {
      const response = await send({ type: 'history', payload: {} });
      if (response.data) {
        setHistory(response.data as HistoryEntry[]);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  }, [send]);

  const clearHistory = useCallback(async () => {
    try {
      await send({ type: 'clear-history', payload: {} });
      setHistory([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  }, [send]);

  const updateSettings = useCallback(async (newSettings: Partial<SettingsResponse>) => {
    try {
      console.log('Sending settings:', newSettings);
      const response = await send({ type: 'settings', payload: newSettings });
      console.log('Settings response:', response);
      if (response.data) {
        setSettings(response.data as SettingsResponse);
      }
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  }, [send]);

  const getTransfer = useCallback((id: string): TransferItem | undefined => {
    return transfers.get(id);
  }, [transfers]);

  const getAllTransfers = useCallback((): TransferItem[] => {
    return Array.from(transfers.values()).sort((a, b) => b.startTime - a.startTime);
  }, [transfers]);

  const getActiveTransfers = useCallback((): TransferItem[] => {
    return Array.from(transfers.values())
      .filter(t => t.status === 'running' || t.status === 'pending' || t.status === 'paused')
      .sort((a, b) => b.startTime - a.startTime);
  }, [transfers]);

  return {
    transfers,
    history,
    settings,
    isConnected,
    isAuthenticated,
    error: wsError,
    connect,
    disconnect,
    retryAuth,
    startTransfer,
    cancelTransfer,
    pauseTransfer,
    resumeTransfer,
    loadHistory,
    clearHistory,
    loadSettings,
    updateSettings,
    getTransfer,
    getAllTransfers,
    getActiveTransfers
  };
}