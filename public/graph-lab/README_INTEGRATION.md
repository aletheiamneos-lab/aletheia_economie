# Pachet Grafice Interactive - Economie

Versiune UI: bazată pe prototipul V5 aprobat.

## Conținut
- `index.html` - acces la toate cele 19 lecții.
- `lessons/lesson_01.html` ... `lesson_19.html` - câte un HTML pentru fiecare lecție.
- `data/lesson_XX.json` - configurația fiecărei lecții pentru integrarea în aplicație.
- `data/lesson_XX.js` - aceeași configurație expusă browserului ca `window.LESSON_CONFIG`.
- `data/manifest.json` - manifest cu toate lecțiile și modulele.
- `data/schema.json` - schemă JSON minimală pentru validare.
- `assets/graph-engine.js` - motor comun pentru toate vizualizările.
- `assets/graph-lab.css` - stilurile comune, inspirate din V5.
- `tools/validate_configs.py` - validator pentru fișierele JSON.
- `tools/simple_server.py` - server local minimal pentru testare.

## Reguli importante de integrare
1. HTML-urile sunt demo-uri complete și funcționează cu asset-urile comune.
2. Pentru integrarea în aplicația existentă, recomandat este să se importe `graph-engine.js`, CSS-ul și JSON-ul lecției, nu să se copieze 19 motoare diferite.
3. Starea modificată de elev este salvată în `localStorage`, cu cheie distinctă pentru fiecare lecție și grafic.
4. `REVENIRE LA MODELUL DE BAZĂ` șterge starea graficului curent: parametri, T0, ancora A/B și orice modificare.
5. `Reset lecție` șterge starea tuturor graficelor lecției curente.
6. Tema graficelor (fundal, grid, axe, liniile 1-6, T0, cursor) este globală: `eco_graph_theme_v1`.
7. Setările administratorului sunt globale: `eco_graph_admin_v1`.
8. Explicațiile sunt texte/reguli din motor; nu există dependență de AI.

## Contract JSON
Fiecare modul are:
- `id`: identificator stabil;
- `title`: denumirea din dropdown;
- `kind`: rendererul folosit;
- `defaults`: parametrii de bază la care revine butonul de reset;
- opțional `formulas`, `labels`, `note`.

## Lansare locală
```bash
python tools/simple_server.py
```
Apoi deschide `http://localhost:8000/`.

## Validare
```bash
python tools/validate_configs.py
node --check assets/graph-engine.js
```


## Resetare – comportament V5.1

Există două niveluri separate:

- `REVENIRE LA MODELUL DE BAZĂ` resetează numai graficul selectat.
- `RESET TOATĂ LECȚIA` resetează toate graficele lecției la valorile din `defaults`.

Resetarea completă a lecției șterge/reinițializează explicit:
- coeficienții și parametrii modificați;
- pozițiile/cursorii modificați;
- T0 și T1;
- ancorele A/B;
- modurile de lucru;
- vizibilitatea/metadata locală a graficelor.

Setările globale de aspect (culori, fundal, grid, axe) sunt intenționat păstrate, deoarece sunt setări generale ale aplicației. Ele se resetează separat din `Aspect grafic -> Reset culori`.


## V5.2 – A/B restaurat + header compact

- În Lecția 8, primele două grafice au din nou un reper A standard după reset.
- OY afișează explicit `Preț A` și `Preț B`.
- Panoul din dreapta afișează `Preț A` separat, read-only, și `Preț B` editabil.
- Resetul graficului/lecției reface și starea standard A/B.
- Headerul a fost redus vizual: `Lecții`, `↶ Revenire grafic`, `↺ Reset lecție`, `Aspect`, `Admin`.


## V5.3 – corecție exclusivă reset

Aspectul V5.2 este păstrat neschimbat.

Corecții:
- `↶ Revenire grafic` execută resetarea direct, fără `confirm()` nativ.
- Se șterg toate stările salvate ale graficului curent înainte de reconstruirea din `defaults`.
- Revin parametrii, T0/T1, ancora A/B, cursorii și modul standard.
- `↺ Reset lecție` execută aceeași logică pentru toate graficele lecției.
- Culorile generale rămân intenționat separate și nu sunt resetate.


## V5.4 – audit complet pe toate materialele

Pachetul are acum 87 module în 19 lecții. Au fost adăugate module omise de auditul inițial (sectoare instituționale, dinamică productivitate, forme suplimentare ale profitului și renta, familii de elasticitate, câștig/profit bancar, ocupare/salariu minim/brut-net, durata-intensitatea șomajului, înclinații medii și echilibru macroeconomic). Fiecare modul are `provenance` A/B/C și fișier de integrare per lecție în `integration/`.
