import { connect } from "./db/db-connection";
import { UniqueKey } from "./db/schema/UniqueKey";
import { generateAndUseUniqueKey, generateUniqueKeyJob } from "./key-generator";
import RabbitMQ from "./mq/RabbitMQ";
import dotenv from "dotenv";

dotenv.config();

const { SHORTEN_URL_REQ_EXCHANGE, SHORTEN_URL_RES_EXCHANGE } = process.env;

export const app = async () => {
  try {
    await connect();
    generateUniqueKeyJob.start();
    console.info("Connected to MongoDB");
  } catch (error) {
    console.error("Failed to connect to MongoDB", error);
    process.exit(1);
  }

  const mq = new RabbitMQ();
  await mq.connect();

  await mq.consume(SHORTEN_URL_REQ_EXCHANGE || "req", async (msg) => {
    console.info(`Received message from client: ${msg}`);
    const data = await UniqueKey.findOneAndUpdate({ used: false }, { used: true });
    const key = data ? data.key : await generateAndUseUniqueKey();
    console.info(`Sending key to client: ${key}`);
    await mq.sendToQueue(SHORTEN_URL_RES_EXCHANGE || "res", {
      key,
      client: JSON.parse(msg),
    });
  });
};

app();
