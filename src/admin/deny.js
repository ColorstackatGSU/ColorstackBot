const { deferredEphemeral } = require('../utils/deferred');
const {
  channelMention,
  getDiscordUsername,
  getUserOption,
  hasManageGuild
} = require('../utils/interaction');
const { ephemeralMessage } = require('../utils/responses');

function handleDeny(interaction, services) {
  if (!hasManageGuild(interaction)) {
    return {
      response: ephemeralMessage('Only server admins can run `/deny`.')
    };
  }

  return deferredEphemeral(interaction, services, () => processDeny(interaction, services));
}

async function processDeny(interaction, services) {
  const targetUser = getUserOption(interaction, 'user');
  if (!targetUser) {
    return { content: 'Please choose a user to deny.' };
  }

  const fallback = channelMention(services.config.unverifiedChannelId, 'unverified-general');
  const message = `Your ColorStack GSU verification was not approved. Please contact an admin in ${fallback} for help.`;
  let dmStatus = 'I sent them a DM.';

  try {
    await services.discord.sendDirectMessage(targetUser.id, message);
  } catch (error) {
    console.error(error);
    dmStatus = 'I could not DM them, so please follow up manually.';
  }

  await services.sheets.updatePendingStatus(targetUser.id, 'DENIED');

  return {
    content: `Denied ${getDiscordUsername(targetUser)}. ${dmStatus}`
  };
}

module.exports = {
  handleDeny,
  processDeny
};
