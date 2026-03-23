import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RULES_CONFIG_PATH = path.join(__dirname, '..', '..', 'rules_config.json');

class RulesDB {
    constructor() {
        this.initDatabase();
    }

    initDatabase() {
        if (!fs.existsSync(RULES_CONFIG_PATH)) {
            fs.writeFileSync(RULES_CONFIG_PATH, JSON.stringify({}, null, 2), 'utf8');
            Logger.info('Utworzono plik konfiguracji regulaminu');
        }
    }

    getConfig(guildId) {
        try {
            const data = JSON.parse(fs.readFileSync(RULES_CONFIG_PATH, 'utf8'));
            return data[guildId] || null;
        } catch (error) {
            Logger.error('Błąd podczas odczytywania konfiguracji regulaminu', error);
            return null;
        }
    }

    setConfig(guildId, channelId, roleId, rulesText) {
        try {
            const data = JSON.parse(fs.readFileSync(RULES_CONFIG_PATH, 'utf8'));
            data[guildId] = {
                channelId,
                roleId,
                rulesText,
                createdAt: new Date().toISOString()
            };
            fs.writeFileSync(RULES_CONFIG_PATH, JSON.stringify(data, null, 2), 'utf8');
            Logger.success(`Zapisano konfigurację regulaminu dla serwera ${guildId}`);
            return true;
        } catch (error) {
            Logger.error('Błąd podczas zapisywania konfiguracji regulaminu', error);
            return false;
        }
    }
}

export default new RulesDB();
