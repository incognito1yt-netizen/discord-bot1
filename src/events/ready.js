import Logger from '../utils/logger.js';
import database from '../database/db.js';
import { startStatsUpdater } from '../utils/stats-updater.js';

export default {
    name: 'ready',
    once: true,
    execute(client) {
        Logger.success(`Bot zalogowany jako ${client.user.tag}`);
        Logger.info(`Gotowy do pracy na ${client.guilds.cache.size} serwerach`);

        // Set bot status
        client.user.setPresence({
            activities: [{ name: 'zarządzanie serwerem', type: 3 }], // Type 3 = Watching
            status: 'online',
        });

        // Initialize database
        database.initDatabase();
        Logger.info('Baza danych zainicjalizowana');

        // Start stats channels updater
        startStatsUpdater(client);
    },
};
