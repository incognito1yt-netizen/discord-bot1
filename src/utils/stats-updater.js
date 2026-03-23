import Logger from './logger.js';
import statsChannelsDB from '../database/stats-channels-db.js';

const UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes
const lastUpdates = new Map(); // Track last update time per channel

export function startStatsUpdater(client) {
    Logger.info('Uruchomiono updater kanałów statystyk');

    // Update immediately on start
    setTimeout(() => updateAllStatsChannels(client), 10000); // Wait 10s after bot start

    // Then update every 5 minutes
    setInterval(() => {
        updateAllStatsChannels(client);
    }, UPDATE_INTERVAL);
}

async function updateAllStatsChannels(client) {
    const allGuildsData = statsChannelsDB.getAllGuildsWithChannels();

    for (const [guildId, channels] of Object.entries(allGuildsData)) {
        try {
            const guild = client.guilds.cache.get(guildId);
            if (!guild) continue;

            for (const [type, channelId] of Object.entries(channels)) {
                await updateStatsChannel(guild, type, channelId);
            }
        } catch (error) {
            Logger.error(`Błąd podczas aktualizacji statystyk dla guild ${guildId}`, error);
        }
    }
}

async function updateStatsChannel(guild, type, channelId) {
    try {
        const channel = guild.channels.cache.get(channelId);
        if (!channel) {
            Logger.warn(`Kanał statystyk ${channelId} nie istnieje, usuwam z bazy`);
            statsChannelsDB.removeChannel(guild.id, type);
            return;
        }

        // Rate limit: max 2 updates per 10 minutes per channel (Discord limit)
        const lastUpdate = lastUpdates.get(channelId);
        if (lastUpdate && Date.now() - lastUpdate < 10 * 60 * 1000) {
            return; // Skip if updated less than 10 minutes ago
        }

        let newName;
        let count;

        if (type === 'online') {
            count = guild.members.cache.filter(m => m.presence?.status && m.presence.status !== 'offline').size;
            newName = `📊 Online: ${count}`;
        } else if (type === 'total') {
            count = guild.memberCount;
            newName = `👥 Members: ${count}`;
        }

        if (channel.name !== newName) {
            await channel.setName(newName);
            lastUpdates.set(channelId, Date.now());
            Logger.info(`Zaktualizowano kanał statystyk ${type} na ${guild.name}: ${newName}`);
        }
    } catch (error) {
        Logger.error(`Błąd podczas aktualizacji kanału ${type} (${channelId})`, error);
    }
}
