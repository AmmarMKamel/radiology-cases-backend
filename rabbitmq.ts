// rabbitmq.ts
import amqplib from "amqplib";

let channel: amqplib.Channel | null = null;
let connection: amqplib.Connection | null = null;
const queue = "tasks";

export async function connectToRabbitMQ(): Promise<void> {
  try {
    if (!connection) {
      connection = await amqplib.connect("amqp://localhost:5672");
    }
    if (!channel) {
      channel = await connection.createChannel();
      await channel.assertQueue(queue);
      console.log("Connected to RabbitMQ");
    }
  } catch (error) {
    console.error("Error connecting to RabbitMQ:", error);
    process.exit(1); // Or handle the error differently
  }
}

export function getChannel(): amqplib.Channel {
  if (!channel) {
    throw new Error(
      "RabbitMQ channel not initialized. Call connectToRabbitMQ() first."
    );
  }
  return channel;
}

export async function closeRabbitMQ(): Promise<void> {
  if (connection) {
    await connection.close();
    console.log("Rabbitmq connection closed");
  }
}
