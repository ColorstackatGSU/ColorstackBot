const { verifyKey } = require('discord-interactions');

async function verifyDiscordRequest(rawBody, headers, publicKey) {
  if (!publicKey) return false;

  const signature = headers['x-signature-ed25519'];
  const timestamp = headers['x-signature-timestamp'];
  if (!signature || !timestamp) return false;

  try {
    return await verifyKey(rawBody, signature, timestamp, publicKey);
  } catch {
    return false;
  }
}

module.exports = {
  verifyDiscordRequest
};
