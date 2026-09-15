export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

export function formatSpeed(bytesPerSecond: number): string {
  return formatBytes(bytesPerSecond) + '/s';
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export function formatETA(transferred: number, total: number, speed: number): string {
  if (speed <= 0 || transferred >= total) return '--';
  const remaining = total - transferred;
  const seconds = remaining / speed;
  return formatDuration(seconds * 1000);
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

export function formatDateShort(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString() + ' ' + new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'completed': return 'text-green-600 dark:text-green-400';
    case 'failed': return 'text-red-600 dark:text-red-400';
    case 'running': return 'text-primary-600 dark:text-primary-400';
    case 'paused': return 'text-yellow-600 dark:text-yellow-400';
    case 'cancelled': return 'text-gray-600 dark:text-gray-400';
    case 'pending': return 'text-blue-600 dark:text-blue-400';
    default: return 'text-gray-600 dark:text-gray-400';
  }
}

export function getStatusBadgeColor(status: string): string {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'running': return 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200';
    case 'paused': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'cancelled': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    case 'pending': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }
}

export function getOperationIcon(operation: 'copy' | 'move'): string {
  return operation === 'copy' ? 'copy' : 'move';
}

export function getOperationLabel(operation: 'copy' | 'move'): string {
  return operation === 'copy' ? 'Copy' : 'Move';
}

export function truncatePath(path: string, maxLength: number = 50): string {
  if (path.length <= maxLength) return path;
  const parts = path.split(/[\\/]/);
  if (parts.length <= 2) return path.substring(0, maxLength - 3) + '...';
  return parts[0] + '\\...\\' + parts.slice(-2).join('\\');
}

export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.substring(lastDot + 1).toLowerCase();
}

export function getFileIcon(filename: string, isDirectory: boolean): string {
  if (isDirectory) return 'folder';
  const ext = getFileExtension(filename);
  const icons: Record<string, string> = {
    pdf: 'file-text',
    doc: 'file-text',
    docx: 'file-text',
    txt: 'file-text',
    md: 'file-text',
    xls: 'file-spreadsheet',
    xlsx: 'file-spreadsheet',
    csv: 'file-spreadsheet',
    ppt: 'presentation',
    pptx: 'presentation',
    jpg: 'image',
    jpeg: 'image',
    png: 'image',
    gif: 'image',
    webp: 'image',
    svg: 'image',
    mp4: 'video',
    mov: 'video',
    avi: 'video',
    mkv: 'video',
    mp3: 'music',
    wav: 'music',
    flac: 'music',
    zip: 'archive',
    rar: 'archive',
    '7z': 'archive',
    tar: 'archive',
    gz: 'archive',
    js: 'code',
    ts: 'code',
    jsx: 'code',
    tsx: 'code',
    html: 'code',
    css: 'code',
    json: 'code',
    py: 'code',
    rs: 'code',
    go: 'code',
    exe: 'cpu',
    msi: 'cpu',
    dmg: 'cpu',
    app: 'cpu'
  };
  return icons[ext] || 'file';
}