const assert = require('node:assert/strict');
const test = require('node:test');
const { createSheetsService } = require('../src/services/sheets');

function fakeSheetsClient(rows) {
  return {
    spreadsheets: {
      values: {
        async get() {
          return { data: { values: rows } };
        },
        async update() {},
        async append() {}
      }
    }
  };
}

test('findMember prefers Discord User ID', async () => {
  const sheets = createSheetsService({
    config: { googleSheetId: 'sheet-1' },
    sheetsClient: fakeSheetsClient([
      ['Old Name', 'https://linkedin.com/in/old', 'sameuser', 'old@example.com', 'GSU', 'TRUE', '', 'user-1'],
      ['New Name', 'https://linkedin.com/in/new', 'sameuser', 'new@example.com', 'GSU', 'TRUE', '', 'user-2']
    ])
  });

  const member = await sheets.findMember({
    discordUserId: 'user-2',
    discordUsername: 'sameuser'
  });

  assert.equal(member.fullName, 'New Name');
});

test('findMember falls back to Discord username when ID is missing', async () => {
  const sheets = createSheetsService({
    config: { googleSheetId: 'sheet-1' },
    sheetsClient: fakeSheetsClient([
      ['Jane Doe', 'https://linkedin.com/in/jane', 'janedoe', 'jane@example.com', 'GSU', 'FALSE', '', '']
    ])
  });

  const member = await sheets.findMember({
    discordUserId: 'user-3',
    discordUsername: 'JaneDoe'
  });

  assert.equal(member.fullName, 'Jane Doe');
  assert.equal(member.verified, false);
});
