const assert = require('node:assert/strict');
const test = require('node:test');
const { buildCommands } = require('../src/commands/definitions');

test('registers the expected slash commands', () => {
  const commands = buildCommands();
  const names = commands.map((command) => command.name).sort();

  assert.deepEqual(names, [
    'approve',
    'deny',
    'join-gsu',
    'join-national',
    'pending',
    'setup'
  ]);
});

test('/approve requires user, role, full name, email, and LinkedIn options', () => {
  const approve = buildCommands().find((command) => command.name === 'approve');
  const requiredOptions = approve.options
    .filter((option) => option.required)
    .map((option) => option.name)
    .sort();

  assert.deepEqual(requiredOptions, ['email', 'full_name', 'linkedin', 'role', 'user']);
  assert.deepEqual(
    approve.options.find((option) => option.name === 'role').choices.map((choice) => choice.value),
    ['gsu', 'national']
  );
});
