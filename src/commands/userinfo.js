import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Wyświetl informacje o użytkowniku')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('Użytkownik')
                .setRequired(false)),

    async execute(interaction) {
        const user = interaction.options.getUser('user') || interaction.user;
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        const embed = new EmbedBuilder()
            .setColor('#5865f2')
            .setTitle(`👤 Informacje o ${user.tag}`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '🆔 ID', value: user.id, inline: true },
                { name: '📛 Nazwa', value: user.tag, inline: true },
                { name: '🤖 Bot', value: user.bot ? 'Tak' : 'Nie', inline: true },
                { name: '📅 Konto utworzone', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true }
            )
            .setTimestamp();

        if (member) {
            embed.addFields(
                { name: '📅 Dołączył na serwer', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: '🎭 Najwyższa rola', value: member.roles.highest.toString(), inline: true },
                { name: '📊 Role', value: member.roles.cache.size > 1 ? member.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => r.toString()).join(', ') : 'Brak', inline: false }
            );

            if (member.premiumSince) {
                embed.addFields({ name: '💎 Nitro Boost od', value: `<t:${Math.floor(member.premiumSince / 1000)}:R>`, inline: true });
            }
        }

        await interaction.reply({ embeds: [embed] });
    },
};
