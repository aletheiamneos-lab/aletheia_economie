# Economia — aplicație interactivă

Aplicație funcțională pentru digitalizarea materialelor de economie. Toate cele 19 capitole sunt implementate ca lecții native, nu ca documente încorporate.

## Rapoarte și control acces

Administratorul intră direct în `#/admin/rapoarte`. Interfața include monitorizarea sesiunilor, filtrarea rapoartelor finale și de admitere, preview, descărcare PDF, trimitere reală prin e-mail, precum și adăugarea, blocarea, deblocarea, deconectarea și ștergerea elevilor. Elevii noi se pot autentifica cu orice nume și adresă validă; conturile blocate rămân blocate. Lista este persistentă local și se sincronizează între filele aceluiași browser.

În stadiul curent, această zonă este un prototip funcțional de interfață, nu un mecanism de securitate pentru producție. Accesul administratorului se face temporar printr-un singur buton, fără e-mail și parolă. Înainte de publicare, `ADMIN_QUICK_ACCESS_ENABLED` trebuie dezactivat și trebuie conectate autentificarea și autorizarea server-side, o bază de date cu politici pe roluri, evenimente realtime și un serviciu tranzacțional de e-mail.

Verificarea recomandată înaintea fiecărui release:

```powershell
npm ci
npm run verify
npm run test:graphs
npm run preview
```

Directorul `dist/` rezultat din `npm run build` este artefactul static de publicat după configurarea serviciilor backend.

## Pornire

Cea mai simplă variantă pe Windows este dublu-click pe `PORNESTE APLICATIA.cmd`. Fișierul instalează automat dependențele Node și Python la prima pornire, pornește motorul celor 10 jocuri, deschide browserul și pornește aplicația.

Alternativ, din terminal:

```powershell
npm install
npm run games:api
```

Într-un al doilea terminal:

```powershell
npm run dev
```

Aplicația va fi disponibilă implicit la `http://localhost:4173`.

## Trimiterea rapoartelor prin e-mail

La finalul unui test final sau de admitere, aplicația generează raportul PDF și îl trimite automat elevului. Mesajul include și un rezumat HTML responsive, o versiune text simplu, scorul, timpul și recomandarea potrivită rezultatului. Cheia furnizorului nu ajunge în browser.

Pentru activare locală, configurează adresa Gmail și parola de aplicație exclusiv în fișierul local `.env.email`. Acest fișier și utilitarul local de configurare sunt excluse din Git, iar datele nu ajung în browser sau în repository. Repornește apoi aplicația folosind `PORNESTE APLICATIA.cmd`.

În producție, ruta `/api/report-service/*` trebuie direcționată către același serviciu FastAPI ca `/api/game-service/*`, iar variabilele secrete trebuie furnizate de platforma de găzduire.

Comenzi utile:

```powershell
npm test
npm run test:games
npm run audit:games
npm run test:graphs
npm run build
npm run verify
npm run preview
```

Scripturile folosesc o legătură temporară sigură pentru Vite/Vitest, deoarece caracterul `#` din numele directorului de lucru este interpretat în mod normal ca fragment URL. Nu este nevoie ca directorul să fie redenumit.

## Ce include prototipul

- dashboard responsive cu acces la cele 19 capitole;
- hartă curriculară pe cinci module;
- toate cele 19 lecții, cu 103 secțiuni de teorie, clasificări, exemple și formule;
- toate vizualizările calculatoarelor și cele 9 diagrame din materialele originale, reconstruite nativ în React/SVG;
- toate cele 19 secțiuni finale de tip explorator/simulator din HTML (capitolul 9 are două), cu titlul, numerotarea, datele și poziția editorială originale;
- laboratorul separat „Grafice interactive” V5.4, cu 87 de module în 19 lecții, selector de lecție și grafic, A/B, T0/T1 și resetări independente;
- grile, adevărat/fals, probleme numerice și asociere pentru fiecare lecție;
- câte un test final cu 30 de întrebări și mod de revizuire pentru fiecare capitol;
- catalog separat `Lecții`, cu toate cele 19 capitole și acces direct la Teorie, Practică sau Test final;
- câte o bancă suplimentară cu 40 de întrebări și feedback imediat pentru fiecare capitol;
- modul separat cu 19 teste recapitulative și 760 de întrebări; răspunsurile și explicațiile apar numai după trimitere;
- secțiune distinctă cu 10 jocuri economice și 135 de scenarii/decizii: Market Maker, Consumer Lab, Factory Master, Inflation Detective, Central Bank, Job Market, Wall Street Lab, Global Trader, Economic Pulse și President: Econia;
- motor FastAPI separat pentru jocuri, astfel încât soluțiile și efectele private să nu fie trimise în browser înaintea deciziei elevului;
- scene și controale proprii pentru fiecare joc, cu Restart, „Vezi de ce”, Continuă, suport pentru tastatură/touch și fallback pentru mișcare redusă;
- arhivă separată cu 36 de teste reale de admitere din perioada 2002–2025 și 1.280 de întrebări; baremul, formulele și rezolvările sunt dezvăluite după trimitere;
- raport PDF A4 pentru testele finale și de admitere, cu elev, timp, grafic corecte/incorecte și analiza completă a răspunsurilor; raportul este trimis automat elevului printr-un e-mail vizual și poate fi retrimis manual;
- marcaje manuale „Parcurs/Neparcurs”, fără procente, puncte sau recorduri și fără stocare persistentă;
- profil cu interfețe distincte pentru elev și administrator, pregătit pentru autentificare ulterioară;
- interfață adaptată pentru desktop, tabletă și mobil.

## Structură

```text
src/
  components/          interfața și componentele interactive
  games/               catalogul și clientul API al jocurilor
  data/
    chapters/          JSON-urile native ale celor 19 lecții
    practice/          băncile native de antrenament ale celor 19 capitole
    final-tests-master.json
  App.tsx              rutare și compoziție
  session.ts           stare temporară, valabilă numai cât aplicația rămâne deschisă
  styles.css           sistem vizual desktop
  responsive.css       adaptări responsive
public/
  graph-lab/            motorul, stilul, manifestul și contractele V5.4 copiate nemodificat
source-materials/
  economy-games-pack/   motoarele Python, scenariile și specificațiile celor 10 jocuri
```

## Jocuri economice

Catalogul se deschide la `#/jocuri`, iar fiecare studio are ruta `#/jocuri/<game_id>`. În dezvoltare, Vite redirecționează `/api/game-service/*` către FastAPI pe portul `8000`.

În producție, serverul web trebuie să trimită aceeași cale către serviciul Python. Sesiunile sunt momentan păstrate în memoria procesului FastAPI; înainte de utilizarea cu elevi reali trebuie conectate autentificarea server-side, un session store persistent, baza de date și raportarea pe utilizator.

Auditul inițial este în [GAME_INTEGRATION_AUDIT.md](./GAME_INTEGRATION_AUDIT.md), iar rezultatele verificării finale sunt în [GAME_INTEGRATION_FINAL_AUDIT.md](./GAME_INTEGRATION_FINAL_AUDIT.md).

## Grafice interactive V5.4

Secțiunea se deschide din butonul `Grafice interactive` din sidebar sau direct la `#/grafice/1`. Lista lecțiilor este citită din `public/graph-lab/data/manifest.json`, iar lecția selectată este construită din `public/graph-lab/integration/lesson_XX.integration.json`. Toate lecțiile folosesc același `assets/graph-engine.js` și același `assets/graph-lab.css`.

Motorul rulează izolat de React pentru a-i păstra exact starea economică și resetările, dar iframe-ul își adaptează automat înălțimea la conținut, fără antet fix sau scroll interior. Culorile se deschid din toolbarul paginii, iar butonul `Etichete date` afișează sau ascunde indicatorii direct în SVG. Profilul de administrator vede butonul `Control profesor`, de unde poate permite sau bloca explicațiile și formulele; elevul nu vede aceste comenzi. Tot administratorul poate descărca graficul curent ca PNG cu antet sau ca raport PDF A4 cu grafic, indicatori, parametri, ecuații și formule. Exporturile sunt generate complet local. `npm run test:graphs` randă toate cele 87 de module și verifică resetarea fiecărui grafic, resetarea celor 19 lecții, mișcarea versus deplasarea paralelă, T0/T1 și separarea temei globale.

Detaliile despre surse, schema unificată și deciziile tehnice se găsesc în [ARCHITECTURE.md](./ARCHITECTURE.md).
