# System Automoderacji - Dokumentacja

## 🎯 Przegląd
System automoderacji automatycznie wykrywa i karze użytkowników za wysyłanie zabronionych linków (YouTube, Discord invites, wszystkie linki).

## 🚀 Szybki Start

### 1. Inicjalizacja
```
/automod setup
```
Tworzy domyślną konfigurację:
- YouTube: `warn`
- Discord Invites: `warn`
- Wszystkie Linki: `off`
- Threshold ostrzeżeń: `3`

### 2. Konfiguracja Filtrów
```
/automod config youtube mute 1d
/automod config discord_invites ban 7d
```

### 3. Ustaw Rolę Bypass (opcjonalnie)
```
/automod bypass @Moderator
```
Użytkownicy z tą rolą mogą wysyłać linki bez kar.

### 4. Sprawdź Status
```
/automod status
```

## 📋 Wszystkie Komendy

### `/automod setup`
Inicjalizuje system automoderacji z domyślnymi ustawieniami.

### `/automod config [filter] [action] [duration]`

**Filtry:**
- `youtube` - Linki YouTube/youtu.be/shorts
- `discord_invites` - Zaproszenia Discord (discord.gg, discord.com/invite)
- `all_links` - Wszystkie linki HTTP/HTTPS

**Akcje:**
- `off` - Wyłączone
- `warn` - Ostrzeżenie (tylko komunikat)
- `mute` - Wyciszenie
- `kick` - Wyrzucenie
- `ban` - Ban

**Czasy (dla mute/ban):**
- `1h`, `6h`, `12h`, `1d`, `3d`, `7d`, `14d`, `30d`, `permanent`

**Przykłady:**
```
/automod config youtube mute 1d
/automod config discord_invites ban permanent
/automod config all_links warn
```

### `/automod bypass @rola`
Ustawia rolę która może wysyłać linki bez konsekwencji.

**Przykład:**
```
/automod bypass @VIP
```

### `/automod warnings [action] [user] [count]`

**Akcje:**
- `set` - Ustaw threshold (limit ostrzeżeń)
- `view` - Zobacz ostrzeżenia użytkownika
- `clear` - Wyczyść ostrzeżenia użytkownika
- `list` - Lista użytkowników z ostrzeżeniami

**Przykłady:**
```
/automod warnings set 3
/automod warnings view @User
/automod warnings clear @User
/automod warnings list
```

### `/automod status`
Pokazuje aktualną konfigurację automoderacji.

### `/automod disable`
Wyłącza automoderację (zachowuje konfigurację).

## 🔄 Jak To Działa

### Przepływ Ostrzeżeń (action: warn)
1. Użytkownik wysyła zabroniony link
2. Bot usuwa wiadomość
3. Dodaje ostrzeżenie do bazy danych
4. Wysyła DM do użytkownika z informacją (X/Y ostrzeżeń)
5. Loguje akcję w kanale logów
6. **Jeśli osiągnięto threshold:** Automatyczny ban na 7 dni

### Przepływ Natychmiastowej Kary (action: mute/kick/ban)
1. Użytkownik wysyła zabroniony link
2. Bot usuwa wiadomość
3. Wykonuje natychmiastową karę (mute/kick/ban)
4. Wysyła DM do użytkownika
5. Loguje akcję w kanale logów

### System Bypass
- Użytkownicy z rolą bypass są całkowicie ignorowani przez automod
- Przydatne dla moderatorów, adminów, VIP

## 📊 Przykładowe Scenariusze

### Scenariusz 1: Ostrzeżenia z Auto-Banem
```
/automod setup
/automod warnings set 3
/automod config youtube warn
```

**Rezultat:**
- Link 1: Ostrzeżenie (1/3)
- Link 2: Ostrzeżenie (2/3)  
- Link 3: Ostrzeżenie (3/3) + Auto-ban 7 dni

### Scenariusz 2: Natychmiastowy Mute
```
/automod setup
/automod config discord_invites mute 1d
```

**Rezultat:**
- Każde zaproszenie Discord = Natychmiastowy mute na 1 dzień

### Scenariusz 3: Surowe Kary
```
/automod setup
/automod config youtube ban permanent
/automod config discord_invites ban permanent
```

**Rezultat:**
- Jakikolwiek link = Permanentny ban

### Scenariusz 4: Z Rolą Bypass
```
/automod setup
/automod config youtube mute 12h
/automod bypass @Moderator
```

**Rezultat:**
- Normalni użytkownicy: Mute 12h za YouTube
- Moderatorzy: Mogą swobodnie wysyłać linki

## 🗂️ Kanał Logów

Bot automatycznie szuka kanału logów w następującej kolejności:
1. `#logs`
2. `#mod-logs`
3. `#automod-logs`
4. `#modlogs`
5. Systemowy kanał serwera
6. Pierwszy dostępny kanał tekstowy

**Zalecenie:** Utwórz kanał `#mod-logs` dla najlepszych rezultatów.

## ⚠️ Rozwiązywanie Problemów

### Bot nie karze użytkowników
- Sprawdź czy automod jest włączony: `/automod status`
- Sprawdź czy użytkownik nie ma roli bypass
- Sprawdź czy filtr nie jest ustawiony na `off`

### Bot nie może wyciszyć/wyrzucić/zbanować
- Sprawdź czy bot ma wymagane uprawnienia
- Sprawdź czy rola bota jest wyższa niż rola użytkownika

### Brak logów
- Utwórz kanał `#logs` lub `#mod-logs`
- Daj botowi uprawnienia do wysyłania wiadomości

### Użytkownik nie otrzymuje DM
- Użytkownik ma wyłączone DM (normalne, bot i tak wykona karę)

## 📈 Statystyki i Monitorowanie

Użyj tych komend aby monitorować aktywność:
```
/automod warnings list          # Top użytkownicy z ostrzeżeniami
/automod warnings view @User    # Historia konkretnego użytkownika
/automod status                 # Aktualna konfiguracja
```

## 🔒 Bezpieczeństwo

- Tylko administratorzy mogą używać `/automod`
- Konfiguracja jest zapisywana lokalnie (JSON)
- Baza ostrzeżeń jest trwała (przetrwa restart bota)
- Użytkownicy z bypass mogą nadużywać - wybieraj mądrze!

## 💡 Wskazówki

1. **Zacznij łagodnie:** Użyj `warn` aby użytkownicy nauczyli się zasad
2. **Ustaw bypass dla moderatorów:** Unikniesz przypadkowego karania moderatorów
3. **Monitoruj logi:** Regularnie sprawdzaj kanał logów
4. **Dostosuj threshold:** 3-5 ostrzeżeń to dobry balans
5. **Testuj na osobnym kanale:** Przed włączeniem na całym serwerze
