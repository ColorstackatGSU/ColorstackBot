const { GoogleGenerativeAI } = require('@google/generative-ai');
const { requireConfig } = require('../config');

const PROFILE_PROMPT = `You are verifying a ColorStack member profile screenshot.

A valid profile has ALL of these elements:
- The ColorStack platform UI
- A visible member number in the format #XXXXX
- A member name
- A "DM on Slack" button
- A school/university name

Extract the following fields if present:
- full_name
- member_number
- school
- linkedin_url (if visible)
- email (if visible)

Respond ONLY with a JSON object:
{
  "valid": true/false,
  "full_name": "",
  "member_number": "",
  "school": "",
  "linkedin_url": "",
  "email": "",
  "missing_fields": []
}

If the image is not a ColorStack profile, set valid to false.`;

function extractJson(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    throw new Error('Gemini returned an empty response.');
  }

  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('Gemini did not return a JSON object.');
    }
    return JSON.parse(candidate.slice(start, end + 1));
  }
}

function normalizeGeminiResult(result) {
  return {
    valid: Boolean(result.valid),
    full_name: String(result.full_name || ''),
    member_number: String(result.member_number || ''),
    school: String(result.school || ''),
    linkedin_url: String(result.linkedin_url || ''),
    email: String(result.email || ''),
    missing_fields: Array.isArray(result.missing_fields) ? result.missing_fields : []
  };
}

function createGeminiService({ config, model } = {}) {
  requireConfig(config, ['geminiApiKey']);

  const client = new GoogleGenerativeAI(config.geminiApiKey);
  const generativeModel = model || client.getGenerativeModel({ model: config.geminiModel });

  return {
    async analyzeProfileScreenshot({ buffer, mimeType }) {
      const result = await generativeModel.generateContent([
        PROFILE_PROMPT,
        {
          inlineData: {
            data: buffer.toString('base64'),
            mimeType
          }
        }
      ]);

      const text = result.response.text();
      try {
        return normalizeGeminiResult(extractJson(text));
      } catch (error) {
        return {
          valid: false,
          full_name: '',
          member_number: '',
          school: '',
          linkedin_url: '',
          email: '',
          missing_fields: ['valid_json'],
          parseError: true,
          rawText: text,
          error: error.message
        };
      }
    }
  };
}

module.exports = {
  PROFILE_PROMPT,
  createGeminiService,
  extractJson,
  normalizeGeminiResult
};
