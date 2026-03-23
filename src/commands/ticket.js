import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import ticketDB from '../database/ticket-db.js';
import Logger from '../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('System ticketów')
        .addSubcommand(sub =>
            sub.setName('setup')
                .setDescription('Wyślij wiadomość z przyciskiem do tworzenia ticketów')
                .addChannelOption(opt => opt.setName('channel').setDescription('Kanał dla wiadomości').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('close')
                .setDescription('Zamknij ticket'))
        .addSubcommand(sub =>
            sub.setName('opcje')
                .setDescription('Zarządzaj kategoriami ticketów')
                .addStringOption(opt => opt.setName('action').setDescription('Akcja').setRequired(true)
                    .addChoices(
                        { name: 'Dodaj kategorię', value: 'add' },
                        { name: 'Usuń kategorię', value: 'remove' },
                        { name: 'Lista kategorii', value: 'list' },
                        { name: 'Reset do domyślnych', value: 'reset' }
                    ))
                .addStringOption(opt => opt.setName('id').setDescription('ID kategorii (np. bug, pomoc)'))
                .addStringOption(opt => opt.setName('name').setDescription('Nazwa kategorii (np. Błąd, Pomoc)'))
                .addStringOption(opt => opt.setName('emoji').setDescription('Emoji (np. 🐛, ❓)')))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'setup') {
            await handleSetup(interaction);
        } else if (subcommand === 'close') {
            await handleClose(interaction);
        } else if (subcommand === 'opcje') {
            await handleOpcje(interaction);
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

    // Get categories
    const categories = ticketDB.getCategories(interaction.guild.id);

    const embed = new EmbedBuilder()
        .setColor('#5865f2')
        .setTitle('🎫 System Ticketów')
        .setDescription(
            '**Potrzebujesz pomocy?**\n\n' +
            'Kliknij przycisk poniżej aby utworzyć ticket.\n' +
            'Po kliknięciu wybierz kategorię:\n\n' +
            categories.map(c => `${c.emoji} **${c.name}**`).join('\n') + '\n\n' +
            '⚠️ Niepotrzebne tickety będą zamykane!'
        )
        .setFooter({ text: 'Kliknij przycisk aby rozpocząć' })
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_create')
                .setLabel('🎫 Utwórz Ticket')
                .setStyle(ButtonStyle.Primary)
        );

    try {
        await channel.send({ embeds: [embed], components: [row] });

        await interaction.reply({
            content: `✅ Wysłano wiadomość z systemem ticketów na ${channel}`,
            ephemeral: true
        });

        Logger.success(`Utworzono panel ticketów na kanale ${channel.name}`);
    } catch (error) {
        Logger.error('Błąd podczas wysyłania panelu ticketów', error);
        await interaction.reply({
            content: '❌ Nie udało się wysłać wiadomości. Sprawdź uprawnienia bota.',
            ephemeral: true
        });
    }
}

async function handleClose(interaction) {
    const ticket = ticketDB.getTicket(interaction.guild.id, interaction.channel.id);

    if (!ticket) {
        return await interaction.reply({
            content: '❌ Ten kanał nie jest ticketem!',
            ephemeral: true
        });
    }

    if (ticket.status === 'closed') {
        return await interaction.reply({
            content: '❌ Ten ticket jest już zamknięty!',
            ephemeral: true
        });
    }

    await interaction.reply({
        content: '🔒 Zamykanie ticketa...',
        ephemeral: true
    });

    ticketDB.closeTicket(interaction.guild.id, interaction.channel.id);

    const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('🔒 Ticket Zamknięty')
        .setDescription(
            `Ticket został zamknięty przez ${interaction.user}\n\n` +
            `Kanał zostanie usunięty za 10 sekund...`
        )
        .setTimestamp();

    await interaction.channel.send({ embeds: [embed] });

    Logger.info(`Zamknięto ticket ${interaction.channel.name}`);

    setTimeout(async () => {
        try {
            await interaction.channel.delete('Ticket zamknięty');
            ticketDB.deleteTicket(interaction.guild.id, interaction.channel.id);
            Logger.success(`Usunięto kanał ticketa ${interaction.channel.name}`);
        } catch (error) {
            Logger.error('Błąd podczas usuwania kanału ticketa', error);
        }
    }, 10000);
}

async function handleOpcje(interaction) {
    const action = interaction.options.getString('action');
    const id = interaction.options.getString('id');
    const name = interaction.options.getString('name');
    const emoji = interaction.options.getString('emoji');

    switch (action) {
        case 'add':
            if (!id || !name || !emoji) {
                return await interaction.reply({
                    content: '❌ Musisz podać: id, name i emoji!',
                    ephemeral: true
                });
            }

            const addResult = ticketDB.addCategory(interaction.guild.id, id, name, emoji);
            if (addResult.success) {
                await interaction.reply({
                    content: `✅ Dodano kategorię: ${emoji} **${name}** (ID: ${id})`,
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: `❌ ${addResult.error}`,
                    ephemeral: true
                });
            }
            break;

        case 'remove':
            if (!id) {
                return await interaction.reply({
                    content: '❌ Musisz podać ID kategorii do usunięcia!',
                    ephemeral: true
                });
            }

            const removeResult = ticketDB.removeCategory(interaction.guild.id, id);
            if (removeResult.success) {
                await interaction.reply({
                    content: `✅ Usunięto kategorię: ${id}`,
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: `❌ ${removeResult.error}`,
                    ephemeral: true
                });
            }
            break;

        case 'list':
            const categories = ticketDB.getCategories(interaction.guild.id);
            const embed = new EmbedBuilder()
                .setColor('#5865f2')
                .setTitle('📋 Lista Kategorii Ticketów')
                .setDescription(
                    categories.map(c => `${c.emoji} **${c.name}** (ID: \`${c.id}\`)`).join('\n')
                )
                .setFooter({ text: `Łącznie: ${categories.length} kategorii` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
            break;

        case 'reset':
            ticketDB.resetCategories(interaction.guild.id);
            await interaction.reply({
                content: '✅ Zresetowano kategorie do domyślnych (Błąd, Sojusz)',
                ephemeral: true
            });
            break;
    }
}
