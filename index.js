import express from "express";
import { WebSocketServer } from "ws";
import http from "http";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const clients = {}; // controllers { uniqueId: ws }
const raspberrypi = {}; // Raspberry Pis { uniqueId: ws }

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
  console.log("New client connected");

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      const { type, uniqueId } = data;

      // Controller registration
      if (type === "register") {
        const customer = customerdata.find((c) => c.uniqueId === uniqueId);
        if (!customer) return;

        clients[uniqueId] = ws;
        console.log(`Controller connected: ${uniqueId}`);

        const piId = customer.raspberrypiId;
        if (raspberrypi[piId]) {
          // Auto-start video
          console.log(`Pi ${piId} is connected. Starting video automatically.`);
          raspberrypi[piId].send(JSON.stringify({ type: "start_video" }));
        }
      }

      // Raspberry Pi registration
      if (type === "registerraspberrypi") {
        const customer = customerdata.find((c) => c.raspberrypiId === uniqueId);
        if (!customer) return;

        raspberrypi[uniqueId] = ws;
        console.log(`Raspberry Pi connected: ${uniqueId}`);

        const controllerId = customer.uniqueId;
        if (clients[controllerId]) {
          // Auto-start video
          console.log(
            `Controller ${controllerId} is connected. Pi will start video automatically.`
          );
          ws.send(JSON.stringify({ type: "start_video" }));
        }
      }
      // if (type === "video_link") {
      //   console.log(`Video link from Pi ${uniqueId}: ${data.url}`);

      //   // Send link to controller too
      //   const customer = customerdata.find((c) => c.raspberrypiId === uniqueId);
      //   if (customer && clients[customer.uniqueId]) {
      //     clients[customer.uniqueId].send(
      //       JSON.stringify({
      //         type: "video_link",
      //         url: data.url,
      //       })
      //     );
      //   }
      // }
      if (type === "video_link") {
  console.log(`Video link from Pi ${uniqueId}: ${data.url}`);
  const customer = customerdata.find(c => c.raspberrypiId === uniqueId);
  if (customer && clients[customer.uniqueId]) {
    clients[customer.uniqueId].send(JSON.stringify({
      type: "video_link",
      url: data.url
    }));
  }
}


      
    } catch (err) {
      console.log("Error:", err);
    }
  });

  ws.on("close", () => {
    for (let id in clients) if (clients[id] === ws) delete clients[id];
    for (let id in raspberrypi)
      if (raspberrypi[id] === ws) delete raspberrypi[id];
    console.log("Client disconnected");
  });
});

app.get("/", (req, res) => res.send("Server running"));
server.listen(8000, () => console.log("Server started on port 8000"));
