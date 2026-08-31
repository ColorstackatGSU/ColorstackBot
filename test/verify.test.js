const assert = require('node:assert/strict');
const test = require('node:test');
const { createInteractionRouter } = require('../src/interactions/router');
const { InteractionResponseType } = require('../src/utils/constants');
const { interaction } = require('./helpers');

function servicesWithFormResponse(response) {
  const calls = {
    assignRoles: [],
    edit: [],
    lookups: [],
    upsertMember: []
  };

  return {
    calls,
    services: {
      config: {
        guildId: 'guild-1',
        gsuRoleId: 'role-gsu',
        nationalRoleId: 'role-national',
        gsuFormUrl: 'https://forms.example/gsu',
        unverifiedChannelId: 'chan-unverified'
      },
      discord: {
        async assignRoles(payload) {
          calls.assignRoles.push(payload);
        },
        async editOriginalInteractionResponse(_interaction, payload) {
          calls.edit.push(payload);
        }
      },
      // Verification reads the member from the portal now. The members tab is still
      // the bot's own record of who it verified, so upsertMember stays on sheets.
      portal: {
        async findMemberByDiscordUsername(discordUsername) {
          calls.lookups.push(discordUsername);
          return response;
        }
      },
      sheets: {
        async upsertMember(payload) {
          calls.upsertMember.push(payload);
        }
      }
    }
  };
}

async function runVerify(services) {
  const router = createInteractionRouter(services);
  const result = await router.handle(interaction({
    type: 3,
    data: { custom_id: 'btn_verify' }
  }));
  assert.equal(result.response.type, InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE);
  await result.afterResponse();
  return result;
}

test('the verify button grants GSU only when the member did not apply nationally', async () => {
  const { calls, services } = servicesWithFormResponse({
    fullName: 'Ada Lovelace',
    studentEmail: 'ada@student.gsu.edu',
    linkedin: 'https://linkedin.com/in/ada',
    appliedNational: false
  });

  await runVerify(services);

  assert.equal(calls.lookups[0], 'rapha');
  assert.deepEqual(calls.assignRoles[0], {
    guildId: 'guild-1',
    userId: 'user-1',
    roleIds: ['role-gsu']
  });
  assert.equal(calls.upsertMember[0].role, 'GSU');
  assert.equal(calls.upsertMember[0].fullName, 'Ada Lovelace');
  assert.match(calls.edit[0].content, /verified as a member of ColorStack @ GSU/);
});

test('the verify button grants GSU and National when the member applied nationally', async () => {
  const { calls, services } = servicesWithFormResponse({
    fullName: 'Grace Hopper',
    studentEmail: 'grace@students.kennesaw.edu',
    linkedin: 'https://linkedin.com/in/grace',
    appliedNational: true
  });

  await runVerify(services);

  assert.deepEqual(calls.assignRoles[0].roleIds, ['role-gsu', 'role-national']);
  assert.equal(calls.upsertMember[0].role, 'GSU+National');
  assert.match(calls.edit[0].content, /ColorStack @ GSU and as a ColorStack National Member/);
});

test('the verify button points members with no form submission to the form', async () => {
  const { calls, services } = servicesWithFormResponse(null);

  await runVerify(services);

  assert.equal(calls.assignRoles.length, 0);
  assert.equal(calls.upsertMember.length, 0);
  assert.match(calls.edit[0].content, /https:\/\/forms\.example\/gsu/);
});
