import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import database from '../database/db.js';
import messagesDB from '../database/messages-db.js';
import config from '../config.js';
import Logger from '../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('verificationchannel')
        .setDescription('Konfiguruje kanał weryfikacyjny z systemem reakcji')
        .addChannelOption(option =>
            option
                .setName('kanał')
                .setDescription('Kanał, na którym zostanie wysłana wiadomość weryfikacyjna')
                .setRequired(true)
        )
        .addRoleOption(option =>
            option
                .setName('rola')
                .setDescription('Rola, która zostanie przypisana po weryfikacji')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // Check if user has administrator permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({
                content: '❌ Nie masz uprawnień do użycia tej komendy! Wymagane uprawnienie: **ADMINISTRATOR**',
                ephemeral: true
            });
        }

        const channel = interaction.options.getChannel('kanał');
        const role = interaction.options.getRole('rola');

        // Verify it's a text channel
        if (!channel.isTextBased()) {
            return await interaction.reply({
                content: '❌ Wybrany kanał nie jest kanałem tekstowym!',
                ephemeral: true
            });
        }

        // Check if bot has required permissions in that channel
        const botPermissions = channel.permissionsFor(interaction.guild.members.me);

        if (!botPermissions.has([
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.AddReactions,
            PermissionFlagsBits.ManageRoles
        ])) {
            return await interaction.reply({
                content: '❌ Bot nie ma wystarczających uprawnień! Wymagane: **VIEW_CHANNEL**, **SEND_MESSAGES**, **ADD_REACTIONS**, **MANAGE_ROLES**',
                ephemeral: true
            });
        }

        // Check if bot can manage the role (role hierarchy)
        if (role.position >= interaction.guild.members.me.roles.highest.position) {
            return await interaction.reply({
                content: '❌ Nie mogę zarządzać tą rolą! Rola bota musi być wyżej w hierarchii niż wybrana rola.',
                ephemeral: true
            });
        }

        // Check if role is @everyone
        if (role.id === interaction.guild.id) {
            return await interaction.reply({
                content: '❌ Nie można użyć roli @everyone!',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            // Create verification embed
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🛡️ Weryfikacja')
                .setDescription(
                    `Witaj na serwerze **${interaction.guild.name}**!\n\n` +
                    `Aby uzyskać dostęp do serwera, zareaguj na tę wiadomość emoji ${config.verificationEmoji}\n\n` +
                    `Po weryfikacji otrzymasz rolę @${role.name}`
                )
                .setFooter({ text: 'System weryfikacji' })
                .setTimestamp();

            // Send the verification message
            const message = await channel.send({ embeds: [embed] });

            // Track the message for editing
            messagesDB.trackMessage(interaction.guild.id, message.id, channel.id, 'verification', {
                title: '🛡️ Weryfikacja',
                description: `Witaj na serwerze **${interaction.guild.name}**!\n\nAby uzyskać dostęp do serwera, zareaguj na tę wiadomość emoji ${config.verificationEmoji}\n\nPo weryfikacji otrzymasz rolę @${role.name}`,
                color: '#00ff00',
                footer: 'System weryfikacji'
            });

            // Add reaction
            await message.react(config.verificationEmoji);

            // Save to database
            const saved = database.saveVerificationChannel(
                interaction.guild.id,
                channel.id,
                role.id,
                message.id
            );

            if (!saved) {
                throw new Error('Nie udało się zapisać konfiguracji do bazy danych');
            }

            await interaction.followUp({
                content: `✅ Kanał weryfikacyjny został skonfigurowany!\n\n` +
                    `📍 Kanał: ${channel}\n` +
                    `👤 Rola: ${role}\n` +
                    `📨 ID wiadomości: \`${message.id}\``,
                ephemeral: true
            });

            Logger.success(
                `Skonfigurowano kanał weryfikacyjny na serwerze ${interaction.guild.name} (${interaction.guild.id})`
            );
        } catch (error) {
            Logger.error('Błąd podczas konfigurowania kanału weryfikacyjnego', error);

            await interaction.followUp({
                content: '❌ Wystąpił błąd podczas konfigurowania kanału weryfikacyjnego!',
                ephemeral: true
            });
        }
    },
};
