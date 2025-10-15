const path = require("path");

const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  meta: {
    verifyToken: process.env.META_VERIFY_TOKEN || "dev-verify-token",
    accessToken: process.env.META_ACCESS_TOKEN || "",
    phoneNumberId: process.env.META_PHONE_NUMBER_ID || ""
  },
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  dataDir: path.join(__dirname, "..", "data"),
  tasksFile: path.join(__dirname, "..", "data", "tasks.json")
};

module.exports = config;
