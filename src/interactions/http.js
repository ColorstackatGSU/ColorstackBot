const { getConfig } = require('../config');
const { createRuntimeServices } = require('../services/runtime');
const { verifyDiscordRequest } = require('../utils/verify');
const { createInteractionRouter } = require('./router');

// On Vercel the function is frozen once the HTTP response is sent, which would
// kill the deferred follow-up work (assign role, edit "thinking..." message).
// waitUntil keeps the invocation alive until that work settles. It is only
// available in the Vercel runtime, so fall back to awaiting locally/in tests.
let waitUntil;
try {
  ({ waitUntil } = require('@vercel/functions'));
} catch {
  waitUntil = null;
}

async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (typeof req.body === 'string') return req.body;

  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    res.status(statusCode).json(payload);
    return;
  }

  const body = JSON.stringify(payload);
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json');
  res.end(body);
}

function sendText(res, statusCode, text) {
  if (typeof res.status === 'function' && typeof res.send === 'function') {
    res.status(statusCode).send(text);
    return;
  }

  res.statusCode = statusCode;
  res.setHeader('content-type', 'text/plain');
  res.end(text);
}

function createHttpHandler(options = {}) {
  const {
    config = getConfig(),
    createServices = () => createRuntimeServices({ config }),
    createRouter = createInteractionRouter,
    verifyRequest = verifyDiscordRequest
  } = options;

  return async function interactionsHandler(req, res) {
    if (req.method !== 'POST') {
      sendText(res, 405, 'Method Not Allowed');
      return;
    }

    const rawBody = await readRawBody(req);
    const headers = req.headers || {};

    if (!(await verifyRequest(rawBody, headers, config.discordPublicKey))) {
      sendText(res, 401, 'Invalid request signature');
      return;
    }

    let interaction;
    try {
      interaction = JSON.parse(rawBody);
    } catch {
      sendText(res, 400, 'Invalid JSON');
      return;
    }

    try {
      const services = createServices();
      const router = createRouter(services);
      const result = await router.handle(interaction);
      sendJson(res, 200, result.response);

      if (typeof result.afterResponse === 'function') {
        const followUp = Promise.resolve()
          .then(() => result.afterResponse())
          .catch((error) => console.error(error));

        if (waitUntil) {
          waitUntil(followUp);
        } else {
          await followUp;
        }
      }
    } catch (error) {
      console.error(error);
      if (!res.headersSent) {
        sendText(res, 500, 'Internal Server Error');
      }
    }
  };
}

module.exports = {
  createHttpHandler,
  readRawBody,
  sendJson,
  sendText
};
