import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import Logger from '../utils/logger.js';
import { parseDuration, formatDuration } from '../utils/automod.js';

export default {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Wycisz użytkownika (timeout)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Użytkownik do wyciszenia')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Czas wyciszenia')
                .setRequired(true)
                .addChoices(
                    { name: '60 sekund', value: '60s' },
                    { name: '5 minut', value: '5m' },
                    { name: '10 minut', value: '10m' },
                    { name: '1 godzina', value: '1h' },
                    { name: '1 dzień', value: '1d' },
                    { name: '1 tydzień', value: '7d' }
                ))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Powód wyciszenia'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const durationStr = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || `Timeout przez ${interaction.user.tag}`;

        const member = await interaction.guild.members.fetch(user.id);

        if (!member) {
            return await interaction.reply({
                content: '❌ Nie znaleziono użytkownika na tym serwerze!',
                ephemeral: true
            });
        }

        if (member.id === interaction.user.id) {
            return await interaction.reply({
                content: '❌ Nie możesz wyciszyć samego siebie!',
                ephemeral: true
            });
        }

        // Parse duration - extend parseDuration to support seconds and minutes
        let duration;
        if (durationStr.endsWith('s')) {
            duration = parseInt(durationStr) * 1000;
        } else if (durationStr.endsWith('m')) {
            duration = parseInt(durationStr) * 60 * 1000;
        } else {
            duration = parseDuration(durationStr);
        }

        if (!duration) {
            return await interaction.reply({
                content: '❌ Nieprawidłowy format czasu!',
                ephemeral: true
            });
        }

        try {
            await member.timeout(duration, reason);

            await interaction.reply({
                content: `✅ Wyciszono użytkownika **${user.tag}**\nCzas: ${durationStr}\nPowód: ${reason}`,
                ephemeral: true
            });

            Logger.success(`${interaction.user.tag} wyciszył ${user.tag} na ${durationStr} (${reason})`);

            // Try to send DM
            try {
                await user.send(
                    `🔇 **Zostałeś wyciszony** na serwerze **${interaction.guild.name}**\n\n` +
                    `Czas: ${durationStr}\n` +
                    `Powód: ${reason}`
                );
            } catch (err) {
                // User has DMs disabled
            }
        } catch (error) {
            Logger.error(`Błąd podczas wyciszania ${user.tag}`, error);
            await interaction.reply({
                content: '❌ Nie udało się wyciszyć użytkownika. Sprawdź uprawnienia bota.',
                ephemeral: true
            });
        }
    },
};
