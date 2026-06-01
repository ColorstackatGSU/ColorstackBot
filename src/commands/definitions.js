const { ApplicationCommandOptionType, Permissions } = require('../utils/constants');

function adminPermissionString() {
  return Permissions.MANAGE_GUILD.toString();
}

function buildCommands() {
  return [
    {
      name: 'join-gsu',
      description: 'Verify as a ColorStack GSU member from the GSU signup sheet.'
    },
    {
      name: 'join-national',
      description: 'Verify as a ColorStack National member.'
    },
    {
      name: 'setup',
      description: 'Post the ColorStack GSU welcome and verification buttons.',
      default_member_permissions: adminPermissionString()
    },
    {
      name: 'approve',
      description: 'Manually approve a member and assign the requested role.',
      default_member_permissions: adminPermissionString(),
      options: [
        {
          name: 'user',
          description: 'Discord user to approve.',
          type: ApplicationCommandOptionType.USER,
          required: true
        },
        {
          name: 'role',
          description: 'Role to assign.',
          type: ApplicationCommandOptionType.STRING,
          required: true,
          choices: [
            { name: 'GSU Member', value: 'gsu' },
            { name: 'ColorStack National Member', value: 'national' }
          ]
        },
        {
          name: 'full_name',
          description: 'Full name to store in the member sheet.',
          type: ApplicationCommandOptionType.STRING,
          required: true
        },
        {
          name: 'email',
          description: 'Student email to store in the member sheet.',
          type: ApplicationCommandOptionType.STRING,
          required: true
        },
        {
          name: 'linkedin',
          description: 'LinkedIn profile URL to store in the member sheet.',
          type: ApplicationCommandOptionType.STRING,
          required: true
        }
      ]
    },
    {
      name: 'deny',
      description: 'Deny a pending verification and DM the user.',
      default_member_permissions: adminPermissionString(),
      options: [
        {
          name: 'user',
          description: 'Discord user to deny.',
          type: ApplicationCommandOptionType.USER,
          required: true
        }
      ]
    },
    {
      name: 'pending',
      description: 'List pending verification records.',
      default_member_permissions: adminPermissionString()
    }
  ];
}

module.exports = {
  adminPermissionString,
  buildCommands
};
