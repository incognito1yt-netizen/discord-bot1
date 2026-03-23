# Ulepszona funkcjonalność `/clearall`

## 🎯 Zmiana
Komenda `/clearall` została rozszerzona, aby usuwać **wszystkie wiadomości**, w tym te starsze niż 14 dni.

## 🔧 Jak to działa

### Faza 1: Szybkie usuwanie nowych wiadomości
- Wiadomości młodsze niż 14 dni są usuwane zbiorczo (bulk delete)
- Bardzo szybka operacja - setki wiadomości w sekundę

### Faza 2: Usuwanie starych wiadomości  
- Wiadomości starsze niż 14 dni są usuwane pojedynczo
- Pokazywane są aktualizacje postępu co 10 wiadomości
- Automatyczne opóźnienia (rate limiting) aby uniknąć limitów API

## 📊 Przykładowe działanie

```
➜ Użytkownik: /clearall #kanał
➜ Bot: ⚠️ Czy na pewno chcesz usunąć wszystkie wiadomości...
➜ Użytkownik: [Potwierdź]

🔄 Usuwanie wiadomości... To może chwilę potrwać.
✅ Usunięto 245 nowych wiadomości.
🔄 Sprawdzam czy są starsze wiadomości...
✅ Usunięto 245 nowych wiadomości.
🔄 Usuwanie 87 starszych wiadomości... (może to potrwać dłużej)
✅ Usunięto 245 nowych wiadomości.
🔄 Usuwanie starszych wiadomości: 30/87...
✅ Usunięto 245 nowych wiadomości.
🔄 Usuwanie starszych wiadomości: 60/87...

✅ **Zakończono usuwanie wiadomości!**

📊 Podsumowanie:
• Nowe wiadomości (< 14 dni): 245
• Stare wiadomości (≥ 14 dni): 87
• **Razem usunięto: 332 wiadomości**
```

## ⚠️ Uwagi

- **Stare wiadomości usuwają się wolniej** - Discord API wymaga pojedynczego usuwania
- Około **1-2 sekundy na 5 wiadomości** (rate limiting)
- Bot pokazuje **aktualizacje postępu** co 10 wiadomości
- **Brak limitu czasowego** - wszystkie wiadomości zostaną usunięte

## 🚀 Testowanie

1. Użyj `/clearall #kanał` 
2. Potwierdź akcję
3. Obserwuj postęp w interfejsie Discord

Bot jest już uruchomiony z nowymi zmianami!
