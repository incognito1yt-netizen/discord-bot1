import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WELCOME_CONFIG_PATH = path.join(__dirname, '..', '..', 'welcome_config.json');

class WelcomeDatabase {
    constructor() {
        this.initDatabase();
    }

    initDatabase() {
        if (!fs.existsSync(WELCOME_CONFIG_PATH)) {
            fs.writeFileSync(WELCOME_CONFIG_PATH, JSON.stringify({}, null, 2), 'utf8');
            Logger.info('Utworzono plik konfiguracji welcome');
        }
    }

    getConfig(guildId) {
        try {
            const data = JSON.parse(fs.readFileSync(WELCOME_CONFIG_PATH, 'utf8'));
            return data[guildId] || null;
        } catch (error) {
            Logger.error('Błąd podczas odczytywania welcome config', error);
            return null;
        }
    }

    saveConfig(guildId, config) {
        try {
            const data = JSON.parse(fs.readFileSync(WELCOME_CONFIG_PATH, 'utf8'));
            data[guildId] = config;
            fs.writeFileSync(WELCOME_CONFIG_PATH, JSON.stringify(data, null, 2), 'utf8');
            Logger.success(`Zapisano konfigurację welcome dla ${guildId}`);
            return true;
        } catch (error) {
            Logger.error('Błąd podczas zapisywania welcome config', error);
            return false;
        }
    }

    createDefaultConfig(guildId, channelId) {
        return {
            enabled: true,
            channelId,
            message: 'Witaj {user} na **{server}**! 🎉\nJesteś {memberCount}. członkiem!',
            useEmbed: true,
            embedColor: '#00ff00'
        };
    }
}

export default new WelcomeDatabase();
