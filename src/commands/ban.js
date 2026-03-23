import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import Logger from '../utils/logger.js';
import { parseDuration, formatDuration } from '../utils/automod.js';

export default {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Zbanuj użytkownika')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Użytkownik do zbanowania')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Czas bana')
                .addChoices(
                    { name: '1 godzina', value: '1h' },
                    { name: '6 godzin', value: '6h' },
                    { name: '12 godzin', value: '12h' },
                    { name: '1 dzień', value: '1d' },
                    { name: '3 dni', value: '3d' },
                    { name: '7 dni', value: '7d' },
                    { name: '14 dni', value: '14d' },
                    { name: '30 dni', value: '30d' },
                    { name: 'Permanent', value: 'permanent' }
                ))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Powód bana'))
        .addIntegerOption(option =>
            option.setName('delete_messages')
                .setDescription('Usuń historię wiadomości (dni)')
                .setMinValue(0)
                .setMaxValue(7))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const duration = interaction.options.getString('duration') || 'permanent';
        const reason = interaction.options.getString('reason') || `Ban przez ${interaction.user.tag}`;
        const deleteMessageDays = interaction.options.getInteger('delete_messages') || 0;

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        // Check if user is bannable
        if (member) {
            if (!member.bannable) {
                return await interaction.reply({
                    content: '❌ Nie mogę zbanować tego użytkownika! (może mieć wyższą rolę lub być administratorem)',
                    ephemeral: true
                });
            }

            if (member.id === interaction.user.id) {
                return await interaction.reply({
                    content: '❌ Nie możesz zbanować samego siebie!',
                    ephemeral: true
                });
            }
        }

        try {
            // Ban the user
            await interaction.guild.members.ban(user, {
                reason,
                deleteMessageSeconds: deleteMessageDays * 24 * 60 * 60
            });

            const durationText = duration === 'permanent' ? 'Permanentny' : formatDuration(duration);

            await interaction.reply({
                content: `✅ Zbanowano użytkownika **${user.tag}**\n` +
                    `Czas: ${durationText}\n` +
                    `Powód: ${reason}\n` +
                    `${deleteMessageDays > 0 ? `Usunięto historię: ${deleteMessageDays} dni` : ''}`,
                ephemeral: true
            });

            Logger.success(`${interaction.user.tag} zbanował ${user.tag} na ${durationText} (${reason})`);

            // Schedule unban if not permanent
            if (duration !== 'permanent') {
                const banDuration = parseDuration(duration);
                setTimeout(async () => {
                    try {
                        await interaction.guild.members.unban(user.id, 'Automatyczny unban - czas kary minął');
                        Logger.info(`Automatycznie odbanowano ${user.tag}`);
                    } catch (err) {
                        Logger.error(`Nie udało się automatycznie odbanować ${user.tag}`, err);
                    }
                }, banDuration);
            }

            // Try to send DM
            try {
                await user.send(
                    `🔨 **Zostałeś zbanowany** na serwerze **${interaction.guild.name}**\n\n` +
                    `Czas: ${durationText}\n` +
                    `Powód: ${reason}`
                );
            } catch (err) {
                // User has DMs disabled
            }
        } catch (error) {
            Logger.error(`Błąd podczas banowania ${user.tag}`, error);
            await interaction.reply({
                content: '❌ Nie udało się zbanować użytkownika. Sprawdź uprawnienia bota.',
                ephemeral: true
            });
        }
    },
};
