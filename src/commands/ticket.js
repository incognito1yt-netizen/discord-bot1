import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import ticketDB from '../database/ticket-db.js';
import messagesDB from '../database/messages-db.js';
import Logger from '../utils/logger.js';

const ticketSetupCooldown = new Map();

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
        }).catch(() => {});
    }

    await interaction.deferReply({ ephemeral: true }).catch(() => {});

    const cooldownKey = `${interaction.guild.id}_${channel.id}`;
    const lastCreated = ticketSetupCooldown.get(cooldownKey);
    if (lastCreated && Date.now() - lastCreated < 30000) {
        return await interaction.editReply({ content: '⏳ Poczekaj chwilę przed wysłaniem kolejnego panelu ticketów!' }).catch(() => {});
    }
    ticketSetupCooldown.set(cooldownKey, Date.now());

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
        const trackedPanels = messagesDB.getMessagesByType(interaction.guild.id, 'ticket_panel');
        for (const [msgId, msg] of Object.entries(trackedPanels)) {
            if (msg.channelId === channel.id) {
                try {
                    const oldMsg = await channel.messages.fetch(msgId).catch(() => null);
                    if (oldMsg) await oldMsg.delete().catch(() => {});
                } catch (e) {}
                messagesDB.deleteMessage(interaction.guild.id, msgId);
            }
        }

        const recentMessages = await channel.messages.fetch({ limit: 20 });
        for (const [, msg] of recentMessages) {
            if (msg.author.id === interaction.client.user.id && msg.embeds.length > 0) {
                const title = msg.embeds[0].title || '';
                if (title.includes('System Ticketów')) {
                    await msg.delete().catch(() => {});
                    messagesDB.deleteMessage(interaction.guild.id, msg.id);
                }
            }
        }

        const msg = await channel.send({ embeds: [embed], components: [row] });

        const description = '**Potrzebujesz pomocy?**\n\n' +
            'Kliknij przycisk poniżej aby utworzyć ticket.\n' +
            'Po kliknięciu wybierz kategorię:\n\n' +
            categories.map(c => `${c.emoji} **${c.name}**`).join('\n') + '\n\n' +
            '⚠️ Niepotrzebne tickety będą zamykane!';

        messagesDB.trackMessage(interaction.guild.id, msg.id, channel.id, 'ticket_panel', {
            title: '🎫 System Ticketów',
            description: description,
            color: '#5865f2',
            footer: 'Kliknij przycisk aby rozpocząć'
        });

        await interaction.editReply({
            content: `✅ Wysłano wiadomość z systemem ticketów na ${channel}`
        }).catch(() => {});

        Logger.success(`Utworzono panel ticketów na kanale ${channel.name}`);
    } catch (error) {
        Logger.error('Błąd podczas wysyłania panelu ticketów', error);
        await interaction.editReply({
            content: '❌ Nie udało się wysłać wiadomości. Sprawdź uprawnienia bota.'
        }).catch(() => {});
    }
}

async function handleClose(interaction) {
    const ticket = ticketDB.getTicket(interaction.guild.id, interaction.channel.id);

    if (!ticket) {
        return await interaction.reply({
            content: '❌ Ten kanał nie jest ticketem!',
            ephemeral: true
        }).catch(() => {});
    }

    if (ticket.status === 'closed') {
        return await interaction.reply({
            content: '❌ Ten ticket jest już zamknięty!',
            ephemeral: true
        }).catch(() => {});
    }

    await interaction.reply({
        content: '🔒 Zamykanie ticketa...',
        ephemeral: true
    }).catch(() => {});

    // Fetch all messages from the channel
    let allMessages = [];
    let lastMessageId = null;
    let fetchMore = true;

    while (fetchMore) {
        const options = { limit: 100 };
        if (lastMessageId) options.before = lastMessageId;

        const messages = await interaction.channel.messages.fetch(options);
        if (messages.size === 0) {
            fetchMore = false;
        } else {
            allMessages = allMessages.concat(Array.from(messages.values()));
            lastMessageId = messages.last().id;
            if (messages.size < 100) fetchMore = false;
        }
    }

    // Sort messages chronologically
    allMessages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    // Create .txt content
    let txtContent = `=== TICKET ZAMKNIĘTY ===\n`;
    txtContent += `Serwer: ${interaction.guild.name}\n`;
    txtContent += `Kanał: ${interaction.channel.name}\n`;
    txtContent += `Kategoria: ${ticket.category || 'Nieznana'}\n`;
    txtContent += `Utworzony: ${new Date(ticket.createdAt).toLocaleString('pl-PL')}\n`;
    txtContent += `Zamknięty: ${new Date().toLocaleString('pl-PL')}\n`;
    txtContent += `Zamknięty przez: ${interaction.user.tag}\n`;
    txtContent += `========================\n\n`;

    allMessages.forEach(msg => {
        const timestamp = new Date(msg.createdTimestamp).toLocaleString('pl-PL');
        txtContent += `[${timestamp}] ${msg.author.tag}: ${msg.content}\n`;
    });

    // Create .txt file attachment
    const { AttachmentBuilder } = await import('discord.js');
    const attachment = new AttachmentBuilder(Buffer.from(txtContent, 'utf-8'), {
        name: `ticket-${interaction.channel.name}-${Date.now()}.txt`
    });

    // Send DM to ticket creator
    try {
        const creator = await interaction.guild.members.fetch(ticket.userId);
        if (creator) {
            const dmEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('🔒 Ticket Został Zamknięty')
                .setDescription(
                    `Twój ticket na serwerze **${interaction.guild.name}** został zamknięty.\n\n` +
                    `**Kanał:** ${interaction.channel.name}\n` +
                    `**Kategoria:** ${ticket.category || 'Nieznana'}\n` +
                    `**Data zamknięcia:** ${new Date().toLocaleString('pl-PL')}\n` +
                    `**Zamknięty przez:** ${interaction.user.tag}\n\n` +
                    `Poniżej znajdziesz plik z historią wiadomości z ticketu.`
                )
                .setTimestamp();

            await creator.send({
                embeds: [dmEmbed],
                files: [attachment]
            });

            Logger.info(`Wysłano DM z podsumowaniem ticketa do ${creator.user.tag}`);
        }
    } catch (error) {
        Logger.warn(`Nie udało się wysłać DM do twórcy ticketa: ${error.message}`);
    }

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

    const channelId = interaction.channel.id;
    const guildId = interaction.guild.id;
    const channelName = interaction.channel.name;

    Logger.info(`Zamknięto ticket ${channelName}`);

    setTimeout(async () => {
        try {
            const channel = interaction.guild.channels.cache.get(channelId);
            if (channel) {
                await channel.delete('Ticket zamknięty');
                Logger.success(`Usunięto kanał ticketa ${channelName}`);
            }
            ticketDB.deleteTicket(guildId, channelId);
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
                }).catch(() => {});
            }

            const addResult = ticketDB.addCategory(interaction.guild.id, id, name, emoji);
            if (addResult.success) {
                await updateTicketPanel(interaction.guild);
                await interaction.reply({
                    content: `✅ Dodano kategorię: ${emoji} **${name}** (ID: ${id})`,
                    ephemeral: true
                }).catch(() => {});
            } else {
                await interaction.reply({
                    content: `❌ ${addResult.error}`,
                    ephemeral: true
                }).catch(() => {});
            }
            break;

        case 'remove':
            if (!id) {
                return await interaction.reply({
                    content: '❌ Musisz podać ID kategorii do usunięcia!',
                    ephemeral: true
                }).catch(() => {});
            }

            const removeResult = ticketDB.removeCategory(interaction.guild.id, id);
            if (removeResult.success) {
                await updateTicketPanel(interaction.guild);
                await interaction.reply({
                    content: `✅ Usunięto kategorię: ${id}`,
                    ephemeral: true
                }).catch(() => {});
            } else {
                await interaction.reply({
                    content: `❌ ${removeResult.error}`,
                    ephemeral: true
                }).catch(() => {});
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

            await interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
            break;

        case 'reset':
            ticketDB.resetCategories(interaction.guild.id);
            await updateTicketPanel(interaction.guild);
            await interaction.reply({
                content: '✅ Zresetowano kategorie do domyślnych (Błąd, Sojusz, Dołączenie do klanu)',
                ephemeral: true
            }).catch(() => {});
            break;
    }
}

async function updateTicketPanel(guild) {
    const panels = messagesDB.getMessagesByType(guild.id, 'ticket_panel');
    const categories = ticketDB.getCategories(guild.id);

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

    for (const [msgId, panel] of Object.entries(panels)) {
        try {
            const channel = guild.channels.cache.get(panel.channelId);
            if (!channel) continue;
            const msg = await channel.messages.fetch(msgId).catch(() => null);
            if (msg) {
                await msg.edit({ embeds: [embed] });
                Logger.success(`Zaktualizowano panel ticketów: ${msgId}`);
            }
        } catch (error) {
            Logger.error('Błąd podczas aktualizacji panelu ticketów', error);
        }
    }
}
