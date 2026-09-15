import { useState, useCallback } from 'react';
import type { BrowseResponse, DriveInfo, SystemInfo } from '../types';
import { useWebSocket } from './useWebSocket';

export function useBrowse(wsUrl: string, token: string) {
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [directoryContents, setDirectoryContents] = useState<BrowseResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { send, isAuthenticated } = useWebSocket({
    url: wsUrl,
    token
  });

  const loadDrives = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const response = await send({ type: 'drives', payload: {} });
      if (response.data) {
        setDrives(response.data as DriveInfo[]);
      }
    } catch (err) {
      setError('Failed to load drives: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  }, [send, isAuthenticated]);

  const loadSystemInfo = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await send({ type: 'system', payload: {} });
      if (response.data) {
        setSystemInfo(response.data as SystemInfo);
      }
    } catch (err) {
      console.error('Failed to load system info:', err);
    }
  }, [send, isAuthenticated]);

  const browse = useCallback(async (path: string, type: 'file' | 'folder'): Promise<BrowseResponse | null> => {
    if (!isAuthenticated) return null;
    try {
      setLoading(true);
      const response = await send({ type: 'browse', payload: { path, type } });
      if (response.data) {
        return response.data as BrowseResponse;
      }
      return null;
    } catch (err) {
      setError('Failed to browse: ' + (err instanceof Error ? err.message : String(err)));
      return null;
    } finally {
      setLoading(false);
    }
  }, [send, isAuthenticated]);

  const listDirectory = useCallback(async (path: string): Promise<BrowseResponse[] | null> => {
    if (!isAuthenticated) return null;
    try {
      setLoading(true);
      setError(null);
      const response = await send({ type: 'list', payload: { path } });
      if (response.data) {
        const contents = response.data as BrowseResponse[];
        setCurrentPath(path);
        setDirectoryContents(contents);
        return contents;
      }
      return null;
    } catch (err) {
      setError('Failed to list directory: ' + (err instanceof Error ? err.message : String(err)));
      return null;
    } finally {
      setLoading(false);
    }
  }, [send, isAuthenticated]);

  const goUp = useCallback(async () => {
    if (currentPath) {
      const parent = currentPath.split(/[\\/]/).slice(0, -1).join('\\') || currentPath.split(/[\\/]/)[0] + '\\';
      await listDirectory(parent);
    }
  }, [currentPath, listDirectory]);

  return {
    drives,
    systemInfo,
    currentPath,
    directoryContents,
    loading,
    error,
    loadDrives,
    loadSystemInfo,
    browse,
    listDirectory,
    goUp,
    setError
  };
}