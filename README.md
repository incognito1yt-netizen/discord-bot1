# Discord Bot

Bot Discord z systemem weryfikacji i zarządzaniem kanałami, napisany w Discord.js v14.

## 🚀 Funkcje

### 🛡️ System Automoderacji
- **`/automod`** - Kompleksowy system automoderacji
  - Auto-wykrywanie linków (YouTube, Discord invites, wszystkie linki)
  - System ostrzeżeń z automatycznym banem po limicie
  - Konfigurowalne kary (warn/mute/kick/ban) i czasy
  - Rola bypass dla moderatorów
  - Szczegółowe logi i statystyki

### ⚖️ Komendy Moderacyjne
- **`/ban @user [czas] [powód]`** - Zbanuj użytkownika (temporary/permanent)
- **`/unban [user_id] [powód]`** - Odbanuj użytkownika
- **`/kick @user [powód]`** - Wyrzuć użytkownika
- **`/timeout @user [czas] [powód]`** - Wycisz użytkownika (60s-7d)
- **`/unmute @user`** - Usuń wyciszenie
- **`/warn @user [powód]`** - Daj ostrzeżenie (integracja z automod)
- **`/purge [liczba] [filtry]`** - Masowe usuwanie wiadomości
  - Filtry: user, bots, contains

### 👋 Auto-Welcome
- **`/autowelcome setup #kanał`** - Konfiguruj kanał powitalny
- **`/autowelcome message [tekst]`** - Ustaw wiadomość ({user}, {server}, {memberCount})
- **`/autowelcome embed [true/false]`** - Włącz/wyłącz embedy
- **`/autowelcome test`** - Przetestuj wiadomość
- **`/autowelcome disable`** - Wyłącz system

### 📊 Statystyki
- **`/stats server`** - Statystyki serwera (członkowie, kanały, role)
- **`/stats user @user`** - Statystyki użytkownika (dołączenie, role)

### 🗑️ Zarządzanie Wiadomościami
- **`/clearall #kanał`** - Usuwa wszystkie wiadomości z wybranego kanału
  - Wymaga uprawnień ADMINISTRATOR
  - System potwierdzenia przed wykonaniem
  - Obsługa błędów i limitów Discord API
  - **Usuwa również wiadomości starsze niż 14 dni** (pojedynczo)

### ✅ System Weryfikacji  
- **`/verificationchannel #kanał @rola`** - Konfiguruje kanał weryfikacyjny
  - Wysyła wiadomość weryfikacyjną z reakcją ✅
  - Automatyczne przypisywanie roli po kliknięciu reakcji
  - Zapisuje konfigurację w bazie danych JSON

### ❓ Pomoc
- **`/help [komenda]`** - System pomocy
  - Lista wszystkich komend
  - Szczegółowa pomoc dla każdej komendy
  - Przykłady użycia

## 📋 Wymagania

- Node.js v16.9.0 lub nowszy
- Bot Discord z odpowiednimi uprawnieniami

## 🔧 Instalacja

1. Sklonuj repozytorium lub pobierz pliki

2. Zainstaluj zależności:
```bash
npm install
```

3. Skonfiguruj plik `.env` (skopiuj z `.env.example`):
```env
DISCORD_TOKEN=twoj_token_bota
CLIENT_ID=id_aplikacji_bota
```

4. Zarejestruj komendy slash:
```bash
npm run deploy
```

5. Uruchom bota:
```bash
npm start
```

## 🤖 Utwórz bota Discord

1. Przejdź do [Discord Developer Portal](https://discord.com/developers/applications)
2. Kliknij "New Application" i nadaj nazwę
3. Przejdź do zakładki "Bot" i kliknij "Add Bot"
4. Skopiuj token bota (DISCORD_TOKEN)
5. Skopiuj Application ID z zakładki "General Information" (CLIENT_ID)
6. W zakładce "Bot" włącz następujące **Privileged Gateway Intents**:
   - SERVER MEMBERS INTENT
   - MESSAGE CONTENT INTENT (opcjonalnie)

## 🔑 Wymagane uprawnienia bota

Bot wymaga następujących uprawnień na serwerze:
- `VIEW_CHANNEL` - Wyświetlanie kanałów
- `SEND_MESSAGES` - Wysyłanie wiadomości
- `MANAGE_MESSAGES` - Zarządzanie wiadomościami (do /clearall)
- `MANAGE_ROLES` - Zarządzanie rolami (do systemu weryfikacji)
- `ADD_REACTIONS` - Dodawanie reakcji

### Link zaproszenia bota

Użyj tego linku (zastąp `YOUR_CLIENT_ID` ID swojej aplikacji):
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=268445760&scope=bot%20applications.commands
```

## 📖 Użycie komend

### `/clearall`
```
/clearall #kanał
```
Usuwa wszystkie wiadomości z wybranego kanału. Wymaga potwierdzenia przed wykonaniem.

**Uwaga:** Discord API pozwala usuwać tylko wiadomości młodsze niż 14 dni.

### `/verificationchannel`
```
/verificationchannel #kanał @rola
```
Konfiguruje system weryfikacji na wybranym kanale. Wysyła wiadomość z reakcją ✅, po kliknięciu której użytkownik otrzymuje wybraną rolę.

## 🗂️ Struktura projektu

```
botdc/
├── src/
│   ├── commands/          # Komendy slash
│   │   ├── clearall.js
│   │   └── verificationchannel.js
│   ├── events/           # Event handlery
│   │   ├── ready.js
│   │   ├── interactionCreate.js
│   │   └── messageReactionAdd.js
│   ├── database/         # Baza danych
│   │   └── db.js
│   ├── utils/           # Narzędzia
│   │   └── logger.js
│   ├── config.js        # Konfiguracja
│   ├── index.js         # Główny plik bota
│   └── deploy-commands.js  # Skrypt rejestracji komend
├── .env                 # Zmienne środowiskowe (nie commitować!)
├── .env.example         # Przykładowy plik .env
├── package.json
└── README.md
```

## 🛠️ Rozwiązywanie problemów

### Bot się nie łączy
- Sprawdź czy token w `.env` jest poprawny
- Upewnij się, że włączyłeś wymagane intenty w Developer Portal

### Komendy nie działają
- Uruchom `npm run deploy` aby zarejestrować komendy
- Komendy globalne mogą potrzebować do 1h na propagację
- Upewnij się, że bot ma uprawnienia `applications.commands`

### Weryfikacja nie działa
- Sprawdź czy bot ma uprawnienie `MANAGE_ROLES`
- Rola bota musi być wyższa w hierarchii niż przypisywana rola
- Sprawdź logi w konsoli pod kątem błędów

### /clearall nie usuwa wszystkich wiadomości
- Discord API pozwala usuwać tylko wiadomości młodsze niż 14 dni
- Dla starszych wiadomości należy użyć innych metod

## 📝 Licencja

MIT

## 🤝 Pomoc

W razie problemów sprawdź logi w konsoli - bot loguje wszystkie ważne zdarzenia i błędy.
