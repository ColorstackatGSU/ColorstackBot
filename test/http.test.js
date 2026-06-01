const assert = require('node:assert/strict');
const test = require('node:test');
const { createHttpHandler } = require('../src/interactions/http');
const { InteractionResponseType } = require('../src/utils/constants');
const { fakeRequest, fakeResponse } = require('./helpers');

test('HTTP handler rejects invalid Discord signatures', async () => {
  const handler = createHttpHandler({
    config: { discordPublicKey: 'public-key' },
    verifyRequest: () => false
  });
  const res = fakeResponse();

  await handler(fakeRequest('{}'), res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.payload, 'Invalid request signature');
});

test('HTTP handler returns PONG for Discord PING', async () => {
  const handler = createHttpHandler({
    config: { discordPublicKey: 'public-key' },
    createServices: () => ({ config: {} }),
    verifyRequest: () => true
  });
  const res = fakeResponse();

  await handler(fakeRequest(JSON.stringify({ type: 1 })), res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.payload, { type: InteractionResponseType.PONG });
});
