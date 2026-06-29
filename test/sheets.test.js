const assert = require('node:assert/strict');
const test = require('node:test');
const { createSheetsService } = require('../src/services/sheets');

function fakeSheetsClient(rowsByRange) {
  return {
    spreadsheets: {
      values: {
        async get({ range }) {
          const sheet = String(range).split('!')[0].replace(/^'|'$/g, '');
          return { data: { values: rowsByRange[sheet] || [] } };
        },
        async update() {},
        async append() {}
      }
    }
  };
}

function formRow({ first, last, studentEmail, linkedin, discord, applied }) {
  const row = new Array(14).fill('');
  row[0] = '2026-01-01T00:00:00Z';
  row[1] = first;
  row[2] = last;
  row[4] = studentEmail;
  row[5] = linkedin;
  row[10] = discord;
  row[13] = applied;
  return row;
}

function memberRow({ id, username, name, email, linkedin, role, verified }) {
  return [id, username, name, email, linkedin, role, verified, ''];
}

test('findMember prefers Discord User ID', async () => {
  const sheets = createSheetsService({
    config: { googleSheetId: 'sheet-1' },
    sheetsClient: fakeSheetsClient({
      members: [
        memberRow({ id: 'user-1', username: 'sameuser', name: 'Old Name', email: 'old@example.com', linkedin: 'https://linkedin.com/in/old', role: 'GSU', verified: 'TRUE' }),
        memberRow({ id: 'user-2', username: 'sameuser', name: 'New Name', email: 'new@example.com', linkedin: 'https://linkedin.com/in/new', role: 'GSU', verified: 'TRUE' })
      ]
    })
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
    sheetsClient: fakeSheetsClient({
      members: [
        memberRow({ id: '', username: 'janedoe', name: 'Jane Doe', email: 'jane@example.com', linkedin: 'https://linkedin.com/in/jane', role: 'GSU', verified: 'FALSE' })
      ]
    })
  });

  const member = await sheets.findMember({
    discordUserId: 'user-3',
    discordUsername: 'JaneDoe'
  });

  assert.equal(member.fullName, 'Jane Doe');
  assert.equal(member.verified, false);
});

test('findFormResponse matches by Discord username and parses the national answer', async () => {
  const sheets = createSheetsService({
    config: { googleSheetId: 'sheet-1' },
    sheetsClient: fakeSheetsClient({
      'Form Responses 1': [
        formRow({ first: 'Ada', last: 'Lovelace', studentEmail: 'ada@student.gsu.edu', linkedin: 'https://linkedin.com/in/ada', discord: 'AdaL', applied: 'Yes' })
      ]
    })
  });

  const response = await sheets.findFormResponse({ discordUsername: 'adal' });

  assert.equal(response.fullName, 'Ada Lovelace');
  assert.equal(response.studentEmail, 'ada@student.gsu.edu');
  assert.equal(response.linkedin, 'https://linkedin.com/in/ada');
  assert.equal(response.appliedNational, true);
});

test('findFormResponse returns the most recent matching submission', async () => {
  const sheets = createSheetsService({
    config: { googleSheetId: 'sheet-1' },
    sheetsClient: fakeSheetsClient({
      'Form Responses 1': [
        formRow({ first: 'Old', last: 'Answer', studentEmail: 'x@x.com', linkedin: '', discord: 'grace', applied: 'No' }),
        formRow({ first: 'New', last: 'Answer', studentEmail: 'y@y.com', linkedin: '', discord: 'grace', applied: 'Yes' })
      ]
    })
  });

  const response = await sheets.findFormResponse({ discordUsername: 'grace' });

  assert.equal(response.fullName, 'New Answer');
  assert.equal(response.appliedNational, true);
});

test('findFormResponse returns null when no submission matches', async () => {
  const sheets = createSheetsService({
    config: { googleSheetId: 'sheet-1' },
    sheetsClient: fakeSheetsClient({ 'Form Responses 1': [] })
  });

  assert.equal(await sheets.findFormResponse({ discordUsername: 'nobody' }), null);
});
