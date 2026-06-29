# ColorStack GSU Discord Bot

The verification bot for the **ColorStack at Georgia State University** Discord server.
It gives new members their roles automatically, based on a single Google Form they fill
out when they join, so admins don't have to vet and assign roles by hand.

## What it does

When someone joins the server, they land in a welcome channel with a single
**Verify Membership** button. After they've filled out the chapter's Google Form, clicking
it makes the bot:

1. Look the person up in the form responses by their **Discord username**.
2. Read what they submitted (name, student email, LinkedIn, and whether they're a
   ColorStack National member).
3. Grant the matching Discord role(s) and record them as a verified member.

Everyone with a form submission is a GSU chapter member, so they get the **GSU** role.
Anyone who marked that they're a ColorStack National member also gets the **National**
role and is recorded as `GSU+National`.

If the bot can't find someone's form submission, it replies with a friendly nudge pointing
them to the form instead of granting anything.

## Why it works this way

Everything keys off **one form**. There's no screenshot upload, no image recognition,
and no manual back-and-forth for the common case — membership is decided by the answers
the member already gave on the form. Admins keep a manual override (`/approve`, `/deny`)
for the rare cases that need a human.

## How members and data are tracked

State lives in a single Google Spreadsheet with three tabs:

- **Form responses** — owned by the Google Form. The bot only reads it, matching people
  by their Discord-username answer and reading their name, student email, LinkedIn, and
  national-application answer.
- **`members`** — owned by the bot. One row per verified member: Discord ID and username,
  name, student email, LinkedIn, role (`GSU` / `National` / `GSU+National`), verified flag,
  and the date they joined.
- **`pending_verifications`** — the manual admin-review queue used by `/approve` and
  `/deny`.

## Admin commands

- `/setup` — posts the welcome message and **Verify Membership** button in a channel.
- `/approve` — manually grant a member their role and record them (override).
- `/deny` — reject a pending verification and DM the person.
- `/pending` — list members awaiting manual review.

## How it runs

The bot is **HTTP interactions-only** — it has no always-on gateway connection. It runs
as a Vercel serverless function that responds to Discord's interaction webhooks at
`api/interactions.js`, calls the Discord REST API to manage roles and messages, and reads
and writes the Google Sheet for membership data.

Configuration (Discord credentials, Google service account, sheet/tab names, role and
channel IDs) is supplied through environment variables — see [`.env.example`](.env.example).
