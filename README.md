# FitFuel Tracker

FitFuel Tracker is een PWA voor gymtracking, voeding, macro's, progressie en barcode scanning. De app is gebouwd als een mobiele app-interface met een minimalistisch sportthema: matzwart, wit, grijs en rood als dominante accentkleur.

## Functies

- Dashboard met calorieen, eiwitten, trainingsvolume en laatste gewicht
- Foodtracker met maaltijdinvoer
- Barcode scanner voor voeding
- Product lookup via Open Food Facts
- Handmatige barcode fallback
- Foto fallback voor barcode scanning
- Gymtracker met workout, oefening, sets, reps, gewicht en rusttijd
- Progressiepagina met gewicht en persoonlijke records
- Lijn-grafieken voor calorieen, workout volume, calorie trend en gewichtstrend
- Macroverdeling met eiwit, koolhydraten en vetten
- Lokale opslag via `localStorage`
- PWA manifest en service worker
- Offline cache voor lokale appbestanden
- Schakelaar tussen appversie en webversie
- White mode en dark mode
- Plan-tabblad voor gym/les advies, gymschema's, standaardgerechten, macrocalculator en eetschema
- Gymschema's van beginner naar advanced met voorbeeld-oefeningen per trainingsdag

## Projectmap

```text
gym-food-pwa/
  app.js
  index.html
  styles.css
  manifest.webmanifest
  sw.js
  icons/
    icon.svg
  start-preview.command
  start-phone-preview.command
  README.md
```

## App Starten Op Mac

Gebruik de normale lokale preview:

```bash
cd /Users/dd44/Desktop/CodingDD/gym-food-pwa
python3 -m http.server 4173 --bind 127.0.0.1
```

Open daarna:

```text
http://127.0.0.1:4173
```

Alternatief: open `start-preview.command`.

## App Gebruiken Op Telefoon

Camera's op telefoons werken alleen betrouwbaar via een veilige origin:

- `https`
- een geinstalleerde PWA
- `localhost` op hetzelfde apparaat

Voor testen op een telefoon is er een HTTPS-previewscript:

```bash
cd /Users/dd44/Desktop/CodingDD/gym-food-pwa
./start-phone-preview.command
```

Het script toont daarna twee adressen:

```text
Mac:    https://localhost:8443
Phone:  https://<jouw-mac-ip>:8443
```

Laat het terminalvenster open zolang je de app gebruikt. Op je telefoon moet je mogelijk een certificaatwaarschuwing accepteren.

## Barcode Scanner

De scanner werkt in lagen:

1. Live scanner via `html5-qrcode`
2. Native browser scanner via `BarcodeDetector`
3. Foto fallback via `capture="environment"`
4. Handmatige barcode invoer

Als een barcode wordt gevonden, probeert de app productdata op te halen via Open Food Facts. Als het product niet wordt gevonden, wordt de barcode alvast ingevuld en kun je de voedingswaarden handmatig toevoegen.

## Grafieken

De app gebruikt SVG-lijngrafieken zonder extra chart-library.

Grafieken:

- Calorieen per dag
- Workout volume per dag
- Calorie trend
- Gewichtstrend

Macro's worden als verdelingsbalk getoond:

- Eiwit
- Koolhydraten
- Vet

## Data Opslag

Alle data wordt lokaal opgeslagen in de browser:

```text
localStorage key: fitfuel-pwa-state
```

Opgeslagen data:

- Profiel
- Maaltijden
- Workouts
- Gewichtlogs
- Barcodegegevens bij maaltijden

## GitHub Repo

Deze app is lokaal gekoppeld aan:

```text
https://github.com/txkxrii/FitFuelApp.git
```

Branch:

```text
main
```

De eerste lokale commit is gemaakt:

```text
a7501c5 Initial FitFuel PWA
```

Pushen naar GitHub lukte niet vanuit Codex omdat GitHub-authenticatie niet beschikbaar was. Push vanuit je IDE of terminal nadat je bent ingelogd:

```bash
cd /Users/dd44/Desktop/CodingDD/gym-food-pwa
git push -u origin main
```

## Belangrijke Bestanden

### `index.html`

Bevat de appstructuur, navigatie, dashboard, foodtracker, gymtracker, progressiepagina, planpagina, profielpagina en scanner UI.

### `styles.css`

Bevat de mobiele app-layout, minimalistische rood/zwarte stijl, cards, buttons, footer navigation, scanner styling en lijngrafieken.

### `app.js`

Bevat de app-logica:

- Renderen van alle views
- Maaltijden opslaan
- Workouts opslaan
- Gewicht opslaan
- Grafieken renderen
- Gymschema's tonen van beginner naar advanced
- Barcode scanning
- Product lookup
- PWA install prompt

### `sw.js`

Service worker voor offline cache en snelle reloads.

### `manifest.webmanifest`

PWA-configuratie voor naam, kleur, icon en app-installatie.

## Cache Refresh

Als je oude styling of oude grafieken ziet:

```text
Hard refresh de browser
```

Of open:

```text
http://127.0.0.1:4173/index.html?v=line-v11
```

## Huidige Status

- App is gebouwd als PWA
- Thema is minimalistisch met rood als dominante kleur
- Grafieken zijn lijngrafieken
- Barcode scanner heeft live, foto en handmatige fallback
- Footer/navigatie is responsief
- App kan schakelen tussen compacte app-layout en brede web-layout
- White mode is beschikbaar via de knop bovenin
- Nieuw Plan-tabblad bevat trainingstype advies voor gym, pilates, Hyrox en fat loss
- Standaardgerechten kunnen direct gelogd worden
- Standaardgerechten zijn klikbaar en tonen ingredienten met grammen per voedsel
- Macrocalculator kan doelen berekenen en een eetschema genereren
- Lokale preview werkt via `127.0.0.1:4173`
- Telefoonpreview kan via HTTPS-script
- Git remote is gekoppeld
- Push naar GitHub vereist nog GitHub-login
