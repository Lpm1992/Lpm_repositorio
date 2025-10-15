const express = require("express");
const config = require("./config");
const TaskStorage = require("./storage");
const { createAssistant } = require("./assistant");
const webhookRouterFactory = require("./webhook");

const storage = new TaskStorage(config.tasksFile);
const assistant = createAssistant({
  storage,
  metaConfig: config.meta,
  openaiApiKey: config.openaiApiKey
});

const app = express();

app.use(express.json());
app.use("/webhook", webhookRouterFactory({ assistant, config }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/", (_req, res) => {
  res.send("Asistente de WhatsApp en ejecución.");
});

app.listen(config.port, () => {
  console.log(`Servidor escuchando en el puerto ${config.port}`);
});
