import { connect } from "./db/db-connection";
import { UniqueKey } from "./db/schema/UniqueKey";
import { generateAndUseUniqueKey, generateUniqueKeyJob } from "./key-generation";
import RabbitMQ from "./mq/RabbitMQ";

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

  await mq.consume("get-unique-key", async (msg) => {
    console.info(`Received message from client: ${msg}`);
    const data = await UniqueKey.findOneAndUpdate({ used: false }, { used: true });
    const key = data ? data.key : await generateAndUseUniqueKey();
    console.info(`Sending key to client: ${key}`);
    await mq.sendToQueue("unique-key", {
      key,
      client: JSON.parse(msg),
    });
  });
};

app();
