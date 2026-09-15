import { promises as fs } from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import os from 'os';
import type { BrowseResponse, DriveInfo } from '@shared/types';
import { exists, isDirectory, getStats, sanitizePath } from '../utils/fs';

export class BrowseService {
  private allowedPaths: string[];

  constructor(allowedPaths: string[] = []) {
    this.allowedPaths = allowedPaths;
  }

  setAllowedPaths(paths: string[]): void {
    this.allowedPaths = paths;
  }

  async browse(requestPath: string, type: 'file' | 'folder'): Promise<BrowseResponse> {
    const sanitized = sanitizePath(requestPath, this.allowedPaths);
    
    if (!(await exists(sanitized))) {
      throw new Error(`Path does not exist: ${sanitized}`);
    }

    const stats = await getStats(sanitized);
    const isDir = stats.isDirectory();

    if (type === 'file' && isDir) {
      throw new Error('Path is a directory, not a file');
    }
    
    if (type === 'folder' && !isDir) {
      throw new Error('Path is a file, not a directory');
    }

    return this.buildResponse(sanitized, stats, isDir);
  }

  async listDirectory(dirPath: string): Promise<BrowseResponse[]> {
    const sanitized = sanitizePath(dirPath, this.allowedPaths);
    
    if (!(await exists(sanitized))) {
      throw new Error(`Directory does not exist: ${sanitized}`);
    }

    if (!(await isDirectory(sanitized))) {
      throw new Error(`Path is not a directory: ${sanitized}`);
    }

    const entries = await fs.readdir(sanitized, { withFileTypes: true });
    const results: BrowseResponse[] = [];

    for (const entry of entries) {
      const fullPath = path.join(sanitized, entry.name);
      try {
        const stats = await getStats(fullPath);
        results.push(this.buildResponse(fullPath, stats, entry.isDirectory()));
      } catch {
        // Skip entries we can't read
      }
    }

    return results.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  private buildResponse(fullPath: string, stats: any, isDir: boolean): BrowseResponse {
    return {
      path: fullPath,
      name: path.basename(fullPath),
      isDirectory: isDir,
      size: isDir ? 0 : stats.size,
      modified: stats.mtimeMs,
      children: isDir ? undefined : undefined
    };
  }

  async getDrives(): Promise<DriveInfo[]> {
    const drives: DriveInfo[] = [];
    
    if (process.platform === 'win32') {
      try {
        const output = execSync('powershell -NoProfile -Command "Get-CimInstance Win32_LogicalDisk | Select-Object DeviceID,VolumeName,FileSystem,FreeSpace,Size | ConvertTo-Json"', { encoding: 'utf8', timeout: 5000 });
        const data = JSON.parse(output.trim());
        const list = Array.isArray(data) ? data : (data ? [data] : []);
        for (const item of list) {
          if (item.DeviceID) {
            drives.push({
              letter: item.DeviceID,
              label: item.VolumeName || 'Local Disk',
              totalSpace: Number(item.Size) || 0,
              freeSpace: Number(item.FreeSpace) || 0,
              fileSystem: item.FileSystem || '',
              type: 'fixed'
            });
          }
        }
      } catch {
        // Fallback drive letter probe
        for (let i = 65; i <= 90; i++) {
          const letter = String.fromCharCode(i) + ':';
          try {
            await fs.stat(letter + '\\');
            drives.push({
              letter,
              label: 'Local Disk',
              totalSpace: 0,
              freeSpace: 0,
              fileSystem: '',
              type: 'fixed'
            });
          } catch {}
        }
      }
    } else {
      try {
        const output = execSync('df -h', { encoding: 'utf8' });
        const lines = output.trim().split('\n').slice(1);
        
        for (const line of lines) {
          const parts = line.split(/\s+/);
          if (parts.length >= 6) {
            const [filesystem, size, used, avail, , mountpoint] = parts;
            if (mountpoint === '/' || mountpoint.startsWith('/mnt/') || mountpoint.startsWith('/media/')) {
              drives.push({
                letter: mountpoint,
                label: mountpoint,
                totalSpace: this.parseSize(size),
                freeSpace: this.parseSize(avail),
                fileSystem: filesystem,
                type: mountpoint === '/' ? 'fixed' : 'removable'
              });
            }
          }
        }
      } catch {}
    }
    
    return drives;
  }

  private parseSize(str: string): number {
    const match = str.match(/^(\d+(?:\.\d+)?)([KMGT]?)/);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = { K: 1024, M: 1024**2, G: 1024**3, T: 1024**4 };
    return Math.round(value * (multipliers[unit] || 1));
  }

  async getSystemInfo() {
    return {
      platform: os.platform(),
      arch: os.arch(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpus: os.cpus().length
    };
  }
}

export const browseService = new BrowseService();