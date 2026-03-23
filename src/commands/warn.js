import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import automodDB from '../database/automod-db.js';
import Logger from '../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Daj ostrzeżenie użytkownikowi')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Użytkownik do ostrzeżenia')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Powód ostrzeżenia')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');

        const member = await interaction.guild.members.fetch(user.id);

        if (!member) {
            return await interaction.reply({
                content: '❌ Nie znaleziono użytkownika na tym serwerze!',
                ephemeral: true
            });
        }

        if (member.id === interaction.user.id) {
            return await interaction.reply({
                content: '❌ Nie możesz ostrzec samego siebie!',
                ephemeral: true
            });
        }

        // Add warning to database
        const warningCount = automodDB.addWarning(
            interaction.guild.id,
            user.id,
            'manual_warn',
            reason
        );

        // Get automod config for threshold
        const config = automodDB.getConfig(interaction.guild.id);
        const threshold = config?.warningsThreshold || 3;

        await interaction.reply({
            content: `⚠️ Dodano ostrzeżenie dla **${user.tag}**\n\n` +
                `Powód: ${reason}\n` +
                `Ostrzeżenia: ${warningCount}/${threshold}`,
            ephemeral: true
        });

        Logger.success(`${interaction.user.tag} ostrzegł ${user.tag}: ${reason} (${warningCount}/${threshold})`);

        // Send DM
        try {
            await user.send(
                `⚠️ **Otrzymałeś ostrzeżenie** na serwerze **${interaction.guild.name}**\n\n` +
                `Powód: ${reason}\n` +
                `Ostrzeżenia: ${warningCount}/${threshold}\n\n` +
                `${warningCount >= threshold ? '🚫 **Osiągnąłeś limit ostrzeżeń!**' : ''}`
            );
        } catch (err) {
            // User has DMs disabled
        }

        // Check if threshold reached
        if (warningCount >= threshold) {
            await interaction.followUp({
                content: `⚠️ **UWAGA:** Użytkownik ${user} osiągnął limit ostrzeżeń (${warningCount}/${threshold})!\n\nMożesz teraz ręcznie zbanować używając \`/ban\``,
                ephemeral: true
            });
        }
    },
};
