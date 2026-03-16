require("dotenv").config();
const { App } = require("@slack/bolt");

const addTaskCommand = require("./commands/add-task");
const taskModalView = require("./views/task-modal");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  port: process.env.PORT || 3000,
});

// Register command and view handlers
addTaskCommand.register(app);
taskModalView.register(app);

(async () => {
  await app.start();
  console.log(`Slack-Jira bot is running on port ${process.env.PORT || 3000}`);
})();
