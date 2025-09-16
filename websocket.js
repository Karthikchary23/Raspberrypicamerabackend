// server.js
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

const clients = new Map(); // clientId -> ws
const pis = new Map();     // piId -> ws

wss.on('connection', (ws) => {
  ws.on('message', (msg) => {
    const data = JSON.parse(msg);

    switch (data.type) {
      case 'register_pi':
        pis.set(data.piId, ws);
        ws.piId = data.piId;
        console.log(`Pi registered: ${data.piId}`);
        break;

      case 'register_app':
        clients.set(data.appId, ws);
        ws.appId = data.appId;
        console.log(`App registered: ${data.appId}`);
        break;

      case 'offer':
        // forward offer from app to Pi
        console.log(`Forwarding offer from app ${data.appId} to pi ${data.piId}`);
        const pi = pis.get(data.piId);
        if (pi) pi.send(JSON.stringify({ type: 'offer', sdp: data.sdp, appId: data.appId }));
        break;

      case 'answer':
        console.log(`Forwarding answer from pi ${data.piId} to app ${data.appId}`);
        // forward answer from Pi to app
        const app = clients.get(data.appId);
        if (app) app.send(JSON.stringify({ type: 'answer', sdp: data.sdp }));
        break;

      case 'ice-candidate':
        console.log(`Forwarding ice candidate from pi ${data.piId} to app ${data.appId}`);

        // forward ICE candidate to the target
        if (data.to === 'pi') {
          const piWs = pis.get(data.piId);
          if (piWs) piWs.send(JSON.stringify({ type: 'ice-candidate', candidate: data.candidate }));
        } else if (data.to === 'app') {
          const appWs = clients.get(data.appId);
          if (appWs) appWs.send(JSON.stringify({ type: 'ice-candidate', candidate: data.candidate }));
        }
        break;
    }
  });

  ws.on('close', () => {
    if (ws.piId) pis.delete(ws.piId);
    if (ws.appId) clients.delete(ws.appId);
  });
});

console.log('Signaling server running on ws://localhost:8080');
