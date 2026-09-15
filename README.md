# File Transfer Agent

A fast, modern web application for **direct local file/folder transfer** between folders on your computer, without uploading files to any server.

## Features

- **Direct Local Transfers**: Files move/copy directly between source and destination on your machine
- **No Browser Upload/Download**: File contents never leave your computer through the web interface
- **Streaming Operations**: Handles very large files with chunked streaming (64KB default)
- **Copy & Move Operations**: Support for both copy and cut (move) operations
- **Real-time Progress**: Live progress bars, transfer speed, ETA, and file-by-file status
- **Conflict Resolution**: Overwrite, skip, or rename on conflicts
- **Drag & Drop**: Drop files/folders directly into path fields
- **Folder Browser**: Native file/folder picker through the local agent
- **Transfer History**: Complete log with source, destination, size, speed, duration, status
- **Multi-transfer Queue**: Concurrent transfers with configurable limits
- **Pause/Cancel**: Control active transfers
- **Security**: Localhost-only binding, token authentication, path restrictions
- **Dark/Light Mode**: Professional UI with theme support

## Architecture

```
┌─────────────────◄──────────────────┐
│        Web Browser (React)         │
│  http://localhost:5173             │
└─────────────────┬──────────────────┘
                  │ WebSocket (ws://127.0.0.1:3456)
                  ▼
┌────────────────────────────────────┐
│      Local Agent (Node.js)         │
│  • Filesystem Operations           │
│  • Transfer Engine (Streaming)     │
│  • Authentication                  │
│  • Path Validation                 │
└────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Clone and install all dependencies
npm run install:all
```

### Development

```bash
# Start both agent and frontend (two terminals)
npm run dev:agent    # Terminal 1: Starts agent on ws://127.0.0.1:3456
npm run dev:frontend # Terminal 2: Starts frontend on http://localhost:5173
```

Or use the startup script:

**Windows:**
```cmd
start.bat
```

**Linux/macOS:**
```bash
./start.sh
```

### Production Build

```bash
npm run build
npm run start
```

## Usage

1. **Start the application** using one of the methods above
2. **Open the frontend** at `http://localhost:5173`
3. **Copy the token** from the agent console output (or Settings panel)
4. **Enter the token** in the frontend if prompted (stored in localStorage)
5. **Set source path** - e.g., `C:\Projects\my-app\dist`
6. **Set destination path** - e.g., `D:\Backups\my-app-2024`
7. **Choose operation** - Copy or Move (Cut)
8. **Choose conflict resolution** - Rename, Overwrite, or Skip
9. **Click "Start Transfer"**

## Configuration

### Agent Settings (Settings Panel)

| Setting | Description | Default |
|---------|-------------|---------|
| Port | WebSocket server port | 3456 |
| Max Concurrent Transfers | Simultaneous transfer operations | 3 |
| Chunk Size | Read/write buffer size | 64 KB |
| Allowed Paths | Restrict filesystem access (one per line, empty = all) | All paths |

### Environment Variables

Create `.env` in the agent directory:

```env
PORT=3456
TOKEN=your-secure-token-here
ALLOWED_PATHS=C:\Users\You\Documents;D:\Data
MAX_CONCURRENT=3
CHUNK_SIZE=65536
```

## Security

- **Localhost Only**: Agent binds to `127.0.0.1` only - not accessible from network
- **Token Authentication**: All WebSocket connections require valid token
- **Path Restrictions**: Configure allowed paths to limit filesystem access
- **No Data Proxy**: Frontend never receives file contents - only metadata and progress
- **Input Validation**: All paths sanitized and validated server-side

## API Reference

### WebSocket Messages

#### Authentication
```json
{ "type": "auth", "payload": { "token": "your-token" }, "requestId": "req_1" }
```

#### Start Transfer
```json
{ 
  "type": "transfer", 
  "payload": { 
    "sourcePath": "C:\\source", 
    "destinationPath": "D:\\dest", 
    "operation": "copy", 
    "conflictResolution": "rename" 
  }, 
  "requestId": "req_2" 
}
```

#### Cancel Transfer
```json
{ "type": "cancel", "payload": { "transferId": "uuid" }, "requestId": "req_3" }
```

#### Browse Filesystem
```json
{ "type": "browse", "payload": { "path": "C:\\", "type": "folder" }, "requestId": "req_4" }
```

#### List Directory
```json
{ "type": "list", "payload": { "path": "C:\\Users" }, "requestId": "req_5" }
```

#### Get History
```json
{ "type": "history", "payload": {}, "requestId": "req_6" }
```

#### Update Settings
```json
{ "type": "settings", "payload": { "maxConcurrentTransfers": 5 }, "requestId": "req_7" }
```

### HTTP Endpoints

- `GET /health` - Health check
- `GET /settings` - Get current settings
- `POST /settings` - Update settings
- `GET /token` - Get current token
- `POST /token/reset` - Generate new token

## Project Structure

```
file-transfer-agent/
├── agent/                 # Local Agent (Node.js)
│   ├── src/
│   │   ├── index.ts       # Entry point
│   │   ├── routes/ws.ts   # WebSocket server
│   │   ├── services/
│   │   │   ├── transfer.ts   # Transfer engine
│   │   │   ├── browse.ts     # Filesystem browsing
│   │   │   └── settings.ts   # Settings management
│   │   └── utils/
│   │       ├── fs.ts         # Filesystem utilities
│   │       └── crypto.ts     # Token encryption
│   └── package.json
├── frontend/              # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/      # UI Components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── types/           # TypeScript types
│   │   ├── utils/           # Formatting utilities
│   │   └── styles/          # Tailwind CSS
│   └── package.json
├── shared/                # Shared types
│   └── types.ts
├── package.json           # Root package.json
├── start.bat              # Windows startup script
├── start.sh               # Unix startup script
└── README.md
```

## Troubleshooting

### Agent won't start
- Check Node.js version: `node -v` (requires 18+)
- Check port 3456 is available: `netstat -an | findstr 3456`
- Run `npm install` in agent directory

### Frontend can't connect
- Verify agent is running (check console for "WebSocket server listening")
- Check token matches (Settings panel shows current token)
- Check browser console for WebSocket errors

### Permission denied errors
- Run terminal as Administrator (Windows) or with sudo (Linux/mac)
- Add paths to "Allowed Paths" in Settings
- Check file/folder permissions

### Large file transfers fail
- Increase chunk size in Settings (try 1MB or 4MB)
- Ensure destination has enough free space
- Check for file locks by other applications

## License

MIT License - see LICENSE file for details.