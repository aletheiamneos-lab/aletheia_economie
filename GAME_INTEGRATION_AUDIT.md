# Audit de integrare — cele 10 jocuri economice

Data auditului: 17 septembrie 2026

## Aplicația existentă

- Framework: React 19 + TypeScript, construit cu Vite 7.
- Rutare: router intern pe `window.location.hash`, fără bibliotecă externă.
- Design system: variabile CSS în `styles.css`, pagini responsive, paletă bleumarin–turcoaz–coral, fonturi Manrope / DM Sans / DM Mono și iconuri Lucide.
- Autentificare: stare React temporară; lista de acces pentru elevi este păstrată în `localStorage`. Nu există încă autentificare server-side.
- Persistență: nu există bază de date. Progresul didactic este în memorie, iar controlul de acces admin este prototip local.
- State management: hook-uri React locale și hook-urile `useSessionState` / `useAdminData`.
- Analytics: nu există un serviciu extern; rapoartele admin folosesc date demonstrative locale.
- API: aplicația principală nu avea un API. Pachetul jocurilor include un serviciu FastAPI cu contractele start, state, action, restart și report.
- Responsive: sidebar fix pe desktop și drawer pe mobil; breakpoint principal la 900 px, cu corecții suplimentare la 740/520/420 px.

## Conținutul pachetului

Arhiva a fost extrasă în `source-materials/economy-games-pack`. Include 10 motoare Python validate, 135 de scenarii/decizii, specificații, surse curriculare, interacțiuni și teste de referință.

| Joc | Unități | Mecanică principală |
| --- | ---: | --- |
| Market Maker | 15 | deplasarea cererii/ofertei și noul echilibru |
| Consumer Lab | 12 | coș optim în limita bugetului |
| Factory Master | 12 | lucrători, producție, cost și profit |
| Inflation Detective | 15 | probe, diagnostic și măsuri antiinflaționiste |
| Central Bank | 8 scenarii × 8 trimestre | rata dobânzii și compromisuri macroeconomice |
| Job Market | 12 | PAD, ocupare, rata și tipul șomajului |
| Wall Street Lab | 15 | acțiuni, obligațiuni, curs și randament |
| Global Trader | 10 scenarii × 6 runde | export, import, curs și competitivitate |
| Economic Pulse | 16 | faza ciclului și politici anticiclice |
| President | 20 decizii | mandat economic cu efecte imediate și întârziate |

## Decizie de integrare

1. Se adaugă o zonă distinctă „Jocuri” în navigația principală și două rute: catalogul și studioul unui joc.
2. Interfața este React nativ și folosește design system-ul existent.
3. Adevărul economic, răspunsurile și efectele private rămân în motoarele Python; browserul primește numai starea publică și feedbackul după trimitere.
4. Vite va redirecționa în dezvoltare cererile `/api/game-service/*` către FastAPI. În producție, aceeași cale trebuie rutată către serviciul Python.
5. Fiecare joc primește o scenă și controale distincte, Restart, „Vezi de ce”, Continuă, alternative la drag și fallback pentru mișcare redusă.
6. Istoricul vizual de sesiune rămâne local în pagină; raportul autoritar este furnizat de API.

## Riscuri și limite identificate

- Serviciul FastAPI păstrează sesiunile în memorie; pentru producție are nevoie de autentificare, autorizare, bază de date și un session store partajat.
- CORS/reverse proxy și HTTPS trebuie configurate la publicare.
- Jocurile nu trebuie prezentate drept prognoze economice; coeficienții dinamici sunt ipoteze pedagogice.
- Datele de progres ale jocurilor trebuie conectate ulterior la raportarea elevului și la auditul administratorului.

## Criterii de acceptare

- toate cele 10 jocuri pornesc și folosesc scenariile din pachet;
- fiecare mecanică este distinctă și utilizabilă cu tastatură/touch;
- soluțiile nu apar înainte de trimitere;
- nu există overflow orizontal sau controale inaccesibile pe mobil;
- testele React, testele motoarelor Python și buildul Vite trec;
- auditul final documentează rezultatele și limitele de producție.
