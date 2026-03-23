import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PING_PROTECTION_PATH = path.join(__dirname, '..', '..', 'ping_protection.json');

class PingProtectionDB {
    constructor() {
        this.initDatabase();
    }

    initDatabase() {
        if (!fs.existsSync(PING_PROTECTION_PATH)) {
            fs.writeFileSync(PING_PROTECTION_PATH, JSON.stringify({}, null, 2), 'utf8');
            Logger.info('Utworzono plik bazy danych ping protection');
        }
    }

    getProtectedUsers(guildId) {
        try {
            const data = JSON.parse(fs.readFileSync(PING_PROTECTION_PATH, 'utf8'));
            return data[guildId] || [];
        } catch (error) {
            Logger.error('Błąd podczas odczytywania ping protection', error);
            return [];
        }
    }

    isProtected(guildId, userId) {
        const protectedUsers = this.getProtectedUsers(guildId);
        return protectedUsers.includes(userId);
    }

    toggleProtection(guildId, userId) {
        try {
            const data = JSON.parse(fs.readFileSync(PING_PROTECTION_PATH, 'utf8'));
            if (!data[guildId]) data[guildId] = [];

            const index = data[guildId].indexOf(userId);
            let enabled = false;

            if (index === -1) {
                // Add protection
                data[guildId].push(userId);
                enabled = true;
            } else {
                // Remove protection
                data[guildId].splice(index, 1);
                enabled = false;
            }

            fs.writeFileSync(PING_PROTECTION_PATH, JSON.stringify(data, null, 2), 'utf8');
            Logger.success(`${enabled ? 'Włączono' : 'Wyłączono'} ping protection dla ${userId} na ${guildId}`);
            return { success: true, enabled };
        } catch (error) {
            Logger.error('Błąd podczas zmiany ping protection', error);
            return { success: false, enabled: false };
        }
    }
}

export default new PingProtectionDB();
