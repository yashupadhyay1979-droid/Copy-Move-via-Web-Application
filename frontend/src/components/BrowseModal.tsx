import { useState, useEffect } from 'react';
import { X, ChevronRight, FolderOpen, HardDrive, Search, ChevronUp, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import type { BrowseResponse } from '../types';
import { getFileIcon } from '../utils/format';

interface BrowseModalProps {
  title: string;
  drives: Array<{ letter: string; label: string }>;
  currentPath: string;
  directoryContents: BrowseResponse[];
  loading: boolean;
  type: 'file' | 'folder';
  onSelect: (item: BrowseResponse) => void;
  onClose: () => void;
  onListDirectory: (path: string) => Promise<BrowseResponse[] | null>;
  onGoUp: () => Promise<void>;
  onLoadDrives: () => Promise<void>;
}

export function BrowseModal({
  title,
  drives,
  currentPath,
  directoryContents,
  loading,
  type,
  onSelect,
  onClose,
  onListDirectory,
  onGoUp,
  onLoadDrives
}: BrowseModalProps) {
  const [view, setView] = useState<'drives' | 'directory'>('drives');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (currentPath && directoryContents.length > 0) {
      setView('directory');
    } else if (drives.length === 0) {
      onLoadDrives();
    }
  }, [currentPath, directoryContents, drives, onLoadDrives]);

  const filteredDrives = drives.filter(d => 
    d.letter.toLowerCase().includes(search.toLowerCase()) ||
    d.label.toLowerCase().includes(search.toLowerCase())
  );

  const filteredContents = directoryContents.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDriveClick = async (drive: { letter: string; label: string }) => {
    await onListDirectory(drive.letter + '\\');
  };

  const handleItemClick = (item: BrowseResponse) => {
    if (item.isDirectory) {
      onListDirectory(item.path);
    } else {
      onSelect(item);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="browse-title"
    >
      <div 
        className="bg-white dark:bg-black rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-slide-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 id="browse-title" className="text-lg font-semibold text-black dark:text-white">{title}</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="input pl-10 w-48"
              />
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {view === 'drives' && (
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="w-8 h-8 animate-spin text-black dark:text-white" />
                </div>
              ) : filteredDrives.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <HardDrive className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No drives found</p>
                  <button onClick={onLoadDrives} className="btn-secondary mt-4">
                    <Loader2 className="w-4 h-4 mr-1" />
                    Refresh
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredDrives.map(drive => (
                    <button
                      key={drive.letter}
                      onClick={() => handleDriveClick(drive)}
                      className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-black dark:hover:border-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-black dark:bg-white rounded-lg text-white dark:text-black">
                          <HardDrive className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-black dark:text-white truncate">{drive.letter}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{drive.label || 'Local Disk'}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {view === 'directory' && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="p-3 border-b border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800">
                <div className="flex items-center gap-2 text-sm">
                  <button onClick={onGoUp} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <span className="font-mono text-black dark:text-white truncate flex-1">{currentPath}</span>
                  <span className="text-gray-500 dark:text-gray-400">{filteredContents.length} items</span>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-48">
                    <Loader2 className="w-8 h-8 animate-spin text-black dark:text-white" />
                  </div>
                ) : filteredContents.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>This folder is empty</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800" role="listbox">
                    {filteredContents.map(item => (
                      <li key={item.path} role="option">
                        <button
                          onClick={() => handleItemClick(item)}
                          className="w-full p-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-3 text-left"
                        >
                          <div className={clsx('p-1.5 rounded', item.isDirectory ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300')}>
                            {getFileIcon(item.name, item.isDirectory)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-black dark:text-white truncate">{item.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                              {item.isDirectory ? 'Folder' : formatFileSize(item.size)}
                              {item.modified && ` • Modified ${new Date(item.modified).toLocaleDateString()}`}
                            </p>
                          </div>
                          {item.isDirectory && <ChevronRight className="w-4 h-4 text-gray-400" />}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center">
          {view === 'directory' ? (
            <button onClick={() => setView('drives')} className="btn-secondary text-xs">
              ← Drives
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            {type === 'folder' && view === 'directory' && currentPath && (
              <button
                onClick={() => {
                  onSelect({
                    path: currentPath,
                    name: currentPath.split(/[\\/]/).pop() || currentPath,
                    isDirectory: true,
                    size: 0,
                    modified: Date.now()
                  });
                }}
                className="btn-primary"
              >
                Select Current Folder
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}