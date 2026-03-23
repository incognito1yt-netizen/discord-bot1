import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Load all commands
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = await import(`file://${filePath}`);

    if (command.default && 'data' in command.default) {
        commands.push(command.default.data.toJSON());
        console.log(`✅ Załadowano komendę: ${command.default.data.name}`);
    }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// Deploy commands
(async () => {
    try {
        console.log(`\n🔄 Rozpoczęto rejestrację ${commands.length} komend slash...`);

        // Register commands globally (can take up to 1 hour to propagate)
        // For faster testing, use guild-specific registration instead
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log(`✅ Pomyślnie zarejestrowano ${data.length} komend slash globalnie!`);
        console.log('\n📝 Zarejestrowane komendy:');
        data.forEach(cmd => {
            console.log(`   - /${cmd.name}: ${cmd.description}`);
        });
        console.log('\n⚠️  Uwaga: Komendy globalne mogą potrzebować do 1 godziny na propagację.');
        console.log('💡 Dla szybszego testowania możesz zarejestrować komendy per-serwer.');

    } catch (error) {
        console.error('❌ Błąd podczas rejestracji komend:', error);
    }
})();
