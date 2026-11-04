import { createApp } from "./app";
import { loadConfig } from "./shared/config/load-config";

const config = loadConfig();
const { app } = createApp({ config });

export default {
  port: config.server.port,
  fetch: app.fetch,
};
