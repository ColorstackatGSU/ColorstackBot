const { requireConfig } = require('../config');
const {
  ButtonStyle,
  ComponentType
} = require('../utils/constants');
const { deferredEphemeral } = require('../utils/deferred');
const {
  channelMention,
  getDiscordUsername,
  getInteractionUser,
  getModalAttachment,
  getModalTextValue
} = require('../utils/interaction');
const {
  ephemeralMessage,
  modalResponse
} = require('../utils/responses');
const {
  isGsuEmail,
  isLikelyEmail,
  isLikelyLinkedInUrl,
  isSupportedImageAttachment,
  normalizeLinkedInUrl
} = require('../utils/validation');

const NATIONAL_MODAL_ID = 'modal_national_profile';
const FIELD_FULL_NAME = 'national_full_name';
const FIELD_LINKEDIN = 'national_linkedin';
const FIELD_EMAIL = 'national_email';
const FIELD_SCREENSHOT = 'national_screenshot';

function nationalChoiceComponents() {
  return [
    {
      type: ComponentType.ACTION_ROW,
      components: [
        {
          type: ComponentType.BUTTON,
          style: ButtonStyle.PRIMARY,
          custom_id: 'btn_already_national',
          label: "I'm already a member"
        },
        {
          type: ComponentType.BUTTON,
          style: ButtonStyle.SECONDARY,
          custom_id: 'btn_apply_national',
          label: 'I want to apply'
        }
      ]
    }
  ];
}

function handleJoinNational() {
  return {
    response: ephemeralMessage('Are you already a ColorStack National member, or would you like to apply?', {
      components: nationalChoiceComponents()
    })
  };
}

function handleApplyNational(interaction, services) {
  const applyUrl = services.config.colorStackApplicationUrl || 'https://www.colorstack.org/';
  return {
    response: ephemeralMessage(`Apply to ColorStack National here: ${applyUrl}\n\nOnce you are accepted, come back and click "Join as National Member" again.`)
  };
}

function label(label, description, component) {
  return {
    type: ComponentType.LABEL,
    label,
    description,
    component
  };
}

function textInput(customId, placeholder) {
  return {
    type: ComponentType.TEXT_INPUT,
    custom_id: customId,
    style: 1,
    min_length: 2,
    max_length: 200,
    placeholder,
    required: true
  };
}

function nationalModal() {
  return {
    custom_id: NATIONAL_MODAL_ID,
    title: 'ColorStack National Verification',
    components: [
      label('Full name', 'Use the name from your ColorStack profile.', textInput(FIELD_FULL_NAME, 'Ada Lovelace')),
      label('LinkedIn URL', 'Paste your LinkedIn profile URL.', textInput(FIELD_LINKEDIN, 'https://www.linkedin.com/in/your-name')),
      label('Student email', 'Use your school email if possible.', textInput(FIELD_EMAIL, 'you@student.gsu.edu')),
      label('Profile screenshot', 'Upload your public ColorStack member profile card.', {
        type: ComponentType.FILE_UPLOAD,
        custom_id: FIELD_SCREENSHOT,
        min_values: 1,
        max_values: 1,
        required: true
      })
    ]
  };
}

function handleAlreadyNational() {
  return {
    response: modalResponse(nationalModal())
  };
}

function submittedNationalData(interaction) {
  return {
    fullName: getModalTextValue(interaction, FIELD_FULL_NAME),
    linkedin: normalizeLinkedInUrl(getModalTextValue(interaction, FIELD_LINKEDIN)),
    studentEmail: getModalTextValue(interaction, FIELD_EMAIL),
    screenshot: getModalAttachment(interaction, FIELD_SCREENSHOT)
  };
}

function nationalValidationErrors(data) {
  const errors = [];
  if (!data.fullName) errors.push('full name');
  if (!isLikelyLinkedInUrl(data.linkedin)) errors.push('a valid LinkedIn URL');
  if (!isLikelyEmail(data.studentEmail)) errors.push('a valid email address');
  if (!isSupportedImageAttachment(data.screenshot)) errors.push('a PNG or JPG ColorStack profile screenshot');
  return errors;
}

async function createPendingNational(interaction, services, data, reason, geminiResult = null) {
  const user = getInteractionUser(interaction);
  const discordUsername = getDiscordUsername(user);

  await services.sheets.appendPendingVerification({
    discordUserId: user.id,
    discordUsername,
    roleRequested: 'National',
    submittedData: {
      fullName: data.fullName,
      linkedin: data.linkedin,
      studentEmail: data.studentEmail,
      attachmentId: data.screenshot?.id,
      attachmentFilename: data.screenshot?.filename,
      geminiResult
    },
    status: 'PENDING',
    reason
  });

  try {
    await services.discord.postChannelMessage(services.config.pendingChannelId, {
      content: `National verification needs review for ${discordUsername} (${user.id}). Reason: ${reason}`
    });
  } catch (error) {
    console.error(error);
  }
}

async function processNationalModal(interaction, services) {
  requireConfig(services.config, ['gsuRoleId', 'nationalRoleId', 'guildId']);

  const data = submittedNationalData(interaction);
  const errors = nationalValidationErrors(data);
  const fallback = channelMention(services.config.unverifiedChannelId, 'unverified-general');

  if (errors.length > 0) {
    return {
      content: `Please submit ${errors.join(', ')}. If you need help, contact an admin in ${fallback}.`
    };
  }

  const image = await services.media.downloadAttachment(data.screenshot);
  const geminiResult = await services.gemini.analyzeProfileScreenshot(image);

  if (!geminiResult.valid) {
    const reason = geminiResult.parseError
      ? 'Gemini returned malformed JSON while checking the screenshot.'
      : 'Gemini could not verify the screenshot as a ColorStack public profile.';
    await createPendingNational(interaction, services, data, reason, geminiResult);

    if (geminiResult.parseError) {
      return {
        content: `I couldn't verify that screenshot automatically, so I sent it to the admin review queue. An admin will follow up, or you can ask for help in ${fallback}.`
      };
    }

    return {
      content: `That doesn't look like a ColorStack profile. Please upload a screenshot of your public member profile page. If you need help, contact an admin in ${fallback}.`
    };
  }

  const user = getInteractionUser(interaction);
  const discordUsername = getDiscordUsername(user);
  const grantsGsu = isGsuEmail(data.studentEmail, services.config.gsuEmailDomains);

  await services.discord.assignRoles({
    guildId: services.config.guildId,
    userId: user.id,
    roleIds: grantsGsu
      ? [services.config.gsuRoleId, services.config.nationalRoleId]
      : [services.config.nationalRoleId]
  });

  await services.sheets.upsertMember({
    fullName: data.fullName,
    linkedin: data.linkedin,
    discordUsername,
    studentEmail: data.studentEmail,
    role: grantsGsu ? 'GSU+National' : 'National',
    verified: true,
    dateJoined: new Date().toISOString(),
    discordUserId: user.id
  });

  await services.sheets.updatePendingStatus(user.id, 'APPROVED');

  return {
    content: grantsGsu
      ? 'You are verified as a ColorStack National Member, and your GSU email unlocked GSU access too. Your server roles have been updated.'
      : 'You are verified as a ColorStack National Member. Your server access has been updated.'
  };
}

function handleNationalModalSubmit(interaction, services) {
  return deferredEphemeral(interaction, services, () => processNationalModal(interaction, services));
}

module.exports = {
  FIELD_EMAIL,
  FIELD_FULL_NAME,
  FIELD_LINKEDIN,
  FIELD_SCREENSHOT,
  NATIONAL_MODAL_ID,
  handleAlreadyNational,
  handleApplyNational,
  handleJoinNational,
  handleNationalModalSubmit,
  nationalChoiceComponents,
  nationalModal,
  processNationalModal,
  submittedNationalData
};
