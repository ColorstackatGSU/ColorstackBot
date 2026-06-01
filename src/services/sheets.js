const { google } = require('googleapis');
const { googlePrivateKey, requireConfig } = require('../config');

const MEMBERS_SHEET = 'members';
const PENDING_SHEET = 'pending_verifications';

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase();
}

function boolString(value) {
  return value ? 'TRUE' : 'FALSE';
}

function rowToMember(row, rowIndex) {
  return {
    rowIndex,
    fullName: row[0] || '',
    linkedin: row[1] || '',
    discordUsername: row[2] || '',
    studentEmail: row[3] || '',
    role: row[4] || '',
    verified: normalizeKey(row[5]) === 'true',
    dateJoined: row[6] || '',
    discordUserId: row[7] || '',
    nationalMemberNumber: row[8] || '',
    school: row[9] || ''
  };
}

function memberToRow(member) {
  return [
    member.fullName || '',
    member.linkedin || '',
    member.discordUsername || '',
    member.studentEmail || '',
    member.role || '',
    boolString(member.verified),
    member.dateJoined || new Date().toISOString(),
    member.discordUserId || '',
    member.nationalMemberNumber || '',
    member.school || ''
  ];
}

function rowToPending(row, rowIndex) {
  return {
    rowIndex,
    discordUserId: row[0] || '',
    discordUsername: row[1] || '',
    roleRequested: row[2] || '',
    submittedDataJson: row[3] || '',
    status: row[4] || '',
    reason: row[5] || '',
    timestamp: row[6] || ''
  };
}

function pendingToRow(record) {
  return [
    record.discordUserId || '',
    record.discordUsername || '',
    record.roleRequested || '',
    JSON.stringify(record.submittedData || {}),
    record.status || 'PENDING',
    record.reason || '',
    record.timestamp || new Date().toISOString()
  ];
}

function createGoogleSheetsClient(config) {
  requireConfig(config, [
    'googleServiceAccountEmail',
    'googlePrivateKey',
    'googleSheetId'
  ]);

  const auth = new google.auth.JWT({
    email: config.googleServiceAccountEmail,
    key: googlePrivateKey(config),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  return google.sheets({ version: 'v4', auth });
}

function createSheetsService({ config, sheetsClient } = {}) {
  const client = sheetsClient || createGoogleSheetsClient(config);
  const spreadsheetId = config.googleSheetId;

  async function getValues(range) {
    const response = await client.spreadsheets.values.get({
      spreadsheetId,
      range
    });
    return response.data.values || [];
  }

  async function updateValues(range, values) {
    await client.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values
      }
    });
  }

  async function appendValues(range, values) {
    await client.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values
      }
    });
  }

  async function listMembers() {
    const rows = await getValues(`${MEMBERS_SHEET}!A2:J`);
    return rows.map((row, index) => rowToMember(row, index + 2));
  }

  async function findMember({ discordUserId, discordUsername }) {
    const members = await listMembers();
    const byId = discordUserId
      ? members.find((member) => member.discordUserId === discordUserId)
      : null;
    if (byId) return byId;

    const usernameKey = normalizeKey(discordUsername);
    if (!usernameKey) return null;
    return members.find((member) => normalizeKey(member.discordUsername) === usernameKey) || null;
  }

  async function appendMember(member) {
    await appendValues(`${MEMBERS_SHEET}!A:J`, [memberToRow(member)]);
  }

  async function updateMember(rowIndex, member) {
    await updateValues(`${MEMBERS_SHEET}!A${rowIndex}:J${rowIndex}`, [memberToRow(member)]);
  }

  async function upsertMember(member) {
    const existing = await findMember({
      discordUserId: member.discordUserId,
      discordUsername: member.discordUsername
    });

    if (!existing) {
      await appendMember(member);
      return { created: true };
    }

    await updateMember(existing.rowIndex, {
      ...existing,
      ...member,
      dateJoined: existing.dateJoined || member.dateJoined
    });
    return { created: false, rowIndex: existing.rowIndex };
  }

  async function updateMemberVerified(rowIndex, verified) {
    await updateValues(`${MEMBERS_SHEET}!F${rowIndex}:F${rowIndex}`, [[boolString(verified)]]);
  }

  async function updateMemberUserId(rowIndex, discordUserId) {
    await updateValues(`${MEMBERS_SHEET}!H${rowIndex}:H${rowIndex}`, [[discordUserId]]);
  }

  async function getUnverifiedMembers() {
    const members = await listMembers();
    return members.filter((member) => !member.verified);
  }

  async function appendPendingVerification(record) {
    await appendValues(`${PENDING_SHEET}!A:G`, [pendingToRow(record)]);
  }

  async function getPendingVerifications(status = 'PENDING') {
    const rows = await getValues(`${PENDING_SHEET}!A2:G`);
    const records = rows.map((row, index) => rowToPending(row, index + 2));
    return status ? records.filter((record) => normalizeKey(record.status) === normalizeKey(status)) : records;
  }

  async function updatePendingStatus(discordUserId, status) {
    const rows = await getValues(`${PENDING_SHEET}!A2:G`);
    const records = rows.map((row, index) => rowToPending(row, index + 2));
    const matching = records.filter((record) => record.discordUserId === discordUserId);

    for (const record of matching) {
      await updateValues(`${PENDING_SHEET}!E${record.rowIndex}:E${record.rowIndex}`, [[status]]);
    }

    return matching.length;
  }

  return {
    appendMember,
    appendPendingVerification,
    findMember,
    getPendingVerifications,
    getUnverifiedMembers,
    listMembers,
    updateMember,
    updateMemberUserId,
    updateMemberVerified,
    updatePendingStatus,
    upsertMember
  };
}

module.exports = {
  MEMBERS_SHEET,
  PENDING_SHEET,
  createSheetsService,
  memberToRow,
  pendingToRow,
  rowToMember,
  rowToPending
};
