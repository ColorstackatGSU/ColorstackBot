const assert = require('node:assert/strict');
const test = require('node:test');
const { processApprove } = require('../src/admin/approve');
const { processDeny } = require('../src/admin/deny');
const { processPending } = require('../src/admin/pending');
const { adminInteraction, user } = require('./helpers');

function adminServices() {
  const calls = {
    assignRoles: [],
    dm: [],
    upsertMember: [],
    updatePendingStatus: []
  };

  return {
    calls,
    services: {
      config: {
        guildId: 'guild-1',
        gsuRoleId: 'role-gsu',
        nationalRoleId: 'role-national',
        unverifiedChannelId: 'chan-unverified'
      },
      discord: {
        async assignRoles(payload) {
          calls.assignRoles.push(payload);
        },
        async sendDirectMessage(userId, content) {
          calls.dm.push({ userId, content });
        }
      },
      sheets: {
        async upsertMember(payload) {
          calls.upsertMember.push(payload);
        },
        async updatePendingStatus(userId, status) {
          calls.updatePendingStatus.push({ userId, status });
        },
        async getPendingVerifications() {
          return [];
        },
        async getUnverifiedMembers() {
          return [];
        }
      }
    }
  };
}

test('/approve assigns national roles and writes complete member row', async () => {
  const { calls, services } = adminServices();
  const target = user('target-1', 'target');
  const payload = await processApprove(adminInteraction({
    data: {
      name: 'approve',
      options: [
        { name: 'user', value: target.id },
        { name: 'role', value: 'national' },
        { name: 'full_name', value: 'Grace Hopper' },
        { name: 'email', value: 'grace@student.gsu.edu' },
        { name: 'linkedin', value: 'linkedin.com/in/grace' }
      ],
      resolved: {
        users: {
          [target.id]: target
        }
      }
    }
  }), services);

  assert.match(payload.content, /Approved target/);
  assert.deepEqual(calls.assignRoles[0].roleIds, ['role-gsu', 'role-national']);
  assert.equal(calls.upsertMember[0].fullName, 'Grace Hopper');
  assert.equal(calls.upsertMember[0].linkedin, 'https://linkedin.com/in/grace');
  assert.deepEqual(calls.updatePendingStatus[0], { userId: 'target-1', status: 'APPROVED' });
});

test('/deny sends a normal DM and updates pending status', async () => {
  const { calls, services } = adminServices();
  const target = user('target-2', 'targettwo');
  const payload = await processDeny(adminInteraction({
    data: {
      name: 'deny',
      options: [
        { name: 'user', value: target.id }
      ],
      resolved: {
        users: {
          [target.id]: target
        }
      }
    }
  }), services);

  assert.match(payload.content, /Denied targettwo/);
  assert.equal(calls.dm[0].userId, 'target-2');
  assert.match(calls.dm[0].content, /not approved/);
  assert.deepEqual(calls.updatePendingStatus[0], { userId: 'target-2', status: 'DENIED' });
});

test('/pending reports no rows when both queues are empty', async () => {
  const { services } = adminServices();
  const payload = await processPending(services);

  assert.equal(payload.content, 'No pending verifications found.');
});
