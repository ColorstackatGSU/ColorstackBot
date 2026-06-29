const { requireConfig } = require('../config');

function parseMaybeJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function discordRequest({ config, fetchImpl }, path, options = {}) {
  requireConfig(config, ['discordBotToken']);

  const headers = {
    Authorization: `Bot ${config.discordBotToken}`,
    ...options.headers
  };

  let body;
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  const response = await fetchImpl(`${config.discordApiBaseUrl}${path}`, {
    method: options.method || 'GET',
    headers,
    body
  });

  if (response.status === 204) return null;

  const text = await response.text();
  const data = parseMaybeJson(text);

  if (!response.ok) {
    const detail = typeof data === 'string' ? data : JSON.stringify(data);
    throw new Error(`Discord API ${options.method || 'GET'} ${path} failed with ${response.status}: ${detail}`);
  }

  return data;
}

async function webhookRequest({ config, fetchImpl }, path, options = {}) {
  let body;
  const headers = {
    ...options.headers
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  const response = await fetchImpl(`${config.discordApiBaseUrl}${path}`, {
    method: options.method || 'GET',
    headers,
    body
  });

  if (response.status === 204) return null;

  const text = await response.text();
  const data = parseMaybeJson(text);

  if (!response.ok) {
    const detail = typeof data === 'string' ? data : JSON.stringify(data);
    throw new Error(`Discord webhook ${options.method || 'GET'} ${path} failed with ${response.status}: ${detail}`);
  }

  return data;
}

function createDiscordService({ config, fetchImpl = globalThis.fetch } = {}) {
  if (!fetchImpl) {
    throw new Error('A fetch implementation is required for Discord REST calls.');
  }

  const context = { config, fetchImpl };

  return {
    async assignRole({ guildId = config.guildId, userId, roleId }) {
      requireConfig(config, ['guildId']);
      if (!userId || !roleId) {
        throw new Error('assignRole requires userId and roleId.');
      }

      await discordRequest(
        context,
        `/guilds/${guildId}/members/${userId}/roles/${roleId}`,
        { method: 'PUT' }
      );
    },

    async assignRoles({ guildId = config.guildId, userId, roleIds }) {
      for (const roleId of roleIds.filter(Boolean)) {
        await this.assignRole({ guildId, userId, roleId });
      }
    },

    async postChannelMessage(channelId, payload) {
      if (!channelId) return null;
      return discordRequest(
        context,
        `/channels/${channelId}/messages`,
        { method: 'POST', body: payload }
      );
    },

    // Upload raw image bytes as a real file attachment (multipart/form-data) so
    // the screenshot lives permanently in the channel. Interaction/CDN URLs are
    // signed and expire, so re-uploading is more reliable for the review queue.
    async postChannelAttachment(channelId, { content, filename = 'screenshot.png', buffer, contentType = 'image/png' } = {}) {
      if (!channelId || !buffer) return null;
      requireConfig(config, ['discordBotToken']);

      const payload = { attachments: [{ id: 0, filename }] };
      if (content) payload.content = content;
      payload.allowed_mentions = { parse: [] };

      const form = new FormData();
      form.append('payload_json', JSON.stringify(payload));
      form.append('files[0]', new Blob([buffer], { type: contentType }), filename);

      const response = await fetchImpl(`${config.discordApiBaseUrl}/channels/${channelId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bot ${config.discordBotToken}` },
        body: form
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Discord attachment upload to ${channelId} failed with ${response.status}: ${text}`);
      }

      return response.json();
    },

    async sendDirectMessage(userId, content) {
      const channel = await discordRequest(
        context,
        '/users/@me/channels',
        { method: 'POST', body: { recipient_id: userId } }
      );

      return discordRequest(
        context,
        `/channels/${channel.id}/messages`,
        { method: 'POST', body: { content } }
      );
    },

    // Reuse the application-owned webhook for this channel if we already made
    // one, otherwise create it. Webhooks created by the bot are owned by the
    // application, which is what lets their messages carry interactive
    // components (buttons) that route back to this bot. Manually-created
    // "incoming" webhooks cannot send components.
    async getOrCreateChannelWebhook(channelId, name) {
      requireConfig(config, ['discordApplicationId']);

      const existing = await discordRequest(
        context,
        `/channels/${channelId}/webhooks`,
        { method: 'GET' }
      );

      const owned = Array.isArray(existing)
        ? existing.find(
            (hook) =>
              hook.application_id === config.discordApplicationId && hook.token
          )
        : null;

      if (owned) return owned;

      return discordRequest(context, `/channels/${channelId}/webhooks`, {
        method: 'POST',
        body: { name }
      });
    },

    // Post a message that displays under a custom name/avatar but still carries
    // working buttons, by executing an application-owned webhook.
    async postWebhookMessage(channelId, { username, avatarUrl, content, components, allowedMentions } = {}) {
      const webhook = await this.getOrCreateChannelWebhook(
        channelId,
        config.welcomeWebhookName || 'ColorStack @ GSU'
      );

      const body = {
        content,
        username: username || config.welcomeWebhookName,
        components,
        // Default to suppressing every mention; callers opt in (e.g. @everyone
        // announcements) by passing allowedMentions explicitly.
        allowed_mentions: allowedMentions || { parse: [] }
      };
      const avatar = avatarUrl || config.welcomeWebhookAvatarUrl;
      if (avatar) body.avatar_url = avatar;

      return webhookRequest(
        context,
        `/webhooks/${webhook.id}/${webhook.token}?wait=true`,
        { method: 'POST', body }
      );
    },

    async editOriginalInteractionResponse(interaction, payload) {
      const applicationId = interaction.application_id || config.discordApplicationId;
      if (!applicationId || !interaction.token) {
        throw new Error('Cannot edit interaction response without application id and interaction token.');
      }

      return webhookRequest(
        context,
        `/webhooks/${applicationId}/${interaction.token}/messages/@original`,
        { method: 'PATCH', body: payload }
      );
    }
  };
}

module.exports = {
  createDiscordService,
  discordRequest
};
