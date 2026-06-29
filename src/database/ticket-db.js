import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TICKETS_PATH = path.join(__dirname, '..', '..', 'tickets.json');
const TICKET_CONFIG_PATH = path.join(__dirname, '..', '..', 'ticket_config.json');

class TicketDatabase {
    constructor() {
        this.initDatabase();
    }

    initDatabase() {
        if (!fs.existsSync(TICKETS_PATH)) {
            fs.writeFileSync(TICKETS_PATH, JSON.stringify({}, null, 2), 'utf8');
            Logger.info('Utworzono plik bazy danych ticketów');
        }
        if (!fs.existsSync(TICKET_CONFIG_PATH)) {
            fs.writeFileSync(TICKET_CONFIG_PATH, JSON.stringify({}, null, 2), 'utf8');
            Logger.info('Utworzono plik konfiguracji ticketów');
        }
    }

    getTickets(guildId) {
        try {
            const data = JSON.parse(fs.readFileSync(TICKETS_PATH, 'utf8'));
            return data[guildId] || {};
        } catch (error) {
            Logger.error('Błąd podczas odczytywania ticketów', error);
            return {};
        }
    }

    getTicket(guildId, channelId) {
        const tickets = this.getTickets(guildId);
        return tickets[channelId] || null;
    }

    createTicket(guildId, channelId, userId, category) {
        try {
            const data = JSON.parse(fs.readFileSync(TICKETS_PATH, 'utf8'));
            if (!data[guildId]) data[guildId] = {};

            data[guildId][channelId] = {
                userId,
                category,
                createdAt: new Date().toISOString(),
                status: 'open'
            };

            fs.writeFileSync(TICKETS_PATH, JSON.stringify(data, null, 2), 'utf8');
            Logger.success(`Utworzono ticket dla ${userId} w kanale ${channelId}`);
            return true;
        } catch (error) {
            Logger.error('Błąd podczas tworzenia ticketa', error);
            return false;
        }
    }

    closeTicket(guildId, channelId) {
        try {
            const data = JSON.parse(fs.readFileSync(TICKETS_PATH, 'utf8'));
            if (data[guildId] && data[guildId][channelId]) {
                data[guildId][channelId].status = 'closed';
                data[guildId][channelId].closedAt = new Date().toISOString();
                fs.writeFileSync(TICKETS_PATH, JSON.stringify(data, null, 2), 'utf8');
                Logger.success(`Zamknięto ticket w kanale ${channelId}`);
                return true;
            }
            return false;
        } catch (error) {
            Logger.error('Błąd podczas zamykania ticketa', error);
            return false;
        }
    }

    deleteTicket(guildId, channelId) {
        try {
            const data = JSON.parse(fs.readFileSync(TICKETS_PATH, 'utf8'));
            if (data[guildId] && data[guildId][channelId]) {
                delete data[guildId][channelId];
                fs.writeFileSync(TICKETS_PATH, JSON.stringify(data, null, 2), 'utf8');
                return true;
            }
            return false;
        } catch (error) {
            Logger.error('Błąd podczas usuwania ticketa z bazy', error);
            return false;
        }
    }

    // Category management
    getCategories(guildId) {
        try {
            const data = JSON.parse(fs.readFileSync(TICKET_CONFIG_PATH, 'utf8'));
            return data[guildId] || this.getDefaultCategories();
        } catch (error) {
            Logger.error('Błąd podczas odczytywania kategorii ticketów', error);
            return this.getDefaultCategories();
        }
    }

    getDefaultCategories() {
        return [
            { id: 'bug', name: 'Błąd', emoji: '🐛' },
            { id: 'alliance', name: 'Sojusz', emoji: '🤝' },
            { id: 'dolaczenie', name: 'Dołączenie do klanu', emoji: '⚔️' }
        ];
    }

    addCategory(guildId, id, name, emoji) {
        try {
            const data = JSON.parse(fs.readFileSync(TICKET_CONFIG_PATH, 'utf8'));
            if (!data[guildId]) data[guildId] = this.getDefaultCategories();

            // Check if category exists
            if (data[guildId].some(c => c.id === id)) {
                return { success: false, error: 'Kategoria o tym ID już istnieje!' };
            }

            data[guildId].push({ id, name, emoji });
            fs.writeFileSync(TICKET_CONFIG_PATH, JSON.stringify(data, null, 2), 'utf8');
            Logger.success(`Dodano kategorię ${name} dla serwera ${guildId}`);
            return { success: true };
        } catch (error) {
            Logger.error('Błąd podczas dodawania kategorii', error);
            return { success: false, error: 'Błąd zapisu' };
        }
    }

    removeCategory(guildId, id) {
        try {
            const data = JSON.parse(fs.readFileSync(TICKET_CONFIG_PATH, 'utf8'));
            if (!data[guildId]) return { success: false, error: 'Brak kategorii' };

            const index = data[guildId].findIndex(c => c.id === id);
            if (index === -1) {
                return { success: false, error: 'Nie znaleziono kategorii' };
            }

            data[guildId].splice(index, 1);
            fs.writeFileSync(TICKET_CONFIG_PATH, JSON.stringify(data, null, 2), 'utf8');
            Logger.success(`Usunięto kategorię ${id} dla serwera ${guildId}`);
            return { success: true };
        } catch (error) {
            Logger.error('Błąd podczas usuwania kategorii', error);
            return { success: false, error: 'Błąd zapisu' };
        }
    }

    resetCategories(guildId) {
        try {
            const data = JSON.parse(fs.readFileSync(TICKET_CONFIG_PATH, 'utf8'));
            delete data[guildId];
            fs.writeFileSync(TICKET_CONFIG_PATH, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (error) {
            Logger.error('Błąd podczas resetowania kategorii', error);
            return false;
        }
    }
}

export default new TicketDatabase();
