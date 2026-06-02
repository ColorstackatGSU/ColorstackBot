const assert = require('node:assert/strict');
const test = require('node:test');
const { handleSetup, welcomeComponents } = require('../src/commands/setup');
const { InteractionResponseType } = require('../src/utils/constants');
const { adminInteraction, interaction } = require('./helpers');

function services(overrides = {}) {
  return {
    config: { unverifiedChannelId: 'chan-unverified', welcomeWebhookName: 'ColorStack GSU' },
    discord: {
      posted: [],
      edits: [],
      async postWebhookMessage(channelId, payload) {
        this.posted.push({ channelId, payload });
      },
      async editOriginalInteractionResponse(_interaction, payload) {
        this.edits.push(payload);
      }
    },
    ...overrides
  };
}

test('setup rejects non-admins', () => {
  const result = handleSetup(interaction({ data: { name: 'setup' } }), services());
  assert.equal(result.response.type, InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
  assert.match(result.response.data.content, /admins/);
});

test('setup posts the welcome message through a webhook in the channel', async () => {
  const svc = services();
  const result = handleSetup(
    adminInteraction({ data: { name: 'setup' }, channel_id: 'welcome-channel' }),
    svc
  );

  // Admin gets a private (deferred) acknowledgement.
  assert.equal(
    result.response.type,
    InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
  );

  await result.afterResponse();

  assert.equal(svc.discord.posted.length, 1);
  const { channelId, payload } = svc.discord.posted[0];
  assert.equal(channelId, 'welcome-channel');
  assert.deepEqual(payload.components, welcomeComponents());
  assert.match(payload.content, /Welcome to ColorStack GSU/);

  // The admin's ephemeral spinner is resolved with a confirmation.
  assert.equal(svc.discord.edits.length, 1);
  assert.match(svc.discord.edits[0].content, /Posted the welcome message/);
});
