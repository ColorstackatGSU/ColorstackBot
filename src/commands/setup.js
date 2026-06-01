const { ButtonStyle, ComponentType } = require('../utils/constants');
const { channelMention, hasManageGuild } = require('../utils/interaction');
const { ephemeralMessage, publicMessage } = require('../utils/responses');

function welcomeComponents() {
  return [
    {
      type: ComponentType.ACTION_ROW,
      components: [
        {
          type: ComponentType.BUTTON,
          style: ButtonStyle.PRIMARY,
          custom_id: 'btn_join_gsu',
          label: 'Join as GSU Member'
        },
        {
          type: ComponentType.BUTTON,
          style: ButtonStyle.SUCCESS,
          custom_id: 'btn_join_national',
          label: 'Join as National Member'
        }
      ]
    }
  ];
}

function welcomeMessage(config) {
  const fallback = channelMention(config.unverifiedChannelId, 'unverified-general');
  return [
    'Welcome to ColorStack GSU!',
    '',
    '[Server rules here]',
    '',
    'To get access, click the button that applies to you below.',
    '- GSU Member: For Georgia State University students',
    '- ColorStack National Member: For students already in ColorStack nationally',
    '',
    'National members automatically get GSU access too.',
    `If you run into any issues, drop a message in ${fallback}.`
  ].join('\n');
}

function handleSetup(interaction, services) {
  if (!hasManageGuild(interaction)) {
    return {
      response: ephemeralMessage('Only server admins can run `/setup`.')
    };
  }

  return {
    response: publicMessage(welcomeMessage(services.config), {
      components: welcomeComponents()
    })
  };
}

module.exports = {
  handleSetup,
  welcomeComponents,
  welcomeMessage
};
