// Lista wulgaryzmów - polskie i angielskie
export const PROFANITY_LIST = {
    polish: [
        // Podstawowe przekleństwa
        'kurwa', 'kurwo', 'kurwy', 'kurwą', 'kurwie',
        'chuj', 'chuja', 'chujek', 'chuju', 'chujem',
        'pizda', 'pizdo', 'pizdy', 'pizdą', 'piździe',
        'jebać', 'jebak', 'jebany', 'jebana', 'jebane',
        'pierdol', 'pierdolić', 'pierdolony', 'pierdolona',
        'skurwysyn', 'skurwiel', 'skurwielu',
        'cipka', 'cipko', 'cipce', 'cipą',
        'dupa', 'dupie', 'dupą', 'dupsko',
        'gówno', 'gówna', 'gównem',
        'cwel', 'cwele', 'cwelu',
        'dziwka', 'dziwko', 'dziwki',
        'suka', 'suko', 'suki',
        'zajebiste', 'zajebisty', 'zajebista',
        'pojebany', 'pojebana', 'pojebane',
        'spierdalaj', 'spierdolić',
        'wkurw', 'wkurwia', 'wkurwiony',
        'kuttas', 'kutas', 'kutasa',
        'pedał', 'pedały', 'pedale',
        'homoś', 'homosie', 'homo',
        'cipa', 'cipę', 'cipy',
        // Warianty z literówkami
        'kurfa', 'kurła', 'kurna',
        'huj', 'xuj',
        'pizde', 'pisdą',
        'jeban', 'jebane',
    ],
    english: [
        'fuck', 'fucking', 'fucked', 'fucker', 'fck', 'fuk',
        'shit', 'shitty', 'bullshit',
        'bitch', 'bitches', 'btch',
        'ass', 'asshole', 'arse',
        'dick', 'cock', 'penis',
        'pussy', 'cunt',
        'damn', 'dammit',
        'bastard', 'bastards',
        'whore', 'slut', 'sluts',
        'nigger', 'nigga', 'negro',
        'fag', 'faggot', 'fags',
        'retard', 'retarded',
        'rape', 'raping', 'raped',
        'sex', 'porn', 'xxx',
        'nazi', 'hitler',
    ]
};

// Funkcja sprawdzająca czy tekst zawiera wulgaryzmy
export function containsProfanity(text) {
    if (!text || typeof text !== 'string') return { found: false };

    const normalized = text.toLowerCase()
        .replace(/[óo]/g, 'o')
        .replace(/[ąa]/g, 'a')
        .replace(/[ęe]/g, 'e')
        .replace(/[śs]/g, 's')
        .replace(/[łl]/g, 'l')
        .replace(/[żźz]/g, 'z')
        .replace(/[ćc]/g, 'c')
        .replace(/[ńn]/g, 'n')
        // Remove special characters and numbers that might be used to bypass
        .replace(/[0@]/g, 'o')
        .replace(/[1!|]/g, 'i')
        .replace(/[3]/g, 'e')
        .replace(/[4]/g, 'a')
        .replace(/[5\$]/g, 's')
        .replace(/[7]/g, 't')
        .replace(/[8]/g, 'b')
        .replace(/[\*]/g, '')
        .replace(/[_\-\.]/g, '');

    // Check Polish profanity
    for (const word of PROFANITY_LIST.polish) {
        const regex = new RegExp(`\\b${word}\\b|${word}`, 'i');
        if (regex.test(normalized)) {
            return { found: true, word, language: 'polish' };
        }
    }

    // Check English profanity
    for (const word of PROFANITY_LIST.english) {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        if (regex.test(normalized)) {
            return { found: true, word, language: 'english' };
        }
    }

    return { found: false };
}

// Funkcja cenzurująca tekst (zamienia wulgaryzmy na ***)
export function censorText(text) {
    if (!text || typeof text !== 'string') return text;

    let censored = text;
    const allWords = [...PROFANITY_LIST.polish, ...PROFANITY_LIST.english];

    for (const word of allWords) {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        censored = censored.replace(regex, '*'.repeat(word.length));
    }

    return censored;
}
