const { getConfig } = require('../config');
const { createResilientFetch } = require('../utils/fetch');
const { createDiscordService } = require('./discord');
const { createSheetsService } = require('./sheets');

function createRuntimeServices(overrides = {}) {
  const config = overrides.config || getConfig();
  // Wrap global fetch so warm-instance dead sockets fail fast and retry on a
  // fresh connection instead of hanging the deferred interaction. Tests/callers
  // can still inject their own fetchImpl via overrides.
  const fetchImpl =
    overrides.fetchImpl ||
    (typeof globalThis.fetch === 'function' ? createResilientFetch(globalThis.fetch) : undefined);
  const services = {
    config
  };

  Object.defineProperties(services, {
    discord: {
      enumerable: true,
      get() {
        if (!this._discord) {
          this._discord = overrides.discord || createDiscordService({ config, fetchImpl });
        }
        return this._discord;
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
