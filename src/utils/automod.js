import Logger from './logger.js';

// Regex patterns for link detection
const PATTERNS = {
    youtube: /(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)/i,
    discord_invites: /(discord\.gg\/|discord\.com\/invite\/|discordapp\.com\/invite\/)/i,
    all_links: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/i
};

export function detectLinks(messageContent) {
    const detected = {
        youtube: false,
        discord_invites: false,
        all_links: false
    };

    const youtubeMatch = PATTERNS.youtube.test(messageContent);
    const discordMatch = PATTERNS.discord_invites.test(messageContent);
    const linkMatch = PATTERNS.all_links.test(messageContent);

    if (youtubeMatch) {
        detected.youtube = true;
        Logger.info(`[AUTOMOD] Wykryto link YouTube: ${messageContent.substring(0, 50)}`);
    }

    if (discordMatch) {
        detected.discord_invites = true;
        Logger.info(`[AUTOMOD] Wykryto zaproszenie Discord: ${messageContent.substring(0, 50)}`);
    }

    if (linkMatch) {
        detected.all_links = true;
        Logger.info(`[AUTOMOD] Wykryto link: ${messageContent.substring(0, 50)}`);
    }

    return detected;
}

export function shouldBypass(member, config) {
    if (!config || !config.bypassRoleId) return false;
    const hasBypass = member.roles.cache.has(config.bypassRoleId);
    if (hasBypass) {
        Logger.info(`[AUTOMOD] Użytkownik ${member.user.tag} ma rolę bypass`);
    }
    return hasBypass;
}

async function checkCanModerate(member) {
    const guild = member.guild;

    // Nie można karać właściciela serwera
    if (member.id === guild.ownerId) {
        Logger.warn(`[AUTOMOD] Nie można wykonać akcji na właścicielu serwera (${member.user.tag})`);
        return { canModerate: false, reason: 'owner' };
    }

    // Pobierz bota jako member
    const botMember = await guild.members.fetchMe();

    // Sprawdź hierarchię ról
    if (member.roles.highest.position >= botMember.roles.highest.position) {
        Logger.warn(
            `[AUTOMOD] Nie można wykonać akcji na ${member.user.tag} — ` +
            `jego rola "${member.roles.highest.name}" (poz. ${member.roles.highest.position}) ` +
            `jest równa lub wyższa niż rola bota "${botMember.roles.highest.name}" (poz. ${botMember.roles.highest.position}). ` +
            `Przesuń rolę bota wyżej w Ustawienia serwera → Role.`
        );
        return { canModerate: false, reason: 'hierarchy' };
    }

    return { canModerate: true };
}

export async function executeAction(member, action, duration, reason) {
    const guild = member.guild;

    try {
        switch (action) {
            case 'warn':
                return { success: true, action: 'warn' };

            case 'mute': {
                const { canModerate, reason: blockReason } = await checkCanModerate(member);
                if (!canModerate) {
                    const msg = blockReason === 'hierarchy'
                        ? `Rola bota jest za nisko — przesuń ją powyżej roli gracza w ustawieniach serwera.`
                        : `Nie można wyciszyć właściciela serwera.`;
                    return { success: false, error: msg };
                }

                const muteDuration = parseDuration(duration);
                await member.timeout(muteDuration, reason);
                Logger.success(`Wyciszono ${member.user.tag} na ${duration} (${reason})`);
                return { success: true, action: 'mute', duration, durationText: formatDuration(duration) };
            }

            case 'kick': {
                const { canModerate, reason: blockReason } = await checkCanModerate(member);
                if (!canModerate) {
                    const msg = blockReason === 'hierarchy'
                        ? `Rola bota jest za nisko — przesuń ją powyżej roli gracza w ustawieniach serwera.`
                        : `Nie można wyrzucić właściciela serwera.`;
                    return { success: false, error: msg };
                }

                await member.kick(reason);
                Logger.success(`Wyrzucono ${member.user.tag} (${reason})`);
                return { success: true, action: 'kick' };
            }

            case 'ban': {
                const { canModerate, reason: blockReason } = await checkCanModerate(member);
                if (!canModerate) {
                    const msg = blockReason === 'hierarchy'
                        ? `Rola bota jest za nisko — przesuń ją powyżej roli gracza w ustawieniach serwera.`
                        : `Nie można zbanować właściciela serwera.`;
                    return { success: false, error: msg };
                }

                if (duration === 'permanent') {
                    await guild.members.ban(member.user, { reason });
                    Logger.success(`Zbanowano permanentnie ${member.user.tag} (${reason})`);
                    return { success: true, action: 'ban', duration: 'permanent' };
                } else {
                    await guild.members.ban(member.user, { reason });
                    Logger.success(`Zbanowano ${member.user.tag} na ${duration} (${reason})`);

                    const banDuration = parseDuration(duration);
                    setTimeout(async () => {
                        try {
                            await guild.members.unban(member.user, 'Automatyczny unban - czas kary minął');
                            Logger.info(`Automatycznie odbanowano ${member.user.tag}`);
                        } catch (err) {
                            Logger.error(`Nie udało się odbanować ${member.user.tag}`, err);
                        }
                    }, banDuration);

                    return { success: true, action: 'ban', duration, durationText: formatDuration(duration) };
                }
            }

            case 'off':
                return { success: false, action: 'off' };

            default:
                Logger.warn(`Nieznana akcja: ${action}`);
                return { success: false, action: 'unknown' };
        }
    } catch (error) {
        // Czytelna informacja dla błędu braku uprawnień
        if (error.code === 50013) {
            Logger.error(
                `[AUTOMOD] Brak uprawnień do wykonania akcji "${action}" na ${member.user.tag}. ` +
                `Sprawdź hierarchię ról bota w ustawieniach serwera.`,
                error
            );
            return { success: false, error: 'Brak uprawnień — sprawdź hierarchię ról bota.' };
        }

        Logger.error(`Błąd podczas wykonywania akcji ${action} na ${member.user.tag}`, error);
        return { success: false, error: error.message };
    }
}

export function parseDuration(durationStr) {
    if (!durationStr || durationStr === 'permanent') return null;

    const units = {
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000
    };

    const match = durationStr.match(/^(\d+)([hd])$/);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2];

    return value * units[unit];
}

export function formatDuration(durationStr) {
    if (durationStr === 'permanent') return 'Permanent';

    const match = durationStr.match(/^(\d+)([hd])$/);
    if (!match) return durationStr;

    const value = match[1];
    const unit = match[2];

    const units = {
        h: 'godzin',
        d: 'dni'
    };

    return `${value} ${units[unit] || unit}`;
}

export async function sendDM(user, message) {
    try {
        await user.send(message);
        return true;
    } catch (error) {
        Logger.warn(`Nie można wysłać DM do ${user.tag}: ${error.message}`);
        return false;
    }
}

export function createActionEmbed(user, action, reason) {
    const actionEmojis = {
        warn: '⚠️',
        mute: '🔇',
        kick: '👢',
        ban: '🔨',
        Ostrzeżenie: '⚠️',
        MUTE: '🔇',
        KICK: '👢',
        BAN: '🔨'
    };

    const actionNames = {
        warn: 'Ostrzeżenie',
        mute: 'Wyciszenie',
        kick: 'Wyrzucenie',
        ban: 'Ban'
    };

    const displayAction = actionNames[action?.toLowerCase()] || action || 'Nieznana akcja';
    const emoji = actionEmojis[action?.toLowerCase()] || actionEmojis[action] || '📝';

    return {
        color: action?.toLowerCase() === 'warn' || action === 'Ostrzeżenie' ? 0xffaa00 : 0xff0000,
        title: `${emoji} ${displayAction}`,
        fields: [
            { name: 'Użytkownik', value: `${user.tag} (${user.id})` || 'Nieznany', inline: true },
            { name: 'Akcja', value: displayAction, inline: true },
            { name: 'Powód', value: reason || 'Nie podano powodu', inline: false }
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'System Automoderacji' }
    };
}
