function getConfig(env = process.env) {
  return {
    discordPublicKey: env.DISCORD_PUBLIC_KEY,
    discordBotToken: env.DISCORD_BOT_TOKEN,
    discordApplicationId: env.DISCORD_APPLICATION_ID,
    googleServiceAccountEmail: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    googlePrivateKey: env.GOOGLE_PRIVATE_KEY,
    googleSheetId: env.GOOGLE_SHEET_ID,
    formResponsesSheet: env.FORM_RESPONSES_SHEET || 'Form Responses 1',
    membersSheet: env.MEMBERS_SHEET || 'members',
    gsuRoleId: env.GSU_ROLE_ID,
    nationalRoleId: env.NATIONAL_ROLE_ID,
    guildId: env.GUILD_ID,
    pendingChannelId: env.PENDING_CHANNEL_ID,
    unverifiedChannelId: env.UNVERIFIED_CHANNEL_ID,
    gsuFormUrl: env.GSU_FORM_URL,
    colorStackApplicationUrl: env.COLORSTACK_APPLICATION_URL,
    welcomeWebhookName: env.WELCOME_WEBHOOK_NAME || 'ColorStack GSU',
    welcomeWebhookAvatarUrl: env.WELCOME_WEBHOOK_AVATAR_URL || undefined,
    gsuEmailDomains: String(env.GSU_EMAIL_DOMAINS || 'student.gsu.edu,gsu.edu')
      .split(',')
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean),
    discordApiBaseUrl: env.DISCORD_API_BASE_URL || 'https://discord.com/api/v10'
  };
}

function requireConfig(config, keys) {
  const missing = keys.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }
}

function googlePrivateKey(config) {
  return String(config.googlePrivateKey || '').replace(/\\n/g, '\n');
}

module.exports = {
  getConfig,
  googlePrivateKey,
  requireConfig
};
