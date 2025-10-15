const express = require("express");

function extractMessageData(body) {
  if (!body.entry || !Array.isArray(body.entry)) {
    return null;
  }
  for (const entry of body.entry) {
    if (!entry.changes || !Array.isArray(entry.changes)) {
      continue;
    }
    for (const change of entry.changes) {
      const value = change.value;
      const messages = value?.messages;
      if (!messages || messages.length === 0) {
        continue;
      }
      const message = messages[0];
      if (message.type !== "text") {
        continue;
      }
      return {
        from: message.from,
        body: message.text?.body || ""
      };
    }
  }
  return null;
}

module.exports = function webhookRouterFactory({ assistant, config }) {
  const router = express.Router();

  router.get("/", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === config.meta.verifyToken) {
      res.status(200).send(challenge);
      return;
    }
    res.sendStatus(403);
  });

  router.post("/", async (req, res) => {
    res.sendStatus(200);

    const messageData = extractMessageData(req.body);
    if (!messageData) {
      return;
    }

    const { from, body } = messageData;
    try {
      await assistant.handleIncomingMessage(from, body);
    } catch (error) {
      console.error("Error procesando mensaje de %s: %s", from, error.message);
    }
  });

  return router;
};
