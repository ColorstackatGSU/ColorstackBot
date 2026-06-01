const { handleApprove } = require('../admin/approve');
const { handleDeny } = require('../admin/deny');
const { handlePending } = require('../admin/pending');
const { handleJoinGsu } = require('../commands/join-gsu');
const {
  NATIONAL_MODAL_ID,
  handleAlreadyNational,
  handleApplyNational,
  handleJoinNational,
  handleNationalModalSubmit
} = require('../commands/join-national');
const { handleSetup } = require('../commands/setup');
const { InteractionType } = require('../utils/constants');
const { ephemeralMessage, pongResponse } = require('../utils/responses');

function commandHandlers() {
  return {
    approve: handleApprove,
    deny: handleDeny,
    'join-gsu': handleJoinGsu,
    'join-national': handleJoinNational,
    pending: handlePending,
    setup: handleSetup
  };
}

function componentHandlers() {
  return {
    btn_join_gsu: handleJoinGsu,
    btn_join_national: handleJoinNational,
    btn_already_national: handleAlreadyNational,
    btn_apply_national: handleApplyNational
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

      if (interaction.type === InteractionType.MODAL_SUBMIT) {
        if (interaction.data?.custom_id === NATIONAL_MODAL_ID) {
          return handleNationalModalSubmit(interaction, services);
        }
        return { response: ephemeralMessage('Unknown modal submission.') };
      }

      return { response: ephemeralMessage('Unsupported interaction type.') };
    }
  };
}

module.exports = {
  createInteractionRouter
};
