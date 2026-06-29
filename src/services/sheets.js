const { google } = require('googleapis');
const { googlePrivateKey, requireConfig } = require('../config');

// The bot owns the `members` and `pending_verifications` tabs. The Google Form
// owns its own response tab (read-only for the bot); we only look members up
// there to read what they submitted.
const FORM_RESPONSES_SHEET = 'Form Responses 1';
const MEMBERS_SHEET = 'members';
const PENDING_SHEET = 'pending_verifications';

// Zero-based column positions of the fields we read from the Google Form's
// response tab. Everything else on the form is ignored by the bot.
const FORM_COLUMN = {
  timestamp: 0,
  firstName: 1,
  lastName: 2,
  personalEmail: 3,
  studentEmail: 4,
  linkedin: 5,
  discordUsername: 10,
  appliedNational: 13
};

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase();
}

function boolString(value) {
  return value ? 'TRUE' : 'FALSE';
}

function rowToFormResponse(row, rowIndex) {
  const firstName = row[FORM_COLUMN.firstName] || '';
  const lastName = row[FORM_COLUMN.lastName] || '';
  return {
    rowIndex,
    timestamp: row[FORM_COLUMN.timestamp] || '',
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
    personalEmail: row[FORM_COLUMN.personalEmail] || '',
    studentEmail: row[FORM_COLUMN.studentEmail] || '',
    linkedin: row[FORM_COLUMN.linkedin] || '',
    discordUsername: row[FORM_COLUMN.discordUsername] || '',
    appliedNational: normalizeKey(row[FORM_COLUMN.appliedNational]) === 'yes'
  };
}

// The `members` tab is fully bot-owned, so the column order is ours to define.
function rowToMember(row, rowIndex) {
  return {
    rowIndex,
    discordUserId: row[0] || '',
    discordUsername: row[1] || '',
    fullName: row[2] || '',
    studentEmail: row[3] || '',
    linkedin: row[4] || '',
    role: row[5] || '',
    verified: normalizeKey(row[6]) === 'true',
    dateJoined: row[7] || ''
  };
}

function memberToRow(member) {
  return [
    member.discordUserId || '',
    member.discordUsername || '',
    member.fullName || '',
    member.studentEmail || '',
    member.linkedin || '',
    member.role || '',
    boolString(member.verified),
    member.dateJoined || new Date().toISOString()
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
  const formSheet = config.formResponsesSheet || FORM_RESPONSES_SHEET;
  const membersSheet = config.membersSheet || MEMBERS_SHEET;

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

  // --- Google Form response tab (read-only) ---------------------------------

  async function listFormResponses() {
    const rows = await getValues(`${formSheet}!A2:N`);
    return rows.map((row, index) => rowToFormResponse(row, index + 2));
  }

  async function findFormResponse({ discordUsername }) {
    const usernameKey = normalizeKey(discordUsername);
    if (!usernameKey) return null;

    const responses = await listFormResponses();
    // A member may resubmit the form; use their most recent response.
    const matches = responses.filter(
      (response) => normalizeKey(response.discordUsername) === usernameKey
    );
    return matches.length > 0 ? matches[matches.length - 1] : null;
  }

  // --- Bot-owned members tab ------------------------------------------------

  async function listMembers() {
    const rows = await getValues(`${membersSheet}!A2:H`);
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
    await appendValues(`${membersSheet}!A:H`, [memberToRow(member)]);
  }

  async function updateMember(rowIndex, member) {
    await updateValues(`${membersSheet}!A${rowIndex}:H${rowIndex}`, [memberToRow(member)]);
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
    await updateValues(`${membersSheet}!G${rowIndex}:G${rowIndex}`, [[boolString(verified)]]);
  }

  async function updateMemberUserId(rowIndex, discordUserId) {
    await updateValues(`${membersSheet}!A${rowIndex}:A${rowIndex}`, [[discordUserId]]);
  }

  async function getUnverifiedMembers() {
    const members = await listMembers();
    return members.filter((member) => !member.verified);
  }

  // --- Manual admin review queue --------------------------------------------

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
    findFormResponse,
    findMember,
    getPendingVerifications,
    getUnverifiedMembers,
    listFormResponses,
    listMembers,
    updateMember,
    updateMemberUserId,
    updateMemberVerified,
    updatePendingStatus,
    upsertMember
  };
}

module.exports = {
  FORM_COLUMN,
  FORM_RESPONSES_SHEET,
  MEMBERS_SHEET,
  PENDING_SHEET,
  createSheetsService,
  memberToRow,
  pendingToRow,
  rowToFormResponse,
  rowToMember,
  rowToPending
};
