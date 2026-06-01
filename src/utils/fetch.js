// On serverless platforms (Vercel) the function instance is reused while warm,
// and Node's global fetch (undici) keeps a pool of keep-alive sockets between
// invocations. Those pooled sockets often die during the freeze, so the next
// outbound request writes to a dead socket and fails with `write ETIMEDOUT`
// ("fetch failed"). The first attempt also tends to hang until the OS-level TCP
// timeout, which is what makes a deferred interaction spin "indefinitely".
//
// createResilientFetch wraps a fetch implementation with:
//   * a per-attempt AbortController timeout, so a dead/hung socket fails fast
//     instead of hanging for minutes, and
//   * a retry on network-level errors, because aborting/erroring discards the
//     bad socket and the retry opens a fresh connection.

const RETRYABLE_CODES = new Set([
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'EPIPE',
  'UND_ERR_SOCKET',
  'UND_ERR_CONNECT_TIMEOUT'
]);

function isRetryable(error) {
  if (!error) return false;
  if (error.name === 'AbortError') return true;
  if (error.message === 'fetch failed') return true;
  const code = error.code || (error.cause && error.cause.code);
  return RETRYABLE_CODES.has(code);
}

function createResilientFetch(baseFetch = globalThis.fetch, options = {}) {
  const { retries = 1, timeoutMs = 5000 } = options;

  if (typeof baseFetch !== 'function') {
    throw new Error('createResilientFetch requires a fetch implementation.');
  }

  return async function resilientFetch(url, init = {}) {
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        return await baseFetch(url, { ...init, signal: controller.signal });
      } catch (error) {
        lastError = error;
        if (attempt === retries || !isRetryable(error)) {
          throw error;
        }
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastError;
  };
}

module.exports = {
  createResilientFetch,
  isRetryable
};
