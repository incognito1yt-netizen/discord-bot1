import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_CONFIG_PATH = path.join(__dirname, '..', '..', 'log_config.json');

class LogConfig {
    constructor() {
        this.initConfig();
        this.client = null;
    }

    initConfig() {
        if (!fs.existsSync(LOG_CONFIG_PATH)) {
            fs.writeFileSync(LOG_CONFIG_PATH, JSON.stringify({}, null, 2), 'utf8');
        }
    }

    setClient(client) {
        this.client = client;
    }

    getConfig(guildId) {
        try {
            const data = JSON.parse(fs.readFileSync(LOG_CONFIG_PATH, 'utf8'));
            return data[guildId] || null;
        } catch (error) {
            return null;
        }
    }

    setLogChannel(guildId, channelId) {
        try {
            const data = JSON.parse(fs.readFileSync(LOG_CONFIG_PATH, 'utf8'));
            data[guildId] = { channelId };
            fs.writeFileSync(LOG_CONFIG_PATH, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (error) {
            return false;
        }
    }

    async sendToDiscord(level, message, guildId = null) {
        if (!this.client) return;

        try {
            const guilds = guildId ? [guildId] : Array.from(this.client.guilds.cache.keys());

            for (const id of guilds) {
                const config = this.getConfig(id);
                if (!config) continue;

                const guild = this.client.guilds.cache.get(id);
                if (!guild) continue;

                const channel = guild.channels.cache.get(config.channelId);
                if (!channel || !channel.isTextBased()) continue;

                const emoji = {
                    error: '❌',
                    warn: '⚠️',
                    success: '✅',
                    info: 'ℹ️'
                }[level] || '📝';

                const color = {
                    error: '#ff0000',
                    warn: '#ffaa00',
                    success: '#00ff00',
                    info: '#5865f2'
                }[level] || '#999999';

                // Split long messages
                if (message.length > 2000) {
                    const chunks = message.match(/.{1,2000}/g) || [];
                    for (const chunk of chunks) {
                        await channel.send(`${emoji} **[${level.toUpperCase()}]** ${chunk}`);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                } else {
                    await channel.send(`${emoji} **[${level.toUpperCase()}]** ${message}`);
                }
            }
        } catch (error) {
            // Avoid infinite loop - don't log errors from logging
            console.error('Error sending to Discord:', error.message);
        }
    }
}

export default new LogConfig();
