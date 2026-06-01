require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { getConfig, requireConfig } = require('../src/config');
const { buildCommands } = require('../src/commands/definitions');

async function main() {
  const config = getConfig();
  requireConfig(config, ['discordApplicationId', 'discordBotToken']);

  const guildSegment = config.guildId ? `/guilds/${config.guildId}` : '';
  const scope = config.guildId ? `guild ${config.guildId}` : 'global';
  const url = `${config.discordApiBaseUrl}/applications/${config.discordApplicationId}${guildSegment}/commands`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${config.discordBotToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(buildCommands())
  });

  const bodyText = await response.text();
  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    body = bodyText;
  }

  if (!response.ok) {
    throw new Error(`Command registration failed with ${response.status}: ${JSON.stringify(body)}`);
  }

  console.log(`Registered ${Array.isArray(body) ? body.length : buildCommands().length} ${scope} commands.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
