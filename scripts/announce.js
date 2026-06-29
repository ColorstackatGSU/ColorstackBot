// Post an announcement to any channel under a custom name/avatar, optionally
// pinging @everyone. Sends through an application-owned webhook (the only way to
// override the display name), so the bot must have the Manage Webhooks
// permission in the target channel.
//
//   node scripts/announce.js <channelId> [options] <message...>
//
// Options:
//   --username "Name"     Display name to post under (default: welcome webhook name)
//   --avatar "https://…"  Avatar image URL to post with
//   --everyone            Allow the message to actually ping @everyone/@here/roles
//
// Examples:
//   node scripts/announce.js 123 --username "ColorStack" --everyone "@everyone GBM tonight at 6!"
//   echo "@everyone multi-line\nannouncement" | node scripts/announce.js 123 --everyone --username "ColorStack"

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { getConfig, requireConfig } = require('../src/config');
const { createDiscordService } = require('../src/services/discord');

async function readStdin() {
  if (process.stdin.isTTY) return '';
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8').trim();
}

function parseArgs(argv) {
  const options = { username: undefined, avatarUrl: undefined, everyone: false };
  const positionals = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--username') {
      options.username = argv[++i];
    } else if (arg === '--avatar') {
      options.avatarUrl = argv[++i];
    } else if (arg === '--everyone') {
      options.everyone = true;
    } else {
      positionals.push(arg);
    }
  }

  return { options, positionals };
}

async function main() {
  const config = getConfig();
  requireConfig(config, ['discordBotToken', 'discordApplicationId']);

  const { options, positionals } = parseArgs(process.argv.slice(2));
  const [channelId, ...rest] = positionals;

  if (!channelId) {
    console.error('Usage: node scripts/announce.js <channelId> [--username "Name"] [--avatar url] [--everyone] <message...>');
    process.exit(1);
  }

  const content = rest.join(' ').trim() || (await readStdin());
  if (!content) {
    console.error('No message provided (pass it as arguments or pipe via stdin).');
    process.exit(1);
  }

  const discord = createDiscordService({ config });
  const message = await discord.postWebhookMessage(channelId, {
    username: options.username,
    avatarUrl: options.avatarUrl,
    content,
    allowedMentions: options.everyone
      ? { parse: ['everyone', 'roles', 'users'] }
      : { parse: ['users'] }
  });

  console.log(`Sent message ${message.id} to channel ${channelId} as "${options.username || config.welcomeWebhookName}".`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
