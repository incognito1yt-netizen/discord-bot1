import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATS_CHANNELS_PATH = path.join(__dirname, '..', '..', 'stats_channels.json');

class StatsChannelsDB {
    constructor() {
        this.initDatabase();
    }

    initDatabase() {
        if (!fs.existsSync(STATS_CHANNELS_PATH)) {
            fs.writeFileSync(STATS_CHANNELS_PATH, JSON.stringify({}, null, 2), 'utf8');
            Logger.info('Utworzono plik stats_channels.json');
        }
    }

    getChannels(guildId) {
        try {
            const data = JSON.parse(fs.readFileSync(STATS_CHANNELS_PATH, 'utf8'));
            return data[guildId] || {};
        } catch (error) {
            Logger.error('Błąd podczas odczytywania stats channels', error);
            return {};
        }
    }

    addChannel(guildId, type, channelId) {
        try {
            const data = JSON.parse(fs.readFileSync(STATS_CHANNELS_PATH, 'utf8'));
            if (!data[guildId]) data[guildId] = {};
            data[guildId][type] = channelId;
            fs.writeFileSync(STATS_CHANNELS_PATH, JSON.stringify(data, null, 2), 'utf8');
            Logger.success(`Dodano kanał statystyk ${type} na ${guildId}`);
            return true;
        } catch (error) {
            Logger.error('Błąd podczas zapisywania kanału statystyk', error);
            return false;
        }
    }

    removeChannel(guildId, type) {
        try {
            const data = JSON.parse(fs.readFileSync(STATS_CHANNELS_PATH, 'utf8'));
            if (data[guildId] && data[guildId][type]) {
                delete data[guildId][type];
                if (Object.keys(data[guildId]).length === 0) {
                    delete data[guildId];
                }
                fs.writeFileSync(STATS_CHANNELS_PATH, JSON.stringify(data, null, 2), 'utf8');
                Logger.success(`Usunięto kanał statystyk ${type} na ${guildId}`);
            }
            return true;
        } catch (error) {
            Logger.error('Błąd podczas usuwania kanału statystyk', error);
            return false;
        }
    }

    clearChannels(guildId) {
        try {
            const data = JSON.parse(fs.readFileSync(STATS_CHANNELS_PATH, 'utf8'));
            if (data[guildId]) {
                delete data[guildId];
                fs.writeFileSync(STATS_CHANNELS_PATH, JSON.stringify(data, null, 2), 'utf8');
                Logger.success(`Usunięto wszystkie kanały statystyk na ${guildId}`);
            }
            return true;
        } catch (error) {
            Logger.error('Błąd podczas czyszczenia kanałów statystyk', error);
            return false;
        }
    }

    getAllGuildsWithChannels() {
        try {
            const data = JSON.parse(fs.readFileSync(STATS_CHANNELS_PATH, 'utf8'));
            return data;
        } catch (error) {
            Logger.error('Błąd podczas odczytywania wszystkich guild', error);
            return {};
        }
    }
}

export default new StatsChannelsDB();
