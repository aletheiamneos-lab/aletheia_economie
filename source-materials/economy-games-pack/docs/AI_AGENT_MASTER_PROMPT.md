# PROMPT MASTER PENTRU ROBOTUL DE CODING

Implementează cele 10 jocuri din acest pachet în aplicația existentă.

## Primul pas obligatoriu
Auditează aplicația:
- framework;
- routing;
- design system;
- auth;
- database;
- state management;
- analytics;
- API conventions;
- responsive behavior.

Nu modifica încă nimic. Creează `GAME_INTEGRATION_AUDIT.md`.

## Apoi
1. Integrează `shared/`.
2. Integrează API-ul.
3. Implementează jocurile în ordinea directoarelor.
4. Pentru fiecare joc, citește obligatoriu:
   - `SPEC.md`
   - `UI_INTERACTIONS.json`
   - `SOURCE_MAP.json`
   - `content/*`
   - `engine.py`
   - `tests/test_engine.py`

## Reguli nenegociabile
- Nu transforma jocurile în quiz-uri cu skin diferit.
- Păstrează mecanica distinctă.
- Păstrează toate controalele funcționale pe mobil și desktop.
- Folosește design system-ul aplicației existente.
- Creează animații semantice, nu pur decorative.
- Nu expune soluțiile înainte ca elevul să răspundă.
- Fiecare joc trebuie să aibă Restart.
- Fiecare joc trebuie să aibă „Vezi de ce”.
- Fiecare joc trebuie să aibă fallback fără animații.
- Nu elimina funcționalități existente.
- Nu trece la următorul joc dacă testele curente eșuează.

## Ordine
1. Market Maker
2. Consumer Lab
3. Factory Master
4. Inflation Detective
5. Central Bank
6. Job Market
7. Wall Street Lab
8. Global Trader
9. Economic Pulse
10. President

## La finalul fiecărui joc raportează
- fișiere create;
- fișiere modificate;
- teste;
- rezultate;
- ce este complet;
- ce mai lipsește.
