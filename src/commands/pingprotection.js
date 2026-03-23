import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import pingProtectionDB from '../database/ping-protection-db.js';
import Logger from '../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('pingprotection')
        .setDescription('Włącz/wyłącz ochronę przed pingami')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Użytkownik do ochrony')
                .setRequired(true)),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const result = pingProtectionDB.toggleProtection(interaction.guild.id, user.id);

        if (result.success) {
            if (result.enabled) {
                await interaction.reply({
                    content: `✅ **Włączono ochronę przed pingami** dla ${user}\n\n` +
                        `🛡️ Każdy kto zpinguje tego użytkownika:\n` +
                        `• Wiadomość zostanie usunięta\n` +
                        `• Dostanie mute na **15 minut**\n\n` +
                        `Aby wyłączyć: użyj tej samej komendy ponownie`,
                    ephemeral: true
                });

                Logger.success(`Włączono ping protection dla ${user.tag} na ${interaction.guild.name}`);
            } else {
                await interaction.reply({
                    content: `❌ **Wyłączono ochronę przed pingami** dla ${user}\n\nUżytkownik może być teraz normalnie pingowany.`,
                    ephemeral: true
                });

                Logger.info(`Wyłączono ping protection dla ${user.tag} na ${interaction.guild.name}`);
            }
        } else {
            await interaction.reply({
                content: '❌ Wystąpił błąd podczas zmiany ochrony!',
                ephemeral: true
            });
        }
    },
};
