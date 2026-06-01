const assert = require('node:assert/strict');
const test = require('node:test');
const { createResilientFetch, isRetryable } = require('../src/utils/fetch');

test('isRetryable recognizes undici socket write timeouts', () => {
  const error = new TypeError('fetch failed');
  error.cause = Object.assign(new Error('write ETIMEDOUT'), { code: 'ETIMEDOUT' });
  assert.equal(isRetryable(error), true);
});

test('isRetryable ignores normal application errors', () => {
  assert.equal(isRetryable(new Error('Discord API PUT failed with 403')), false);
});

test('resilientFetch retries once on a network error then succeeds', async () => {
  let calls = 0;
  const baseFetch = async () => {
    calls += 1;
    if (calls === 1) {
      const error = new TypeError('fetch failed');
      error.cause = Object.assign(new Error('write ETIMEDOUT'), { code: 'ETIMEDOUT' });
      throw error;
    }
    return { ok: true, status: 200 };
  };

  const fetchImpl = createResilientFetch(baseFetch, { retries: 1, timeoutMs: 1000 });
  const response = await fetchImpl('https://example.test');

  assert.equal(calls, 2);
  assert.equal(response.status, 200);
});

test('resilientFetch does not retry non-retryable errors', async () => {
  let calls = 0;
  const baseFetch = async () => {
    calls += 1;
    throw new Error('boom');
  };

  const fetchImpl = createResilientFetch(baseFetch, { retries: 2, timeoutMs: 1000 });
  await assert.rejects(() => fetchImpl('https://example.test'), /boom/);
  assert.equal(calls, 1);
});

test('resilientFetch aborts a hung request and retries', async () => {
  let calls = 0;
  const baseFetch = async (url, init) => {
    calls += 1;
    if (calls === 1) {
      return new Promise((_, reject) => {
        init.signal.addEventListener('abort', () => {
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
        });
      });
    }
    return { ok: true, status: 200 };
  };

  const fetchImpl = createResilientFetch(baseFetch, { retries: 1, timeoutMs: 20 });
  const response = await fetchImpl('https://example.test');

  assert.equal(calls, 2);
  assert.equal(response.status, 200);
});
