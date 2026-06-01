const InteractionType = Object.freeze({
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
  MODAL_SUBMIT: 5
});

const InteractionResponseType = Object.freeze({
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
  MODAL: 9
});

const ComponentType = Object.freeze({
  ACTION_ROW: 1,
  BUTTON: 2,
  STRING_SELECT: 3,
  TEXT_INPUT: 4,
  LABEL: 18,
  FILE_UPLOAD: 19
});

const ButtonStyle = Object.freeze({
  PRIMARY: 1,
  SECONDARY: 2,
  SUCCESS: 3,
  DANGER: 4,
  LINK: 5
});

const ApplicationCommandOptionType = Object.freeze({
  STRING: 3,
  USER: 6
});

const MessageFlags = Object.freeze({
  EPHEMERAL: 1 << 6
});

const Permissions = Object.freeze({
  MANAGE_GUILD: 1n << 5n
});

module.exports = {
  ApplicationCommandOptionType,
  ButtonStyle,
  ComponentType,
  InteractionResponseType,
  InteractionType,
  MessageFlags,
  Permissions
};
