import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import Logger from '../utils/logger.js';
import { activeGiveaways } from '../events/interactionCreate.js';

export default {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Losowanie nagród')
        .addSubcommand(sub =>
            sub.setName('start')
                .setDescription('Rozpocznij losowanie')
                .addStringOption(opt =>
                    opt.setName('nagroda')
                        .setDescription('Co jest do wygrania?')
                        .setRequired(true))
                .addIntegerOption(opt =>
                    opt.setName('czas')
                        .setDescription('Czas trwania w minutach')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(10080))
                .addIntegerOption(opt =>
                    opt.setName('wygranych')
                        .setDescription('Liczba zwycięzców')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(20)))
        .addSubcommand(sub =>
            sub.setName('end')
                .setDescription('Zakończ losowanie')
                .addStringOption(opt =>
                    opt.setName('id')
                        .setDescription('ID wiadomości losowania')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'start') {
            await handleGiveawayStart(interaction);
        } else if (subcommand === 'end') {
            await handleGiveawayEnd(interaction);
        }
    },
};

async function handleGiveawayStart(interaction) {
    const prize = interaction.options.getString('nagroda');
    const duration = interaction.options.getInteger('czas');
    const winnersCount = interaction.options.getInteger('wygranych') || 1;

    const endTime = new Date(Date.now() + duration * 60 * 1000);

    const embed = new EmbedBuilder()
        .setColor('#ff00ff')
        .setTitle('🎉 GIVEAWAY 🎉')
        .setDescription(
            `**Nagroda:** ${prize}\n\n` +
            `**Czas trwania:** ${duration} min\n` +
            `**Zwycięzcy:** ${winnersCount}\n\n` +
            `**Koniec:** <t:${Math.floor(endTime.getTime() / 1000)}:R>\n\n` +
            `Kliknij 🎉 aby dołączyć!`
        )
        .setFooter({ text: `Giveaway od ${interaction.user.tag}` })
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('giveaway_enter')
                .setLabel('🎉 Dołącz')
                .setStyle(ButtonStyle.Success)
        );

    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    activeGiveaways.set(msg.id, {
        prize,
        winnersCount,
        participants: [],
        createdBy: interaction.user.id,
        channelId: interaction.channel.id,
        guildId: interaction.guild.id
    });

    Logger.success(`Rozpoczęto giveaway: ${prize}`);

    setTimeout(async () => {
        const giveaway = activeGiveaways.get(msg.id);
        if (!giveaway) return;

        activeGiveaways.delete(msg.id);

        const channel = interaction.guild.channels.cache.get(giveaway.channelId);
        if (!channel) return;

        try {
            const fetchedMsg = await channel.messages.fetch(msg.id);

            if (giveaway.participants.length === 0) {
                const noWinnerEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('🎉 GIVEAWAY ZAKOŃCZONY 🎉')
                    .setDescription(
                        `**Nagroda:** ${giveaway.prize}\n\n` +
                        `❌ Nikt nie dołączył do losowania.`
                    )
                    .setTimestamp();

                await fetchedMsg.edit({ embeds: [noWinnerEmbed], components: [] });
                return;
            }

            const shuffled = [...giveaway.participants].sort(() => 0.5 - Math.random());
            const winners = shuffled.slice(0, Math.min(giveaway.winnersCount, shuffled.length));

            const winnerMentions = winners.map(id => `<@${id}>`).join(', ');

            const resultEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🎉 GIVEAWAY ZAKOŃCZONY 🎉')
                .setDescription(
                    `**Nagroda:** ${giveaway.prize}\n\n` +
                    `**Zwycięzcy:** ${winnerMentions}\n\n` +
                    `Gratulacje! 🎊`
                )
                .setTimestamp();

            await fetchedMsg.edit({ embeds: [resultEmbed], components: [] });

            await channel.send(`🎉 **${winnerMentions}** wygrał(a) **${giveaway.prize}**!`);

            Logger.info(`Giveaway zakończony: ${giveaway.prize} - Zwycięzcy: ${winners.join(', ')}`);
        } catch (error) {
            Logger.error('Błąd podczas kończenia giveaway', error);
        }
    }, duration * 60 * 1000);
}

async function handleGiveawayEnd(interaction) {
    const messageId = interaction.options.getString('id');

    const giveaway = activeGiveaways.get(messageId);
    if (!giveaway) {
        return await interaction.reply({
            content: '❌ Nie znaleziono losowania o tym ID lub już się zakończyło!',
            ephemeral: true
        });
    }

    if (giveaway.createdBy !== interaction.user.id && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return await interaction.reply({
            content: '❌ Tylko twórca losowania lub administrator może je zakończyć!',
            ephemeral: true
        });
    }

    activeGiveaways.delete(messageId);

    const channel = interaction.guild.channels.cache.get(giveaway.channelId);
    if (!channel) {
        return await interaction.reply({ content: '❌ Nie znaleziono kanału!', ephemeral: true });
    }

    try {
        const msg = await channel.messages.fetch(messageId);

        if (giveaway.participants.length === 0) {
            const noWinnerEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('🎉 GIVEAWAY ZAKOŃCZONY 🎉')
                .setDescription(
                    `**Nagroda:** ${giveaway.prize}\n\n` +
                    `❌ Nikt nie dołączył do losowania.`
                )
                .setTimestamp();

            await msg.edit({ embeds: [noWinnerEmbed], components: [] });
            await interaction.reply({ content: '✅ Giveaway zakończony (brak uczestników).', ephemeral: true });
            return;
        }

        const shuffled = [...giveaway.participants].sort(() => 0.5 - Math.random());
        const winners = shuffled.slice(0, Math.min(giveaway.winnersCount, shuffled.length));
        const winnerMentions = winners.map(id => `<@${id}>`).join(', ');

        const resultEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🎉 GIVEAWAY ZAKOŃCZONY 🎉')
            .setDescription(
                `**Nagroda:** ${giveaway.prize}\n\n` +
                `**Zwycięzcy:** ${winnerMentions}\n\n` +
                `Gratulacje! 🎊`
            )
            .setTimestamp();

        await msg.edit({ embeds: [resultEmbed], components: [] });

        await channel.send(`🎉 **${winnerMentions}** wygrał(a) **${giveaway.prize}**!`);

        await interaction.reply({ content: '✅ Giveaway zakończony!', ephemeral: true });

        Logger.info(`Giveaway ręcznie zakończony: ${giveaway.prize}`);
    } catch (error) {
        Logger.error('Błąd podczas kończenia giveaway', error);
        await interaction.reply({ content: '❌ Wystąpił błąd podczas kończenia losowania.', ephemeral: true });
    }
}
