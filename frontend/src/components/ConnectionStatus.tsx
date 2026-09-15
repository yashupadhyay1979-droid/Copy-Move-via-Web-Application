import { WifiOff, Shield, Loader2 } from 'lucide-react';

interface ConnectionStatusProps {
  isConnected: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export function ConnectionStatus({ isConnected, isAuthenticated, error }: ConnectionStatusProps) {
  if (!isConnected) {
    return (
      <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
        <WifiOff className="w-5 h-5" />
        <span className="text-sm font-medium">Disconnected</span>
        {error && <span className="text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate">{error}</span>}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm font-medium">Connecting...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-black dark:text-white">
      <Shield className="w-5 h-5" />
      <span className="text-sm font-medium">Authenticated</span>
    </div>
  );
}