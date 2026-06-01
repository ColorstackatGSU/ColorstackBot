const { deferredEphemeralMessage } = require('./responses');
const { channelMention } = require('./interaction');

function deferredEphemeral(interaction, services, work) {
  return {
    response: deferredEphemeralMessage(),
    async afterResponse() {
      let payload;

      try {
        payload = await work();
      } catch (error) {
        console.error(error);
        const fallback = channelMention(services.config?.unverifiedChannelId, 'unverified-general');
        payload = {
          content: `Something went wrong while processing that request. Please try again, or contact an admin in ${fallback}.`,
          components: []
        };
      }

      await services.discord.editOriginalInteractionResponse(interaction, {
        components: [],
        ...payload
      });
    }
  };
}

module.exports = {
  deferredEphemeral
};
