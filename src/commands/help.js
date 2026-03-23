import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Pomoc dla komend bota')
        .addStringOption(opt =>
            opt.setName('command')
                .setDescription('Konkretna komenda')
                .addChoices(
                    { name: 'automod', value: 'automod' },
                    { name: 'clearall', value: 'clearall' },
                    { name: 'verificationchannel', value: 'verificationchannel' }
                )),

    async execute(interaction) {
        const commandName = interaction.options.getString('command');

        if (commandName) {
            await showCommandHelp(interaction, commandName);
        } else {
            await showAllCommands(interaction);
        }
    },
};

async function showAllCommands(interaction) {
    const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('📚 Pomoc - Lista Komend')
        .setDescription('Oto wszystkie dostępne komendy. Użyj `/help [komenda]` aby zobaczyć szczegóły.')
        .addFields(
            {
                name: '🛡️ /automod',
                value: 'System automoderacji - automatyczne karanie za linki',
                inline: false
            },
            {
                name: '🗑️ /clearall',
                value: 'Usuwa wszystkie wiadomości z wybranego kanału',
                inline: false
            },
            {
                name: '✅ /verificationchannel',
                value: 'Konfiguruje kanał weryfikacyjny z systemem reakcji',
                inline: false
            },
            {
                name: '❓ /help',
                value: 'Pokazuje tę wiadomość pomocy',
                inline: false
            }
        )
        .setFooter({ text: 'Używaj komend odpowiedzialnie!' })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function showCommandHelp(interaction, commandName) {
    const helpData = {
        automod: {
            title: '🛡️ /automod - System Automoderacji',
            description: 'Automatyczne wykrywanie i karanie za wysyłanie linków (YouTube, Discord invites, etc.)',
            fields: [
                {
                    name: '📋 Subkomendy',
                    value:
                        '`/automod setup` - Zainicjalizuj automod\n' +
                        '`/automod config` - Konfiguruj filtry\n' +
                        '`/automod bypass @rola` - Ustaw rolę bypass\n' +
                        '`/automod warnings` - Zarządzaj ostrzeżeniami\n' +
                        '`/automod status` - Pokaż konfigurację\n' +
                        '`/automod disable` - Wyłącz automod',
                    inline: false
                },
                {
                    name: '⚙️ Przykłady Użycia',
                    value:
                        '```\n' +
                        '/automod setup\n' +
                        '/automod config youtube mute 1d\n' +
                        '/automod config discord_invites ban 7d\n' +
                        '/automod bypass @Moderator\n' +
                        '/automod warnings set 3\n' +
                        '```',
                    inline: false
                },
                {
                    name: '📌 Dostępne Akcje',
                    value: '`off`, `warn` (ostrzeżenie), `mute` (wyciszenie), `kick` (wyrzucenie), `ban`',
                    inline: false
                },
                {
                    name: '⏰ Dostępne Czasy',
                    value: '`1h`, `6h`, `12h`, `1d`, `3d`, `7d`, `14d`, `30d`, `permanent`',
                    inline: false
                }
            ]
        },
        clearall: {
            title: '🗑️ /clearall - Usuwanie Wiadomości',
            description: 'Usuwa wszystkie wiadomości z wybranego kanału (w tym starsze niż 14 dni)',
            fields: [
                {
                    name: '📋 Składnia',
                    value: '`/clearall #kanał`',
                    inline: false
                },
                {
                    name: '⚙️ Przykład',
                    value: '```\n/clearall #ogólny\n```',
                    inline: false
                },
                {
                    name: '✨ Funkcje',
                    value:
                        '• Wymaga uprawnień **ADMINISTRATOR**\n' +
                        '• System potwierdzenia przed usunięciem\n' +
                        '• Usuwa wiadomości nowe (< 14 dni) zbiorczo\n' +
                        '• Usuwa wiadomości stare (≥ 14 dni) pojedynczo\n' +
                        '• Pokazuje postęp w czasie rzeczywistym',
                    inline: false
                },
                {
                    name: '⚠️ Uwagi',
                    value: 'Stare wiadomości usuwają się wolniej (1-2s na 5 wiadomości)',
                    inline: false
                }
            ]
        },
        verificationchannel: {
            title: '✅ /verificationchannel - System Weryfikacji',
            description: 'Konfiguruje kanał weryfikacyjny z automatycznym przypisywaniem roli przez reakcje',
            fields: [
                {
                    name: '📋 Składnia',
                    value: '`/verificationchannel #kanał @rola`',
                    inline: false
                },
                {
                    name: '⚙️ Przykład',
                    value: '```\n/verificationchannel #weryfikacja @Zweryfikowany\n```',
                    inline: false
                },
                {
                    name: '✨ Funkcje',
                    value:
                        '• Wysyła wiadomość weryfikacyjną z embedem\n' +
                        '• Dodaje reakcję ✅ automatycznie\n' +
                        '• Przypisuje rolę po kliknięciu reakcji\n' +
                        '• Zapisuje konfigurację (działa po restarcie)\n' +
                        '• Wysyła DM z potwierdzeniem',
                    inline: false
                },
                {
                    name: '🔑 Wymagania',
                    value:
                        '• Uprawnienia: **ADMINISTRATOR**\n' +
                        '• Bot musi mieć uprawnienia do zarządzania rolami\n' +
                        '• Rola bota musi być wyżej niż przypisywana rola',
                    inline: false
                }
            ]
        }
    };

    const data = helpData[commandName];
    if (!data) {
        await interaction.reply({
            content: '❌ Nie znaleziono pomocy dla tej komendy.',
            ephemeral: true
        });
        return;
    }

    const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(data.title)
        .setDescription(data.description)
        .addFields(data.fields)
        .setFooter({ text: 'Potrzebujesz więcej pomocy? Skontaktuj się z administratorem!' })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}
