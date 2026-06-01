const {
  InteractionResponseType,
  MessageFlags
} = require('./constants');

function interactionMessage(data) {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data
  };
}

function ephemeralMessage(content, extra = {}) {
  return interactionMessage({
    content,
    flags: MessageFlags.EPHEMERAL,
    ...extra
  });
}

function publicMessage(content, extra = {}) {
  return interactionMessage({
    content,
    ...extra
  });
}

function deferredEphemeralMessage() {
  return {
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      flags: MessageFlags.EPHEMERAL
    }
  };
}

function modalResponse(data) {
  return {
    type: InteractionResponseType.MODAL,
    data
  };
}

function pongResponse() {
  return {
    type: InteractionResponseType.PONG
  };
}

function noComponents(payload = {}) {
  return {
    ...payload,
    components: []
  };
}

module.exports = {
  deferredEphemeralMessage,
  ephemeralMessage,
  interactionMessage,
  modalResponse,
  noComponents,
  pongResponse,
  publicMessage
};
