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
    '# 👋 Welcome to ColorStack GSU!',
    '',
    'We\'re the Georgia State University chapter of **ColorStack**, a community dedicated to increasing the number of underrepresented students in computing. We\'re so glad you\'re here.',
    '',
    '## Server Rules',
    '',
    '**1. Be respectful.** Treat everyone with kindness and professionalism. Harassment, hate speech, and discrimination of any kind are not tolerated.',
    '**2. Keep it relevant.** Post in the channel that fits your topic, and keep conversations on-topic.',
    '**3. No spam or unsolicited self-promotion.** Don\'t advertise, mass-DM members, or post referral/affiliate links without approval from an admin.',
    '**4. Stay professional.** This is a space tied to your career. Keep content safe-for-work and free of NSFW or illegal material.',
    '**5. Follow the rules everywhere.** Discord\'s Community Guidelines and the ColorStack Code of Conduct apply at all times.',
    '',
    '> Breaking these rules may result in a warning, kick, or ban at the moderators\' discretion.',
    '',
    '## Getting Access',
    '',
    'Click the button below that applies to you:',
    '- 🟦 **Join as GSU Member**: for Georgia State University students',
    '- 🟩 **Join as National Member**: for students already in ColorStack nationally',
    '',
    '*National members with a GSU email automatically get GSU access too.*',
    '',
    `Run into any issues? Drop a message in ${fallback} and an admin will help you out.`
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
