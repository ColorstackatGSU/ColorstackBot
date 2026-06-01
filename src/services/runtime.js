const { getConfig } = require('../config');
const { createDiscordService } = require('./discord');
const { createGeminiService } = require('./gemini');
const { createMediaService } = require('./media');
const { createSheetsService } = require('./sheets');

function createRuntimeServices(overrides = {}) {
  const config = overrides.config || getConfig();
  const services = {
    config
  };

  Object.defineProperties(services, {
    discord: {
      enumerable: true,
      get() {
        if (!this._discord) {
          this._discord = overrides.discord || createDiscordService({ config, fetchImpl: overrides.fetchImpl });
        }
        return this._discord;
      }
    },
    gemini: {
      enumerable: true,
      get() {
        if (!this._gemini) {
          this._gemini = overrides.gemini || createGeminiService({ config });
        }
        return this._gemini;
      }
    },
    media: {
      enumerable: true,
      get() {
        if (!this._media) {
          this._media = overrides.media || createMediaService({ config, fetchImpl: overrides.fetchImpl });
        }
        return this._media;
      }
    },
    sheets: {
      enumerable: true,
      get() {
        if (!this._sheets) {
          this._sheets = overrides.sheets || createSheetsService({ config });
        }
        return this._sheets;
      }
    }
  });

  return services;
}

module.exports = {
  createRuntimeServices
};
