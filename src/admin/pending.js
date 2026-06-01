const { deferredEphemeral } = require('../utils/deferred');
const { hasManageGuild } = require('../utils/interaction');
const { ephemeralMessage } = require('../utils/responses');

function handlePending(interaction, services) {
  if (!hasManageGuild(interaction)) {
    return {
      response: ephemeralMessage('Only server admins can run `/pending`.')
    };
  }

  return deferredEphemeral(interaction, services, () => processPending(services));
}

function truncate(value, maxLength) {
  const text = String(value || '');
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function formatPendingVerification(record) {
  return `- ${record.discordUsername || record.discordUserId} (${record.roleRequested}) - ${truncate(record.reason, 100)}`;
}

function formatUnverifiedMember(member) {
  return `- ${member.discordUsername || member.discordUserId || member.fullName} (${member.role || 'Unknown'}) - ${member.studentEmail || 'no email'}`;
}

async function processPending(services) {
  const [pendingVerifications, unverifiedMembers] = await Promise.all([
    services.sheets.getPendingVerifications('PENDING'),
    services.sheets.getUnverifiedMembers()
  ]);

  if (pendingVerifications.length === 0 && unverifiedMembers.length === 0) {
    return { content: 'No pending verifications found.' };
  }

  const sections = [];
  if (pendingVerifications.length > 0) {
    sections.push([
      '**Manual review queue**',
      ...pendingVerifications.slice(0, 15).map(formatPendingVerification)
    ].join('\n'));
  }

  if (unverifiedMembers.length > 0) {
    sections.push([
      '**Unverified member rows**',
      ...unverifiedMembers.slice(0, 15).map(formatUnverifiedMember)
    ].join('\n'));
  }

  return {
    content: sections.join('\n\n').slice(0, 1900)
  };
}

module.exports = {
  handlePending,
  processPending
};
