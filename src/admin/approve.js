const { requireConfig } = require('../config');
const { deferredEphemeral } = require('../utils/deferred');
const {
  getDiscordUsername,
  getStringOption,
  getUserOption,
  hasManageGuild
} = require('../utils/interaction');
const { ephemeralMessage } = require('../utils/responses');
const {
  isLikelyEmail,
  isLikelyLinkedInUrl,
  normalizeLinkedInUrl
} = require('../utils/validation');

function handleApprove(interaction, services) {
  if (!hasManageGuild(interaction)) {
    return {
      response: ephemeralMessage('Only server admins can run `/approve`.')
    };
  }

  return deferredEphemeral(interaction, services, () => processApprove(interaction, services));
}

async function processApprove(interaction, services) {
  requireConfig(services.config, ['gsuRoleId', 'guildId']);

  const targetUser = getUserOption(interaction, 'user');
  const role = getStringOption(interaction, 'role').toLowerCase();
  const fullName = getStringOption(interaction, 'full_name');
  const linkedin = normalizeLinkedInUrl(getStringOption(interaction, 'linkedin'));
  const studentEmail = getStringOption(interaction, 'email');

  if (!targetUser) {
    return { content: 'Please choose a user to approve.' };
  }

  if (role !== 'gsu' && role !== 'national') {
    return { content: 'Role must be `gsu` or `national`.' };
  }

  if (!fullName || !isLikelyEmail(studentEmail) || !isLikelyLinkedInUrl(linkedin)) {
    return {
      content: 'Please provide full_name, a valid email, and a valid LinkedIn URL before approving.'
    };
  }

  if (role === 'national') {
    requireConfig(services.config, ['nationalRoleId']);
  }

  await services.discord.assignRoles({
    guildId: services.config.guildId,
    userId: targetUser.id,
    roleIds: role === 'national'
      ? [services.config.gsuRoleId, services.config.nationalRoleId]
      : [services.config.gsuRoleId]
  });

  await services.sheets.upsertMember({
    fullName,
    linkedin,
    discordUsername: getDiscordUsername(targetUser),
    studentEmail,
    role: role === 'national' ? 'National' : 'GSU',
    verified: true,
    dateJoined: new Date().toISOString(),
    discordUserId: targetUser.id,
    nationalMemberNumber: '',
    school: ''
  });

  await services.sheets.updatePendingStatus(targetUser.id, 'APPROVED');

  return {
    content: `Approved ${getDiscordUsername(targetUser)} as ${role === 'national' ? 'National Member' : 'GSU Member'}.`
  };
}

module.exports = {
  handleApprove,
  processApprove
};
