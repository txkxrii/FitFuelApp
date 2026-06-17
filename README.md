# FitFuel Tracker

FitFuel Tracker is een responsive website voor gymtracking, voeding, macro's, progressie en barcode scanning. De site is gebouwd als een mobiele app-interface met een rustig sportthema: neutrale stone-tinten met sage groen en zacht blauw als accenten.

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
- Schakelaar tussen appversie en webversie
- Een vaste lichte, neutrale appstijl
- Plan-tabblad voor gym/les advies en gymschema's
- Eetplanner-tabblad dat macro-invoer omzet naar een daglijst met voeding en grammen per maaltijd
- Makkelijke winkelopties voor snelle eiwit-, koolhydraat-, vet- en complete maaltijden
- Gymschema's van beginner naar advanced met voorbeeld-oefeningen per trainingsdag
- Feedbackpagina die websitefeedback via e-mail verstuurt

## Projectmap

```text
gym-food-pwa/
  app.js
  index.html
  styles.css
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

Bevat de appstructuur, navigatie, dashboard, foodtracker, gymtracker, progressiepagina, planpagina, profielpagina, feedbackformulier en scanner UI.

### `styles.css`

Bevat de mobiele app-layout, neutrale styling, cards, buttons, footer navigation, scanner styling en lijngrafieken.

### `app.js`

Bevat de app-logica:

- Renderen van alle views
- Maaltijden opslaan
- Workouts opslaan
- Gewicht opslaan
- Grafieken renderen
- Gymschema's tonen van beginner naar advanced
- Websitefeedback via e-mailformulier versturen
- Barcode scanning
- Product lookup
- Oude service worker cleanup voor bezoekers met eerdere PWA-versies

### `sw.js`

Cleanup-bestand dat oude caches en oude service workers opruimt. De website werkt daarna zonder download/installatie.

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

- Website werkt zonder download of installatie
- Thema is minimalistisch met neutrale kleuren en sage groen als accent
- Grafieken zijn lijngrafieken
- Barcode scanner heeft live, foto en handmatige fallback
- Footer/navigatie is responsief
- App kan schakelen tussen compacte app-layout en brede web-layout
- De app gebruikt een vaste lichte, neutrale stijl
- Overbodige oude thema-CSS, decoratieve elementen en dubbele foodsecties zijn opgeruimd
- Nieuw Plan-tabblad bevat trainingstype advies voor gym, pilates, Hyrox en fat loss
- Standaardgerechten kunnen direct gelogd worden
- Standaardgerechten zijn klikbaar en tonen ingredienten met grammen per voedsel
- Testers kunnen websitefeedback mailen via de Feedback-pagina
- Eetplanner toont "Dit kan je eten vandaag" met alle voeding die past bij ingevulde calorieen, eiwit, koolhydraten en vet
- Eetplanner toont ook handige kant-en-klare supermarktopties
- Lokale preview werkt via `127.0.0.1:4173`
- Telefoonpreview kan via HTTPS-script
- Git remote is gekoppeld
- Push naar GitHub vereist nog GitHub-login
