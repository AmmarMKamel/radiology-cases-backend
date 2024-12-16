import express from "express";
import rateLimit from "express-rate-limit";
import bodyParser from "body-parser";
import { v2 as cloudinary } from "cloudinary";
import mongoose, { mongo } from "mongoose";
import amqplib from "amqplib";
import { Server } from "socket.io";
import http from "http";
import dotenv from "dotenv";
// require("dotenv").config();

import { connectToRabbitMQ, getChannel } from "./rabbitmq";

import caseRoutes from "./routes/case";

dotenv.config({ path: `.env.${process.env.NODE_ENV || "development"}` });

const app = express();

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: "Too many requests from this IP, please try again after 1 minute",
  standardHeaders: true,
  legacyHeaders: false,
});

const port = process.env.PORT || 3000;

app.use(limiter);

// const queue = "tasks"; // Name of the queue
// let channel;

// async function connectToRabbitMQ() {
//   try {
//     const connection = await amqplib.connect("amqp://localhost:5672");
//     channel = await connection.createChannel();
//     await channel.assertQueue(queue);
//     console.log("Connected to RabbitMQ");
//   } catch (error) {
//     console.error("Error connecting to RabbitMQ:", error);
//     process.exit(1);
//   }
// }

app.use((_, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*"); // Allow all origins
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE"); // Allowed methods
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization"); // Allowed headers
  next();
});

app.use(bodyParser.json());

app.use("/api/cases", caseRoutes);

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

mongoose
  .connect(process.env.MONGODB_URI!)
  // .then(() => connectToRabbitMQ())
  .then(() => {
    // const server = http.createServer(app);
    // const io = new Server(server, {
    //   cors: {
    //     origin: "http://localhost:3000",
    //     methods: ["GET", "POST"],
    //   },
    // });

    // io.on("connection", (socket) => {
    //   console.log("a user connected");
    //   socket.on("disconnect", () => {
    //     console.log("user disconnected");
    //   });
    // });

    app.listen(port, () => {
      console.log("Server started...");
    });

    // startWorkerIfQueueHasMessages();
  })
  .catch((error) => console.log(error));

// async function startWorkerIfQueueHasMessages() {
//   try {
//     const channel = getChannel();
//     const q = await channel.checkQueue("tasks");
//     if (q.messageCount > 0) {
//       console.log(`Queue has ${q.messageCount} messages. Starting worker...`);
//       // Start your worker process here (e.g., using child_process.fork)
//       const { fork } = require("child_process");
//       // fork("./worker");
//       fork("./worker", [], { execArgv: ["-r", "ts-node/register"] });
//     } else {
//       console.log("Queue is empty. Worker not needed.");
//     }
//   } catch (error) {
//     console.error("Error checking queue:", error);
//   }
// }
