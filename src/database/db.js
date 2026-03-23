import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', '..', 'verification_config.json');

class Database {
    constructor() {
        this.initDatabase();
    }

    initDatabase() {
        if (!fs.existsSync(DB_PATH)) {
            fs.writeFileSync(DB_PATH, JSON.stringify({}), 'utf8');
            Logger.info('Utworzono nowy plik konfiguracji weryfikacji');
        }
    }

    saveVerificationChannel(guildId, channelId, roleId, messageId) {
        try {
            const data = this.loadData();
            data[guildId] = {
                channelId,
                roleId,
                messageId,
                createdAt: new Date().toISOString()
            };
            fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
            Logger.success(`Zapisano konfigurację weryfikacji dla serwera ${guildId}`);
            return true;
        } catch (error) {
            Logger.error('Błąd podczas zapisywania konfiguracji weryfikacji', error);
            return false;
        }
    }

    getVerificationChannel(guildId) {
        try {
            const data = this.loadData();
            return data[guildId] || null;
        } catch (error) {
            Logger.error('Błąd podczas odczytywania konfiguracji weryfikacji', error);
            return null;
        }
    }

    getVerificationByMessage(messageId) {
        try {
            const data = this.loadData();
            for (const [guildId, config] of Object.entries(data)) {
                if (config.messageId === messageId) {
                    return { guildId, ...config };
                }
            }
            return null;
        } catch (error) {
            Logger.error('Błąd podczas wyszukiwania konfiguracji po ID wiadomości', error);
            return null;
        }
    }

    loadData() {
        try {
            const content = fs.readFileSync(DB_PATH, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            Logger.error('Błąd podczas odczytywania bazy danych', error);
            return {};
        }
    }
}

export default new Database();
