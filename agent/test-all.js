const WebSocket = require('ws');

const TOKEN = '7fca426ffd193b7ea8c77ccd48e63348e2dcaca6e391f6a4ec3a595a19fa2edd';
const ws = new WebSocket('ws://127.0.0.1:3456');

let requestId = 0;
function nextId() { return `req_${++requestId}_${Date.now()}`; }

const pending = new Map();

ws.on('open', () => {
  console.log('=== Connected ===');
  // 1. Auth
  send({ type: 'auth', payload: { token: TOKEN } }, (res) => {
    console.log('Auth:', res.success ? 'OK' : 'FAIL', res.error || '');
    
    // 2. Get drives
    send({ type: 'drives', payload: {} }, (res) => {
      console.log('Drives:', res.success ? res.data.length + ' found' : 'FAIL');
      if (res.data?.length > 0) {
        const drive = res.data[0].letter + '\\';
        
        // 3. List directory
        send({ type: 'list', payload: { path: drive } }, (res) => {
          console.log('List dir:', res.success ? res.data.length + ' items' : 'FAIL');
          
          // 4. Create test file for transfer
          const fs = require('fs');
          const testSrc = 'C:\\test-transfer-src';
          const testDst = 'C:\\test-transfer-dst';
          
          if (!fs.existsSync(testSrc)) fs.mkdirSync(testSrc, { recursive: true });
          if (!fs.existsSync(testDst)) fs.mkdirSync(testDst, { recursive: true });
          
          const testFile1 = testSrc + '\\test-file1.txt';
          const testFile2 = testSrc + '\\test-file2.txt';
          fs.writeFileSync(testFile1, 'Hello World! Copy test file.');
          fs.writeFileSync(testFile2, 'Hello World! Move test file.');
          
          // 5. Test COPY transfer
          send({ type: 'transfer', payload: { 
            sourcePath: testFile1, 
            destinationPath: testDst + '\\copied-file.txt', 
            operation: 'copy', 
            conflictResolution: 'rename' 
          }}, (res) => {
            console.log('Copy transfer:', res.success ? 'STARTED - ID: ' + res.data.id : 'FAIL', res.error || '');
            
            // 6. Test MOVE transfer
            send({ type: 'transfer', payload: { 
              sourcePath: testFile2, 
              destinationPath: testDst + '\\moved-file.txt', 
              operation: 'move', 
              conflictResolution: 'overwrite' 
            }}, (res) => {
              console.log('Move transfer:', res.success ? 'STARTED - ID: ' + res.data.id : 'FAIL', res.error || '');
              
              // 7. Get history
              setTimeout(() => {
                send({ type: 'history', payload: {} }, (res) => {
                  console.log('History:', res.success ? res.data.length + ' entries' : 'FAIL');
                  
                  // 8. Get settings
                  send({ type: 'settings', payload: {} }, (res) => {
                    console.log('Settings:', res.success ? 'OK' : 'FAIL', res.data);
                    
                    // 9. Update settings
                    send({ type: 'settings', payload: { maxConcurrentTransfers: 2, chunkSize: 32768 } }, (res) => {
                      console.log('Update settings:', res.success ? 'OK' : 'FAIL', res.data);
                      
                      // 10. Test browse
                      send({ type: 'browse', payload: { path: testSrc, type: 'folder' } }, (res) => {
                        console.log('Browse:', res.success ? 'OK - ' + res.data.name : 'FAIL');
                        
                        // 11. Test cancel (if any pending)
                        console.log('\n=== All API tests completed ===');
                        ws.close();
                      });
                    });
                  });
                });
              }, 2000);
            });
          });
        });
      }
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
    } else {
      // Progress updates
      if (msg.type === 'progress') {
        const t = msg.payload;
        if (t.status === 'running' || t.status === 'completed' || t.status === 'failed') {
          console.log(`Progress: ${t.id.slice(0,8)} ${t.status} ${Math.round(t.transferredSize/t.totalSize*100)}% ${t.speed>0?Math.round(t.speed/1024)+'KB/s':''}`);
        }
      }
    }
  } catch (e) {
    console.error('Parse error:', e.message);
  }
});

ws.on('error', (err) => console.error('WS Error:', err.message));
ws.on('close', () => { console.log('WS Closed'); process.exit(0); });

setTimeout(() => { console.log('Timeout'); process.exit(1); }, 30000);