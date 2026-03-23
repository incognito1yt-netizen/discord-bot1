import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import Logger from '../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Usuń określoną liczbę wiadomości')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Liczba wiadomości do usunięcia (1-1000)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(1000))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Usuń tylko wiadomości od tego użytkownika'))
        .addStringOption(option =>
            option.setName('contains')
                .setDescription('Usuń tylko wiadomości zawierające ten tekst'))
        .addBooleanOption(option =>
            option.setName('bots')
                .setDescription('Usuń tylko wiadomości od botów'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');
        const targetUser = interaction.options.getUser('user');
        const contains = interaction.options.getString('contains');
        const botsOnly = interaction.options.getBoolean('bots');

        await interaction.deferReply({ ephemeral: true });

        const channel = interaction.channel;
        let deletedCount = 0;
        let toDelete = amount;

        try {
            while (toDelete > 0) {
                const fetchLimit = Math.min(toDelete, 100);
                const messages = await channel.messages.fetch({ limit: fetchLimit });

                if (messages.size === 0) break;

                // Apply filters
                let filteredMessages = messages;

                if (targetUser) {
                    filteredMessages = filteredMessages.filter(msg => msg.author.id === targetUser.id);
                }

                if (contains) {
                    filteredMessages = filteredMessages.filter(msg =>
                        msg.content.toLowerCase().includes(contains.toLowerCase())
                    );
                }

                if (botsOnly) {
                    filteredMessages = filteredMessages.filter(msg => msg.author.bot);
                }

                if (filteredMessages.size === 0) {
                    // No more messages matching filters
                    break;
                }

                // Separate recent and old messages
                const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
                const recentMessages = filteredMessages.filter(msg => msg.createdTimestamp > twoWeeksAgo);
                const oldMessages = filteredMessages.filter(msg => msg.createdTimestamp <= twoWeeksAgo);

                // Bulk delete recent messages
                if (recentMessages.size > 0) {
                    await channel.bulkDelete(recentMessages, true);
                    deletedCount += recentMessages.size;
                    Logger.info(`Purge: usunięto ${recentMessages.size} nowych wiadomości`);
                }

                // Individual delete for old messages
                for (const [, message] of oldMessages) {
                    try {
                        await message.delete();
                        deletedCount++;

                        if (deletedCount % 5 === 0) {
                            await interaction.editReply({
                                content: `🔄 Usuwanie... (${deletedCount}/${amount})`,
                            });
                            // Rate limit
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    } catch (err) {
                        Logger.warn(`Nie udało się usunąć wiadomości ${message.id}`);
                    }
                }

                toDelete -= filteredMessages.size;

                // If we got less than requested, we've run out of messages
                if (messages.size < fetchLimit) break;
            }

            const filters = [];
            if (targetUser) filters.push(`od ${targetUser.tag}`);
            if (contains) filters.push(`zawierające "${contains}"`);
            if (botsOnly) filters.push('od botów');

            await interaction.editReply({
                content: `✅ Usunięto **${deletedCount}** wiadomości${filters.length > 0 ? ` (${filters.join(', ')})` : ''}`,
            });

            Logger.success(`${interaction.user.tag} wykonał purge: ${deletedCount} wiadomości`);
        } catch (error) {
            Logger.error('Błąd podczas purge', error);
            await interaction.editReply({
                content: `❌ Wystąpił błąd. Usunięto ${deletedCount} wiadomości przed błędem.`,
            });
        }
    },
};
