import { useState, useCallback } from 'react';
import { TransferPanel } from './components/TransferPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { ConnectionStatus } from './components/ConnectionStatus';
import { BrowseModal } from './components/BrowseModal';
import { useTransfers } from './hooks/useTransfers';
import { useBrowse } from './hooks/useBrowse';
import type { TransferOperation, ConflictResolution, BrowseResponse, AgentSettings } from './types';
import { FolderOpen, File as FileIcon, Settings, History } from 'lucide-react';
import { clsx } from 'clsx';

function App() {
  const [activeTab, setActiveTab] = useState<'transfer' | 'history' | 'settings'>('transfer');
  const [showBrowseSource, setShowBrowseSource] = useState(false);
  const [showBrowseDest, setShowBrowseDest] = useState(false);
  const [selectedSourcePath, setSelectedSourcePath] = useState('');
  const [selectedDestPath, setSelectedDestPath] = useState('');
  const DEFAULT_TOKEN = '7fca426ffd193b7ea8c77ccd48e63348e2dcaca6e391f6a4ec3a595a19fa2edd';
  const [savedToken, setSavedToken] = useState(() => localStorage.getItem('agentToken') || DEFAULT_TOKEN);

  const handleTokenChange = useCallback((token: string) => {
    setSavedToken(token);
    localStorage.setItem('agentToken', token);
  }, []);

  const wsUrl = `ws://127.0.0.1:3456`;
  const token = savedToken;

  const {
    transfers,
    history,
    settings,
    isConnected,
    isAuthenticated,
    error: wsError,
    startTransfer,
    cancelTransfer,
    pauseTransfer,
    resumeTransfer,
    loadHistory,
    clearHistory,
    updateSettings,
    getActiveTransfers,
    retryAuth
  } = useTransfers(wsUrl, token);

  const {
    drives,
    currentPath,
    directoryContents,
    loading: browseLoading,
    listDirectory,
    goUp,
    loadDrives
  } = useBrowse(wsUrl, token);

  const activeTransfers = getActiveTransfers();

  const handleBrowseSourceSelect = (item: BrowseResponse) => {
    setSelectedSourcePath(item.path);
    setShowBrowseSource(false);
  };

  const handleBrowseDestSelect = (item: BrowseResponse) => {
    setSelectedDestPath(item.path);
    setShowBrowseDest(false);
  };

  const handleStartTransfer = async (
    sourcePath: string,
    destinationPath: string,
    operation: TransferOperation,
    conflictResolution: ConflictResolution
  ) => {
    return await startTransfer(sourcePath, destinationPath, operation, conflictResolution);
  };

  const handleRetryAuth = useCallback(async (newToken: string) => {
    return retryAuth(newToken);
  }, [retryAuth]);

  const tabs = [
    { id: 'transfer' as const, label: 'Transfer', icon: FileIcon },
    { id: 'history' as const, label: 'History', icon: History },
    { id: 'settings' as const, label: 'Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white transition-colors duration-200">
      <header className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-black dark:bg-white rounded-lg">
                <FolderOpen className="w-6 h-6 text-white dark:text-black" />
              </div>
              <h1 className="text-xl font-semibold text-black dark:text-white">File Transfer Agent</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <ConnectionStatus 
                isConnected={isConnected} 
                isAuthenticated={isAuthenticated}
                error={wsError}
              />
            </div>
          </div>
          
          <nav className="flex gap-1 pb-4 border-b border-gray-200 dark:border-gray-800" role="tablist">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={activeTab === id}
                onClick={() => setActiveTab(id)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  activeTab === id
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'transfer' && (
          <TransferPanel
            drives={drives}
            currentPath={currentPath}
            directoryContents={directoryContents}
            browseLoading={browseLoading}
            activeTransfers={activeTransfers}
            allTransfers={Array.from(transfers.values()).sort((a, b) => b.startTime - a.startTime)}
            externalSourcePath={selectedSourcePath}
            externalDestPath={selectedDestPath}
            onListDirectory={listDirectory}
            onGoUp={goUp}
            onLoadDrives={loadDrives}
            onStartTransfer={handleStartTransfer}
            onCancelTransfer={cancelTransfer}
            onPauseTransfer={pauseTransfer}
            onResumeTransfer={resumeTransfer}
            onClearCompleted={clearHistory}
            onShowBrowseSource={() => setShowBrowseSource(true)}
            onShowBrowseDest={() => setShowBrowseDest(true)}
          />
        )}
        
        {activeTab === 'history' && (
          <HistoryPanel
            history={history}
            onClearHistory={clearHistory}
            onLoadHistory={loadHistory}
          />
        )}
        
        {activeTab === 'settings' && (
          <SettingsPanel
            settings={settings as AgentSettings}
            token={token}
            onUpdateSettings={updateSettings}
            onTokenChange={handleTokenChange}
            onRetryAuth={handleRetryAuth}
            isConnected={isConnected}
            isAuthenticated={isAuthenticated}
          />
        )}
      </main>

      {showBrowseSource && (
        <BrowseModal
          title="Select Source Folder or File"
          drives={drives}
          currentPath={currentPath}
          directoryContents={directoryContents}
          loading={browseLoading}
          type="folder"
          onSelect={handleBrowseSourceSelect}
          onClose={() => setShowBrowseSource(false)}
          onListDirectory={listDirectory}
          onGoUp={goUp}
          onLoadDrives={loadDrives}
        />
      )}

      {showBrowseDest && (
        <BrowseModal
          title="Select Destination Folder"
          drives={drives}
          currentPath={currentPath}
          directoryContents={directoryContents}
          loading={browseLoading}
          type="folder"
          onSelect={handleBrowseDestSelect}
          onClose={() => setShowBrowseDest(false)}
          onListDirectory={listDirectory}
          onGoUp={goUp}
          onLoadDrives={loadDrives}
        />
      )}
    </div>
  );
}

export default App;