const { fetchEpics } = require("../services/jira");

function register(app) {
  app.command("/add-task", async ({ ack, body, client }) => {
    await ack();

    // Open a loading modal IMMEDIATELY to use trigger_id before it expires
    const loadingModal = await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: "modal",
        callback_id: "task_modal_loading",
        title: { type: "plain_text", text: "Add Task to Jira" },
        close: { type: "plain_text", text: "Cancel" },
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: ":hourglass_flowing_sand: Loading epics from Jira...",
            },
          },
        ],
      },
    });

    // Now fetch epics (can take a while on cold start)
    let epics;
    try {
      epics = await fetchEpics();
    } catch (err) {
      console.error("Failed to fetch epics:", err.message);
      epics = [];
    }

    const epicOptions = epics.map((e) => ({
      text: { type: "plain_text", text: e.summary },
      value: e.key,
    }));

    // Update the modal with the full form
    await client.views.update({
      view_id: loadingModal.view.id,
      view: {
        type: "modal",
        callback_id: "task_modal_submit",
        title: { type: "plain_text", text: "Add Task to Jira" },
        submit: { type: "plain_text", text: "Create" },
        close: { type: "plain_text", text: "Cancel" },
        private_metadata: body.channel_id,
        blocks: [
          {
            type: "input",
            block_id: "type_block",
            label: { type: "plain_text", text: "Type" },
            element: {
              type: "static_select",
              action_id: "type_select",
              placeholder: { type: "plain_text", text: "Bug Fix or Feature?" },
              options: [
                {
                  text: { type: "plain_text", text: "Bug Fix" },
                  value: "bug",
                },
                {
                  text: { type: "plain_text", text: "Feature" },
                  value: "feature",
                },
              ],
            },
          },
          {
            type: "input",
            block_id: "epic_block",
            label: { type: "plain_text", text: "Parent (Epic)" },
            element: {
              type: "static_select",
              action_id: "epic_select",
              placeholder: { type: "plain_text", text: "Select an epic..." },
              options:
                epicOptions.length > 0
                  ? epicOptions
                  : [
                      {
                        text: { type: "plain_text", text: "No epics found" },
                        value: "none",
                      },
                    ],
            },
          },
          {
            type: "input",
            block_id: "summary_block",
            label: { type: "plain_text", text: "Summary" },
            element: {
              type: "plain_text_input",
              action_id: "summary_input",
              placeholder: {
                type: "plain_text",
                text: "Short description of what needs to be done",
              },
            },
          },
          {
            type: "input",
            block_id: "description_block",
            label: { type: "plain_text", text: "Description" },
            optional: true,
            element: {
              type: "plain_text_input",
              action_id: "description_input",
              multiline: true,
              placeholder: {
                type: "plain_text",
                text: "Detailed description...",
              },
            },
          },
          {
            type: "input",
            block_id: "attachment_block",
            label: { type: "plain_text", text: "Attachments" },
            optional: true,
            element: {
              type: "file_input",
              action_id: "attachment_input",
              filetypes: [
                "png",
                "jpg",
                "jpeg",
                "gif",
                "pdf",
                "doc",
                "docx",
                "txt",
                "csv",
                "mp4",
                "mov",
              ],
              max_files: 5,
            },
          },
        ],
      },
    });
  });
}

module.exports = { register };
