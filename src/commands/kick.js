import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import Logger from '../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Wyrzuć użytkownika z serwera')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Użytkownik do wyrzucenia')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Powód wyrzucenia'))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || `Kick przez ${interaction.user.tag}`;

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) {
            return await interaction.reply({
                content: '❌ Użytkownik nie jest na tym serwerze!',
                ephemeral: true
            });
        }

        if (!member.kickable) {
            return await interaction.reply({
                content: '❌ Nie mogę wyrzucić tego użytkownika! (może mieć wyższą rolę)',
                ephemeral: true
            });
        }

        if (member.id === interaction.user.id) {
            return await interaction.reply({
                content: '❌ Nie możesz wyrzucić samego siebie!',
                ephemeral: true
            });
        }

        try {
            // Send DM before kicking
            try {
                await user.send(
                    `👢 **Zostałeś wyrzucony** z serwera **${interaction.guild.name}**\n\n` +
                    `Powód: ${reason}`
                );
            } catch (err) {
                // User has DMs disabled
            }

            await member.kick(reason);

            await interaction.reply({
                content: `✅ Wyrzucono użytkownika **${user.tag}**\nPowód: ${reason}`,
                ephemeral: true
            });

            Logger.success(`${interaction.user.tag} wyrzucił ${user.tag} (${reason})`);
        } catch (error) {
            Logger.error(`Błąd podczas wyrzucania ${user.tag}`, error);
            await interaction.reply({
                content: '❌ Nie udało się wyrzucić użytkownika. Sprawdź uprawnienia bota.',
                ephemeral: true
            });
        }
    },
};
