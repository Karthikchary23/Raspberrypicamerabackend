import express from "express";
import { WebSocketServer } from "ws";
import http from "http";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const connections = {};       // { uniqueId: ws }
const clients = new Set();    // controller IDs
const raspberryPis = new Set(); // Pi IDs

const customerdata = [
  {
    email: "lingojikarthikchary@gmail.com",
    password: "123456789",
    roverid: "rover@123",
    uniqueId: "controller@123",
    raspberrypiId: "raspberrypi@123",
  },
];

wss.on("connection", (ws) => {
  ws.isAlive = true;
  ws.on("pong", () => (ws.isAlive = true));

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);
      const { type, uniqueId } = data;
      if (!type || !uniqueId) return;

      console.log("📩 Received:", type, "from", uniqueId);

      const customer = customerdata.find(
        (c) => c.uniqueId === uniqueId || c.raspberrypiId === uniqueId
      );
      if (!customer) {
        console.log("❌ Customer not found for ID:", uniqueId);
        return;
      }

      const piId = customer.raspberrypiId;
      const controllerId = customer.uniqueId;

      // Controller registration
      if (type === "register") {
        console.log("✅ Registering controller:", uniqueId);
        clients.add(uniqueId);
        connections[uniqueId] = ws;

        if (raspberryPis.has(piId)) {
          console.log("📹 Pi is online, starting video for controller");
          connections[piId].send(JSON.stringify({ type: "start_video" }));
        }
      }

      // Raspberry Pi registration
      if (type === "registerraspberrypi") {
        console.log("✅ Registering Raspberry Pi:", uniqueId);
        raspberryPis.add(uniqueId);
        connections[uniqueId] = ws;

        if (clients.has(controllerId)) {
          console.log("📱 Controller is online, starting video for Pi");
          connections[uniqueId].send(JSON.stringify({ type: "start_video" }));
        }
      }

      // Forward signaling messages
      if (["offer", "answer", "ice-candidate"].includes(type)) {
        console.log(`🔄 Forwarding signaling message: ${type}`);
        
        // Offer from controller -> Pi
        if (type === "offer" && connections[piId]) {
          console.log(`➡️ Sending OFFER to Pi: ${piId}`);
          connections[piId].send(JSON.stringify(data));
        }

        // Answer from Pi -> controller
        if (type === "answer" && connections[controllerId]) {
          console.log(`⬅️ Sending ANSWER to Controller: ${controllerId}`);
          connections[controllerId].send(JSON.stringify(data));
        }

        // ICE candidates
        if (type === "ice-candidate") {
          if (uniqueId === controllerId && connections[piId]) {
            console.log(`❄️ Controller -> Pi ICE Candidate`);
            connections[piId].send(JSON.stringify(data));
          } else if (uniqueId === piId && connections[controllerId]) {
            console.log(`❄️ Pi -> Controller ICE Candidate`);
            connections[controllerId].send(JSON.stringify(data));
          }
        }
      }
    } catch (err) {
      console.log("⚠️ Error handling message:", err);
    }
  });

  ws.on("close", () => {
    for (let id in connections) {
      if (connections[id] === ws) {
        clients.delete(id);
        raspberryPis.delete(id);
        delete connections[id];
        console.log("❌ Disconnected:", id);
      }
    }
  });
});

const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

app.get("/", (req, res) => res.send("✅ Signaling server running"));
server.listen(8000, () => console.log("🚀 Server started on port 8000"));
