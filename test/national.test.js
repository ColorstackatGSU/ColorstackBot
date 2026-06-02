const assert = require('node:assert/strict');
const test = require('node:test');
const {
  FIELD_EMAIL,
  FIELD_FULL_NAME,
  FIELD_LINKEDIN,
  FIELD_SCREENSHOT,
  NATIONAL_MODAL_ID,
  handleAlreadyNational,
  handleJoinNational,
  processNationalModal
} = require('../src/commands/join-national');
const { ComponentType, InteractionResponseType } = require('../src/utils/constants');
const { interaction, modalComponent, modalUpload, user } = require('./helpers');

test('Join National short-circuits when the user already has the National role', () => {
  const result = handleJoinNational(
    interaction({
      data: { custom_id: 'btn_join_national' },
      member: { permissions: '0', user: user(), roles: ['role-national'] }
    }),
    { config: { nationalRoleId: 'role-national' } }
  );

  assert.equal(result.response.type, InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
  assert.match(result.response.data.content, /already verified as a ColorStack National Member/);
});

function nationalInteraction({ attachment = {}, email = 'ada@student.gsu.edu' } = {}) {
  return interaction({
    type: 5,
    data: {
      custom_id: NATIONAL_MODAL_ID,
      components: [
        modalComponent(FIELD_FULL_NAME, 'Ada Lovelace'),
        modalComponent(FIELD_LINKEDIN, 'linkedin.com/in/ada'),
        modalComponent(FIELD_EMAIL, email),
        modalUpload(FIELD_SCREENSHOT, 'att-1')
      ],
      resolved: {
        attachments: {
          'att-1': {
            id: 'att-1',
            filename: 'profile.png',
            content_type: 'image/png',
            url: 'https://cdn.example/profile.png',
            ...attachment
          }
        }
      }
    }
  });
}

function nationalServices(geminiResult) {
  const calls = {
    assignRoles: [],
    upsertMember: [],
    updatePendingStatus: [],
    pending: [],
    posts: []
  };

  return {
    calls,
    services: {
      config: {
        guildId: 'guild-1',
        gsuRoleId: 'role-gsu',
        nationalRoleId: 'role-national',
        pendingChannelId: 'chan-pending',
        unverifiedChannelId: 'chan-unverified'
      },
      discord: {
        async assignRoles(payload) {
          calls.assignRoles.push(payload);
        },
        async postChannelMessage(channelId, payload) {
          calls.posts.push({ channelId, payload });
        }
      },
      gemini: {
        async analyzeProfileScreenshot() {
          return geminiResult;
        }
      },
      media: {
        async downloadAttachment() {
          return { buffer: Buffer.from('image'), mimeType: 'image/png' };
        }
      },
      sheets: {
        async upsertMember(payload) {
          calls.upsertMember.push(payload);
        },
        async updatePendingStatus(userId, status) {
          calls.updatePendingStatus.push({ userId, status });
        },
        async appendPendingVerification(payload) {
          calls.pending.push(payload);
        }
      }
    }
  };
}

test('already-national button returns modal with required file upload', () => {
  const result = handleAlreadyNational();
  const fileUpload = result.response.data.components
    .map((component) => component.component)
    .find((component) => component.type === ComponentType.FILE_UPLOAD);

  assert.equal(result.response.type, 9);
  assert.equal(fileUpload.custom_id, FIELD_SCREENSHOT);
  assert.equal(fileUpload.required, true);
  assert.equal(fileUpload.max_values, 1);
});

test('gsu email grants both roles and records GSU+National', async () => {
  const { calls, services } = nationalServices({ valid: true });

  const payload = await processNationalModal(
    nationalInteraction({ email: 'ada@student.gsu.edu' }),
    services
  );

  assert.match(payload.content, /verified as a ColorStack National Member/);
  assert.match(payload.content, /GSU access/);
  assert.deepEqual(calls.assignRoles[0], {
    guildId: 'guild-1',
    userId: 'user-1',
    roleIds: ['role-gsu', 'role-national']
  });
  assert.equal(calls.upsertMember[0].fullName, 'Ada Lovelace');
  assert.equal(calls.upsertMember[0].linkedin, 'https://linkedin.com/in/ada');
  assert.equal(calls.upsertMember[0].role, 'GSU+National');
  assert.deepEqual(calls.updatePendingStatus[0], { userId: 'user-1', status: 'APPROVED' });
});

test('non-gsu email grants National role only', async () => {
  const { calls, services } = nationalServices({ valid: true });

  const payload = await processNationalModal(
    nationalInteraction({ email: 'ada@students.kennesaw.edu' }),
    services
  );

  assert.doesNotMatch(payload.content, /GSU access/);
  assert.deepEqual(calls.assignRoles[0].roleIds, ['role-national']);
  assert.equal(calls.upsertMember[0].role, 'National');
});

test('invalid national screenshot creates a pending review record', async () => {
  const { calls, services } = nationalServices({
    valid: false,
    missing_fields: ['ColorStack platform UI']
  });

  const payload = await processNationalModal(nationalInteraction(), services);

  assert.match(payload.content, /doesn't look like a ColorStack profile/);
  assert.equal(calls.assignRoles.length, 0);
  assert.equal(calls.pending.length, 1);
  assert.equal(calls.posts[0].channelId, 'chan-pending');
});

test('malformed Gemini JSON creates a pending review record', async () => {
  const { calls, services } = nationalServices({
    valid: false,
    parseError: true,
    missing_fields: ['valid_json']
  });

  const payload = await processNationalModal(nationalInteraction(), services);

  assert.match(payload.content, /admin review queue/);
  assert.equal(calls.pending.length, 1);
  assert.match(calls.pending[0].reason, /malformed JSON/);
});

test('national modal rejects non-image uploads before Gemini', async () => {
  const { calls, services } = nationalServices({ valid: true });

  const payload = await processNationalModal(
    nationalInteraction({ attachment: { filename: 'profile.pdf', content_type: 'application/pdf' } }),
    services
  );

  assert.match(payload.content, /PNG or JPG/);
  assert.equal(calls.assignRoles.length, 0);
});
