const WebSocket = require('ws');

const TOKEN = '7fca426ffd193b7ea8c77ccd48e63348e2dcaca6e391f6a4ec3a595a19fa2edd';
const ws = new WebSocket('ws://127.0.0.1:3456');

let requestId = 0;
function nextId() { return `req_${++requestId}_${Date.now()}`; }

const pending = new Map();

ws.on('open', () => {
  console.log('=== Testing Directory Copy ===');
  send({ type: 'auth', payload: { token: TOKEN } }, (res) => {
    console.log('Auth:', res.success ? 'OK' : 'FAIL');
    
    // Test directory copy
    const testSrc = 'C:\\test-transfer-src';
    const testDst = 'C:\\test-transfer-dst2';
    
    const fs = require('fs');
    if (!fs.existsSync(testSrc)) fs.mkdirSync(testSrc, { recursive: true });
    if (!fs.existsSync(testDst)) fs.mkdirSync(testDst, { recursive: true });
    fs.writeFileSync(testSrc + '\\file1.txt', 'Content of file 1');
    fs.writeFileSync(testSrc + '\\file2.txt', 'Content of file 2');
    fs.mkdirSync(testSrc + '\\subdir', { recursive: true });
    fs.writeFileSync(testSrc + '\\subdir\\file3.txt', 'Content of file 3 in subdir');
    
    send({ type: 'transfer', payload: { 
      sourcePath: testSrc, 
      destinationPath: testDst, 
      operation: 'copy', 
      conflictResolution: 'rename' 
    }}, (res) => {
      console.log('Copy transfer:', res.success ? 'STARTED - ID: ' + res.data.id : 'FAIL', res.error || '');
    });
  });
});

function send(msg, callback) {
  const id = nextId();
  pending.set(id, callback);
  ws.send(JSON.stringify({ ...msg, requestId: id }));
}

ws.on('message', (data) => {
  try {
    const msg = JSON.parse(data.toString());
    if (msg.requestId && pending.has(msg.requestId)) {
      const cb = pending.get(msg.requestId);
      pending.delete(msg.requestId);
      cb(msg);
    } else if (msg.type === 'progress') {
      const t = msg.payload;
      console.log(`Progress: ${t.id.slice(0,8)} ${t.status} ${Math.round(t.transferredSize/t.totalSize*100)}%`);
    } else if (msg.type === 'transfer-complete') {
      console.log('Transfer completed:', msg.payload.id.slice(0,8));
      setTimeout(() => {
        // Verify files
        const fs = require('fs');
        const dst = 'C:\\test-transfer-dst2\\test-transfer-src';
        if (fs.existsSync(dst)) {
          console.log('\nVerifying copied files:');
          function walk(dir, prefix = '') {
            const files = fs.readdirSync(dir);
            files.forEach(f => {
              const full = path.join(dir, f);
              const stat = fs.statSync(full);
              if (stat.isDirectory()) {
                console.log(`${prefix}📁 ${f}/`);
                walk(full, prefix + '  ');
              } else {
                console.log(`${prefix}📄 ${f} (${stat.size} bytes)`);
              }
            });
          }
          walk(dst);
        } else {
          console.log('Destination directory not found!');
        }
        ws.close();
      }, 1000);
    }
  } catch (e) {
    console.error('Parse error:', e.message);
  }
});

const path = require('path');

ws.on('error', (err) => console.error('WS Error:', err.message));
ws.on('close', () => { console.log('WS Closed'); process.exit(0); });

setTimeout(() => { console.log('Timeout'); process.exit(1); }, 30000);