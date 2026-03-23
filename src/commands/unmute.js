import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import Logger from '../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Usuń wyciszenie (timeout) użytkownika')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Użytkownik do odmutowania')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id);

        if (!member) {
            return await interaction.reply({
                content: '❌ Nie znaleziono użytkownika na tym serwerze!',
                ephemeral: true
            });
        }

        if (!member.isCommunicationDisabled()) {
            return await interaction.reply({
                content: `ℹ️ ${user} nie jest wyciszony!`,
                ephemeral: true
            });
        }

        try {
            await member.timeout(null, `Unmute przez ${interaction.user.tag}`);

            await interaction.reply({
                content: `✅ Usunięto wyciszenie użytkownika ${user}`,
                ephemeral: true
            });

            Logger.success(`${interaction.user.tag} odmutował ${user.tag}`);

            // Try to send DM
            try {
                await user.send(`✅ Twoje wyciszenie na serwerze **${interaction.guild.name}** zostało usunięte.`);
            } catch (err) {
                // User has DMs disabled
            }
        } catch (error) {
            Logger.error(`Błąd podczas usuwania wyciszenia ${user.tag}`, error);
            await interaction.reply({
                content: '❌ Nie udało się usunąć wyciszenia. Sprawdź uprawnienia bota.',
                ephemeral: true
            });
        }
    },
};
