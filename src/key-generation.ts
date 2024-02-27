import { CronJob } from "cron";
import { UniqueKey } from "./db/schema/UniqueKey";

const MAX_KEY_TO_GENERATE = parseInt(process.env.MAX_KEY_TO_GENERATE!) || 10;

export const generateRandomKey = (length: number = 6) => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    const character = characters[randomIndex];
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
  process.env.KEY_GENERATION_CRON_SCHEDULE || "*/15 * * * *", // every 15 minutes by default
  async () => {
    const unusedKeyCount = await UniqueKey.countDocuments({ used: false });

    const keyToGenerate = MAX_KEY_TO_GENERATE - unusedKeyCount;

    console.log(`Unused key count: ${unusedKeyCount}`);

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
