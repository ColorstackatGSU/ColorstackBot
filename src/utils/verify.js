const { verifyKey } = require('discord-interactions');

function verifyDiscordRequest(rawBody, headers, publicKey) {
  if (!publicKey) return false;

  const signature = headers['x-signature-ed25519'];
  const timestamp = headers['x-signature-timestamp'];
  if (!signature || !timestamp) return false;

  return verifyKey(rawBody, signature, timestamp, publicKey);
}

module.exports = {
  verifyDiscordRequest
};
