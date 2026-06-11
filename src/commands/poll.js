import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import Logger from '../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Twórz ankiety')
        .addStringOption(opt =>
            opt.setName('pytanie')
                .setDescription('Pytanie do ankiety')
                .setRequired(true))
        .addStringOption(opt =>
            opt.setName('opcje')
                .setDescription('Opcje oddzielone przecinkiem (max 10)')
                .setRequired(false))
        .addIntegerOption(opt =>
            opt.setName('czas')
                .setDescription('Czas trwania w minutach (bez limitu = domyślnie)')
                .setMinValue(1)
                .setMaxValue(10080)
                .setRequired(false)),

    async execute(interaction) {
        const question = interaction.options.getString('pytanie');
        const optionsRaw = interaction.options.getString('opcje');
        const duration = interaction.options.getInteger('czas');

        let options = [];
        if (optionsRaw) {
            options = optionsRaw.split(',').map(o => o.trim()).filter(o => o.length > 0);
        }

        if (options.length > 10) {
            return await interaction.reply({
                content: '❌ Maksymalnie 10 opcji!',
                ephemeral: true
            });
        }

        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

        let description = `**${question}**\n\n`;
        if (options.length > 0) {
            description += options.map((opt, i) => `${emojis[i]} ${opt}`).join('\n');
        } else {
            description += '✅ Tak\n❌ Nie';
            options = ['Tak', 'Nie'];
        }

        if (duration) {
            description += `\n\n⏱️ Koniec za: ${duration} min`;
        }

        const embed = new EmbedBuilder()
            .setColor('#5865f2')
            .setTitle('📊 Ankieta')
            .setDescription(description)
            .setFooter({ text: `Ankieta od ${interaction.user.tag}` })
            .setTimestamp();

        const components = [];
        if (options.length > 0) {
            const row = new ActionRowBuilder();
            options.forEach((opt, i) => {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`poll_vote_${i}`)
                        .setLabel(opt.substring(0, 80))
                        .setStyle(ButtonStyle.Secondary)
                );
            });
            components.push(row);
        }

        const pollMsg = await interaction.reply({ embeds: [embed], components, fetchReply: true });

        Logger.success(`Utworzono ankietę: ${question}`);

        if (duration) {
            setTimeout(async () => {
                try {
                    const msg = await interaction.channel.messages.fetch(pollMsg.id);
                    const results = {};

                    for (const row of msg.components) {
                        for (const button of row.components) {
                            results[button.customId] = 0;
                        }
                    }

                    for (const [userId, reaction] of msg.reactions.cache) {
                        const users = await reaction.users.fetch();
                        results[reaction.customId] = users.size - 1;
                    }

                    let resultText = '';
                    for (let i = 0; i < options.length; i++) {
                        const votes = results[`poll_vote_${i}`] || 0;
                        resultText += `${emojis[i]} ${options[i]}: **${votes}** głosów\n`;
                    }

                    const resultEmbed = new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle('📊 Wyniki Ankiety')
                        .setDescription(`**${question}**\n\n${resultText}`)
                        .setFooter({ text: 'Ankieta zakończona' })
                        .setTimestamp();

                    await msg.edit({ embeds: [resultEmbed], components: [] });
                    Logger.info(`Ankieta zakończona: ${question}`);
                } catch (error) {
                    Logger.error('Błąd podczas kończenia ankiety', error);
                }
            }, duration * 60 * 1000);
        }
    },
};
