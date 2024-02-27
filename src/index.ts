import { connect } from "./db/db-connection";
import { UniqueKey } from "./db/schema/UniqueKey";
import { generateAndUseUniqueKey, generateUniqueKeyJob } from "./key-generation";
import RabbitMQ from "./mq/RabbitMQ";
import http from "http";

connect().then(() => {
  console.log("Connected to MongoDB");
});

generateUniqueKeyJob.start();

const app = async () => {
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

const HTTP_PORT = process.env.PORT || 4001;
http.createServer().listen(HTTP_PORT, () => {
  app();
  console.log(`Server is running on port ${HTTP_PORT}`);
});
