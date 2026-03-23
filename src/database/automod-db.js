import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTOMOD_CONFIG_PATH = path.join(__dirname, '..', '..', 'automod_config.json');
const WARNINGS_PATH = path.join(__dirname, '..', '..', 'warnings.json');

class AutomodDatabase {
    constructor() {
        this.initDatabases();
    }

    initDatabases() {
        // Initialize automod config
        if (!fs.existsSync(AUTOMOD_CONFIG_PATH)) {
            fs.writeFileSync(AUTOMOD_CONFIG_PATH, JSON.stringify({}, null, 2), 'utf8');
            Logger.info('Utworzono plik konfiguracji automod');
        }

        // Initialize warnings
        if (!fs.existsSync(WARNINGS_PATH)) {
            fs.writeFileSync(WARNINGS_PATH, JSON.stringify({}, null, 2), 'utf8');
            Logger.info('Utworzono plik warnings');
        }
    }

    // ========== CONFIG METHODS ==========

    getConfig(guildId) {
        try {
            const data = JSON.parse(fs.readFileSync(AUTOMOD_CONFIG_PATH, 'utf8'));
            return data[guildId] || null;
        } catch (error) {
            Logger.error('Błąd podczas odczytywania konfiguracji automod', error);
            return null;
        }
    }

    saveConfig(guildId, config) {
        try {
            const data = JSON.parse(fs.readFileSync(AUTOMOD_CONFIG_PATH, 'utf8'));
            data[guildId] = config;
            fs.writeFileSync(AUTOMOD_CONFIG_PATH, JSON.stringify(data, null, 2), 'utf8');
            Logger.success(`Zapisano konfigurację automod dla serwera ${guildId}`);
            return true;
        } catch (error) {
            Logger.error('Błąd podczas zapisywania konfiguracji automod', error);
            return false;
        }
    }

    createDefaultConfig(guildId) {
        const defaultConfig = {
            enabled: true,
            bypassRoleId: null,
            warningsThreshold: 3,
            filters: {
                youtube: {
                    action: 'warn',
                    duration: null
                },
                discord_invites: {
                    action: 'warn',
                    duration: null
                },
                all_links: {
                    action: 'off',
                    duration: null
                },
                profanity: {
                    action: 'warn',
                    duration: null
                }
            }
        };

        return this.saveConfig(guildId, defaultConfig);
    }

    // ========== WARNINGS METHODS ==========

    getWarnings(guildId, userId) {
        try {
            const data = JSON.parse(fs.readFileSync(WARNINGS_PATH, 'utf8'));
            if (!data[guildId]) return null;
            return data[guildId][userId] || null;
        } catch (error) {
            Logger.error('Błąd podczas odczytywania ostrzeżeń', error);
            return null;
        }
    }

    getAllWarnings(guildId) {
        try {
            const data = JSON.parse(fs.readFileSync(WARNINGS_PATH, 'utf8'));
            return data[guildId] || {};
        } catch (error) {
            Logger.error('Błąd podczas odczytywania wszystkich ostrzeżeń', error);
            return {};
        }
    }

    addWarning(guildId, userId, reason, messageContent = '') {
        try {
            const data = JSON.parse(fs.readFileSync(WARNINGS_PATH, 'utf8'));

            if (!data[guildId]) data[guildId] = {};
            if (!data[guildId][userId]) {
                data[guildId][userId] = {
                    count: 0,
                    warnings: [],
                    lastWarning: null
                };
            }

            data[guildId][userId].count++;
            data[guildId][userId].warnings.push({
                reason,
                messageContent: messageContent.substring(0, 100), // Limit to 100 chars
                timestamp: new Date().toISOString()
            });
            data[guildId][userId].lastWarning = new Date().toISOString();

            fs.writeFileSync(WARNINGS_PATH, JSON.stringify(data, null, 2), 'utf8');
            Logger.info(`Dodano ostrzeżenie dla ${userId} na serwerze ${guildId} (${data[guildId][userId].count} total)`);

            return data[guildId][userId].count;
        } catch (error) {
            Logger.error('Błąd podczas dodawania ostrzeżenia', error);
            return 0;
        }
    }

    clearWarnings(guildId, userId) {
        try {
            const data = JSON.parse(fs.readFileSync(WARNINGS_PATH, 'utf8'));

            if (data[guildId] && data[guildId][userId]) {
                delete data[guildId][userId];
                fs.writeFileSync(WARNINGS_PATH, JSON.stringify(data, null, 2), 'utf8');
                Logger.success(`Wyczyszczono ostrzeżenia dla ${userId} na serwerze ${guildId}`);
                return true;
            }

            return false;
        } catch (error) {
            Logger.error('Błąd podczas czyszczenia ostrzeżeń', error);
            return false;
        }
    }
}

export default new AutomodDatabase();
