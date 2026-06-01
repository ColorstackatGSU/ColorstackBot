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

async function processJoinGsu(interaction, services) {
  requireConfig(services.config, ['gsuRoleId', 'guildId']);

  const user = getInteractionUser(interaction);
  const discordUsername = getDiscordUsername(user);
  const member = await services.sheets.findMember({
    discordUserId: user.id,
    discordUsername
  });

  if (!member) {
    const fallback = channelMention(services.config.unverifiedChannelId, 'unverified-general');
    return {
      content: `Looks like you haven't filled out the form yet. Fill it out here: ${formUrl(services.config)}. Once done, run \`/join-gsu\` again or click the button. If you have issues, contact an admin in ${fallback}.`
    };
  }

  await services.discord.assignRole({
    guildId: services.config.guildId,
    userId: user.id,
    roleId: services.config.gsuRoleId
  });

  if (!member.verified) {
    await services.sheets.updateMemberVerified(member.rowIndex, true);
  }

  if (!member.discordUserId) {
    await services.sheets.updateMemberUserId(member.rowIndex, user.id);
  }

  return {
    content: 'You are verified as a GSU Member. Your server access has been updated.'
  };
}

function handleJoinGsu(interaction, services) {
  return deferredEphemeral(interaction, services, () => processJoinGsu(interaction, services));
}

module.exports = {
  handleJoinGsu,
  processJoinGsu
};
