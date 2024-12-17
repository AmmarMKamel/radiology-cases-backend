// import amqplib from "amqplib";
// import io from "socket.io-client";
// import { v2 as cloudinary } from "cloudinary";

// const queue = "tasks";
// let channel: amqplib.Channel;
// const socket = io("http://localhost:3000");
// import { getChannel } from "./rabbitmq";

// import addCase from "./utils/add-case";
// import mongoose from "mongoose";

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// async function connectToRabbitMQ() {
//   try {
//     const connection = await amqplib.connect("amqp://localhost:5672");
//     channel = await connection.createChannel();
//     await channel.assertQueue(queue);
//     console.log("Worker connected to RabbitMQ");
//     return connection;
//   } catch (error) {
//     console.error("Error connecting to RabbitMQ:", error);
//     process.exit(1);
//   }
// }

// async function consumeMessages() {
//   await mongoose.connect(process.env.MONGODB_URI!);
//   await connectToRabbitMQ();
//   channel.consume(queue, async (msg: any) => {
//     if (msg !== null) {
//       try {
//         const message = JSON.parse(msg.content.toString());
//         const result = await addCase(message.url);
//         socket.emit("task-completed", {
//           userId: message.userId,
//           result,
//           timestamp: message.timestamp,
//         });
//         console.log(`Task completed for user ${message.userId}`);
//         channel.ack(msg); // Acknowledge message processing
//       } catch (error) {
//         console.error("Error processing message:", error);
//         // socket.emit("task-failed", {
//         //   userId: message.userId,
//         //   error: error.message,
//         //   timestamp: message.timestamp,
//         // });
//         channel.nack(msg, false, true);
//       }
//     }
//   });
// }

// consumeMessages();
