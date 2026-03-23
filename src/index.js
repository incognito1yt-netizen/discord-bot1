import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Logger from './utils/logger.js';
import { startStatsUpdater } from './utils/stats-updater.js';
import logConfig from './utils/log-config.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences,
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
    ],
});

// Set client for log config
logConfig.setClient(client);

// Load commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = await import(`file://${filePath}`);

    if (command.default?.data?.name) {
        client.commands.set(command.default.data.name, command.default);
        Logger.info(`Załadowano komendę: ${command.default.data.name}`);
    }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = await import(`file://${filePath}`);

    if (event.default?.name) {
        if (event.default.once) {
            client.once(event.default.name, (...args) => event.default.execute(...args));
        } else {
            client.on(event.default.name, (...args) => event.default.execute(...args));
        }
        Logger.info(`Załadowano event: ${event.default.name}`);
    }
}

// Error handling
process.on('unhandledRejection', error => {
    Logger.error('Nieobsłużone odrzucenie promise:', error);
});

process.on('uncaughtException', error => {
    Logger.error('Nieobsłużony wyjątek:', error);
    process.exit(1);
});

// Login to Discord
if (!process.env.DISCORD_TOKEN) {
    Logger.error('Brak DISCORD_TOKEN w pliku .env!');
    process.exit(1);
}

client.login(process.env.DISCORD_TOKEN).catch(error => {
    Logger.error('Nie udało się zalogować do Discord:', error);
    process.exit(1);
});
