const { requireConfig } = require('../config');

function createMediaService({ config, fetchImpl = globalThis.fetch } = {}) {
  if (!fetchImpl) {
    throw new Error('A fetch implementation is required for media downloads.');
  }

  return {
    async downloadAttachment(attachment) {
      requireConfig(config, ['maxScreenshotBytes']);

      if (!attachment?.url) {
        throw new Error('Attachment is missing a downloadable URL.');
      }

      if (attachment.size && Number(attachment.size) > config.maxScreenshotBytes) {
        throw new Error(`Attachment is larger than ${config.maxScreenshotBytes} bytes.`);
      }

      const response = await fetchImpl(attachment.url);
      if (!response.ok) {
        throw new Error(`Attachment download failed with ${response.status}.`);
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > config.maxScreenshotBytes) {
        throw new Error(`Downloaded attachment is larger than ${config.maxScreenshotBytes} bytes.`);
      }

      return {
        buffer: Buffer.from(arrayBuffer),
        mimeType: attachment.content_type || response.headers.get('content-type') || 'image/png'
      };
    }
  };
}

module.exports = {
  createMediaService
};
