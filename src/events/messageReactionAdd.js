import database from '../database/db.js';
import config from '../config.js';
import Logger from '../utils/logger.js';

export default {
    name: 'messageReactionAdd',
    async execute(reaction, user) {
        // Ignore bot reactions
        if (user.bot) return;

        // Fetch the message if it's partial
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                Logger.error('Błąd podczas pobierania reakcji', error);
                return;
            }
        }

        // Check if this is a verification message
        const verificationConfig = database.getVerificationByMessage(reaction.message.id);

        if (!verificationConfig) return;

        // Check if the reaction is the verification emoji
        if (reaction.emoji.name !== config.verificationEmoji) return;

        try {
            // Get the guild and member
            const guild = reaction.message.guild;
            const member = await guild.members.fetch(user.id);

            // Get the role to assign
            const role = await guild.roles.fetch(verificationConfig.roleId);

            if (!role) {
                Logger.error(`Nie znaleziono roli o ID ${verificationConfig.roleId}`);
                return;
            }

            // Check if member already has the role
            if (member.roles.cache.has(role.id)) {
                Logger.info(`Użytkownik ${user.tag} już posiada rolę ${role.name}`);
                return;
            }

            // Add the role
            await member.roles.add(role);
            Logger.success(`Przypisano rolę ${role.name} użytkownikowi ${user.tag}`);

            // Try to send a DM to the user (optional)
            try {
                await user.send(`✅ Weryfikacja pomyślna! Otrzymałeś rolę **${role.name}** na serwerze **${guild.name}**.`);
            } catch (error) {
                // User has DMs disabled, that's okay
                Logger.warn(`Nie można wysłać wiadomości DM do ${user.tag}`);
            }
        } catch (error) {
            Logger.error(`Błąd podczas przypisywania roli użytkownikowi ${user.tag}`, error);
        }
    },
};
