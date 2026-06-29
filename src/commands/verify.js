const { requireConfig } = require('../config');
const { deferredEphemeral } = require('../utils/deferred');
const {
  channelMention,
  getDiscordUsername,
  getInteractionUser
} = require('../utils/interaction');

function formUrl(config) {
  return config.gsuFormUrl || '[form link]';
}

async function processVerify(interaction, services) {
  requireConfig(services.config, ['gsuRoleId', 'nationalRoleId', 'guildId']);

  const user = getInteractionUser(interaction);
  const discordUsername = getDiscordUsername(user);
  const fallback = channelMention(services.config.unverifiedChannelId, 'unverified-general');

  const response = await services.sheets.findFormResponse({ discordUsername });

  if (!response) {
    return {
      content: `I couldn't find a form submission for **${discordUsername}**. Fill out the member form here: ${formUrl(services.config)}\n\nMake sure the "Discord Username" answer exactly matches your Discord username, then click Verify again. If you have issues, contact an admin in ${fallback}.`
    };
  }

  // Everyone with a form submission is a GSU chapter member. Members who said
  // "Yes" to the national-membership question additionally get the National role.
  const isNational = response.appliedNational;
  const roleIds = isNational
    ? [services.config.gsuRoleId, services.config.nationalRoleId]
    : [services.config.gsuRoleId];

  await services.discord.assignRoles({
    guildId: services.config.guildId,
    userId: user.id,
    roleIds
  });

  await services.sheets.upsertMember({
    discordUserId: user.id,
    discordUsername,
    fullName: response.fullName,
    studentEmail: response.studentEmail,
    linkedin: response.linkedin,
    role: isNational ? 'GSU+National' : 'GSU',
    verified: true,
    dateJoined: new Date().toISOString()
  });

  return {
    content: isNational
      ? 'You are verified as a member of ColorStack @ GSU and as a ColorStack National Member. Your server access has been updated. ✅'
      : 'You are verified as a member of ColorStack @ GSU. Your server access has been updated. ✅'
  };
}

function handleVerify(interaction, services) {
  return deferredEphemeral(interaction, services, () => processVerify(interaction, services));
}

module.exports = {
  handleVerify,
  processVerify
};
