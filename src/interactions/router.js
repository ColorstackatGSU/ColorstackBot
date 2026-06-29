const { handleApprove } = require('../admin/approve');
const { handleDeny } = require('../admin/deny');
const { handlePending } = require('../admin/pending');
const { handleVerify } = require('../commands/verify');
const { handleSetup } = require('../commands/setup');
const { InteractionType } = require('../utils/constants');
const { ephemeralMessage, pongResponse } = require('../utils/responses');

function commandHandlers() {
  return {
    approve: handleApprove,
    deny: handleDeny,
    pending: handlePending,
    setup: handleSetup,
    verify: handleVerify
  };
}

function componentHandlers() {
  return {
    btn_verify: handleVerify
  };
}

function createInteractionRouter(services) {
  return {
    async handle(interaction) {
      if (interaction.type === InteractionType.PING) {
        return { response: pongResponse() };
      }

      if (interaction.type === InteractionType.APPLICATION_COMMAND) {
        const handler = commandHandlers()[interaction.data?.name];
        if (!handler) {
          return { response: ephemeralMessage('Unknown command.') };
        }
        return handler(interaction, services);
      }

      if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
        const handler = componentHandlers()[interaction.data?.custom_id];
        if (!handler) {
          return { response: ephemeralMessage('Unknown button action.') };
        }
        return handler(interaction, services);
      }

      return { response: ephemeralMessage('Unsupported interaction type.') };
    }
  };
}

module.exports = {
  createInteractionRouter
};
