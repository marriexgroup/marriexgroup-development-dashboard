import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import morgan from "morgan";

import routes from "./routes/index.js";

dotenv.config();

import http from "http";
import { Server } from "socket.io";
import { socketHandler } from "./socket/socket-handler.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL,
      "http://localhost:5173",
      "http://localhost:3000",
      "https://pro-dashbord-developers.marriexgroup.com",
      "https://marriexgroup-development-dashboard-chi.vercel.app",
      /^https:\/\/.*\.vercel\.app$/, // Allow all Vercel preview deployments
    ].filter(Boolean),
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  allowEIO3: true, // Support older Socket.IO clients
  transports: ["polling", "websocket"], // Explicitly allow both transports
  allowUpgrades: true,
  // Better handling for serverless environments
  connectTimeout: 45000,
  upgradeTimeout: 10000,
});

socketHandler(io);

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "DELETE", "PUT"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(morgan("dev"));

// db connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("BD Connected successfully."))
  .catch((err) => console.log("Failed to connect to DB:", err));

app.use(express.json());

const PORT = process.env.PORT || 5000;

app.get("/", async (req, res) => {
  res.status(200).json({
    message: "Welcome to TaskHub API",
  });
});
// http:localhost:500/api-v1/
app.use("/api-v1", routes);

// error middleware
app.use((err, req, res, next) => {
  console.log(err.stack);
  res.status(500).json({ message: "Internal server error" });
});

// not found middleware
app.use((req, res) => {
  res.status(404).json({
    message: "Not found",
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
