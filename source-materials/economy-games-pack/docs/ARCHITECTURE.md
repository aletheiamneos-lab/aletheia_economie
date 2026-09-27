# ARHITECTURĂ

## Principiu
Cele 10 jocuri folosesc o platformă comună, dar fiecare are mecanică distinctă.

```text
Existing App UI
   |
   | JSON
   v
FastAPI / Python Game Service
   |
   +-- shared models
   +-- 10 game engines
   +-- content JSON
   +-- scoring/mastery
   +-- reports
   |
   v
Persistence / user progress
```

## Contract standard
- start session
- get public state
- apply action
- restart
- report

## Reguli
1. Conținutul privat și soluțiile rămân server-side.
2. Toate sesiunile sunt reproductibile prin `seed`.
3. Fiecare joc trimite `animation_cues` către frontend.
4. UI-ul desenează și animă; motorul decide adevărul economic.
5. Fiecare scenariu are `source_refs`.
