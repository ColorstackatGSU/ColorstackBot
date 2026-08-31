const assert = require('node:assert/strict');
const test = require('node:test');
const { createPortalService } = require('../src/services/portal');

const config = {
  portalApiBaseUrl: 'https://api.example/',
  portalSharedSecret: 'the-right-secret'
};

function fakeFetch(reply) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return reply;
  };
  return { calls, fetchImpl };
}

function jsonReply(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
    async text() {
      return JSON.stringify(body);
    }
  };
}

test('it asks the portal for the handle and carries the shared secret', async () => {
  const { calls, fetchImpl } = fakeFetch(
    jsonReply({ firstName: 'Ada', lastName: 'Lovelace', email: 'ada@student.gsu.edu' })
  );
  const portal = createPortalService({ config, fetchImpl });

  await portal.findMemberByDiscordUsername('adalovelace');

  assert.equal(calls[0].url, 'https://api.example/bot/member?discordUsername=adalovelace');
  assert.equal(calls[0].init.headers['X-Bot-Secret'], 'the-right-secret');
});

test('it maps the portal record onto the shape the verify command reads', async () => {
  const { fetchImpl } = fakeFetch(
    jsonReply({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@student.gsu.edu',
      personalEmail: 'ada@example.com',
      linkedinUrl: 'https://www.linkedin.com/in/ada',
      discordUsername: 'adalovelace',
      nationalMemberApplied: true
    })
  );
  const member = await createPortalService({ config, fetchImpl })
    .findMemberByDiscordUsername('adalovelace');

  assert.equal(member.fullName, 'Ada Lovelace');
  assert.equal(member.studentEmail, 'ada@student.gsu.edu');
  assert.equal(member.linkedin, 'https://www.linkedin.com/in/ada');
  assert.equal(member.appliedNational, true);
});

test('a member who never answered the national question does not get the role', async () => {
  // Null is "never answered", which is not the same as "No" but grants the same access.
  for (const nationalMemberApplied of [null, undefined, false]) {
    const { fetchImpl } = fakeFetch(jsonReply({ firstName: 'Ada', nationalMemberApplied }));
    const member = await createPortalService({ config, fetchImpl })
      .findMemberByDiscordUsername('adalovelace');
    assert.equal(member.appliedNational, false, `for ${String(nationalMemberApplied)}`);
  }
});

test('a 404 is nobody, not a failure', async () => {
  const { fetchImpl } = fakeFetch(jsonReply({}, 404));
  const member = await createPortalService({ config, fetchImpl })
    .findMemberByDiscordUsername('ghost');

  assert.equal(member, null);
});

test('any other error is thrown rather than read as nobody', async () => {
  // Reading a 500 as "no submission" would tell a real member to go fill the form in
  // again, which is worse than telling them something went wrong.
  const { fetchImpl } = fakeFetch(jsonReply({ message: 'boom' }, 500));
  await assert.rejects(
    () => createPortalService({ config, fetchImpl }).findMemberByDiscordUsername('ada'),
    /Portal lookup failed with 500/
  );
});

test('a blank handle never reaches the network', async () => {
  const { calls, fetchImpl } = fakeFetch(jsonReply({}));
  const portal = createPortalService({ config, fetchImpl });

  assert.equal(await portal.findMemberByDiscordUsername(''), null);
  assert.equal(await portal.findMemberByDiscordUsername('   '), null);
  assert.equal(await portal.findMemberByDiscordUsername(null), null);
  assert.equal(calls.length, 0);
});

test('it refuses to run unconfigured rather than calling an empty host', async () => {
  const { fetchImpl } = fakeFetch(jsonReply({}));
  const portal = createPortalService({ config: {}, fetchImpl });

  await assert.rejects(
    () => portal.findMemberByDiscordUsername('ada'),
    /Missing required configuration/
  );
});
