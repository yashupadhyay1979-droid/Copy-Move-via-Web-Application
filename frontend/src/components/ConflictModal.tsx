import { AlertTriangle, RotateCcw, Trash2, Forward } from 'lucide-react';
import type { ConflictResolution } from '../types';
import { formatBytes } from '../utils/format';

interface ConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResolve: (resolution: ConflictResolution) => void;
  fileName: string;
  fileSize: number;
}

export function ConflictModal({
  isOpen,
  onClose,
  onResolve,
  fileName,
  fileSize
}: ConflictModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-title"
    >
      <div 
        className="bg-white dark:bg-black rounded-xl shadow-xl w-full max-w-md animate-slide-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 id="conflict-title" className="text-lg font-semibold text-black dark:text-white">File Already Exists</h2>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">A file with this name already exists in the destination.</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Source</p>
              <p className="font-medium text-black dark:text-white truncate">{fileName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{formatBytes(fileSize)}</p>
            </div>
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Destination</p>
              <p className="font-medium text-black dark:text-white truncate">{fileName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Already exists</p>
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400">How would you like to proceed?</p>

          <div className="space-y-2">
            <button
              onClick={() => onResolve('rename')}
              className="w-full btn-secondary justify-start gap-3"
            >
              <div className="p-2 bg-black dark:bg-white rounded-lg text-white dark:text-black">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-medium text-black dark:text-white">Rename (Keep Both)</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Save as "{fileName} (1)"</p>
              </div>
            </button>

            <button
              onClick={() => onResolve('overwrite')}
              className="w-full btn-danger justify-start gap-3"
            >
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg text-red-600 dark:text-red-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-medium text-black dark:text-white">Overwrite</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Replace the existing file</p>
              </div>
            </button>

            <button
              onClick={() => onResolve('skip')}
              className="w-full btn-secondary justify-start gap-3"
            >
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300">
                <Forward className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-medium text-black dark:text-white">Skip</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Don't transfer this file</p>
              </div>
            </button>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
            This choice applies to this file only. Other conflicts will prompt again.
          </p>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancel Transfer</button>
        </div>
      </div>
    </div>
  );
}