import { promises as fs } from 'fs';
import * as fsSync from 'fs';
import * as path from 'path';
import { stat } from 'fs/promises';

export async function exists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

export async function isDirectory(path: string): Promise<boolean> {
  try {
    const stats = await fs.stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

export async function isFile(path: string): Promise<boolean> {
  try {
    const stats = await fs.stat(path);
    return stats.isFile();
  } catch {
    return false;
  }
}

export async function getStats(path: string) {
  return fs.stat(path);
}

export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw err;
    }
  }
}

export async function copyFileWithProgress(
  src: string,
  dest: string,
  onProgress: (transferred: number) => void,
  signal: AbortSignal,
  chunkSize: number = 64 * 1024
): Promise<void> {
  const stats = await fs.stat(src);
  const totalSize = stats.size;
  let transferred = 0;

  const readStream = fsSync.createReadStream(src, { highWaterMark: chunkSize });
  const writeStream = fsSync.createWriteStream(dest);

  return new Promise((resolve, reject) => {
    const abortHandler = () => {
      readStream.destroy();
      writeStream.destroy();
      reject(new Error('Transfer cancelled'));
    };

    signal.addEventListener('abort', abortHandler);

    readStream.on('data', (chunk: Buffer | string) => {
      transferred += chunk.length;
      onProgress(transferred);
      if (!writeStream.write(chunk)) {
        readStream.pause();
      }
    });

    writeStream.on('drain', () => {
      readStream.resume();
    });

    readStream.on('end', () => {
      writeStream.end();
    });

    writeStream.on('finish', () => {
      signal.removeEventListener('abort', abortHandler);
      resolve();
    });

    readStream.on('error', (err) => {
      signal.removeEventListener('abort', abortHandler);
      writeStream.destroy();
      reject(err);
    });

    writeStream.on('error', (err) => {
      signal.removeEventListener('abort', abortHandler);
      readStream.destroy();
      reject(err);
    });
  });
}

export async function moveFile(src: string, dest: string): Promise<void> {
  try {
    await fs.rename(src, dest);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'EXDEV') {
      await copyFileWithProgress(src, dest, () => {}, new AbortSignal());
      await fs.unlink(src);
    } else {
      throw err;
    }
  }
}

export async function getDirectorySize(dirPath: string): Promise<number> {
  let totalSize = 0;
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      totalSize += await getDirectorySize(fullPath);
    } else {
      const stats = await fs.stat(fullPath);
      totalSize += stats.size;
    }
  }
  
  return totalSize;
}

export async function getFileList(dirPath: string, basePath: string = ''): Promise<Array<{ path: string; relativePath: string; size: number; isDirectory: boolean }>> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files: Array<{ path: string; relativePath: string; size: number; isDirectory: boolean }> = [];
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.join(basePath, entry.name);
    
    if (entry.isDirectory()) {
      files.push({ path: fullPath, relativePath, size: 0, isDirectory: true });
      const subFiles = await getFileList(fullPath, relativePath);
      files.push(...subFiles);
    } else {
      const stats = await fs.stat(fullPath);
      files.push({ path: fullPath, relativePath, size: stats.size, isDirectory: false });
    }
  }
  
  return files;
}

export function normalizeInputPath(rawPath: string): string {
  if (!rawPath) return '';
  let cleaned = rawPath.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return path.normalize(cleaned);
}

export function sanitizePath(inputPath: string, allowedPaths: string[]): string {
  const cleaned = normalizeInputPath(inputPath);
  const normalized = path.resolve(cleaned);
  
  const isAllowed = allowedPaths.some(allowed => {
    const allowedNormalized = path.resolve(allowed);
    return normalized.startsWith(allowedNormalized + path.sep) || normalized === allowedNormalized;
  });
  
  if (!isAllowed && allowedPaths.length > 0) {
    throw new Error(`Path not allowed: ${normalized}`);
  }
  
  return normalized;
}

export function getDestinationPath(sourcePath: string, destinationPath: string, isDirectory: boolean): string {
  const sourceName = path.basename(sourcePath);
  
  if (isDirectory) {
    return path.join(destinationPath, sourceName);
  }
  
  return path.join(destinationPath, sourceName);
}

export async function resolveConflict(
  destPath: string,
  resolution: 'overwrite' | 'skip' | 'rename',
  isDirectory: boolean
): Promise<string | null> {
  if (!(await exists(destPath))) {
    return destPath;
  }
  
  switch (resolution) {
    case 'overwrite':
      if (isDirectory) {
        await fs.rm(destPath, { recursive: true, force: true });
      } else {
        await fs.unlink(destPath);
      }
      return destPath;
      
    case 'skip':
      return null;
      
    case 'rename': {
      const ext = path.extname(destPath);
      const base = path.basename(destPath, ext);
      const dir = path.dirname(destPath);
      let counter = 1;
      let newPath = path.join(dir, `${base} (${counter})${ext}`);
      
      while (await exists(newPath)) {
        counter++;
        newPath = path.join(dir, `${base} (${counter})${ext}`);
      }
      
      return newPath;
    }
    
    default:
      throw new Error(`Unknown conflict resolution: ${resolution}`);
  }
}