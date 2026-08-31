const { requireConfig } = require('../config');

// The member portal's API, which is now where member records come from.
//
// The bot used to read the Google Form's response tab by column position, which meant it
// matched on the Discord handle a member typed when they applied. A member who changed
// their handle afterwards could never verify, and adding or reordering a form question
// shifted every column index in sheets.js without anything noticing. The backend owns
// this data, so ask it.
//
// The form's response tab is still the bot's source for manual admin approvals; only the
// self-service lookup moved.

function createPortalService({ config, fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('createPortalService requires a fetch implementation.');
  }

  function baseUrl() {
    return String(config.portalApiBaseUrl || '').replace(/\/+$/, '');
  }

  /**
   * Returns the member who claims this Discord handle, or null.
   *
   * Matching is the backend's job and it is case-insensitive there, because the stored
   * handle is what somebody typed rather than something read back from Discord.
   */
  async function findMemberByDiscordUsername(discordUsername) {
    const handle = String(discordUsername || '').trim();
    if (!handle) return null;

    requireConfig(config, ['portalApiBaseUrl', 'portalSharedSecret']);

    const url = `${baseUrl()}/bot/member?discordUsername=${encodeURIComponent(handle)}`;
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: {
        'X-Bot-Secret': config.portalSharedSecret,
        Accept: 'application/json'
      }
    });

    // The portal answers 404 when nobody claims the handle. That is an ordinary outcome
    // rather than a failure: it is the member who has not filled the form in yet.
    if (response.status === 404) return null;

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `Portal lookup failed with ${response.status}${body ? `: ${body.slice(0, 200)}` : ''}`
      );
    }

    const member = await response.json();
    const firstName = member.firstName || '';
    const lastName = member.lastName || '';

    // Shaped like the sheet row this replaced, so the command that consumes it did not
    // have to learn a second vocabulary.
    return {
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      studentEmail: member.email || '',
      personalEmail: member.personalEmail || '',
      linkedin: member.linkedinUrl || '',
      discordUsername: member.discordUsername || '',
      // Null means the question was never answered, which is not the same as "No". Both
      // mean no National role, but only one of them is worth chasing a member about.
      appliedNational: member.nationalMemberApplied === true
    };
  }

  return { findMemberByDiscordUsername };
}

module.exports = {
  createPortalService
};
