# ColorStack GSU Discord Bot

HTTP interactions-only Discord bot for the ColorStack GSU chapter server. It runs as a Vercel serverless function, verifies members through Discord slash commands and buttons, stores state in Google Sheets, and uses Gemini to check ColorStack National profile screenshots.

## Stack

- Node.js 20+
- Vercel serverless functions
- `discord-interactions` for request signature verification
- Raw Discord REST API calls for roles, DMs, interaction edits, and channel messages
- Google Sheets via `googleapis`
- Gemini via `@google/generative-ai`

## Environment

Copy `.env.example` to `.env.local` for local scripts, then add the same values in Vercel:

```text
DISCORD_PUBLIC_KEY=
DISCORD_BOT_TOKEN=
DISCORD_APPLICATION_ID=
GEMINI_API_KEY=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SHEET_ID=
GSU_ROLE_ID=
NATIONAL_ROLE_ID=
GUILD_ID=
PENDING_CHANNEL_ID=
UNVERIFIED_CHANNEL_ID=
GSU_FORM_URL=
COLORSTACK_APPLICATION_URL=
```

`GOOGLE_PRIVATE_KEY` may be stored with escaped newlines, for example `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n`.

## Google Sheet

Create a `members` tab with these columns:

| Column | Field |
| --- | --- |
| A | Full Name |
| B | LinkedIn |
| C | Discord Username |
| D | Student Email |
| E | Role |
| F | Verified |
| G | Date Joined |
| H | Discord User ID |
| I | National Member Number |
| J | School |

Create a `pending_verifications` tab with these columns:

| Column | Field |
| --- | --- |
| A | Discord User ID |
| B | Discord Username |
| C | Role Requested |
| D | Submitted Data JSON |
| E | Status |
| F | Reason |
| G | Timestamp |

Share the sheet with the Google service account email as an editor.

## Discord Setup

Create these roles and channels manually:

- `GSU Member`
- `ColorStack National Member`
- `#welcome-and-rules`
- `#unverified-general`
- `#admin-pending`

Set the Discord Developer Portal interaction endpoint to:

```text
https://your-vercel-project.vercel.app/api/interactions
```

## Commands

Install dependencies and register commands:

```powershell
npm install
npm run register-commands
```

If `GUILD_ID` is set, commands register to that guild for fast iteration. Without `GUILD_ID`, the script registers global commands.

## Development

Run tests:

```powershell
npm test
```

The bot has no persistent gateway connection. It only handles Discord HTTP interactions at `api/interactions.js`.
