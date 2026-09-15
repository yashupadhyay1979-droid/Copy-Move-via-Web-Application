import { useState } from 'react';
import { Trash2, Download, ChevronDown, ChevronUp, Clock, Copy, Move } from 'lucide-react';
import { clsx } from 'clsx';
import type { HistoryEntry } from '../types';
import { formatBytes, formatDuration, formatDateShort, getStatusBadgeColor, getOperationLabel } from '../utils/format';

interface HistoryPanelProps {
  history: HistoryEntry[];
  onClearHistory: () => Promise<void>;
  onLoadHistory: () => Promise<void>;
}

export function HistoryPanel({ history, onClearHistory, onLoadHistory }: HistoryPanelProps) {
  const [filter, setFilter] = useState<'all' | 'completed' | 'failed' | 'cancelled'>('all');
  const [sortColumn, setSortColumn] = useState<'date' | 'operation' | 'size' | 'duration' | 'status'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredHistory = history.filter(entry => {
    if (filter === 'all') return true;
    return entry.status === filter;
  });

  const sortedHistory = [...filteredHistory].sort((a, b) => {
    let aVal: any, bVal: any;
    switch (sortColumn) {
      case 'date': aVal = a.timestamp; bVal = b.timestamp; break;
      case 'operation': aVal = a.operation; bVal = b.operation; break;
      case 'size': aVal = a.totalSize; bVal = b.totalSize; break;
      case 'duration': aVal = a.duration; bVal = b.duration; break;
      case 'status': aVal = a.status; bVal = b.status; break;
      default: aVal = a.timestamp; bVal = b.timestamp;
    }
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ column }: { column: typeof sortColumn }) => {
    if (sortColumn !== column) return <ChevronDown className="w-4 h-4 text-gray-400" />;
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 text-black dark:text-white" /> : <ChevronDown className="w-4 h-4 text-black dark:text-white" />;
  };

  return (
    <div className="card">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-black dark:text-white">Transfer History</h2>
          <span className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-300">
            {history.length} entr{history.length === 1 ? 'y' : 'ies'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="input w-auto py-1.5 text-sm"
          >
            <option value="all">All</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          
          {history.length > 0 && (
            <button onClick={onClearHistory} className="btn-ghost text-red-600 hover:text-red-700">
              <Trash2 className="w-4 h-4 mr-1" />
              Clear
            </button>
          )}
          
          <button onClick={onLoadHistory} className="btn-secondary">
            <Download className="w-4 h-4 mr-1" />
            Refresh
          </button>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="p-12 text-center text-gray-500 dark:text-gray-400">
          <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No transfer history yet.</p>
          <p className="text-sm mt-1">Completed transfers will appear here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                <th className="pb-3 pr-4 cursor-pointer hover:text-black dark:hover:text-white" onClick={() => handleSort('date')}>
                  <div className="flex items-center gap-1">
                    Date <SortIcon column="date" />
                  </div>
                </th>
                <th className="pb-3 pr-4 cursor-pointer hover:text-black dark:hover:text-white" onClick={() => handleSort('operation')}>
                  <div className="flex items-center gap-1">
                    Operation <SortIcon column="operation" />
                  </div>
                </th>
                <th className="pb-3 pr-4 cursor-pointer hover:text-black dark:hover:text-white" onClick={() => handleSort('size')}>
                  <div className="flex items-center gap-1">
                    Size <SortIcon column="size" />
                  </div>
                </th>
                <th className="pb-3 pr-4 cursor-pointer hover:text-black dark:hover:text-white" onClick={() => handleSort('duration')}>
                  <div className="flex items-center gap-1">
                    Duration <SortIcon column="duration" />
                  </div>
                </th>
                <th className="pb-3 pr-4 cursor-pointer hover:text-black dark:hover:text-white" onClick={() => handleSort('status')}>
                  <div className="flex items-center gap-1">
                    Status <SortIcon column="status" />
                  </div>
                </th>
                <th className="pb-3 pr-4">Speed</th>
                <th className="pb-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {sortedHistory.map(entry => (
                <HistoryRow
                  key={entry.id}
                  entry={entry}
                  expanded={expandedId === entry.id}
                  onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function HistoryRow({ entry, expanded, onToggle }: { entry: HistoryEntry; expanded: boolean; onToggle: () => void }) {
  return (
    <>
      <tr className={clsx('hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer', expanded && 'bg-gray-50 dark:bg-gray-800/50')} onClick={onToggle}>
        <td className="py-3 pr-4 text-sm text-black dark:text-white font-mono whitespace-nowrap">
          {formatDateShort(entry.timestamp)}
        </td>
        <td className="py-3 pr-4">
          <div className="flex items-center gap-2">
            {entry.operation === 'copy' ? <Copy className="w-4 h-4 text-black dark:text-white" /> : <Move className="w-4 h-4 text-black dark:text-white" />}
            <span className="font-medium text-black dark:text-white capitalize">{getOperationLabel(entry.operation)}</span>
          </div>
        </td>
        <td className="py-3 pr-4 text-sm text-gray-600 dark:text-gray-300 font-mono">
          {formatBytes(entry.totalSize)}
        </td>
        <td className="py-3 pr-4 text-sm text-gray-600 dark:text-gray-300">
          {formatDuration(entry.duration)}
        </td>
        <td className="py-3 pr-4">
          <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', getStatusBadgeColor(entry.status))}>
            {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
          </span>
        </td>
        <td className="py-3 pr-4 text-sm text-gray-600 dark:text-gray-300 font-mono">
          {formatBytes(entry.averageSpeed)}/s
        </td>
        <td className="py-3 pr-4 text-right">
          <ChevronDown className={clsx('w-4 h-4 text-gray-400 inline-block transition-transform', expanded && 'rotate-180')} />
        </td>
      </tr>
      
      {expanded && (
        <tr>
          <td colSpan={7} className="p-0">
            <div className="p-4 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-800 animate-slide-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <DetailItem label="Source" value={entry.sourcePath} />
                <DetailItem label="Destination" value={entry.destinationPath} />
                <DetailItem label="Files" value={entry.fileCount.toString()} />
                <DetailItem label="Avg Speed" value={formatBytes(entry.averageSpeed) + '/s'} />
                <DetailItem label="Duration" value={formatDuration(entry.duration)} />
                <DetailItem label="Status" value={entry.status} />
                {entry.error && <DetailItem label="Error" value={entry.error} className="text-red-600 dark:text-red-400" />}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function DetailItem({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">{label}</p>
      <p className={clsx('text-sm font-mono text-black dark:text-white truncate', className)} title={value}>
        {value}
      </p>
    </div>
  );
}