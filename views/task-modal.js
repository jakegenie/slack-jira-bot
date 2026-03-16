const { createIssue, addAttachment } = require("../services/jira");

function register(app) {
  app.view("task_modal_submit", async ({ ack, body, view, client }) => {
    await ack();

    const values = view.state.values;
    const type = values.type_block.type_select.selected_option.value;
    const epicKey = values.epic_block.epic_select.selected_option.value;
    const epicName = values.epic_block.epic_select.selected_option.text.text;
    const summary = values.summary_block.summary_input.value;
    const description =
      values.description_block.description_input.value || "";
    const files = values.attachment_block.attachment_input.files || [];

    const channelId = view.private_metadata;
    const userId = body.user.id;
    const typeName = type === "bug" ? "Bug Fix" : "Feature";

    try {
      // Create the Jira issue
      const issue = await createIssue({
        type,
        epicKey,
        summary,
        description,
      });

      const issueKey = issue.key;
      const issueUrl = `${process.env.JIRA_BASE_URL}/browse/${issueKey}`;

      // Upload attachments if any
      if (files.length > 0) {
        for (const file of files) {
          try {
            // Download file from Slack
            const fileInfo = await client.files.info({ file: file.id });
            const fileUrl = fileInfo.file.url_private_download;

            const response = await fetch(fileUrl, {
              headers: {
                Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
              },
            });
            const buffer = Buffer.from(await response.arrayBuffer());

            // Upload to Jira
            await addAttachment(issueKey, buffer, fileInfo.file.name);
          } catch (attachErr) {
            console.error(
              `Failed to upload attachment ${file.id}:`,
              attachErr.message
            );
          }
        }
      }

      // Post confirmation in channel
      if (channelId) {
        await client.chat.postMessage({
          channel: channelId,
          text: `<@${userId}> created a new ${typeName} in *${epicName}*`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: [
                  `*${typeName} Created* by <@${userId}>`,
                  `*Epic:* ${epicName}`,
                  `*Summary:* ${summary}`,
                  description ? `*Description:* ${description}` : null,
                  files.length > 0
                    ? `*Attachments:* ${files.length} file(s)`
                    : null,
                  `<${issueUrl}|View ${issueKey} in Jira>`,
                ]
                  .filter(Boolean)
                  .join("\n"),
              },
            },
          ],
        });
      }
    } catch (err) {
      console.error("Failed to create Jira issue:", err.message);

      // DM the user about the error
      try {
        await client.chat.postMessage({
          channel: userId,
          text: `Failed to create Jira issue: ${err.message}. Please try again or create it manually.`,
        });
      } catch (dmErr) {
        console.error("Failed to DM user about error:", dmErr.message);
      }
    }
  });
}

module.exports = { register };
