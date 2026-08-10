const amqp = require("amqplib");
const logger = require("./logger").logger;

let channel = null;

async function connectRabbitMQ() {
  const RABBITMQ_URL =
    process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue("order_notifications", { durable: true });
    logger.info("RabbitMQ connection successful");
  } catch (error) {
    logger.error("Error in connecting RabbitMQ", { error: error.message });
  }
}

function publishOrderCompletedEvent(eventData) {
  if (!channel) {
    logger.warn("RabbitMQ channel not available.");
    return false;
  }
  const queue = "order_notifications";
  const message = JSON.stringify(eventData);
  channel.sendToQueue(queue, Buffer.from(message), { persistent: true });
  logger.info("Published order completed event to RabbitMq", {
    orderId: eventData.orderId,
  });
  return true;
}

module.exports = { connectRabbitMQ, publishOrderCompletedEvent };
