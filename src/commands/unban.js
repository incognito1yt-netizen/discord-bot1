import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import Logger from '../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Usuń bana użytkownika')
        .addStringOption(option =>
            option.setName('user_id')
                .setDescription('ID użytkownika do odbanowania')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Powód odbanowania'))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        const userId = interaction.options.getString('user_id');
        const reason = interaction.options.getString('reason') || `Unban przez ${interaction.user.tag}`;

        // Check if it's a valid Discord ID (17-19 digits)
        if (!/^\d{17,19}$/.test(userId)) {
            return await interaction.reply({
                content: '❌ Nieprawidłowe ID użytkownika! Użyj formatu: `123456789012345678`',
                ephemeral: true
            });
        }

        try {
            // Check if user is actually banned
            const bans = await interaction.guild.bans.fetch();
            const bannedUser = bans.get(userId);

            if (!bannedUser) {
                return await interaction.reply({
                    content: `❌ Użytkownik z ID \`${userId}\` nie jest zbanowany!`,
                    ephemeral: true
                });
            }

            await interaction.guild.members.unban(userId, reason);

            await interaction.reply({
                content: `✅ Odbanowano użytkownika **${bannedUser.user.tag}** (${userId})\nPowód: ${reason}`,
                ephemeral: true
            });

            Logger.success(`${interaction.user.tag} odbanował ${bannedUser.user.tag} (${reason})`);
        } catch (error) {
            Logger.error(`Błąd podczas odbanowywania ${userId}`, error);
            await interaction.reply({
                content: '❌ Nie udało się odbanować użytkownika. Sprawdź uprawnienia bota i ID użytkownika.',
                ephemeral: true
            });
        }
    },
};
