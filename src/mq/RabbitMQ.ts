import amqp, { Channel, Connection } from "amqplib";
import dotenv from "dotenv";

dotenv.config();

export default class RabbitMQ {
  connection!: Connection;
  channel!: Channel;
  private connected!: Boolean;

  async connect() {
    if (this.connected && this.channel) return;
    else this.connected = true;

    try {
      console.log("Connecting to Rabbit-MQ Server...");
      this.connection = await amqp.connect(process.env.RABBITMQ_URI!);

      console.log("Rabbit MQ Connection is ready!");

      this.channel = await this.connection.createChannel();

      console.log("Created RabbitMQ Channel successfully!");
    } catch (error) {
      console.error(error);
      console.error("Not connected to MQ Server");
    }
  }

  async sendToQueue(queue: string, message: any) {
    try {
      if (!this.channel) {
        await this.connect();
      }

      this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async consume(queue: string, handleIncomingNotification: (msg: string) => any) {
    if (!this.channel) {
      await this.connect();
    }

    await this.channel.assertQueue(queue);

    this.channel.consume(
      queue,
      (msg) => {
        {
          if (!msg) {
            return console.error(`Invalid incoming message`);
          }
          handleIncomingNotification(msg?.content?.toString());
          this.channel.ack(msg);
        }
      },
      {
        noAck: false,
      }
    );
  }
}
