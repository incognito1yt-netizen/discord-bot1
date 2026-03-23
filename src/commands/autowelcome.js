import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import welcomeDB from '../database/welcome-db.js';
import Logger from '../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('autowelcome')
        .setDescription('Konfiguruj system powitalny')
        .addSubcommand(sub =>
            sub.setName('setup')
                .setDescription('Włącz auto-welcome')
                .addChannelOption(opt => opt.setName('channel').setDescription('Kanał powitalny').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('message')
                .setDescription('Ustaw wiadomość powitalną')
                .addStringOption(opt => opt.setName('text').setDescription('Wiadomość ({user}, {server}, {memberCount})').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('embed')
                .setDescription('Włącz/wyłącz embed')
                .addBooleanOption(opt => opt.setName('enabled').setDescription('Czy używać embeda?').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('test')
                .setDescription('Przetestuj wiadomość powitalną'))
        .addSubcommand(sub =>
            sub.setName('disable')
                .setDescription('Wyłącz auto-welcome'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'setup':
                await handleSetup(interaction);
                break;
            case 'message':
                await handleMessage(interaction);
                break;
            case 'embed':
                await handleEmbed(interaction);
                break;
            case 'test':
                await handleTest(interaction);
                break;
            case 'disable':
                await handleDisable(interaction);
                break;
        }
    },
};

async function handleSetup(interaction) {
    const channel = interaction.options.getChannel('channel');

    if (!channel.isTextBased()) {
        return await interaction.reply({
            content: '❌ Wybrany kanał nie jest kanałem tekstowym!',
            ephemeral: true
        });
    }

    const config = welcomeDB.createDefaultConfig(interaction.guild.id, channel.id);
    welcomeDB.saveConfig(interaction.guild.id, config);

    await interaction.reply({
        content: `✅ Włączono auto-welcome na kanale ${channel}!\n\n` +
            `Domyślna wiadomość:\n\`\`\`${config.message}\`\`\`\n\n` +
            `Użyj \`/autowelcome message\` aby zmienić wiadomość.`,
        ephemeral: true
    });
}

async function handleMessage(interaction) {
    const text = interaction.options.getString('text');
    const config = welcomeDB.getConfig(interaction.guild.id);

    if (!config) {
        return await interaction.reply({
            content: '❌ Auto-welcome nie jest skonfigurowany! Użyj `/autowelcome setup`',
            ephemeral: true
        });
    }

    config.message = text;
    welcomeDB.saveConfig(interaction.guild.id, config);

    await interaction.reply({
        content: `✅ Zaktualizowano wiadomość powitalną:\n\`\`\`${text}\`\`\``,
        ephemeral: true
    });
}

async function handleEmbed(interaction) {
    const enabled = interaction.options.getBoolean('enabled');
    const config = welcomeDB.getConfig(interaction.guild.id);

    if (!config) {
        return await interaction.reply({
            content: '❌ Auto-welcome nie jest skonfigurowany! Użyj `/autowelcome setup`',
            ephemeral: true
        });
    }

    config.useEmbed = enabled;
    welcomeDB.saveConfig(interaction.guild.id, config);

    await interaction.reply({
        content: `✅ ${enabled ? 'Włączono' : 'Wyłączono'} embedy dla wiadomości powitalnych`,
        ephemeral: true
    });
}

async function handleTest(interaction) {
    const config = welcomeDB.getConfig(interaction.guild.id);

    if (!config || !config.enabled) {
        return await interaction.reply({
            content: '❌ Auto-welcome nie jest skonfigurowany! Użyj `/autowelcome setup`',
            ephemeral: true
        });
    }

    const channel = interaction.guild.channels.cache.get(config.channelId);
    if (!channel) {
        return await interaction.reply({
            content: '❌ Kanał powitalny nie istnieje!',
            ephemeral: true
        });
    }

    const formatted = formatWelcomeMessage(config.message, interaction.member, interaction.guild);

    if (config.useEmbed) {
        const embed = new EmbedBuilder()
            .setColor(config.embedColor || '#00ff00')
            .setDescription(formatted)
            .setTimestamp();

        await channel.send({ embeds: [embed] });
    } else {
        await channel.send(formatted);
    }

    await interaction.reply({
        content: `✅ Wysłano testową wiadomość powitalną na ${channel}`,
        ephemeral: true
    });
}

async function handleDisable(interaction) {
    const config = welcomeDB.getConfig(interaction.guild.id);

    if (!config) {
        return await interaction.reply({
            content: '❌ Auto-welcome nie jest skonfigurowany!',
            ephemeral: true
        });
    }

    config.enabled = false;
    welcomeDB.saveConfig(interaction.guild.id, config);

    await interaction.reply({
        content: '✅ Wyłączono auto-welcome',
        ephemeral: true
    });
}

function formatWelcomeMessage(message, member, guild) {
    return message
        .replace(/{user}/g, `<@${member.id}>`)
        .replace(/{username}/g, member.user.username)
        .replace(/{server}/g, guild.name)
        .replace(/{memberCount}/g, guild.memberCount.toString());
}
