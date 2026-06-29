import Logger from '../utils/logger.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ChannelType, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import ticketDB from '../database/ticket-db.js';
import rulesDB from '../database/rules-db.js';
import messagesDB from '../database/messages-db.js';

export default {
    name: 'interactionCreate',
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) {
                Logger.error(`Nie znaleziono komendy: ${interaction.commandName}`);
                return;
            }
            try {
                await command.execute(interaction);
            } catch (error) {
                Logger.error(`Błąd podczas wykonywania komendy ${interaction.commandName}`, error);

                if (error.code === 10062 || error.code === 40060) {
                    return;
                }

                const errorMessage = { content: '❌ Wystąpił błąd podczas wykonywania tej komendy!', ephemeral: true };
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMessage).catch(() => {});
                } else {
                    await interaction.reply(errorMessage).catch(() => {});
                }
            }
        }

        if (interaction.isButton()) {
            try {
                if (interaction.customId === 'clearall_confirm') await handleClearAllConfirm(interaction);
                else if (interaction.customId === 'clearall_cancel') await handleClearAllCancel(interaction);
                else if (interaction.customId === 'ticket_create') await handleTicketCreate(interaction);
                else if (interaction.customId.startsWith('ticket_category_')) await handleTicketCategory(interaction);
                else if (interaction.customId === 'rules_read') await handleRulesRead(interaction);
                else if (interaction.customId === 'rules_accept') await handleRulesAccept(interaction);
                else if (interaction.customId.startsWith('poll_vote_')) await handlePollVote(interaction);
                else if (interaction.customId === 'giveaway_enter') await handleGiveawayEnter(interaction);
            } catch (error) {
                if (error.code === 10062 || error.code === 40060) {
                    return;
                }
                Logger.error('Błąd podczas obsługi przycisku', error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: '❌ Wystąpił błąd podczas obsługi tej akcji!', ephemeral: true }).catch(() => {});
                }
            }
        }

        if (interaction.isModalSubmit()) {
            try {
                if (interaction.customId.startsWith('rules_setup_')) await handleRulesSetupSubmit(interaction);
                else if (interaction.customId.startsWith('messages_edit_')) await handleMessagesEditSubmit(interaction);
            } catch (error) {
                if (error.code === 10062 || error.code === 40060) {
                    return;
                }
                Logger.error('Błąd podczas obsługi modalu', error);
                await interaction.reply({ content: '❌ Wystąpił błąd podczas przetwarzania!', ephemeral: true }).catch(() => {});
            }
        }
    },
};

async function handleClearAllConfirm(interaction) {
    await interaction.update({ content: '🔄 Czyszczenie kanału...', components: [], ephemeral: true });
    const channel = interaction.channel;
    try {
        // Zapisz wszystkie dane kanału przed usunięciem
        const channelName = channel.name;
        const channelTopic = channel.topic;
        const channelPosition = channel.position;
        const channelNsfw = channel.nsfw;
        const channelSlowmode = channel.rateLimitPerUser;
        const channelParent = channel.parentId;
        const permissionOverwrites = channel.permissionOverwrites.cache.map(overwrite => ({
            id: overwrite.id,
            type: overwrite.type,
            allow: overwrite.allow.toArray(),
            deny: overwrite.deny.toArray(),
        }));

        // Utwórz nowy identyczny kanał
        const newChannel = await channel.guild.channels.create({
            name: channelName,
            topic: channelTopic,
            nsfw: channelNsfw,
            rateLimitPerUser: channelSlowmode,
            parent: channelParent,
            permissionOverwrites: permissionOverwrites,
            position: channelPosition,
        });

        // Usuń stary kanał
        await channel.delete();

        Logger.success(`Wyczyszczono kanał ${channelName} — sklonowano i usunięto oryginał`);

        // Wyślij potwierdzenie na nowym kanale
        await newChannel.send({ content: `✅ Kanał został wyczyszczony przez ${interaction.user}.` });

    } catch (error) {
        Logger.error('Błąd podczas czyszczenia kanału', error);
        try {
            await interaction.editReply({ content: '❌ Wystąpił błąd podczas czyszczenia kanału.' });
        } catch (_) {}
    }
}

async function handleClearAllCancel(interaction) {
    await interaction.update({ content: '❌ Anulowano.', components: [], ephemeral: true });
}

async function handleTicketCreate(interaction) {
    const existingTickets = ticketDB.getTickets(interaction.guild.id);
    const MAX_TICKETS = 3;
    const userOpenTickets = Object.values(existingTickets).filter(t => t.userId === interaction.user.id && t.status === 'open');
    if (userOpenTickets.length >= MAX_TICKETS) {
        return await interaction.reply({ content: `❌ Masz już otwartych ${MAX_TICKETS} ticketów! Zamknij jeden z nich.`, ephemeral: true });
    }
    const categories = ticketDB.getCategories(interaction.guild.id);
    const embed = new EmbedBuilder()
        .setColor('#5865f2')
        .setTitle('🎫 Wybierz Kategorię')
        .setDescription('Wybierz odpowiednią kategorię:')
        .setTimestamp();
    const buttons = categories.slice(0, 5).map(cat =>
        new ButtonBuilder().setCustomId(`ticket_category_${cat.id}`).setLabel(`${cat.emoji} ${cat.name}`).setStyle(ButtonStyle.Primary)
    );
    const row = new ActionRowBuilder().addComponents(...buttons);
    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

async function handleTicketCategory(interaction) {
    const categoryId = interaction.customId.replace('ticket_category_', '');
    const categories = ticketDB.getCategories(interaction.guild.id);
    const category = categories.find(c => c.id === categoryId);
    if (!category) {
        return await interaction.update({ content: '❌ Nieznana kategoria!', embeds: [], components: [] });
    }
    await interaction.update({ content: '🔄 Tworzenie ticketa...', embeds: [], components: [] });
    try {
        const channelName = `ticket-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
        const ticketChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
            ],
        });
        ticketDB.createTicket(interaction.guild.id, ticketChannel.id, interaction.user.id, categoryId);

        if (categoryId === 'dolaczenie') {
            const formEmbed = new EmbedBuilder()
                .setColor('#ff9900')
                .setTitle('⚔️ Formularz Rekrutacyjny CWR')
                .setDescription(
                    `Witaj ${interaction.user}!\n\n` +
                    `Aby dołączyć do klanu CWR, odpowiedz na poniższe pytania.\n` +
                    `**Odpowiadaj numerkami (np. 1: Odpowiedź)**\n\n` +
                    `**1.** Nick z MC\n` +
                    `**2.** Wiek\n` +
                    `**3.** Od ilu miesiecy/lat grasz w MC i na jakich wersjach grałeś/aś\n` +
                    `**4.** Byłeś/aś w innych klanach? (Jak tak to jakich)\n` +
                    `**5.** Wymień cechy które mogły by się przydać w klanie (lub co mógłbyś/mogłabyś robić w gildii)\n` +
                    `**6.** Dlaczego akurat ciebie powinniśmy przyjąć (1/2 zdania może być więcej)\n` +
                    `**7.** Ocen swoje PVP w skali od 1/10\n` +
                    `**8.** Opisz siebie w kilku zdaniach (min. 1 ROZBUDOWANE zdanie)\n` +
                    `**9.** Ile czasu jesteś w stanie poświęcić na grę\n` +
                    `**10.** Dlaczego akurat wybrałeś/aś nas\n` +
                    `**11.** Używasz cheatów czy grasz "legitnie"? (bez lipy można napisać prawdę nic poza ticketem nie wychodzi)\n` +
                    `**12.** Wyślij ss (screenshot) eq i ec\n\n` +
                    `⚠️ **Pamiętaj:** Odpowiadaj numerkami, abyśmy mogli łatwo przejrzeć Twoje odpowiedzi!`
                )
                .setFooter({ text: 'Formularz Rekrutacyjny CWR | Odpowiadaj numerkami!' })
                .setTimestamp();

            const msg = await ticketChannel.send({ embeds: [formEmbed] });

            const recruitmentDescription = `Witaj ${interaction.user}!\n\n` +
                `Aby dołączyć do klanu CWR, odpowiedz na poniższe pytania.\n` +
                `**Odpowiadaj numerkami (np. 1: Odpowiedź)**\n\n` +
                `**1.** Nick z MC\n` +
                `**2.** Wiek\n` +
                `**3.** Od ilu miesiecy/lat grasz w MC i na jakich wersjach grałeś/aś\n` +
                `**4.** Byłeś/aś w innych klanach? (Jak tak to jakich)\n` +
                `**5.** Wymień cechy które mogły by się przydać w klanie (lub co mógłbyś/mogłabyś robić w gildii)\n` +
                `**6.** Dlaczego akurat ciebie powinniśmy przyjąć (1/2 zdania może być więcej)\n` +
                `**7.** Ocen swoje PVP w skali od 1/10\n` +
                `**8.** Opisz siebie w kilku zdaniach (min. 1 ROZBUDOWANE zdanie)\n` +
                `**9.** Ile czasu jesteś w stanie poświęcić na grę\n` +
                `**10.** Dlaczego akurat wybrałeś/aś nas\n` +
                `**11.** Używasz cheatów czy grasz "legitnie"? (bez lipy można napisać prawdę nic poza ticketem nie wychodzi)\n` +
                `**12.** Wyślij ss (screenshot) eq i ec\n\n` +
                `⚠️ **Pamiętaj:** Odpowiadaj numerkami, abyśmy mogli łatwo przejrzeć Twoje odpowiedzi!`;

            messagesDB.trackMessage(interaction.guild.id, msg.id, ticketChannel.id, 'recruitment', {
                title: '⚔️ Formularz Rekrutacyjny CWR',
                description: recruitmentDescription,
                color: '#ff9900',
                footer: 'Formularz Rekrutacyjny CWR | Odpowiadaj numerkami!'
            });
        } else {
            const welcomeEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle(`${category.emoji} Ticket: ${category.name}`)
                .setDescription(`Witaj ${interaction.user}!\n\nKategoria: **${category.name}**\n\nOpisz swój problem. Zespół pomocy wkrótce się odezwie.`)
                .setFooter({ text: 'Aby zamknąć ticket, moderator użyje /ticket close' })
                .setTimestamp();
            await ticketChannel.send({ embeds: [welcomeEmbed] });
        }

        await interaction.editReply({ content: `✅ Utworzono ticket: ${ticketChannel}` });
        Logger.success(`Utworzono ticket dla ${interaction.user.tag}`);
    } catch (error) {
        Logger.error('Błąd podczas tworzenia ticketa', error);
        await interaction.editReply({ content: '❌ Nie udało się utworzyć ticketa.' });
    }
}

async function handleRulesRead(interaction) {
    const config = rulesDB.getConfig(interaction.guild.id);
    if (!config) {
        return await interaction.reply({ content: '❌ System regulaminu nie jest skonfigurowany!', ephemeral: true }).catch(() => {});
    }
    const embed = new EmbedBuilder()
        .setColor('#5865f2')
        .setTitle('📜 Regulamin Serwera')
        .setDescription(config.rulesText.substring(0, 4000))
        .setFooter({ text: 'Przeczytaj cały regulamin i kliknij Akceptuję' })
        .setTimestamp();
    const acceptButton = new ButtonBuilder()
        .setCustomId('rules_accept')
        .setLabel('✅ Akceptuję Regulamin')
        .setStyle(ButtonStyle.Success);
    const row = new ActionRowBuilder().addComponents(acceptButton);
    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true }).catch(() => {});
}

async function handleRulesAccept(interaction) {
    const config = rulesDB.getConfig(interaction.guild.id);
    if (!config) {
        return await interaction.update({ content: '❌ System regulaminu nie jest skonfigurowany!', embeds: [], components: [] }).catch(() => {});
    }
    try {
        const role = interaction.guild.roles.cache.get(config.roleId);
        if (!role) {
            return await interaction.update({ content: '❌ Nie znaleziono roli!', embeds: [], components: [] }).catch(() => {});
        }
        if (interaction.member.roles.cache.has(role.id)) {
            return await interaction.update({ content: '✅ Już zaakceptowałeś regulamin!', embeds: [], components: [] }).catch(() => {});
        }
        await interaction.member.roles.add(role);
        await interaction.update({ content: `✅ **Regulamin zaakceptowany!**\n\nOtrzymałeś rolę ${role}.\nWitamy! 🎉`, embeds: [], components: [] }).catch(() => {});
        Logger.success(`${interaction.user.tag} zaakceptował regulamin`);
    } catch (error) {
        Logger.error('Błąd podczas nadawania roli', error);
    }
}

async function handleRulesSetupSubmit(interaction) {
    if (processedModals.has(interaction.customId)) {
        return await interaction.reply({ content: '✅ Regulamin został już utworzony!', ephemeral: true }).catch(() => {});
    }
    processedModals.add(interaction.customId);
    setTimeout(() => processedModals.delete(interaction.customId), 60000);

    const parts = interaction.customId.split('_');
    const channelId = parts[2];
    const roleId = parts[3];
    const rulesText = interaction.fields.getTextInputValue('rules_text');
    const channel = interaction.guild.channels.cache.get(channelId);
    const role = interaction.guild.roles.cache.get(roleId);
    if (!channel || !role) {
        return await interaction.reply({ content: '❌ Nie znaleziono kanału lub roli!', ephemeral: true }).catch(() => {});
    }

    const cooldownKey = `${interaction.guild.id}_${channelId}`;
    const lastCreated = rulesCooldown.get(cooldownKey);
    if (lastCreated && Date.now() - lastCreated < 30000) {
        return await interaction.reply({ content: '⏳ Poczekaj chwilę przed utworzeniem kolejnego regulaminu!', ephemeral: true }).catch(() => {});
    }
    rulesCooldown.set(cooldownKey, Date.now());

    const success = rulesDB.setConfig(interaction.guild.id, channelId, roleId, rulesText);
    if (!success) {
        return await interaction.reply({ content: '❌ Nie udało się zapisać konfiguracji!', ephemeral: true }).catch(() => {});
    }

    const existingRules = messagesDB.getMessagesByType(interaction.guild.id, 'rules_setup');
    for (const [msgId, msg] of Object.entries(existingRules)) {
        if (msg.channelId === channelId) {
            try {
                const ch = interaction.guild.channels.cache.get(channelId);
                if (ch) {
                    const oldMsg = await ch.messages.fetch(msgId).catch(() => null);
                    if (oldMsg) await oldMsg.delete().catch(() => {});
                }
            } catch (e) {}
            messagesDB.deleteMessage(interaction.guild.id, msgId);
        }
    }

    try {
        const recentMessages = await channel.messages.fetch({ limit: 20 });
        for (const [, msg] of recentMessages) {
            if (msg.author.id === interaction.client.user.id && msg.embeds.length > 0) {
                const title = msg.embeds[0].title || '';
                if (title.includes('Regulamin')) {
                    await msg.delete().catch(() => {});
                    messagesDB.deleteMessage(interaction.guild.id, msg.id);
                }
            }
        }
    } catch (e) {}

    const embedDescription = `**Witaj na serwerze!**\n\nAby uzyskać dostęp, musisz zaakceptować regulamin.\n\n**Krok 1:** Kliknij przycisk poniżej\n**Krok 2:** Przeczytaj cały regulamin\n**Krok 3:** Kliknij ✅ Akceptuję Regulamin\n\nPo akceptacji otrzymasz rolę <@&${role.id}>.`;
    const embed = new EmbedBuilder()
        .setColor('#5865f2')
        .setTitle('📜 Regulamin Serwera')
        .setDescription(embedDescription)
        .setFooter({ text: 'System Akceptacji Regulaminu' })
        .setTimestamp();
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rules_read').setLabel('📜 Przeczytaj Regulamin').setStyle(ButtonStyle.Primary)
    );
    try {
        const msg = await channel.send({ embeds: [embed], components: [row] });

        messagesDB.trackMessage(interaction.guild.id, msg.id, channelId, 'rules_setup', {
            title: '📜 Regulamin Serwera',
            description: `**Witaj na serwerze!**\n\nAby uzyskać dostęp, musisz zaakceptować regulamin.\n\n**Krok 1:** Kliknij przycisk poniżej\n**Krok 2:** Przeczytaj cały regulamin\n**Krok 3:** Kliknij ✅ Akceptuję Regulamin\n\nPo akceptacji otrzymasz rolę {role}.`,
            color: '#5865f2',
            footer: 'System Akceptacji Regulaminu',
            roleName: role.name
        });

        await interaction.reply({
            content: `✅ **System regulaminu skonfigurowany!**\n\n📍 Kanał: ${channel}\n🎭 Rola: ${role}\n📝 Regulamin: ${rulesText.length} znaków`,
            ephemeral: true
        }).catch(() => {});
        Logger.success(`Skonfigurowano regulamin na ${interaction.guild.name}`);
    } catch (error) {
        Logger.error('Błąd podczas wysyłania wiadomości', error);
    }
}

async function handlePollVote(interaction) {
    const optionIndex = interaction.customId.replace('poll_vote_', '');

    for (const row of interaction.message.components) {
        for (const button of row.components) {
            if (button.customId === interaction.customId) {
                const emoji = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'][parseInt(optionIndex)];
                await interaction.reply({
                    content: `Oddałeś głos na: ${emoji} ${button.label}`,
                    ephemeral: true
                });
                return;
            }
        }
    }
}

const activeGiveaways = new Map();
const rulesCooldown = new Map();
const processedModals = new Set();

async function handleGiveawayEnter(interaction) {
    const giveawayId = interaction.message.id;
    const giveaway = activeGiveaways.get(giveawayId);

    if (!giveaway) {
        return await interaction.reply({ content: '❌ Ta loteria już się zakończyła!', ephemeral: true });
    }

    if (giveaway.participants.includes(interaction.user.id)) {
        giveaway.participants = giveaway.participants.filter(id => id !== interaction.user.id);
        await interaction.reply({ content: '❌ Wycofałeś się z loterii.', ephemeral: true });
    } else {
        giveaway.participants.push(interaction.user.id);
        await interaction.reply({ content: '✅ Dołączyłeś do loterii!', ephemeral: true });
    }
}

async function handleMessagesEditSubmit(interaction) {
    const parts = interaction.customId.split('_');
    const messageId = parts[2];
    const guildId = parts[3];

    const tracked = messagesDB.getMessage(guildId, messageId);

    if (!tracked) {
        return await interaction.reply({ content: '❌ Nie znaleziono wiadomości w bazie!', ephemeral: true }).catch(() => {});
    }

    const newTitle = interaction.fields.getTextInputValue('msg_title') || tracked.config.title;
    const newColor = interaction.fields.getTextInputValue('msg_color') || tracked.config.color;
    const newFooter = interaction.fields.getTextInputValue('msg_footer') || tracked.config.footer;
    let newDescription = interaction.fields.getTextInputValue('msg_description') || tracked.config.description;
    const roleName = interaction.fields.getTextInputValue('msg_role') || tracked.config.roleName;

    if (roleName) {
        const role = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
        if (role) {
            newDescription = newDescription.replace(/{role}/g, `<@&${role.id}>`);
        }
    }

    const newConfig = {
        title: newTitle,
        color: newColor,
        footer: newFooter,
        description: newDescription,
        roleName: roleName
    };

    messagesDB.updateMessage(guildId, messageId, newConfig);

    try {
        const channel = interaction.guild.channels.cache.get(tracked.channelId);
        if (!channel) {
            return await interaction.reply({ content: '❌ Nie znaleziono kanału!', ephemeral: true }).catch(() => {});
        }

        const message = await channel.messages.fetch(messageId);

        const newEmbed = new EmbedBuilder()
            .setColor(newColor)
            .setTitle(newTitle)
            .setDescription(newDescription)
            .setFooter({ text: newFooter })
            .setTimestamp();

        await message.edit({ embeds: [newEmbed] });

        await interaction.reply({ content: '✅ Zaktualizowano wiadomość!', ephemeral: true }).catch(() => {});
        Logger.success(`Zaktualizowano wiadomość ${messageId} na ${interaction.guild.name}`);
    } catch (error) {
        Logger.error('Błąd podczas aktualizacji wiadomości', error);
        await interaction.reply({ content: '❌ Nie udało się zaktualizować wiadomości!', ephemeral: true }).catch(() => {});
    }
}

export { activeGiveaways };
