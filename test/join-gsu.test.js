const assert = require('node:assert/strict');
const test = require('node:test');
const { createInteractionRouter } = require('../src/interactions/router');
const { InteractionResponseType } = require('../src/utils/constants');
const { interaction } = require('./helpers');

function servicesWithMember(member) {
  const calls = {
    assignRole: [],
    edit: [],
    findMember: [],
    updateVerified: [],
    updateUserId: []
  };

  return {
    calls,
    services: {
      config: {
        guildId: 'guild-1',
        gsuRoleId: 'role-gsu',
        gsuFormUrl: 'https://forms.example/gsu',
        unverifiedChannelId: 'chan-unverified'
      },
      discord: {
        async assignRole(payload) {
          calls.assignRole.push(payload);
        },
        async editOriginalInteractionResponse(_interaction, payload) {
          calls.edit.push(payload);
        }
      },
      sheets: {
        async findMember(payload) {
          calls.findMember.push(payload);
          return member;
        },
        async updateMemberVerified(rowIndex, verified) {
          calls.updateVerified.push({ rowIndex, verified });
        },
        async updateMemberUserId(rowIndex, discordUserId) {
          calls.updateUserId.push({ rowIndex, discordUserId });
        }
      }
    }
  };
}

test('/join-gsu assigns role and updates verification/user id', async () => {
  const { calls, services } = servicesWithMember({
    rowIndex: 2,
    verified: false,
    discordUserId: '',
    discordUsername: 'rapha'
  });
  const router = createInteractionRouter(services);

  const result = await router.handle(interaction({
    data: { name: 'join-gsu' }
  }));
  assert.equal(result.response.type, InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE);

  await result.afterResponse();

  assert.deepEqual(calls.findMember[0], {
    discordUserId: 'user-1',
    discordUsername: 'rapha'
  });
  assert.deepEqual(calls.assignRole[0], {
    guildId: 'guild-1',
    userId: 'user-1',
    roleId: 'role-gsu'
  });
  assert.deepEqual(calls.updateVerified[0], { rowIndex: 2, verified: true });
  assert.deepEqual(calls.updateUserId[0], { rowIndex: 2, discordUserId: 'user-1' });
  assert.match(calls.edit[0].content, /verified as a GSU Member/);
});

test('/join-gsu returns form link when user is not in the sheet', async () => {
  const { calls, services } = servicesWithMember(null);
  const router = createInteractionRouter(services);

  const result = await router.handle(interaction({
    data: { name: 'join-gsu' }
  }));
  await result.afterResponse();

  assert.equal(calls.assignRole.length, 0);
  assert.match(calls.edit[0].content, /https:\/\/forms\.example\/gsu/);
});
