const { ButtonStyle, ComponentType } = require('../utils/constants');
const { deferredEphemeral } = require('../utils/deferred');
const { channelMention, hasManageGuild } = require('../utils/interaction');
const { ephemeralMessage } = require('../utils/responses');

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

  const channelId = interaction.channel_id || interaction.channel?.id;
  if (!channelId) {
    return {
      response: ephemeralMessage('Could not determine which channel to post in.')
    };
  }

  return deferredEphemeral(interaction, services, async () => {
    await services.discord.postWebhookMessage(channelId, {
      content: welcomeMessage(services.config),
      components: welcomeComponents()
    });

    return {
      content: `Posted the welcome message in ${channelMention(channelId)}.`
    };
  });
}

module.exports = {
  handleSetup,
  welcomeComponents,
  welcomeMessage
};
