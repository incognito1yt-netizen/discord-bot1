import { EmbedBuilder } from 'discord.js';
import welcomeDB from '../database/welcome-db.js';
import Logger from '../utils/logger.js';

export default {
    name: 'guildMemberAdd',
    async execute(member) {
        const config = welcomeDB.getConfig(member.guild.id);

        if (!config || !config.enabled) return;

        const channel = member.guild.channels.cache.get(config.channelId);
        if (!channel) {
            Logger.warn(`Kanał powitalny ${config.channelId} nie istnieje na serwerze ${member.guild.name}`);
            return;
        }

        const formatted = formatWelcomeMessage(config.message, member, member.guild);

        try {
            if (config.useEmbed) {
                const embed = new EmbedBuilder()
                    .setColor(config.embedColor || '#00ff00')
                    .setDescription(formatted)
                    .setThumbnail(member.user.displayAvatarURL())
                    .setTimestamp();

                await channel.send({ embeds: [embed] });
            } else {
                await channel.send(formatted);
            }

            Logger.info(`Wysłano wiadomość powitalną dla ${member.user.tag} na serwerze ${member.guild.name}`);
        } catch (error) {
            Logger.error(`Błąd podczas wysyłania wiadomości powitalnej dla ${member.user.tag}`, error);
        }
    },
};

function formatWelcomeMessage(message, member, guild) {
    return message
        .replace(/{user}/g, `<@${member.id}>`)
        .replace(/{username}/g, member.user.username)
        .replace(/{server}/g, guild.name)
        .replace(/{memberCount}/g, guild.memberCount.toString());
}
