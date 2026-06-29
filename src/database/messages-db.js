import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MESSAGES_PATH = path.join(__dirname, '..', '..', 'messages_tracked.json');

class MessagesDB {
    constructor() {
        this.initDatabase();
    }

    initDatabase() {
        if (!fs.existsSync(MESSAGES_PATH)) {
            fs.writeFileSync(MESSAGES_PATH, JSON.stringify({}, null, 2), 'utf8');
            Logger.info('Utworzono plik śledzenia wiadomości');
        }
    }

    trackMessage(guildId, messageId, channelId, type, config) {
        try {
            const data = JSON.parse(fs.readFileSync(MESSAGES_PATH, 'utf8'));
            if (!data[guildId]) data[guildId] = {};

            data[guildId][messageId] = {
                type,
                channelId,
                config,
                trackedAt: new Date().toISOString()
            };

            fs.writeFileSync(MESSAGES_PATH, JSON.stringify(data, null, 2), 'utf8');
            Logger.success(`Śledzę wiadomość ${messageId} typu ${type}`);
            return true;
        } catch (error) {
            Logger.error('Błąd podczas śledzenia wiadomości', error);
            return false;
        }
    }

    getMessage(guildId, messageId) {
        try {
            const data = JSON.parse(fs.readFileSync(MESSAGES_PATH, 'utf8'));
            return data[guildId]?.[messageId] || null;
        } catch (error) {
            Logger.error('Błąd podczas odczytywania wiadomości', error);
            return null;
        }
    }

    updateMessage(guildId, messageId, newConfig) {
        try {
            const data = JSON.parse(fs.readFileSync(MESSAGES_PATH, 'utf8'));
            if (data[guildId]?.[messageId]) {
                data[guildId][messageId].config = { ...data[guildId][messageId].config, ...newConfig };
                data[guildId][messageId].updatedAt = new Date().toISOString();
                fs.writeFileSync(MESSAGES_PATH, JSON.stringify(data, null, 2), 'utf8');
                Logger.success(`Zaktualizowano konfigurację wiadomości ${messageId}`);
                return true;
            }
            return false;
        } catch (error) {
            Logger.error('Błąd podczas aktualizacji wiadomości', error);
            return false;
        }
    }

    untrackMessage(guildId, messageId) {
        try {
            const data = JSON.parse(fs.readFileSync(MESSAGES_PATH, 'utf8'));
            if (data[guildId]?.[messageId]) {
                delete data[guildId][messageId];
                fs.writeFileSync(MESSAGES_PATH, JSON.stringify(data, null, 2), 'utf8');
                return true;
            }
            return false;
        } catch (error) {
            Logger.error('Błąd podczas usuwania śledzenia', error);
            return false;
        }
    }

    getAllMessages(guildId) {
        try {
            const data = JSON.parse(fs.readFileSync(MESSAGES_PATH, 'utf8'));
            return data[guildId] || {};
        } catch (error) {
            return {};
        }
    }
}

export default new MessagesDB();
