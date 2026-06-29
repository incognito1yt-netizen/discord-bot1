import { SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import messagesDB from '../database/messages-db.js';
import Logger from '../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('messages')
        .setDescription('Zarządzaj wiadomościami bota')
        .addSubcommand(sub =>
            sub.setName('edit')
                .setDescription('Edytuj wiadomość bota')
                .addStringOption(opt =>
                    opt.setName('id')
                        .setDescription('ID wiadomości do edycji (opcjonalne jeśli reply)')
                        .setRequired(false))
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'edit') {
            await handleEdit(interaction);
        }
    },
};

async function handleEdit(interaction) {
    let referencedMessage = null;
    const manualId = interaction.options.getString('id');

    // Metoda 1: Sprawdź czy to reply
    if (interaction.reference && interaction.reference.messageId) {
        try {
            referencedMessage = await interaction.channel.messages.fetch(interaction.reference.messageId);
            Logger.info(`Pobrano wiadomość z reply: ${referencedMessage.id}`);
        } catch (error) {
            Logger.error('Błąd podczas pobierania wiadomości z reply', error);
        }
    }

    // Metoda 2: Sprawdź czy podano ID ręcznie
    if (!referencedMessage && manualId) {
        try {
            referencedMessage = await interaction.channel.messages.fetch(manualId);
            Logger.info(`Pobrano wiadomość z ID: ${referencedMessage.id}`);
        } catch (error) {
            Logger.error('Błąd podczas pobierania wiadomości z ID', error);
        }
    }

    // Metoda 3: Sprawdź cache ostatnich wiadomości bota
    if (!referencedMessage) {
        try {
            const messages = await interaction.channel.messages.fetch({ limit: 20 });
            const tracked = messagesDB.getAllMessages(interaction.guild.id);
            const trackedIds = Object.keys(tracked);
            const botMessages = messages.filter(m => m.author.bot && m.author.id === interaction.client.user.id);
            for (const [id, msg] of botMessages) {
                if (trackedIds.includes(id)) {
                    referencedMessage = msg;
                    Logger.info(`Użyto tracked wiadomości bota: ${referencedMessage.id}`);
                    break;
                }
            }
            if (!referencedMessage && botMessages.size > 0) {
                referencedMessage = botMessages.first();
                Logger.info(`Użyto ostatniej wiadomości bota: ${referencedMessage.id}`);
            }
        } catch (error) {
            Logger.error('Błąd podczas pobierania wiadomości bota', error);
        }
    }

    if (!referencedMessage) {
        return await interaction.reply({
            content: '❌ Nie znaleziono wiadomości do edycji!\n\n**Możliwości:**\n1. Odpowiedz na wiadomość bota i użyj `/messages edit`\n2. Użyj `/messages edit id:ID_WIADOMOSCI`',
            ephemeral: true
        });
    }

    if (!referencedMessage.author.bot) {
        return await interaction.reply({
            content: '❌ Wybrana wiadomość nie jest od bota!',
            ephemeral: true
        });
    }

    const tracked = messagesDB.getMessage(interaction.guild.id, referencedMessage.id);

    if (!tracked) {
        return await interaction.reply({
            content: '❌ Ta wiadomość bota nie jest edytowalna przez `/messages edit`.\n\nTylko wiadomości wysłane przez systemy bota (regulamin, tickety, weryfikacja) mogą być edytowane.',
            ephemeral: true
        });
    }

    const config = tracked.config;
    const type = tracked.type;

    const typeNames = {
        'rules_setup': 'Regulamin Serwera',
        'rules_read': 'Podgląd Regulaminu',
        'ticket_panel': 'Panel Ticketów',
        'ticket_close': 'Zamykanie Ticketu',
        'welcome': 'Wiadomość Powitalna',
        'verification': 'Weryfikacja',
        'recruitment': 'Formularz Rekrutacyjny',
        'giveaway': 'Giveaway',
        'poll': 'Ankieta'
    };

    const modal = new ModalBuilder()
        .setCustomId(`messages_edit_${referencedMessage.id}_${interaction.guild.id}`)
        .setTitle(`Edytuj: ${typeNames[type] || type}`);

    const titleInput = new TextInputBuilder()
        .setCustomId('msg_title')
        .setLabel('Tytuł')
        .setStyle(TextInputStyle.Short)
        .setValue(config.title || '')
        .setRequired(false)
        .setMaxLength(256);

    const colorInput = new TextInputBuilder()
        .setCustomId('msg_color')
        .setLabel('Kolor (hex, np. #5865f2)')
        .setStyle(TextInputStyle.Short)
        .setValue(config.color || '#5865f2')
        .setRequired(false)
        .setMaxLength(7);

    const roleInput = new TextInputBuilder()
        .setCustomId('msg_role')
        .setLabel('Nazwa roli (np. zweryfikowany, CWR)')
        .setStyle(TextInputStyle.Short)
        .setValue(config.roleName || '')
        .setPlaceholder('Wpisz nazwę roli do wzmianki')
        .setRequired(false)
        .setMaxLength(100);

    const footerInput = new TextInputBuilder()
        .setCustomId('msg_footer')
        .setLabel('Stopka')
        .setStyle(TextInputStyle.Short)
        .setValue(config.footer || '')
        .setRequired(false)
        .setMaxLength(256);

    const descriptionInput = new TextInputBuilder()
        .setCustomId('msg_description')
        .setLabel('Treść (opis) - użyj {role} dla wzmianki roli')
        .setStyle(TextInputStyle.Paragraph)
        .setValue(config.description || '')
        .setRequired(false)
        .setMaxLength(4000);

    const row1 = new ActionRowBuilder().addComponents(titleInput);
    const row2 = new ActionRowBuilder().addComponents(colorInput);
    const row3 = new ActionRowBuilder().addComponents(roleInput);
    const row4 = new ActionRowBuilder().addComponents(footerInput);
    const row5 = new ActionRowBuilder().addComponents(descriptionInput);

    modal.addComponents(row1, row2, row3, row4, row5);

    try {
        await interaction.showModal(modal);
    } catch (error) {
        if (error.code === 10062 || error.code === 40060) {
            return;
        }
        Logger.error('Błąd podczas pokazywania modalu', error);
        await interaction.reply({
            content: '❌ Nie udało się otworzyć okna edycji. Spróbuj ponownie szybciej!',
            ephemeral: true
        }).catch(() => {});
    }
}
