# Agent Instructions

## Quick Start

```bash
npm install
cp .env.example .env  # Fill DISCORD_TOKEN and CLIENT_ID
npm run deploy        # Register slash commands (takes up to 1h globally)
npm start             # Run bot
```

## Architecture

- **ES Modules** - Uses `import/export`, not CommonJS. File extensions required.
- **Entrypoint**: `src/index.js` - Creates Discord client, loads commands/events dynamically.
- **Commands**: `src/commands/*.js` - Auto-loaded via `fs.readdirSync`. Each exports `{ data: SlashCommandBuilder, execute: async fn }`.
- **Events**: `src/events/*.js` - Auto-loaded. Each exports `{ name: string, once?: boolean, execute: async fn }`.
- **Database**: File-based JSON in root directory (not `src/database/`). Files: `verification_config.json`, `automod_config.json`, `warnings.json`, etc.
- **Logging**: Custom `Logger` class sends to both console and Discord channel via `log-config.js`.

## Key Patterns

- All commands use Polish language for descriptions and messages.
- Ban/mute actions use `parseDuration()` from `src/utils/automod.js` for time strings like `1h`, `7d`.
- Temporary bans schedule automatic unban via `setTimeout()`.
- Bot checks role hierarchy before moderating members.
- **Ticket system**: `/ticket close` fetches all messages, creates a .txt file, and DMs the ticket creator with a Polish summary before deleting the channel.

## Environment Variables

Required in `.env`:
- `DISCORD_TOKEN` - Bot token from Discord Developer Portal
- `CLIENT_ID` - Application ID from Discord Developer Portal

## Discord Bot Requirements

- Privileged Gateway Intents: SERVER_MEMBERS_INTENT, MESSAGE_CONTENT_INTENT
- Permissions: ViewChannel, SendMessages, ManageMessages, ManageRoles, AddReactions

## Docker

```bash
docker compose up --build
```

Uses `node:19-alpine`, copies `.env` file into container.

## Gotchas

- Slash commands are global - can take up to 1 hour to propagate after `npm run deploy`.
- For testing, consider guild-specific command registration instead.
- Discord API only allows deleting messages younger than 14 days.
- Bot role must be higher in hierarchy than target user's role for moderation actions.
