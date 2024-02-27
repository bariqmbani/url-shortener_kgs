import { BackgroundHandler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { app } from "../../src";

export const handler: BackgroundHandler = async () => {
  app();
};
