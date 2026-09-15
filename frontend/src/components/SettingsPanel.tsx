import { useState, useEffect } from 'react';
import { Copy, RefreshCw, Eye, EyeOff, Save, Check, Info, Server, HardDrive, Cpu, MemoryStick } from 'lucide-react';
import { clsx } from 'clsx';
import type { AgentSettings } from '../types';

interface SettingsPanelProps {
  settings: AgentSettings;
  token: string;
  onUpdateSettings: (settings: Partial<AgentSettings>) => Promise<void>;
  onTokenChange: (token: string) => void;
  onRetryAuth: (token: string) => Promise<boolean>;
  isConnected: boolean;
  isAuthenticated: boolean;
}

export function SettingsPanel({ settings, token, onUpdateSettings, onTokenChange, onRetryAuth, isConnected, isAuthenticated }: SettingsPanelProps) {
  const [showToken, setShowToken] = useState(false);
  const [editedSettings, setEditedSettings] = useState<Partial<AgentSettings>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [customToken, setCustomToken] = useState(token);
  const [authenticating, setAuthenticating] = useState(false);

  useEffect(() => {
    setCustomToken(token);
  }, [token]);

  const handleSave = async () => {
    setSaving(true);
    try {
      console.log('Saving settings:', editedSettings);
      await onUpdateSettings(editedSettings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyToken = async () => {
    await navigator.clipboard.writeText(customToken || token);
  };

  const handleTokenSave = async () => {
    onTokenChange(customToken);
    setAuthenticating(true);
    try {
      const success = await onRetryAuth(customToken);
      if (success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        alert('Authentication failed. Please check the token and try again.');
      }
    } finally {
      setAuthenticating(false);
    }
  };

  const handleRegenerateToken = async () => {
    if (!confirm('This will invalidate the current token. Continue?')) return;
    try {
      alert('Token regeneration requires agent restart. Please restart the agent to generate a new token.');
    } catch (err) {
      console.error('Failed to regenerate token:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-black dark:text-white">Connection</h2>
          <div className="flex items-center gap-3">
            <span className={clsx('px-3 py-1 rounded-full text-xs font-medium', 
              isAuthenticated ? 'bg-black text-white' :
              isConnected ? 'bg-gray-300 dark:bg-gray-600 text-black dark:text-white' :
              'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
            )}>
              {isAuthenticated ? 'Authenticated' : isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">WebSocket URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                value="ws://127.0.0.1:3456"
                readOnly
                className="input flex-1 bg-gray-100 dark:bg-gray-800"
              />
              <button onClick={handleCopyToken} className="btn-secondary">
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">The agent WebSocket endpoint</p>
          </div>

          <div>
            <label className="label">Authentication Token</label>
            <div className="flex gap-2">
              <input
                type={showToken ? 'text' : 'password'}
                value={customToken}
                onChange={(e) => setCustomToken(e.target.value)}
                className="input flex-1 font-mono text-sm"
                placeholder="Enter token from agent console"
              />
              <button onClick={() => setShowToken(!showToken)} className="btn-secondary">
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button onClick={handleCopyToken} className="btn-secondary">
                <Copy className="w-4 h-4" />
              </button>
              <button onClick={handleTokenSave} className="btn-primary" disabled={authenticating}>
                {authenticating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-1" />
                    Save & Connect
                  </>
                )}
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enter the token shown in the agent console. Saved to browser storage.</p>
          </div>

          <div className="flex items-center gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <Server className="w-6 h-6 text-gray-500" />
            <div>
              <p className="font-medium text-black dark:text-white">Agent Status</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isAuthenticated ? 'Connected and authenticated' : isConnected ? 'Connected, not authenticated' : 'Disconnected'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-black dark:text-white mb-6">Transfer Settings</h2>
        
        <div className="space-y-4">
          <div>
            <label className="label">Max Concurrent Transfers</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="10"
                value={editedSettings.maxConcurrentTransfers || settings.maxConcurrentTransfers}
                onChange={(e) => setEditedSettings({ ...editedSettings, maxConcurrentTransfers: parseInt(e.target.value) })}
                className="flex-1"
              />
              <span className="w-12 text-right font-mono text-black dark:text-white">
                {editedSettings.maxConcurrentTransfers || settings.maxConcurrentTransfers}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Number of simultaneous transfer operations</p>
          </div>

          <div>
            <label className="label">Chunk Size (bytes)</label>
            <select
              value={editedSettings.chunkSize || settings.chunkSize}
              onChange={(e) => setEditedSettings({ ...editedSettings, chunkSize: parseInt(e.target.value) })}
              className="input w-auto"
            >
              <option value={16 * 1024}>16 KB</option>
              <option value={64 * 1024}>64 KB</option>
              <option value={256 * 1024}>256 KB</option>
              <option value={1024 * 1024}>1 MB</option>
              <option value={4 * 1024 * 1024}>4 MB</option>
              <option value={16 * 1024 * 1024}>16 MB</option>
            </select>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Larger chunks = faster transfers but more memory usage</p>
          </div>

          <div>
            <label className="label">Allowed Paths (one per line)</label>
            <textarea
              value={(editedSettings.allowedPaths || settings.allowedPaths).join('\n')}
              onChange={(e) => setEditedSettings({ ...editedSettings, allowedPaths: e.target.value.split('\n').filter(p => p.trim()) })}
              rows={4}
              className="input font-mono text-sm"
              placeholder="C:\\Users\\User\\Documents&#10;D:\\Data&#10;/home/user/files"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Restrict filesystem access to these paths. Empty = allow all.</p>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex-1"
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </>
              ) : saved ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </>
              )}
            </button>
            
            <button onClick={handleRegenerateToken} className="btn-secondary">
              <RefreshCw className="w-4 h-4 mr-1" />
              Regenerate Token
            </button>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-black dark:text-white mb-6">System Information</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <InfoCard icon={<HardDrive className="w-6 h-6" />} label="Platform" value={navigator.platform} />
          <InfoCard icon={<Cpu className="w-6 h-6" />} label="CPU Cores" value={navigator.hardwareConcurrency?.toString() || 'Unknown'} />
          <InfoCard icon={<MemoryStick className="w-6 h-6" />} label="Memory" value={`${Math.round((navigator as any).deviceMemory || 0)} GB`} />
          <InfoCard icon={<Server className="w-6 h-6" />} label="User Agent" value={navigator.userAgent.split(' ')[0]} />
        </div>

        <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <h3 className="font-medium text-black dark:text-white mb-3">Security Notes</h3>
          <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-2">
            <li className="flex items-start gap-2"><Info className="w-4 h-4 mt-0.5 flex-shrink-0" /> The agent binds only to localhost (127.0.0.1) - not accessible from network</li>
            <li className="flex items-start gap-2"><Info className="w-4 h-4 mt-0.5 flex-shrink-0" /> All file operations happen locally on your machine - no data leaves your computer</li>
            <li className="flex items-start gap-2"><Info className="w-4 h-4 mt-0.5 flex-shrink-0" /> Use "Allowed Paths" to restrict which folders the agent can access</li>
            <li className="flex items-start gap-2"><Info className="w-4 h-4 mt-0.5 flex-shrink-0" /> Regenerate token if you suspect it was compromised</li>
            <li className="flex items-start gap-2"><Info className="w-4 h-4 mt-0.5 flex-shrink-0" /> The agent requires Node.js 18+ to run</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-black dark:bg-white rounded-lg text-white dark:text-black">
          {icon}
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <p className="font-mono text-black dark:text-white text-sm truncate">{value}</p>
    </div>
  );
}