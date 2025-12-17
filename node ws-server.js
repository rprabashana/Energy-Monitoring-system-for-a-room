// ws-server.js (demo) - sends simulated readings to connected clients
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });
console.log('WS server listening on ws://localhost:8080');

function sendRandom(wss) {
  const payload = JSON.stringify({
    type: 'reading',
    powerW: Math.round(100 + Math.random()*900),
    ts: Date.now(),
    // optional device states
    deviceStates: { ac: Math.random()>0.8, fan: Math.random()>0.7 }
  });
  wss.clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload);
  });
}

wss.on('connection', (ws) => {
  console.log('client connected');
  ws.on('message', msg => console.log('from client:', msg.toString()));
});

// send every second
setInterval(()=>sendRandom(wss), 1000);