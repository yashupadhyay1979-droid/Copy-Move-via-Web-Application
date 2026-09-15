import * as fs from 'fs';
import * as path from 'path';
import type { AgentSettings } from '@shared/types';
import { generateToken, hashToken, verifyToken } from '../utils/crypto';

const SETTINGS_FILE = path.join(process.cwd(), 'agent-settings.json');

const DEFAULT_SETTINGS: AgentSettings = {
  port: 3456,
  token: '',
  allowedPaths: [],
  maxConcurrentTransfers: 3,
  chunkSize: 64 * 1024
};

export class SettingsService {
  private settings: AgentSettings;
  private tokenHash: string = '';

  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.load();
  }

  private load(): void {
    try {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      const loaded = JSON.parse(data);
      this.settings = { ...DEFAULT_SETTINGS, ...loaded };
      if (this.settings.token) {
        this.tokenHash = hashToken(this.settings.token);
      }
    } catch {
      this.regenerateToken();
      this.save();
    }
  }

  private save(): void {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(this.settings, null, 2));
  }

  private regenerateToken(): void {
    this.settings.token = generateToken();
    this.tokenHash = hashToken(this.settings.token);
  }

  getSettings(): AgentSettings {
    return { ...this.settings };
  }

  getToken(): string {
    return this.settings.token;
  }

  verifyToken(token: string): boolean {
    return verifyToken(token, this.tokenHash);
  }

  updateSettings(updates: Partial<AgentSettings>): AgentSettings {
    if (updates.token) {
      this.settings.token = updates.token;
      this.tokenHash = hashToken(updates.token);
    }
    
    if (updates.port) {
      this.settings.port = updates.port;
    }
    
    if (updates.allowedPaths) {
      this.settings.allowedPaths = updates.allowedPaths;
    }
    
    if (updates.maxConcurrentTransfers) {
      this.settings.maxConcurrentTransfers = updates.maxConcurrentTransfers;
    }
    
    if (updates.chunkSize) {
      this.settings.chunkSize = updates.chunkSize;
    }

    this.save();
    return this.getSettings();
  }

  resetToken(): string {
    this.regenerateToken();
    this.save();
    return this.settings.token;
  }
}

export const settingsService = new SettingsService();