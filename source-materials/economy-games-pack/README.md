# ECONOMIE — 10 JOCURI EDUCATIONALE / FULL IMPLEMENTATION PACK

Acest pachet conține toate cele 10 jocuri în directoare separate.

Pentru fiecare joc există:
- `SPEC.md` — logica completă și mecanica;
- `engine.py` — motor Python funcțional de referință;
- `content/scenarios.json` sau `content/decisions.json`;
- `UI_INTERACTIONS.json` — componente vizuale, animații, interacțiuni desktop/mobile;
- `tests/test_engine.py`;
- `SOURCE_MAP.json` — capitolele și conceptele din materialele de economie.

În plus:
- `shared/` — modele, scoring, utilitare și contracte comune;
- `api/` — FastAPI de referință pentru toate cele 10 jocuri;
- `docs/` — arhitectură, reguli UX și promptul pentru agentul AI.

IMPORTANT:
- Relațiile economice și formulele provin din materialele de curs.
- Coeficienții folosiți în simulările dinamice (ex. cât se modifică un indicator după o politică) sunt ipoteze pedagogice, nu prognoze econometrice.
- Frontendul nu trebuie să conțină cheile de răspuns sau efectele private.
