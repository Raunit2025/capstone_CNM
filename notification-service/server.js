require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const amqp = require("amqplib");
const nodemailer = require("nodemailer");
const cors = require("cors");
const logger = require("./config/logger");
const Notification = require("./models/Notification");
const { promises } = require("nodemailer/lib/xoauth2");

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://admin:password@localhost:27017/notification_db?authSource=admin";
mongoose
  .connect(MONGO_URI)
  .then(() => logger.info("MongoDb connection Successful"))
  .catch((error) => {
    logger.error("Error in connecting to MongoDB", { error: error.message });
    process.exit(1);
  });

let transporter = null;

if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  transporter.verify((error, success) => {
    if (error) {
      logger.error("Gmail SMTP connection failed", { error: error.message });
    } else {
      logger.info("Live Gmail Transporter is ready to send messages");
    }
  });
} else {
  logger.warn(
    "No Gmail credentials found in .env. Falling back to MOCK email mode.",
  );
}

async function startRabbitMQConsumer(retries = 5) {
  const RABBITMQ_URL =
    process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
  while(retries){
    try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    const queue = "order_notifications";

    await channel.assertQueue(queue, { durable: true });
    logger.info("RabbitMQ connected, waiting for order events...");

    channel.consume(queue, async (msg) => {
      if (msg !== null) {
        const eventData = JSON.parse(msg.content.toString());
        logger.info("Received Order completion event", {
          orderId: eventData.orderId,
        });

        try {
          if (transporter) {
            await transporter.sendMail({
              from: `"Cake Delight" <${process.env.GMAIL_USER}>`,
              to: eventData.customerEmail,
              subject: `Your Order Confirmation #${eventData.orderId}`,
              text: `Order #${eventData.orderId} confirmed. Total: ₹${eventData.totalAmount}`,
              html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
                    <h2 style="color: #ff6b6b;">Cake Delight</h2>
                    <h3>Thank you for your order!</h3>
                    <p>Your order with orderID<b>#${eventData.orderId}</b> has been confirmed.</p>
                    <p><b>Total Amount Paid:</b> ₹${eventData.totalAmount}</p>
                </div>
              `,
            });
            logger.info(`Email successfully sent to ${eventData.customerEmail}`);
          } else {
            logger.info(`[MOCK EMAIL OUTBOUND] To: ${eventData.customerEmail} | Body: Order #${eventData.orderId} confirmed. Total: ₹${eventData.totalAmount}`);
          }

          const notification = new Notification({
            orderId: eventData.orderId.toString(),
            customerEmail: eventData.customerEmail,
            status: "SENT",
            message: `Order #${eventData.orderId} confirmed. Total: $${eventData.totalAmount}`,
          });
          await notification.save();

          channel.ack(msg);

        } catch (error) {
          logger.error("Error processing notification", { error: error.message });
        }
      }
    });
    break;
  } catch (error) {
    logger.error(`RabbitMQ Connection Failed, retrying... (${retries} left)`);
    retries -= 1;
    await new Promise((res)=> setTimeout(res, 5000));

    if(retries === 0){
      logger.info('RabbitMQ Connection Completely Failed, exiting process...');
      process.exit(1);
    }
  }
  }
  
}

//API for health check
app.get('/health',(req,res)=>{
  const isDbConnected = mongoose.connection.readyState === 1;
  if(isDbConnected){
    return res.status(200).json({status: 'UP', database: 'CONNECTED'});
  }
  return res.status(503).json({status: 'DOWN', database: 'DISCONNECTED'});
});

//API to retiriev notification
app.get("/api/notification/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const notifications = await Notification.find({ orderId });
    res.status(200).json(notifications);
  } catch (error) {
    logger.error("Error in fetching notification", { error: error.message });
    res.status(500).json({ message: "Internal Server error" });
  }
});

const PORT = process.env.PORT || 3004;
app.listen(PORT, async () => {
  logger.info(`Notification Service is running on PORT ${PORT}`);
  await startRabbitMQConsumer();
});
