import { CronJob } from "cron";
import { UniqueKey } from "./db/schema/UniqueKey";
import dotenv from "dotenv";

dotenv.config();

const MAX_KEY_TO_GENERATE = parseInt(process.env.MAX_KEY_TO_GENERATE!) || 10;
const KEY_CHARACTERS = process.env.KEY_CHARACTERS! || "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const KEY_LENGTH = parseInt(process.env.KEY_LENGTH!) || 6;

export const generateRandomKey = (length: number = KEY_LENGTH) => {
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * KEY_CHARACTERS.length);
    const character = KEY_CHARACTERS[randomIndex];
    result += character;
  }
  return result;
};

export const generateAndUseUniqueKey = async () => {
  let exist = true;
  let key = "";

  while (exist) {
    key = generateRandomKey();
    exist = Boolean(await UniqueKey.exists({ key }));
  }

  try {
    await UniqueKey.create({ key, used: true });
    return key;
  } catch (error: any) {
    if (error.code === 11000 || (error.name === "MongoServerError" && error.message.includes("duplicate key"))) {
      generateAndUseUniqueKey();
    } else {
      // Handle other errors
      console.error("Error:", error);
    }
  }
};

export const generateUniqueKeyJob = new CronJob(
  process.env.KEY_GENERATION_CRON_SCHEDULE || "*/15 * * * *", // 15/30/45/60 minutes by default
  async () => {
    const unusedKeyCount = await UniqueKey.countDocuments({ used: false });

    const keyToGenerate = MAX_KEY_TO_GENERATE - unusedKeyCount;

    if (keyToGenerate <= 0) {
      return;
    }

    console.info(`Generating ${keyToGenerate} keys...`);

    for (let i = 0; i < keyToGenerate; i++) {
      const key = generateRandomKey();
      try {
        await UniqueKey.create({ key });
        console.info(`Key ${key} generated!`);
      } catch (error: any) {
        if (error.code === 11000 || (error.name === "MongoServerError" && error.message.includes("duplicate key"))) {
          console.info(`Key ${key} already exists!`);
        } else {
          // Handle other errors
          console.error("Error:", error);
        }
      }
    }

    console.info(`Done generating keys!`);
  }
);
