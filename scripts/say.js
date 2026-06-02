// Send a message as the bot to any channel, straight from your machine.
//
//   node scripts/say.js <channelId> <message...>
//
// Example:
//   node scripts/say.js 1511114870882308136 "Hello from the bot!"
//
// The message can also be piped in via stdin (handy for multi-line content):
//   echo "line one\nline two" | node scripts/say.js 1511114870882308136

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { getConfig, requireConfig } = require('../src/config');

async function readStdin() {
  if (process.stdin.isTTY) return '';
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8').trim();
}

async function main() {
  const config = getConfig();
  requireConfig(config, ['discordBotToken']);

  const [channelId, ...rest] = process.argv.slice(2);
  if (!channelId) {
    console.error('Usage: node scripts/say.js <channelId> <message...>');
    process.exit(1);
  }

  const content = rest.join(' ').trim() || (await readStdin());
  if (!content) {
    console.error('No message provided (pass it as arguments or pipe via stdin).');
    process.exit(1);
  }

  const response = await fetch(
    `${config.discordApiBaseUrl}/channels/${channelId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bot ${config.discordBotToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content,
        // Don't ping @everyone/@here/roles unless you explicitly want to.
        allowed_mentions: { parse: ['users'] }
      })
    }
  );

  const text = await response.text();
  if (!response.ok) {
    console.error(`Failed (${response.status}): ${text}`);
    process.exit(1);
  }

  const message = JSON.parse(text);
  console.log(`Sent message ${message.id} to channel ${channelId}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
