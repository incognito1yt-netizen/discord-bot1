import automodDB from '../database/automod-db.js';
import { detectLinks, shouldBypass, executeAction, sendDM, createActionEmbed } from '../utils/automod.js';
import { containsProfanity } from '../utils/profanity-filter.js';
import pingProtectionDB from '../database/ping-protection-db.js';
import Logger from '../utils/logger.js';

export default {
    name: 'messageCreate',
    async execute(message) {
        // Ignore bots
        if (message.author.bot) return;

        // Ignore DMs
        if (!message.guild) return;

        // Check ping protection FIRST (before anything else)
        if (message.mentions.users.size > 0) {
            const protectedUsers = pingProtectionDB.getProtectedUsers(message.guild.id);
            const mentionedProtected = message.mentions.users.find(user => protectedUsers.includes(user.id));

            if (mentionedProtected) {
                // Someone pinged a protected user!
                Logger.warn(`[PING PROTECTION] ${message.author.tag} zpingował chronionego użytkownika ${mentionedProtected.tag}`);

                try {
                    await message.delete();
                    Logger.info(`Usunięto wiadomość od ${message.author.tag} (ping protection)`);
                } catch (error) {
                    Logger.error(`Nie udało się usunąć wiadomości od ${message.author.tag}`, error);
                    return;
                }

                // Mute for 15 minutes
                try {
                    await message.member.timeout(15 * 60 * 1000, `Pingowanie chronionego użytkownika: ${mentionedProtected.tag}`);
                    Logger.success(`Wyciszono ${message.author.tag} na 15 minut (ping protection)`);

                    // Send DM
                    try {
                        await message.author.send(
                            `🛡️ **Ochrona przed Pingami**\n\n` +
                            `Zpingowałeś chronionego użytkownika ${mentionedProtected.tag} na serwerze **${message.guild.name}**.\n\n` +
                            `⏰ Zostałeś wyciszony na **15 minut**.\n\n` +
                            `❗ Nie pinguj użytkowników z włączoną ochroną!`
                        );
                    } catch (err) {
                        // User has DMs disabled
                    }
                } catch (error) {
                    Logger.error(`Nie udało się wyciszyć ${message.author.tag}`, error);
                }

                return; // Stop processing after ping protection
            }
        }

        const guildId = message.guild.id;
        const config = automodDB.getConfig(guildId);

        // If automod is not enabled for this guild, ignore
        if (!config || !config.enabled) {
            return;
        }

        Logger.info(`[AUTOMOD] Sprawdzam wiadomość od ${message.author.tag}: "${message.content.substring(0, 50)}..."`);

        // Check if user has bypass role
        if (shouldBypass(message.member, config)) {
            return;
        }

        // Check for profanity
        const profanityCheck = containsProfanity(message.content);
        if (profanityCheck.found) {
            const filter = config.filters.profanity;
            if (filter && filter.action !== 'off') {
                Logger.warn(`[AUTOMOD] WYKRYTO WULGARYZM (${profanityCheck.language}): "${profanityCheck.word}" od ${message.author.tag}`);

                try {
                    await message.delete();
                    Logger.info(`Usunięto wiadomość od ${message.author.tag} (wulgaryzm)`);
                } catch (error) {
                    Logger.error(`Nie udało się usunąć wiadomości od ${message.author.tag}`, error);
                    return;
                }

                await handleAutomodAction(message, 'profanity', filter, config);
                return; // Stop processing after profanity
            }
        }

        // Detect links in message
        const detected = detectLinks(message.content);

        // Check each filter type
        for (const [filterType, isDetected] of Object.entries(detected)) {
            if (!isDetected) continue;

            const filter = config.filters[filterType];
            if (!filter || filter.action === 'off') {
                Logger.info(`[AUTOMOD] Wykryto ${filterType}, ale filtr jest wyłączony`);
                continue;
            }

            Logger.warn(`[AUTOMOD] WYKRYTO NARUSZENIE: ${filterType} od ${message.author.tag}, akcja: ${filter.action}`);

            // Delete the message immediately
            try {
                await message.delete();
                Logger.info(`Usunięto wiadomość od ${message.author.tag} (wykryto: ${filterType})`);
            } catch (error) {
                Logger.error(`Nie udało się usunąć wiadomości od ${message.author.tag}`, error);
                return;
            }

            // Handle the action
            await handleAutomodAction(message, filterType, filter, config);

            // Only process the first detected filter type
            break;
        }
    },
};

async function handleAutomodAction(message, filterType, filter, config) {
    const { action, duration } = filter;
    const member = message.member;
    const guild = message.guild;

    const filterNames = {
        youtube: 'Link YouTube',
        discord_invites: 'Zaproszenie Discord',
        all_links: 'Link',
        profanity: 'Wulgaryzmy'
    };

    const reason = `Automod: ${filterNames[filterType]}`;

    if (action === 'warn') {
        // Add warning
        const warningCount = automodDB.addWarning(
            guild.id,
            member.user.id,
            filterType,
            message.content
        );

        // Send DM
        await sendDM(
            member.user,
            `⚠️ **Ostrzeżenie** na serwerze **${guild.name}**\n\n` +
            `Powód: ${filterNames[filterType]}\n` +
            `Ostrzeżenia: ${warningCount}/${config.warningsThreshold}\n\n` +
            `${warningCount >= config.warningsThreshold ? '🚫 **Osiągnięto limit ostrzeżeń!**' : ''}`
        );

        Logger.info(`Dodano ostrzeżenie dla ${member.user.tag} na serwerze ${guild.name} (${warningCount} total)`);

        // Check if threshold reached
        if (warningCount >= config.warningsThreshold) {
            Logger.warn(`${member.user.tag} osiągnął limit ostrzeżeń (${warningCount}/${config.warningsThreshold})`);

            // Auto-ban
            try {
                await member.ban({ reason: 'Przekroczono limit ostrzeżeń', deleteMessageSeconds: 7 * 24 * 60 * 60 });
                Logger.success(`Zbanowano ${member.user.tag} na 7d (Przekroczono limit ostrzeżeń)`);

                // Schedule unban after 7 days
                setTimeout(async () => {
                    try {
                        await guild.members.unban(member.user.id, 'Automatyczny unban po 7 dniach');
                        Logger.info(`Automatycznie odbanowano ${member.user.tag}`);
                    } catch (err) {
                        Logger.error(`Nie udało się automatycznie odbanować ${member.user.tag}`, err);
                    }
                }, 7 * 24 * 60 * 60 * 1000);

                // Send log
                await sendLogMessage(guild, member.user, 'Ban (auto)', 'Przekroczono limit ostrzeżeń');
            } catch (error) {
                Logger.error(`Nie udało się automatycznie zbanować ${member.user.tag}`, error);
            }
        } else {
            // Send log for warning
            await sendLogMessage(guild, member.user, 'Ostrzeżenie', `${filterNames[filterType]} (${warningCount}/${config.warningsThreshold})`);
        }
    } else {
        // Execute immediate action (mute/kick/ban)
        const result = await executeAction(member, action, duration, reason);

        if (result.success) {
            // Send DM
            let dmMessage = '';
            if (action === 'mute') {
                dmMessage = `🔇 **Zostałeś wyciszony** na serwerze **${guild.name}**`;
            } else if (action === 'kick') {
                dmMessage = `👢 **Zostałeś wyrzucony** z serwera **${guild.name}**`;
            } else if (action === 'ban') {
                dmMessage = `🔨 **Zostałeś zbanowany** na serwerze **${guild.name}**`;
            }

            dmMessage += `\n\nPowód: ${filterNames[filterType]}`;
            if (duration) {
                dmMessage += `\nCzas: ${result.durationText}`;
            }

            await sendDM(member.user, dmMessage);

            // Send log
            await sendLogMessage(guild, member.user, action.toUpperCase(), `${filterNames[filterType]}${duration ? ` (${result.durationText})` : ''}`);
        }
    }
}

async function sendLogMessage(guild, user, action, reason) {
    const logChannel = await getLogChannel(guild);
    if (!logChannel) return;

    const embed = createActionEmbed(user, action, reason);

    try {
        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        Logger.error('Nie udało się wysłać logu na kanał', error);
    }
}

async function getLogChannel(guild) {
    // Check if custom log channel is configured
    const config = automodDB.getConfig(guild.id);
    if (config && config.logChannelId) {
        const customChannel = guild.channels.cache.get(config.logChannelId);
        if (customChannel && customChannel.isTextBased()) {
            return customChannel;
        }
    }

    // Try to find a channel named "logs", "mod-logs", or similar
    const logChannelNames = ['logs', 'mod-logs', 'automod-logs', 'modlogs'];

    for (const name of logChannelNames) {
        const channel = guild.channels.cache.find(ch =>
            ch.name.toLowerCase() === name && ch.isTextBased()
        );
        if (channel) return channel;
    }

    // Default to system channel or first text channel
    return guild.systemChannel || guild.channels.cache.find(ch => ch.isTextBased());
}
