import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import logConfig from '../utils/log-config.js';
import Logger from '../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('logs')
        .setDescription('Konfiguruj kanał logów bota')
        .addSubcommand(sub =>
            sub.setName('setup')
                .setDescription('Ustaw kanał dla logów')
                .addChannelOption(opt => opt.setName('channel').setDescription('Kanał logów').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('disable')
                .setDescription('Wyłącz logi na Discord'))
        .addSubcommand(sub =>
            sub.setName('test')
                .setDescription('Wyślij testowy log'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'setup':
                await handleSetup(interaction);
                break;
            case 'disable':
                await handleDisable(interaction);
                break;
            case 'test':
                await handleTest(interaction);
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

    const success = logConfig.setLogChannel(interaction.guild.id, channel.id);

    if (success) {
        await interaction.reply({
            content: `✅ Ustawiono kanał logów: ${channel}\n\n` +
                `📝 Wszystkie logi z konsoli będą wysyłane na ten kanał.\n` +
                `⚠️ Upewnij się że bot ma uprawnienia do pisania na tym kanale!`,
            ephemeral: true
        });

        Logger.success(`Ustawiono kanał logów: ${channel.name} (${channel.id}) dla serwera ${interaction.guild.name}`);

        // Send initial message to channel
        await channel.send(
            `📊 **System Logów Aktywowany**\n\n` +
            `Bot będzie wysyłał tutaj wszystkie logi z konsoli.\n\n` +
            `Typy logów:\n` +
            `✅ **SUCCESS** - Pomyślne operacje\n` +
            `ℹ️ **INFO** - Informacje\n` +
            `⚠️ **WARN** - Ostrzeżenia\n` +
            `❌ **ERROR** - Błędy\n\n` +
            `Aby wyłączyć: \`/logs disable\``
        );
    } else {
        await interaction.reply({
            content: '❌ Nie udało się zapisać konfiguracji logów.',
            ephemeral: true
        });
    }
}

async function handleDisable(interaction) {
    const success = logConfig.setLogChannel(interaction.guild.id, null);

    if (success) {
        await interaction.reply({
            content: '✅ Wyłączono logi na Discord',
            ephemeral: true
        });

        Logger.info(`Wyłączono kanał logów dla serwera ${interaction.guild.name}`);
    } else {
        await interaction.reply({
            content: '❌ Nie udało się wyłączyć logów.',
            ephemeral: true
        });
    }
}

async function handleTest(interaction) {
    const config = logConfig.getConfig(interaction.guild.id);

    if (!config) {
        return await interaction.reply({
            content: '❌ Logi nie są skonfigurowane! Użyj `/logs setup` najpierw.',
            ephemeral: true
        });
    }

    await interaction.reply({
        content: '📤 Wysyłam testowe logi...',
        ephemeral: true
    });

    Logger.info('[TEST] This is a test INFO log');
    Logger.success('[TEST] This is a test SUCCESS log');
    Logger.warn('[TEST] This is a test WARN log');
    Logger.error('[TEST] This is a test ERROR log');

    await interaction.editReply({
        content: '✅ Wysłano testowe logi! Sprawdź kanał logów.',
    });
}
