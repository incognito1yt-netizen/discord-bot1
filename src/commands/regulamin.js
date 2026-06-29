import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import rulesDB from '../database/rules-db.js';
import Logger from '../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('regulamin')
        .setDescription('Ustaw system akceptacji regulaminu')
        .addChannelOption(opt => opt.setName('channel').setDescription('Kanał dla regulaminu').setRequired(true))
        .addRoleOption(opt => opt.setName('role').setDescription('Rola po akceptacji').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');
        const role = interaction.options.getRole('role');

        if (!channel.isTextBased()) {
            return await interaction.reply({
                content: '❌ Wybrany kanał nie jest kanałem tekstowym!',
                ephemeral: true
            });
        }

        // Store channel and role temporarily in interaction
        // We'll show modal to get rules text
        const modal = new ModalBuilder()
            .setCustomId(`rules_setup_${channel.id}_${role.id}`)
            .setTitle('📜 Wpisz Regulamin');

        const rulesInput = new TextInputBuilder()
            .setCustomId('rules_text')
            .setLabel('Treść regulaminu (możesz wkleić długi tekst)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Wpisz tutaj cały regulamin serwera...\n\n1. Zasada pierwsza\n2. Zasada druga\n...')
            .setRequired(true)
            .setMinLength(10)
            .setMaxLength(4000);

        const row = new ActionRowBuilder().addComponents(rulesInput);
        modal.addComponents(row);

        try {
            await interaction.showModal(modal);
        } catch (error) {
            Logger.error('Błąd podczas pokazywania modalu', error);
            if (error.code === 10062 || error.code === 40060) {
                return;
            }
            await interaction.reply({
                content: '❌ Nie udało się otworzyć okna regulaminu. Spróbuj ponownie!',
                ephemeral: true
            }).catch(() => {});
        }
    },
};
