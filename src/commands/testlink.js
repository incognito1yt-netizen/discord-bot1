import { SlashCommandBuilder } from 'discord.js';
import { detectLinks } from '../utils/automod.js';

export default {
    data: new SlashCommandBuilder()
        .setName('testlink')
        .setDescription('[DEBUG] Test wykrywania linków')
        .addStringOption(option =>
            option.setName('text')
                .setDescription('Tekst do przetestowania')
                .setRequired(true)),

    async execute(interaction) {
        const text = interaction.options.getString('text');
        const detected = detectLinks(text);

        const results = [];
        for (const [type, isDetected] of Object.entries(detected)) {
            results.push(`${type}: ${isDetected ? '✅ WYKRYTO' : '❌ NIE'}`);
        }

        await interaction.reply({
            content: `**Test wykrywania linków:**\n\nTekst: \`${text}\`\n\n${results.join('\n')}`,
            ephemeral: true
        });
    },
};
