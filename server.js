
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let latestData = {
  deviceId: "SMART_BIN_01",
  distance1: null,
  distance2: null,
  averageDistance: null,
  fillPercent: null,
  temperature: null,
  humidity: null,
  gasRaw: null,
  weightRaw: null,
  timestamp: null
};

app.get("/", (req, res) => {
  res.send("SmartBin Cloud API is running!");
});

app.post("/api/bin", (req, res) => {
  const {
    deviceId,
    distance1,
    distance2,
    averageDistance,
    fillPercent,
    temperature,
    humidity,
    gasRaw,
    weightRaw
  } = req.body;

  // Keep the required distance validation.
  if (
    ![distance1, distance2, averageDistance, fillPercent]
      .every(Number.isFinite) ||
    fillPercent < 0 ||
    fillPercent > 100
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid sensor data"
    });
  }

  // Optional readings can be null while sensors are unavailable.
  const optionalValues = {
    temperature,
    humidity,
    gasRaw,
    weightRaw
  };

  for (const [key, value] of Object.entries(optionalValues)) {
    if (value !== undefined &&
        value !== null &&
        !Number.isFinite(value)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${key} reading`
      });
    }
  }

  latestData = {
    deviceId: deviceId || "SMART_BIN_01",
    distance1,
    distance2,
    averageDistance,
    fillPercent,
    temperature: temperature ?? null,
    humidity: humidity ?? null,
    gasRaw: gasRaw ?? null,
    weightRaw: weightRaw ?? null,
    timestamp: new Date().toISOString()
  };

  console.log("SmartBin data:", latestData);

  io.emit("binData", latestData);

  res.json({
    success: true,
    message: "SmartBin data received",
    data: latestData
  });
});

app.get("/api/bin", (req, res) => {
  res.json(latestData);
});

io.on("connection", (socket) => {
  console.log("Dashboard connected:", socket.id);
  socket.emit("binData", latestData);

  socket.on("disconnect", () => {
    console.log("Dashboard disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`SmartBin server running on port ${PORT}`);
});
