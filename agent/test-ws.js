const WebSocket = require('ws');
const ws = new WebSocket('ws://127.0.0.1:3456');

ws.on('open', () => {
  console.log('Connected');
  ws.send(JSON.stringify({ 
    type: 'auth', 
    payload: { token: '7fca426ffd193b7ea8c77ccd48e63348e2dcaca6e391f6a4ec3a595a19fa2edd' }, 
    requestId: 'test1' 
  }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  console.log('Received:', JSON.stringify(msg, null, 2));
  if (msg.requestId === 'test1' && msg.success) {
    console.log('Sending settings...');
    ws.send(JSON.stringify({ 
      type: 'settings', 
      payload: { maxConcurrentTransfers: 5, chunkSize: 1048576 }, 
      requestId: 'test2' 
    }));
  }
});

ws.on('error', (err) => console.error('Error:', err.message));

setTimeout(() => process.exit(0), 5000);