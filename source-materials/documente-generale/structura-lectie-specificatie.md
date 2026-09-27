# Specificație: structura unei lecții

Acest document descrie **doar structura** (ce date există, în ce ordine apar pe pagină) — fără nimic legat de stil vizual, culori sau grafice, exact cum ai cerut. E extras direct din fișierul HTML validat al Capitolului 8, ca să fie o oglindă fidelă a ce există deja, nu o propunere nouă.

---

## 1. Structura conținutului (schema de date)

Fiecare capitol e descris de un singur obiect cu 6 părți: `capitol`, `teorie`, `grila`, `af`, `probleme`, `asociere` (ultima fiind opțională - vezi 1.6).

### 1.1 `capitol` — metadate generale

| Câmp | Tip | Exemplu |
|---|---|---|
| `numar` | număr | `8` |
| `titlu` | text | `"Piața și echilibrul său"` |
| `obiective` | listă de texte | `["Să explici legea cererii...", ...]` |

### 1.2 `teorie` — listă de secțiuni

Fiecare secțiune de teorie are:

| Câmp | Tip | Obligatoriu? | Descriere |
|---|---|---|---|
| `id` | text | da | identificator unic, folosit la link-uri (`#sect-id`) |
| `nr` | text | da | numărul secțiunii, afișat înaintea titlului |
| `titlu` | text | da | titlul secțiunii |
| `text` | listă de paragrafe | da | corpul teoriei, un string per paragraf |
| `puncteCheie` | listă de texte SAU de `{termen, descriere}` | opțional | proprietăți/trăsături independente, ca bullet list. Dacă un element e `{termen, descriere}`, `termen` apare îngroșat (bold), pentru contrast vizual - folosește acest format ori de câte ori punctul are un "cuvânt-cheie" natural |
| `clasificari` | listă de `{criteriu, categorii, orientare?}` | opțional | pentru conținut care e o **defalcare/clasificare** (nu proprietăți independente) - se afișează ca un mic arbore (un punct care se ramifică spre cutii cu categoriile), nu ca bullet list. `categorii` e o listă de texte SAU de `{nume, definitie}` - **folosește `{nume, definitie}` de fiecare dată când manualul dă o explicație pentru acea categorie**, nu doar un string, altfel definiția se pierde (asta a fost o greșeală reală, corectată la Cap. 1-2: microeconomia/mezoeconomia/macroeconomia apăruseră ca simple etichete, fără explicație). `orientare` e opțional: `'orizontal'` (implicit) sau `'vertical'` - folosește `'vertical'` la 5+ categorii sau etichete lungi, ca să nu se înghesuie pe lățime |
| `exemple` | listă de texte | opțional | afișate într-un chenar distinct, tip "Exemplu" |
| `formule` | listă de `{nume, formula}` | opțional | afișate în chenar tip formulă |
| `calculator` | text (flag) | opțional | declanșează un calculator inline (ex: `elasticitateCerere`, `costOportunitate`, `indicatori`) |
| `diagrama` | text (flag) | opțional | declanșează o diagramă (ex: `echilibruStatic`, `excesExplorer`, `surplus`) |
| `notaLegatura` | `{href, text}` | opțional | o notă cu link către altă secțiune |

**Regulă de alegere `puncteCheie` vs. `clasificari`**: dacă poți întreba "din ce criteriu provine asta?" (ex: "după nivel", "după formă"), e o clasificare → `clasificari`. Dacă e o caracteristică de sine stătătoare, fără o axă de clasificare în spate (ex: "sunt regenerabile"), e un punct cheie → `puncteCheie`.

### 1.3 `grila` — teste grilă (alegere multiplă)

| Câmp | Tip | Descriere |
|---|---|---|
| `intrebare` | text | enunțul întrebării |
| `optiuni` | listă de texte | variantele de răspuns (a, b, c, d...) |
| `corect` | număr | indexul variantei corecte (0 = a) |
| `explicatie` | text | afișată după verificare |

### 1.4 `af` — adevărat/fals

| Câmp | Tip | Descriere |
|---|---|---|
| `enunt` | text | afirmația de evaluat |
| `corect` | boolean | `true` = adevărat, `false` = fals |
| `explicatie` | text | afișată după verificare |

### 1.5 `probleme` — probleme numerice

| Câmp | Tip | Obligatoriu? | Descriere |
|---|---|---|---|
| `enunt` | text | da | enunțul problemei |
| `unitate` | text | da (poate fi gol) | unitatea de măsură |
| `tip` | text | opțional, implicit `'simplu'` | `'simplu'` = verificare directă (corect + toleranță); `'custom'` = verificare specifică acelui capitol (vezi 3. Extensibilitate) |
| `corect` | număr | da, pt. `tip: 'simplu'` | răspunsul corect |
| `toleranta` | număr | da, pt. `tip: 'simplu'` | marja acceptată (pt. rotunjiri) |
| `custom` | text (flag) | da, pt. `tip: 'custom'` | numele funcției de verificare scrise special pt. acea problemă |
| `explicatie` | text | da | rezolvarea, afișată după verificare |

Majoritatea problemelor sunt `'simplu'` (un singur număr, o toleranță). Dar unele probleme dintr-un capitol pot avea nevoie de altceva - de ex. mai mulți pași, mai multe câmpuri de răspuns, sau o verificare legată de un grafic. Pentru acelea, folosim `tip: 'custom'` + un `custom` flag, exact ca la `diagrama`/`calculator` din teorie (vezi secțiunea 3).

### 1.6 `asociere` — potrivire termen-definiție (opțional, doar unde are sens)

Nu toate lecțiile au nevoie de acest tip - se adaugă doar la capitolele unde există un set clar de concepte de asociat (de ex. termen ↔ definiție, formulă ↔ nume, cauză ↔ efect).

| Câmp | Tip | Descriere |
|---|---|---|
| `instructiune` | text | ex: "Asociază fiecare termen cu definiția corespunzătoare" |
| `coloanaA` | listă de `{id, text}` | elementele din stânga (termenii) |
| `coloanaB` | listă de `{id, text}` | elementele din dreapta (definițiile), afișate amestecat |
| `perechi` | listă de `{stanga, dreapta}` | perechile corecte, prin `id`-uri |
| `explicatie` | text (opțional, per pereche sau generală) | afișată după verificare |

**Regulă importantă, valabilă pentru toate tipurile de exerciții**: răspunsurile corecte (`corect`, `explicatie`, `perechi`) nu ajung niciodată în pagină înainte ca elevul să răspundă — sunt comparate în momentul verificării, nu expuse din start.

---

## 2. Structura paginii (ordinea secțiunilor)

De sus în jos, exact această ordine:

1. **Bară de scor** (fixă, sus) — text "X corecte din Y încercate" + o bară de progres
2. **Antet** — "Capitolul N" + titlul capitolului
3. **Obiective** — "Ce vei ști să faci" + lista de obiective
4. **Cuprins** — link-uri către fiecare secțiune de teorie
5. **Titlu secțiune: "Teorie"**
6. **Toate secțiunile de teorie**, în ordinea din listă (fiecare expandabilă/restrângibilă)
7. **Titlu secțiune: "Exerciții"**
8. **I. Teste grilă** — titlu + subtitlu instrucțiuni + toate cardurile grilă
9. **II. Adevărat sau fals** — titlu + subtitlu + toate cardurile A/F
10. **III. Probleme** — titlu + subtitlu + toate cardurile problemă
11. **IV. Simulatorul cerere-ofertă** — titlu + subtitlu + widgetul interactiv

> Dacă un capitol are și `asociere`, secțiunea ei se inserează ca punct propriu (ex. "V. Asociază noțiunile"), oriunde are sens în logica lecției — de obicei după probleme, înainte de un eventual simulator.

Fiecare tip de card (teorie, grilă, A/F, problemă, asociere, simulator) e generat de o funcție separată, care primește doar datele (fără cod hardcodat per capitol) — asta rămâne valabil indiferent ce faci vizual, pentru că separă clar "ce conține" de "cum arată".

---

## 3. Extensibilitate — cum adaugi ceva nou fără să strici ce există

Trei lucruri sunt gândite explicit ca „prize" în care se conectează cod nou, fără să atingi restul:

| Flag | Unde apare | Ce declanșează |
|---|---|---|
| `calculator` (în `teorie`) | într-o secțiune de teorie | un mini-calculator interactiv, specific acelei secțiuni |
| `diagrama` (în `teorie`) | într-o secțiune de teorie | o diagramă/grafic, static sau interactiv |
| `custom` (în `probleme`, când `tip: 'custom'`) | o problemă anume | o verificare de răspuns scrisă special pentru acea problemă |

Pe lângă acestea, `clasificari` (secțiunea 1.2) e acum parte din schema de bază, nu mai e un flag separat - orice secțiune de teorie poate avea o listă de clasificări, randate automat ca arbori, fără cod suplimentar per capitol.

**Regula pentru oricine (om sau AI) adaugă un flag nou**: valoarea flagului e un nume nou (ex. `diagrama: 'elasticitateGrafic'`), iar undeva în cod trebuie scrisă o singură funcție cu acel nume, care întoarce un element de pagină. Restul aplicației (schema, ordinea secțiunilor, celelalte exerciții) nu se schimbă. Așa am adăugat și cele 3 diagrame din Capitolul 8, și explorer-ul de la Capitolul 1 - fără să umblu la nimic altceva.

---

## De validat

- [x] ~~Toate cele 4 tipuri de exerciții sunt suficiente?~~ → Rezolvat: adăugat `asociere` (opțional, doar unde are sens) și modul `custom` pentru probleme care nu se încadrează în verificarea simplă.
- [x] ~~Clasificările/defalcările arată ca liste plate de bullet-uri~~ → Rezolvat: câmp nou `clasificari`, randat ca arbore (vezi Capitolul 1, secțiunile Nevoi/Bunuri/Resurse).
- [x] ~~Arborii pierd definiția/exemplul din spatele categoriei, dacă manualul o dă~~ → Rezolvat: `categorii` acceptă `{nume, definitie}`, afișat sub arbore. Corectat retroactiv la Cap. 1 și 2.
- [x] ~~Arborii cu multe categorii sau etichete lungi se înghesuie pe lățime~~ → Rezolvat: `orientare: 'vertical'` (cutii stivuite, cu o coloană vertebrală în stânga). Aplicat la "agenții economici" din Cap. 2 (7 categorii).
- [x] ~~Calculatoarele inline dau doar text, fără sprijin vizual~~ → Rezolvat: helper nou `buildMiniBarPair` (kit, secțiunea 3) - orice calculator trebuie să aibă acum și un mic grafic vizual. Aplicat retroactiv la Cap. 1 și Cap. 4.
- [x] ~~Toate graficele calculatoarelor sunt bare simple, devine monoton~~ → Rezolvat: paletă de 6 tipuri de grafice (`buildDumbbellChart`, `buildWaterfallChart`, `buildDonutChart`, `buildRadarChart`, `buildGaugeChart`, `buildMiniBarPair` ca ultimă opțiune) - vezi kit-extindere-cod.md, secțiunea 3, cu tabelul de decizie „ce grafic pentru ce relație între valori". Aplicat retroactiv la toate cele 19 capitole - fiecare calculator folosește acum tipul de grafic potrivit conținutului lui (compoziție→donut, sumă→waterfall, înainte/după→dumbbell, multi-criteriu→radar, poziție pe scală→gauge), nu implicit bare.
- [ ] Câmpurile din schema de mai sus acoperă tot ce ai nevoie pentru un capitol?
- [ ] Ordinea secțiunilor (1-11) e cea corectă, sau vrei să muți ceva (ex: simulatorul mai sus, cuprinsul mai jos)?
- [ ] Sistemul de „flags" extensibile (secțiunea 3) e suficient de clar ca să-l dai unui agent AI să-l urmeze corect?
