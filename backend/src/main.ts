import { createApp } from "./app";
import { loadConfig } from "./shared/config/load-config";

const config = loadConfig();
const { app, scheduler } = createApp({ config });

scheduler.catchUpInBackground();

export default {
  port: config.server.port,
  fetch: app.fetch,
};
