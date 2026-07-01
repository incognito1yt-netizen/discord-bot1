import { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Logger from '../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('clearall')
        .setDescription('Usuwa wszystkie wiadomości z wybranego kanału')
        .addChannelOption(option =>
            option
                .setName('kanał')
                .setDescription('Kanał, z którego zostaną usunięte wiadomości')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // Check if user has administrator permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({
                content: '❌ Nie masz uprawnień do użycia tej komendy! Wymagane uprawnienie: **ADMINISTRATOR**',
                ephemeral: true
            }).catch(() => {});
        }

        const channel = interaction.options.getChannel('kanał');

        // Verify it's a text channel
        if (!channel.isTextBased()) {
            return await interaction.reply({
                content: '❌ Wybrany kanał nie jest kanałem tekstowym!',
                ephemeral: true
            }).catch(() => {});
        }

        // Check if bot has permissions in that channel
        const botPermissions = channel.permissionsFor(interaction.guild.members.me);

        if (!botPermissions.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageMessages])) {
            return await interaction.reply({
                content: '❌ Bot nie ma wystarczających uprawnień w tym kanale! Wymagane: **VIEW_CHANNEL**, **MANAGE_MESSAGES**',
                ephemeral: true
            }).catch(() => {});
        }

        // Create confirmation buttons
        const confirmButton = new ButtonBuilder()
            .setCustomId('clearall_confirm')
            .setLabel('Potwierdź')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('✅');

        const cancelButton = new ButtonBuilder()
            .setCustomId('clearall_cancel')
            .setLabel('Anuluj')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('❌');

        const row = new ActionRowBuilder()
            .addComponents(confirmButton, cancelButton);

        await interaction.reply({
            content: `⚠️ **UWAGA!** Czy na pewno chcesz usunąć wszystkie wiadomości z kanału ${channel}?\n\nTa akcja jest nieodwracalna!`,
            components: [row],
            ephemeral: true
        }).catch(() => {});

        Logger.info(`${interaction.user.tag} zainicjował usuwanie wiadomości z kanału ${channel.name}`);
    },
};
