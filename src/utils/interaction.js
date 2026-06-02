const { Permissions } = require('./constants');

function getInteractionUser(interaction) {
  return interaction.member?.user || interaction.user;
}

function getDiscordUsername(user) {
  if (!user) return '';
  if (user.discriminator && user.discriminator !== '0') {
    return `${user.username}#${user.discriminator}`;
  }
  return user.username || '';
}

function getMemberRoleIds(interaction) {
  const roles = interaction.member?.roles;
  return Array.isArray(roles) ? roles : [];
}

function memberHasRole(interaction, roleId) {
  return roleId ? getMemberRoleIds(interaction).includes(roleId) : false;
}

function getMemberPermissions(interaction) {
  const permissions = interaction.member?.permissions;
  if (permissions === undefined || permissions === null || permissions === '') {
    return 0n;
  }
  return BigInt(permissions);
}

function hasManageGuild(interaction) {
  return (getMemberPermissions(interaction) & Permissions.MANAGE_GUILD) === Permissions.MANAGE_GUILD;
}

function getOption(interaction, name) {
  return interaction.data?.options?.find((option) => option.name === name);
}

function getStringOption(interaction, name) {
  const option = getOption(interaction, name);
  return typeof option?.value === 'string' ? option.value.trim() : '';
}

function getUserOption(interaction, name) {
  const option = getOption(interaction, name);
  if (!option?.value) return null;

  const user = interaction.data?.resolved?.users?.[option.value] || {
    id: option.value,
    username: option.value
  };

  return {
    ...user,
    id: option.value
  };
}

function flattenModalComponents(components = []) {
  const flattened = [];

  for (const component of components) {
    if (component.component) {
      flattened.push(component.component);
      continue;
    }

    if (Array.isArray(component.components)) {
      flattened.push(...flattenModalComponents(component.components));
      continue;
    }

    flattened.push(component);
  }

  return flattened;
}

function getModalFieldMap(interaction) {
  const fields = new Map();
  for (const component of flattenModalComponents(interaction.data?.components || [])) {
    if (component.custom_id) {
      fields.set(component.custom_id, component);
    }
  }
  return fields;
}

function getModalTextValue(interaction, customId) {
  const component = getModalFieldMap(interaction).get(customId);
  return typeof component?.value === 'string' ? component.value.trim() : '';
}

function getModalAttachment(interaction, customId) {
  const component = getModalFieldMap(interaction).get(customId);
  const attachmentId = component?.values?.[0];
  if (!attachmentId) return null;
  return interaction.data?.resolved?.attachments?.[attachmentId] || null;
}

function channelMention(channelId, fallbackName) {
  return channelId ? `<#${channelId}>` : `#${fallbackName}`;
}

module.exports = {
  channelMention,
  getDiscordUsername,
  getInteractionUser,
  getModalAttachment,
  getModalTextValue,
  getMemberRoleIds,
  getOption,
  getStringOption,
  getUserOption,
  hasManageGuild,
  memberHasRole
};
