import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import automodDB from '../database/automod-db.js';
import { formatDuration } from '../utils/automod.js';
import Logger from '../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('System automoderacji')
        .addSubcommand(sub =>
            sub.setName('setup')
                .setDescription('Zainicjalizuj system automoderacji'))
        .addSubcommand(sub =>
            sub.setName('config')
                .setDescription('Konfiguruj filtry')
                .addStringOption(opt => opt.setName('filter').setDescription('Typ filtra').setRequired(true)
                    .addChoices(
                        { name: 'YouTube', value: 'youtube' },
                        { name: 'Discord Invites', value: 'discord_invites' },
                        { name: 'Wszystkie Linki', value: 'all_links' },
                        { name: 'Wulgaryzmy', value: 'profanity' }
                    ))
                .addStringOption(opt => opt.setName('action').setDescription('Akcja').setRequired(true)
                    .addChoices(
                        { name: 'Off', value: 'off' },
                        { name: 'Warn (Ostrzeżenie)', value: 'warn' },
                        { name: 'Mute (Wyciszenie)', value: 'mute' },
                        { name: 'Kick (Wyrzucenie)', value: 'kick' },
                        { name: 'Ban', value: 'ban' }
                    ))
                .addStringOption(opt => opt.setName('duration').setDescription('Czas kary (dla mute/ban)')
                    .addChoices(
                        { name: '1 godzina', value: '1h' },
                        { name: '6 godzin', value: '6h' },
                        { name: '12 godzin', value: '12h' },
                        { name: '1 dzień', value: '1d' },
                        { name: '3 dni', value: '3d' },
                        { name: '7 dni', value: '7d' },
                        { name: '14 dni', value: '14d' },
                        { name: '30 dni', value: '30d' },
                        { name: 'Permanent', value: 'permanent' }
                    )))
        .addSubcommand(sub =>
            sub.setName('bypass')
                .setDescription('Ustaw rolę która może wysyłać linki')
                .addRoleOption(opt => opt.setName('role').setDescription('Rola bypass').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('warnings')
                .setDescription('Zarządzaj ostrzeżeniami')
                .addStringOption(opt => opt.setName('action').setDescription('Akcja').setRequired(true)
                    .addChoices(
                        { name: 'Ustaw threshold (limit)', value: 'set' },
                        { name: 'Zobacz ostrzeżenia', value: 'view' },
                        { name: 'Wyczyść ostrzeżenia', value: 'clear' },
                        { name: 'Lista użytkowników', value: 'list' }
                    ))
                .addUserOption(opt => opt.setName('user').setDescription('Użytkownik'))
                .addIntegerOption(opt => opt.setName('count').setDescription('Liczba ostrzeżeń').setMinValue(1).setMaxValue(10)))
        .addSubcommand(sub =>
            sub.setName('status')
                .setDescription('Pokaż aktualną konfigurację automoderacji'))
        .addSubcommand(sub =>
            sub.setName('disable')
                .setDescription('Wyłącz automoderację'))
        .addSubcommand(sub =>
            sub.setName('resetconfig')
                .setDescription('Zresetuj konfigurację do domyślnych ustawień'))
        .addSubcommand(sub =>
            sub.setName('logchannel')
                .setDescription('Ustaw kanał dla logów automoderacji')
                .addChannelOption(opt => opt.setName('channel').setDescription('Kanał logów').setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // Check admin permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({
                content: '❌ Nie masz uprawnień do użycia tej komendy! Wymagane: **ADMINISTRATOR**',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'setup':
                await handleSetup(interaction);
                break;
            case 'config':
                await handleConfig(interaction);
                break;
            case 'bypass':
                await handleBypass(interaction);
                break;
            case 'warnings':
                await handleWarnings(interaction);
                break;
            case 'status':
                await handleStatus(interaction);
                break;
            case 'disable':
                await handleDisable(interaction);
                break;
            case 'resetconfig':
                await handleResetConfig(interaction);
                break;
            case 'logchannel':
                await handleLogChannel(interaction);
                break;
        }
    },
};

async function handleSetup(interaction) {
    const guildId = interaction.guild.id;
    const existing = automodDB.getConfig(guildId);

    if (existing && existing.enabled) {
        return await interaction.reply({
            content: '⚠️ Automoderacja jest już skonfigurowana na tym serwerze!\n\nUżyj `/automod status` aby zobaczyć konfigurację.',
            ephemeral: true
        });
    }

    const success = automodDB.createDefaultConfig(guildId);

    if (success) {
        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('✅ Automoderacja została włączona!')
            .setDescription(
                'System automoderacji został zainicjalizowany z domyślnymi ustawieniami:\n\n' +
                '📌 **Domyślna konfiguracja:**\n' +
                '• YouTube: `warn` (ostrzeżenie)\n' +
                '• Discord Invites: `warn` (ostrzeżenie)\n' +
                '• Wszystkie Linki: `off` (wyłączone)\n' +
                '• Threshold ostrzeżeń: `3`\n\n' +
                '⚙️ Użyj `/automod config` aby dostosować ustawienia!'
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    } else {
        await interaction.reply({
            content: '❌ Wystąpił błąd podczas inicjalizacji automoderacji.',
            ephemeral: true
        });
    }
}

async function handleConfig(interaction) {
    const guildId = interaction.guild.id;
    const filter = interaction.options.getString('filter');
    const action = interaction.options.getString('action');
    const duration = interaction.options.getString('duration');

    let config = automodDB.getConfig(guildId);

    if (!config) {
        return await interaction.reply({
            content: '❌ Automoderacja nie jest skonfigurowana! Użyj najpierw `/automod setup`',
            ephemeral: true
        });
    }

    // Validate duration for mute/ban
    if ((action === 'mute' || action === 'ban') && !duration) {
        return await interaction.reply({
            content: `❌ Musisz podać czas kary dla akcji \`${action}\`!`,
            ephemeral: true
        });
    }

    // Update config
    config.filters[filter] = {
        action,
        duration: duration || null
    };

    const success = automodDB.saveConfig(guildId, config);

    if (success) {
        const filterNames = {
            youtube: 'YouTube',
            discord_invites: 'Discord Invites',
            all_links: 'Wszystkie Linki'
        };

        const actionNames = {
            off: 'Wyłączone',
            warn: 'Ostrzeżenie',
            mute: 'Wyciszenie',
            kick: 'Wyrzucenie',
            ban: 'Ban'
        };

        await interaction.reply({
            content: `✅ Zaktualizowano filtr **${filterNames[filter]}**:\n\n` +
                `Akcja: \`${actionNames[action]}\`\n` +
                `${duration ? `Czas: \`${formatDuration(duration)}\`` : ''}`,
            ephemeral: true
        });
    } else {
        await interaction.reply({
            content: '❌ Wystąpił błąd podczas zapisywania konfiguracji.',
            ephemeral: true
        });
    }
}

async function handleBypass(interaction) {
    const guildId = interaction.guild.id;
    const role = interaction.options.getRole('role');

    let config = automodDB.getConfig(guildId);

    if (!config) {
        return await interaction.reply({
            content: '❌ Automoderacja nie jest skonfigurowana! Użyj najpierw `/automod setup`',
            ephemeral: true
        });
    }

    config.bypassRoleId = role.id;
    const success = automodDB.saveConfig(guildId, config);

    if (success) {
        await interaction.reply({
            content: `✅ Ustawiono rolę bypass: ${role}\n\nUżytkownicy z tą rolą mogą wysyłać linki bez kar.`,
            ephemeral: true
        });
    } else {
        await interaction.reply({
            content: '❌ Wystąpił błąd podczas zapisywania konfiguracji.',
            ephemeral: true
        });
    }
}

async function handleWarnings(interaction) {
    const guildId = interaction.guild.id;
    const action = interaction.options.getString('action');
    const user = interaction.options.getUser('user');
    const count = interaction.options.getInteger('count');

    let config = automodDB.getConfig(guildId);

    if (!config && action !== 'view' && action !== 'list') {
        return await interaction.reply({
            content: '❌ Automoderacja nie jest skonfigurowana! Użyj najpierw `/automod setup`',
            ephemeral: true
        });
    }

    switch (action) {
        case 'set':
            if (!count) {
                return await interaction.reply({
                    content: '❌ Musisz podać liczbę ostrzeżeń!',
                    ephemeral: true
                });
            }

            config.warningsThreshold = count;
            const success = automodDB.saveConfig(guildId, config);

            if (success) {
                await interaction.reply({
                    content: `✅ Ustawiono threshold ostrzeżeń na **${count}**\n\nPo ${count} ostrzeżeniach użytkownik zostanie automatycznie zbanowany.`,
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: '❌ Wystąpił błąd podczas zapisywania konfiguracji.',
                    ephemeral: true
                });
            }
            break;

        case 'view':
            if (!user) {
                return await interaction.reply({
                    content: '❌ Musisz podać użytkownika!',
                    ephemeral: true
                });
            }

            const warnings = automodDB.getWarnings(guildId, user.id);

            if (!warnings || warnings.count === 0) {
                await interaction.reply({
                    content: `ℹ️ Użytkownik ${user} nie ma żadnych ostrzeżeń.`,
                    ephemeral: true
                });
            } else {
                const embed = new EmbedBuilder()
                    .setColor(0xffaa00)
                    .setTitle(`⚠️ Ostrzeżenia dla ${user.tag}`)
                    .setDescription(
                        `**Liczba ostrzeżeń:** ${warnings.count}\n` +
                        `**Ostatnie ostrzeżenie:** ${new Date(warnings.lastWarning).toLocaleString('pl-PL')}\n\n` +
                        `**Historia:**\n` +
                        warnings.warnings.slice(-5).reverse().map((w, i) =>
                            `${i + 1}. ${w.reason} - ${new Date(w.timestamp).toLocaleString('pl-PL')}`
                        ).join('\n')
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
            break;

        case 'clear':
            if (!user) {
                return await interaction.reply({
                    content: '❌ Musisz podać użytkownika!',
                    ephemeral: true
                });
            }

            const cleared = automodDB.clearWarnings(guildId, user.id);

            if (cleared) {
                await interaction.reply({
                    content: `✅ Wyczyszczono ostrzeżenia dla ${user}`,
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: `ℹ️ Użytkownik ${user} nie ma żadnych ostrzeżeń do wyczyszczenia.`,
                    ephemeral: true
                });
            }
            break;

        case 'list':
            const allWarnings = automodDB.getAllWarnings(guildId);
            const users = Object.keys(allWarnings);

            if (users.length === 0) {
                await interaction.reply({
                    content: 'ℹ️ Brak użytkowników z ostrzeżeniami.',
                    ephemeral: true
                });
            } else {
                const userList = users.slice(0, 10).map(userId => {
                    const data = allWarnings[userId];
                    return `• <@${userId}>: **${data.count}** ostrzeżeń`;
                }).join('\n');

                const embed = new EmbedBuilder()
                    .setColor(0xffaa00)
                    .setTitle('⚠️ Lista użytkowników z ostrzeżeniami')
                    .setDescription(userList + (users.length > 10 ? '\n\n_(Pokazano 10 pierwszych)_' : ''))
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
            break;
    }
}

async function handleStatus(interaction) {
    const guildId = interaction.guild.id;
    const config = automodDB.getConfig(guildId);

    if (!config) {
        return await interaction.reply({
            content: '❌ Automoderacja nie jest skonfigurowana! Użyj `/automod setup` aby rozpocząć.',
            ephemeral: true
        });
    }

    const filterNames = {
        youtube: 'YouTube',
        discord_invites: 'Discord Invites',
        all_links: 'Wszystkie Linki'
    };

    const actionNames = {
        off: 'Wyłączone',
        warn: 'Ostrzeżenie',
        mute: 'Wyciszenie',
        kick: 'Wyrzucenie',
        ban: 'Ban'
    };

    const bypassRole = config.bypassRoleId ? `<@&${config.bypassRoleId}>` : 'Brak';

    let filtersDesc = '';
    for (const [filterType, filterData] of Object.entries(config.filters)) {
        const emoji = filterData.action === 'off' ? '⚪' : '🔴';
        filtersDesc += `${emoji} **${filterNames[filterType]}**: \`${actionNames[filterData.action]}\`${filterData.duration ? ` (${formatDuration(filterData.duration)})` : ''}\n`;
    }

    const embed = new EmbedBuilder()
        .setColor(config.enabled ? 0x00ff00 : 0xff0000)
        .setTitle(`🛡️ Status Automoderacji`)
        .setDescription(
            `**Status:** ${config.enabled ? '✅ Włączona' : '❌ Wyłączona'}\n` +
            `**Rola bypass:** ${bypassRole}\n` +
            `**Threshold ostrzeżeń:** ${config.warningsThreshold}\n\n` +
            `**Filtry:**\n${filtersDesc}`
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleDisable(interaction) {
    const guildId = interaction.guild.id;
    let config = automodDB.getConfig(guildId);

    if (!config) {
        return await interaction.reply({
            content: '❌ Automoderacja nie jest skonfigurowana!',
            ephemeral: true
        });
    }

    config.enabled = false;
    const success = automodDB.saveConfig(guildId, config);

    if (success) {
        await interaction.reply({
            content: '✅ Automoderacja została wyłączona.\n\nMożesz ją ponownie włączyć używając `/automod setup`',
            ephemeral: true
        });
    } else {
        await interaction.reply({
            content: '❌ Wystąpił błąd podczas wyłączania automoderacji.',
            ephemeral: true
        });
    }
}

async function handleResetConfig(interaction) {
    const guildId = interaction.guild.id;
    const config = automodDB.getConfig(guildId);

    if (!config) {
        return await interaction.reply({
            content: '❌ Automoderacja nie jest skonfigurowana! Użyj `/automod setup` aby rozpocząć.',
            ephemeral: true
        });
    }

    // Create default config
    const success = automodDB.createDefaultConfig(guildId);

    if (success) {
        const embed = new EmbedBuilder()
            .setColor(0xffa500)
            .setTitle('🔄 Konfiguracja została zresetowana!')
            .setDescription(
                'System automoderacji został zresetowany do domyślnych ustawień:\n\n' +
                '📌 **Domyślna konfiguracja:**\n' +
                '• YouTube: `warn` (ostrzeżenie)\n' +
                '• Discord Invites: `warn` (ostrzeżenie)\n' +
                '• Wszystkie Linki: `off` (wyłączone)\n' +
                '• Threshold ostrzeżeń: `3`\n' +
                '• Rola bypass: `Brak`\n' +
                '• Status: `Włączony`\n\n' +
                '⚙️ Użyj `/automod config` aby dostosować ustawienia!'
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    } else {
        await interaction.reply({
            content: '❌ Wystąpił błąd podczas resetowania konfiguracji.',
            ephemeral: true
        });
    }
}

async function handleLogChannel(interaction) {
    const guildId = interaction.guild.id;
    const channel = interaction.options.getChannel('channel');
    let config = automodDB.getConfig(guildId);

    if (!config) {
        return await interaction.reply({
            content: '❌ Automoderacja nie jest skonfigurowana! Użyj najpierw `/automod setup`',
            ephemeral: true
        });
    }

    if (!channel.isTextBased()) {
        return await interaction.reply({
            content: '❌ Wybrany kanał nie jest kanałem tekstowym!',
            ephemeral: true
        });
    }

    config.logChannelId = channel.id;
    const success = automodDB.saveConfig(guildId, config);

    if (success) {
        await interaction.reply({
            content: `✅ Ustawiono kanał logów automoderacji: ${channel}\n\nWszystkie ostrzeżenia i akcje będą wysyłane na tym kanale.`,
            ephemeral: true
        });
    } else {
        await interaction.reply({
            content: '❌ Wystąpił błąd podczas zapisywania konfiguracji.',
            ephemeral: true
        });
    }
}
