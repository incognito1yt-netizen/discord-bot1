import dotenv from 'dotenv';

dotenv.config();

console.log('=== Test zmiennych środowiskowych ===\n');
console.log('DISCORD_TOKEN:', process.env.DISCORD_TOKEN ? '✅ USTAWIONY (' + process.env.DISCORD_TOKEN.substring(0, 20) + '...)' : '❌ BRAK');
console.log('CLIENT_ID:', process.env.CLIENT_ID ? '✅ USTAWIONY (' + process.env.CLIENT_ID + ')' : '❌ BRAK');
console.log('\nPełna zawartość process.env.DISCORD_TOKEN:', process.env.DISCORD_TOKEN);
console.log('Pełna zawartość process.env.CLIENT_ID:', process.env.CLIENT_ID);
