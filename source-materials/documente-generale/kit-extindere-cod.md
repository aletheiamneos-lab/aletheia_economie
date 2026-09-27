# Kit de extindere: cod gata de folosit

Acest fișier conține **cod funcțional, verificat sintactic**, nu doar descrieri — exact ca „robotul de AI" să nu ghicească, ci să copieze. Corespunde secțiunilor 1.2, 1.6 și 3 din `structura-lectie-specificatie.md`.

Toate bucățile de cod de mai jos respectă convențiile deja validate în `capitolul-8-piata-si-echilibrul-sau.html` și `capitolul-1-introducere-in-economie.html`: folosesc helperul `el()`, aceleași clase CSS (`optiune`, `corecta`, `gresita`, `selectata`, `feedback`), și aceeași structură de funcție ca `buildQuizGrila`/`buildQuizAF`/`buildQuizProblema`.

---

## 1. Exercițiul de asociere (termen ↔ definiție)

### 1.1 Cum arată datele (în `DATA.asociere`)

```js
asociere: [
  {
    instructiune: 'Asociază fiecare termen cu definiția corespunzătoare.',
    coloanaA: [
      { id: 'a1', text: 'Cerere' },
      { id: 'a2', text: 'Ofertă' }
    ],
    coloanaB: [
      { id: 'b1', text: 'Cantitatea dorită și cumpărată la un preț dat' },
      { id: 'b2', text: 'Cantitatea dorită și vândută la un preț dat' }
    ],
    perechi: [
      { stanga: 'a1', dreapta: 'b1' },
      { stanga: 'a2', dreapta: 'b2' }
    ],
    explicatie: 'Cererea și oferta sunt cele două laturi ale pieței, în oglindă.'
  }
]
```

`coloanaB` se afișează exact în ordinea din listă — dacă vrei ca termenii să nu fie în ordinea "evidentă", amestecă tu manual ordinea elementelor din `coloanaB` când scrii JSON-ul (nu se amestecă automat în cod, ca rezultatul să fie previzibil și testabil).

### 1.2 Codul funcției (de lipit lângă `buildQuizProblema`)

```js
function buildQuizAsociere(item, idx) {
  const card = el('div', 'card');
  if (item.instructiune) card.appendChild(el('p', 'card__intrebare', (idx + 1) + '. ' + item.instructiune));

  const grid = el('div', 'asociere-grid');
  const colA = el('div', 'asociere-coloana');
  const colB = el('div', 'asociere-coloana');
  grid.appendChild(colA); grid.appendChild(colB);
  card.appendChild(grid);

  const stare = document.createElement('div');
  card.appendChild(stare);

  let selectatId = null;
  let rezolvate = 0;
  const total = item.perechi.length;
  const butoaneA = {};

  function verificaFinal() {
    if (rezolvate === total) {
      stare.className = 'feedback corect';
      stare.textContent = 'Ai asociat corect toate cele ' + total + ' perechi.' + (item.explicatie ? ' ' + item.explicatie : '');
    }
  }

  item.coloanaA.forEach(termen => {
    const btn = el('button', 'optiune', termen.text);
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      Object.values(butoaneA).forEach(b => b.classList.remove('selectata'));
      selectatId = termen.id;
      btn.classList.add('selectata');
    });
    butoaneA[termen.id] = btn;
    colA.appendChild(btn);
  });

  item.coloanaB.forEach(definitie => {
    const btn = el('button', 'optiune', definitie.text);
    btn.addEventListener('click', () => {
      if (btn.disabled || selectatId === null) return;
      const btnA = butoaneA[selectatId];
      const perecheCorecta = item.perechi.some(p => p.stanga === selectatId && p.dreapta === definitie.id);
      if (perecheCorecta) {
        btnA.classList.remove('selectata'); btnA.classList.add('corecta'); btnA.disabled = true;
        btn.classList.add('corecta'); btn.disabled = true;
        rezolvate++;
        selectatId = null;
        verificaFinal();
      } else {
        btnA.classList.add('gresita'); btn.classList.add('gresita');
        setTimeout(() => { btnA.classList.remove('selectata', 'gresita'); btn.classList.remove('gresita'); }, 600);
        selectatId = null;
      }
    });
    colB.appendChild(btn);
  });

  return card;
}
```

**Notă despre scor**: funcția de mai sus nu apelează `inregistreazaScor` — o asociere corectă/greșită per pereche nu se numără automat în bara de scor de sus, pentru că (spre deosebire de grilă/A-F/problemă) elevul poate încerca de mai multe ori aceeași pereche până nimerește. Dacă vrei ca asocierea să conteze în scor, cea mai simplă variantă e să adaugi `inregistreazaScor(true)` o singură dată, în `verificaFinal()`, când toate perechile sunt rezolvate.

### 1.3 CSS necesar (de adăugat în `<style>`, lângă `.optiuni`)

```css
.asociere-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; }
.asociere-coloana { display: flex; flex-direction: column; gap: 8px; }
@media (max-width: 480px) { .asociere-grid { grid-template-columns: 1fr; } }
```

### 1.4 Cum o activezi în asamblarea paginii

```js
if (DATA.asociere && DATA.asociere.length) {
  root.appendChild(el('div', 'exercitiu-eyebrow', 'V. Asociază noțiunile'));
  root.appendChild(el('div', 'exercitiu-sub', 'Apasă un termen din stânga, apoi definiția potrivită din dreapta.'));
  DATA.asociere.forEach((item, idx) => root.appendChild(buildQuizAsociere(item, idx)));
}
```

(`if` la început ca să nu apară secțiunea deloc la capitolele fără asociere - vezi 1.6 din specificație.)

---

## 2. Arborele de clasificare (înlocuiește liste plate de bullet-uri)

Se folosește oriunde teoria conține o clasificare/defalcare (un criteriu care se ramifică în 2-7 categorii), nu pentru proprietăți independente - vezi regula din secțiunea 1.2 a specificației.

**Regulă obligatorie, ca să nu se repete o greșeală reală făcută la Capitolele 1-2**: dacă manualul dă o definiție sau un exemplu pentru o categorie (nu doar un nume), acea definiție **trebuie** păstrată - nu doar eticheta. La prima trecere prin Capitolul 2, "Microeconomia / Mezoeconomia / Macroeconomia" au apărut ca simple cutii, fără explicație, deși manualul le definea explicit pe fiecare. Corect e ca fiecare categorie să fie `{nume, definitie}`, nu doar un string, ori de câte ori manualul oferă o explicație - un string simplu e acceptabil DOAR când manualul chiar nu explică termenul (de ex. "Producție, Repartiție, Schimb, Consum" - enumerate, fără definiții individuale în sursă).

### 2.1 Cum arată datele (în `teorie[i].clasificari`)

```js
clasificari: [
  {
    criteriu: 'După nivelul la care se manifestă',
    categorii: [
      { nume: 'Individuale', definitie: 'nevoi personale, ale unui singur om' },
      { nume: 'De grup', definitie: 'nevoi la nivelul unor colectivități' },
      { nume: 'Sociale', definitie: 'nevoi ale întregii societăți' }
    ]
  },
  {
    criteriu: 'Fazele activității economice',
    categorii: ['Producție', 'Repartiție', 'Schimb', 'Consum']  // ok: fara definitie in sursa
  },
  {
    criteriu: 'Sectoarele instituționale (multe categorii, etichete lungi)',
    orientare: 'vertical',
    categorii: [
      { nume: 'Societăți comerciale nefinanciare', definitie: 'produc bunuri și servicii nefinanciare, destinate pieței' }
    ]
  }
]
```

`categorii[i]` poate fi un string simplu (doar eticheta) SAU un obiect `{nume, definitie}` - vezi regula de mai sus pentru când se folosește care. `orientare` e opțional: `'orizontal'` (implicit, cutii una lângă alta) sau `'vertical'` (cutii una sub alta, cu o singură "coloană vertebrală" în stânga) - **folosește `'vertical'` când sunt 5+ categorii sau etichete lungi**, ca să nu se înghesuie pe lățime.

### 2.2 Codul funcțiilor (deja incluse în fișier - le citești, nu le adaugi separat)

```js
function buildArboreOrizontal(nume) {
  const charW = 6.3, padX = 18, minW = 64, boxH = 30, gap = 10;
  const widths = nume.map(c => Math.max(minW, Math.round(c.length * charW) + padX));
  const totalW = widths.reduce((a, b) => a + b, 0) + gap * (nume.length - 1);
  const height = 56;
  const topY = 4, boxY = 26;
  const rootX = totalW / 2;

  const svg = elNS('svg', { width: totalW, height: height, viewBox: '0 0 ' + totalW + ' ' + height, role: 'img', 'aria-label': nume.join(', '), style: 'max-width: 100%; display: block;' });
  svg.appendChild(elNS('circle', { cx: rootX, cy: topY, r: 3, fill: 'var(--accent)' }));

  let x = 0;
  widths.forEach((w, i) => {
    const cx = x + w / 2;
    svg.appendChild(elNS('line', { x1: rootX, y1: topY + 3, x2: cx, y2: boxY, stroke: 'var(--border)', 'stroke-width': 1.5 }));
    svg.appendChild(elNS('rect', { x: x, y: boxY, width: w, height: boxH, rx: 7, fill: 'var(--accent-soft)', stroke: 'var(--accent)', 'stroke-width': 1 }));
    const t = elNS('text', { x: cx, y: boxY + boxH / 2 + 4, 'text-anchor': 'middle', 'font-family': 'var(--font-body)', 'font-size': 11.5, fill: 'var(--text)' });
    t.textContent = nume[i];
    svg.appendChild(t);
    x += w + gap;
  });
  return svg;
}

function buildArboreVertical(nume) {
  const charW = 6.3, padX = 18, minW = 64, boxH = 28, gapV = 10, stubLen = 16, trunkX = 4, topPad = 4;
  const widths = nume.map(c => Math.max(minW, Math.round(c.length * charW) + padX));
  const maxW = Math.max.apply(null, widths);
  const boxX = trunkX + stubLen;
  const totalW = boxX + maxW + 6;
  const totalH = topPad + nume.length * boxH + (nume.length - 1) * gapV + topPad;

  const svg = elNS('svg', { width: totalW, height: totalH, viewBox: '0 0 ' + totalW + ' ' + totalH, role: 'img', 'aria-label': nume.join(', '), style: 'max-width: 100%; display: block;' });
  const firstCy = topPad + boxH / 2;
  const lastCy = topPad + (nume.length - 1) * (boxH + gapV) + boxH / 2;
  svg.appendChild(elNS('line', { x1: trunkX, y1: firstCy, x2: trunkX, y2: lastCy, stroke: 'var(--border)', 'stroke-width': 1.5 }));
  svg.appendChild(elNS('circle', { cx: trunkX, cy: (firstCy + lastCy) / 2, r: 3, fill: 'var(--accent)' }));

  nume.forEach((n, i) => {
    const cy = topPad + i * (boxH + gapV) + boxH / 2;
    svg.appendChild(elNS('line', { x1: trunkX, y1: cy, x2: boxX, y2: cy, stroke: 'var(--border)', 'stroke-width': 1.5 }));
    svg.appendChild(elNS('rect', { x: boxX, y: cy - boxH / 2, width: widths[i], height: boxH, rx: 7, fill: 'var(--accent-soft)', stroke: 'var(--accent)', 'stroke-width': 1 }));
    const t = elNS('text', { x: boxX + widths[i] / 2, y: cy + 4, 'text-anchor': 'middle', 'font-family': 'var(--font-body)', 'font-size': 11.5, fill: 'var(--text)' });
    t.textContent = n;
    svg.appendChild(t);
  });
  return svg;
}

// categorii: liste de texte SAU de {nume, definitie}. optiuni.orientare:
// 'orizontal' (implicit) sau 'vertical'.
function buildClasificareTree(criteriu, categorii, optiuni) {
  optiuni = optiuni || {};
  const orientare = optiuni.orientare || 'orizontal';
  const nume = categorii.map(c => (typeof c === 'object' && c !== null) ? c.nume : c);
  const definitii = categorii.map(c => (typeof c === 'object' && c !== null) ? c.definitie : null);

  const wrap = el('div', 'clasificare');
  wrap.appendChild(el('div', 'clasificare__criteriu', criteriu));
  wrap.appendChild(orientare === 'vertical' ? buildArboreVertical(nume) : buildArboreOrizontal(nume));

  if (definitii.some(d => d)) {
    const listaDef = el('div', 'clasificare__definitii');
    nume.forEach((n, i) => {
      if (definitii[i]) {
        const p = document.createElement('p');
        const strong = document.createElement('strong');
        strong.textContent = n;
        p.appendChild(strong);
        p.appendChild(document.createTextNode(' - ' + definitii[i]));
        listaDef.appendChild(p);
      }
    });
    wrap.appendChild(listaDef);
  }
  return wrap;
}
```

**Important despre dimensiuni**: spre deosebire de graficele mari (echilibru, exces, PPF), acest element **nu** se întinde la `width: 100%` — lățimea/înălțimea sunt calculate exact din text și fixate ca atare, cu `max-width: 100%` doar ca plasă de siguranță pe ecrane înguste. Un arbore orizontal cu multe categorii sau etichete lungi devine foarte lat (ex. 7 categorii lungi → peste 1200px) și, la `max-width: 100%`, s-ar comprima prea mult, devenind ilizibil - de-asta există varianta `'vertical'`, care crește pe înălțime (mult mai tolerantă) în loc de lățime.

### 2.3 CSS necesar

```css
.clasificare { margin-top: 16px; }
.clasificare__criteriu { font-family: var(--font-mono); font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
.clasificare__definitii { margin-top: 10px; }
.clasificare__definitii p { font-size: 13.5px; margin: 0 0 6px; color: var(--text); }
.clasificare__definitii p:last-child { margin-bottom: 0; }
.clasificare__definitii strong { color: var(--accent); }
```

### 2.4 Cum se activează (deja inclus în `buildTeorieBox`)

```js
(item.clasificari || []).forEach(cl => body.appendChild(buildClasificareTree(cl.criteriu, cl.categorii, { orientare: cl.orientare })));
```

---

## 3. Paleta de grafice pentru calculatoare (nu mai folosi doar bare!)

**Regulă obligatorie, revizuită**: orice calculator inline (`buildXyzCalc`) trebuie să aibă un mic grafic vizual lângă rezultatul text - dar **nu implicit un grafic cu bare**. La primele capitole s-a folosit `buildMiniBarPair` peste tot, iar rezultatul a devenit monoton (feedback direct de la utilizator: "m-am săturat de bar chart-uri"). Regula acum: **alege graficul potrivit conținutului**, din paleta de mai jos, înainte să te gândești la bare.

### 3.0 Cum alegi ce grafic să folosești

| Relația dintre valori | Grafic potrivit |
|---|---|
| Două valori sunt **aceeași mărime, la momente diferite** (înainte/după, T0/T1) | `buildDumbbellChart` |
| Componentele **se adună exact la un total** (CF+CV=CT, KF+KC=KT) | `buildWaterfallChart` |
| Componentele **reprezintă părți dintr-un întreg** (% din PAD, din venit, din buget) | `buildDonutChart` |
| **3 sau mai multe criterii independente**, de comparat simultan (pt. una sau mai multe "entități") | `buildRadarChart` |
| O singură valoare, de plasat **pe o scală cu zone denumite** (inelastic/unitar/elastic; moderată/galopantă/hiperinflație) | `buildGaugeChart` |
| Nimic din de mai sus nu se potrivește (rar) | `buildMiniBarPair`, ca ultimă opțiune |

### 3.1 `buildDumbbellChart` — comparație înainte/după

```js
function buildDumbbellChart(label0, val0, label1, val1, maxVal, culoare0, culoare1) {
  const width = 240, height = 100, left = 16, right = 16, midY = 46;
  const usableW = width - left - right;
  const scale = usableW / maxVal;
  const x0 = left + Math.max(0, Math.min(val0, maxVal)) * scale;
  const x1 = left + Math.max(0, Math.min(val1, maxVal)) * scale;
  const svg = elNS('svg', { width: '100%', viewBox: '0 0 ' + width + ' ' + height, role: 'img', 'aria-label': label0 + ': ' + val0 + ', ' + label1 + ': ' + val1 });
  svg.appendChild(elNS('line', { x1: left, y1: midY, x2: width - right, y2: midY, stroke: 'var(--border)', 'stroke-width': 2 }));
  svg.appendChild(elNS('line', { x1: x0, y1: midY, x2: x1, y2: midY, stroke: 'var(--text-muted)', 'stroke-width': 3 }));
  svg.appendChild(elNS('circle', { cx: x0, cy: midY, r: 7, fill: culoare0, stroke: 'var(--surface)', 'stroke-width': 2 }));
  svg.appendChild(elNS('circle', { cx: x1, cy: midY, r: 7, fill: culoare1, stroke: 'var(--surface)', 'stroke-width': 2 }));
  const t0 = elNS('text', { x: x0, y: midY - 14, 'text-anchor': 'middle', 'font-family': 'var(--font-mono)', 'font-size': 11.5, fill: culoare0, 'font-weight': 600 });
  t0.textContent = Math.round(val0 * 100) / 100;
  const t1 = elNS('text', { x: x1, y: midY - 14, 'text-anchor': 'middle', 'font-family': 'var(--font-mono)', 'font-size': 11.5, fill: culoare1, 'font-weight': 600 });
  t1.textContent = Math.round(val1 * 100) / 100;
  svg.appendChild(t0); svg.appendChild(t1);
  const l0 = elNS('text', { x: left, y: midY + 30, 'text-anchor': 'start', 'font-size': 10, fill: 'var(--text-muted)' });
  l0.textContent = label0;
  const l1 = elNS('text', { x: width - right, y: midY + 30, 'text-anchor': 'end', 'font-size': 10, fill: 'var(--text-muted)' });
  l1.textContent = label1;
  svg.appendChild(l0); svg.appendChild(l1);
  return svg;
}
```

Utilizare: `buildDumbbellChart('T0 (inițial)', val0, 'T1 (curent)', val1, maxVal, 'var(--text-muted)', 'var(--accent)')`.

### 3.2 `buildWaterfallChart` — componente care se adună la un total

```js
function buildWaterfallChart(componente) {
  const width = 260, height = 150, left = 14, right = 14, top = 14, bottom = 30;
  const chartH = height - top - bottom, chartW = width - left - right;
  const total = componente.reduce((a, c) => a + c.val, 0);
  const barW = chartW / (componente.length + 1) * 0.72;
  const gap = chartW / (componente.length + 1) * 0.28;
  const scale = chartH / (total * 1.1);
  const baseY = top + chartH;
  const svg = elNS('svg', { width: '100%', viewBox: '0 0 ' + width + ' ' + height, role: 'img', 'aria-label': 'Cascada: ' + componente.map(c => c.label + '=' + c.val).join(', ') + ', total=' + total });
  svg.appendChild(elNS('line', { x1: left, y1: baseY, x2: width - right, y2: baseY, stroke: 'var(--text-muted)', 'stroke-width': 1 }));
  let yCursor = baseY, x = left;
  componente.forEach(c => {
    const h = Math.max(2, c.val * scale);
    svg.appendChild(elNS('rect', { x, y: yCursor - h, width: barW, height: h, fill: c.culoare, rx: 2 }));
    const lv = elNS('text', { x: x + barW / 2, y: yCursor - h - 6, 'text-anchor': 'middle', 'font-family': 'var(--font-mono)', 'font-size': 10.5, fill: 'var(--text)', 'font-weight': 600 });
    lv.textContent = Math.round(c.val * 100) / 100;
    svg.appendChild(lv);
    const ll = elNS('text', { x: x + barW / 2, y: height - 10, 'text-anchor': 'middle', 'font-size': 9.5, fill: 'var(--text-muted)' });
    ll.textContent = c.label;
    svg.appendChild(ll);
    if (yCursor < baseY) svg.appendChild(elNS('line', { x1: x - gap * 0.4, y1: yCursor, x2: x, y2: yCursor, stroke: 'var(--border)', 'stroke-width': 1, 'stroke-dasharray': '2 2' }));
    yCursor -= h;
    x += barW + gap;
  });
  const hTotal = Math.max(2, total * scale);
  svg.appendChild(elNS('rect', { x, y: baseY - hTotal, width: barW, height: hTotal, fill: 'var(--accent)', rx: 2 }));
  const lvT = elNS('text', { x: x + barW / 2, y: baseY - hTotal - 6, 'text-anchor': 'middle', 'font-family': 'var(--font-mono)', 'font-size': 10.5, fill: 'var(--accent)', 'font-weight': 700 });
  lvT.textContent = Math.round(total * 100) / 100;
  svg.appendChild(lvT);
  const llT = elNS('text', { x: x + barW / 2, y: height - 10, 'text-anchor': 'middle', 'font-size': 9.5, fill: 'var(--accent)', 'font-weight': 600 });
  llT.textContent = 'Total';
  svg.appendChild(llT);
  return svg;
}
```

Utilizare: `buildWaterfallChart([{label:'CFM', val:r.CFM, culoare:'var(--text-muted)'}, {label:'CVM', val:r.CVM, culoare:'var(--mark)'}])` — bara "Total" (CTM) se adaugă automat.

### 3.3 `buildDonutChart` — compoziție (părți dintr-un întreg)

```js
function buildDonutChart(componente) {
  const size = 200, cx = size / 2, cy = size / 2 - 6, rOut = 70, rIn = 42;
  const total = componente.reduce((a, c) => a + Math.max(0, c.val), 0) || 1;
  const svg = elNS('svg', { width: '100%', viewBox: '0 0 ' + size + ' ' + (size + 34), role: 'img', 'aria-label': 'Compozitie: ' + componente.map(c => c.label + '=' + c.val).join(', ') });
  let unghiStart = -Math.PI / 2;
  componente.forEach(c => {
    const frac = Math.max(0, c.val) / total;
    const unghiEnd = unghiStart + frac * 2 * Math.PI;
    const x0o = cx + rOut * Math.cos(unghiStart), y0o = cy + rOut * Math.sin(unghiStart);
    const x1o = cx + rOut * Math.cos(unghiEnd), y1o = cy + rOut * Math.sin(unghiEnd);
    const x0i = cx + rIn * Math.cos(unghiEnd), y0i = cy + rIn * Math.sin(unghiEnd);
    const x1i = cx + rIn * Math.cos(unghiStart), y1i = cy + rIn * Math.sin(unghiStart);
    const mare = frac > 0.5 ? 1 : 0;
    const d = 'M ' + x0o + ' ' + y0o + ' A ' + rOut + ' ' + rOut + ' 0 ' + mare + ' 1 ' + x1o + ' ' + y1o + ' L ' + x0i + ' ' + y0i + ' A ' + rIn + ' ' + rIn + ' 0 ' + mare + ' 0 ' + x1i + ' ' + y1i + ' Z';
    if (frac > 0.001) svg.appendChild(elNS('path', { d, fill: c.culoare }));
    unghiStart = unghiEnd;
  });
  const legenda = elNS('g', {});
  componente.forEach((c, i) => {
    const ly = size + 12 + Math.floor(i / 2) * 16;
    const lx = 10 + (i % 2) * (size / 2);
    legenda.appendChild(elNS('rect', { x: lx, y: ly - 8, width: 9, height: 9, fill: c.culoare, rx: 2 }));
    const t = elNS('text', { x: lx + 13, y: ly, 'font-size': 9.5, fill: 'var(--text-muted)' });
    t.textContent = c.label + ' (' + Math.round(c.val / total * 1000) / 10 + '%)';
    legenda.appendChild(t);
  });
  svg.appendChild(legenda);
  return svg;
}
```

Utilizare: `buildDonutChart([{label:'Populație ocupată', val:PO, culoare:'var(--good)'}, {label:'Șomeri', val:S, culoare:'var(--bad)'}])`. Funcționează cu orice număr de componente (2, 3, 5...).

### 3.4 `buildRadarChart` — comparație multi-criteriu

```js
function buildRadarChart(axe, serii, options) {
  options = options || {};
  const size = options.size || 300;
  const cx = size / 2, cy = size / 2 + 6;
  const radius = size * 0.32;
  const maxVal = options.maxVal || 4;
  const n = axe.length;
  const svg = elNS('svg', { width: '100%', viewBox: '0 0 ' + size + ' ' + (size + 10), role: 'img', 'aria-label': 'Grafic radar comparativ: ' + axe.join(', ') });

  function punctPe(axaIdx, valoare) {
    const unghi = (2 * Math.PI * axaIdx / n) - Math.PI / 2;
    const r = (valoare / maxVal) * radius;
    return { x: cx + r * Math.cos(unghi), y: cy + r * Math.sin(unghi) };
  }
  [0.25, 0.5, 0.75, 1].forEach(frac => {
    const puncte = [];
    for (let i = 0; i < n; i++) puncte.push(punctPe(i, maxVal * frac));
    svg.appendChild(elNS('polygon', { points: puncte.map(p => p.x + ',' + p.y).join(' '), fill: 'none', stroke: 'var(--border)', 'stroke-width': 1 }));
  });
  for (let i = 0; i < n; i++) {
    const p = punctPe(i, maxVal);
    svg.appendChild(elNS('line', { x1: cx, y1: cy, x2: p.x, y2: p.y, stroke: 'var(--border)', 'stroke-width': 1 }));
    const labelR = radius + 22;
    const unghi = (2 * Math.PI * i / n) - Math.PI / 2;
    const lx = cx + labelR * Math.cos(unghi), ly = cy + labelR * Math.sin(unghi);
    const t = elNS('text', { x: lx, y: ly, 'text-anchor': 'middle', 'font-size': 10.5, fill: 'var(--text-muted)', 'font-family': 'var(--font-body)' });
    t.textContent = axe[i];
    svg.appendChild(t);
  }
  serii.forEach(s => {
    const puncte = [];
    for (let i = 0; i < n; i++) puncte.push(punctPe(i, s.valori[i]));
    svg.appendChild(elNS('polygon', { points: puncte.map(p => p.x + ',' + p.y).join(' '), fill: s.culoare, 'fill-opacity': 0.18, stroke: s.culoare, 'stroke-width': 2.2 }));
    puncte.forEach(p => svg.appendChild(elNS('circle', { cx: p.x, cy: p.y, r: 3, fill: s.culoare })));
  });
  return svg;
}
```

Utilizare (o singură "entitate"): `buildRadarChart(['RPr/K', 'RPr/CT', 'RPr/CA'], [{culoare:'var(--accent)', valori:[r.RPrK, r.RPrCT, r.RPrCA]}], {maxVal: 50})`.
Utilizare (mai multe entități suprapuse, cu bife de activare/dezactivare): vezi Capitolul 9, `buildExploratorRadar` - fiecare structură de piață e o serie separată, cu propria culoare, iar utilizatorul bifează care apar pe grafic.

### 3.5 `buildGaugeChart` — o valoare pe o scală cu zone denumite

```js
function buildGaugeChart(valoare, maxDisplay, zone) {
  const size = 260, cx = size / 2, cy = size / 2 + 4, radius = size * 0.38, grosime = 22;
  const svg = elNS('svg', { width: '100%', viewBox: '0 0 ' + size + ' ' + (size * 0.62), role: 'img', 'aria-label': 'Cadran: nivelul valorii ' + valoare + ' pe scala 0-' + maxDisplay });
  function unghiPe(v) { return Math.PI - (Math.min(Math.max(v, 0), maxDisplay) / maxDisplay) * Math.PI; }
  function punctPe(v, r) { const u = unghiPe(v); return { x: cx + r * Math.cos(u), y: cy - r * Math.sin(u) }; }
  function arc(v0, v1, r) {
    const p0 = punctPe(v0, r), p1 = punctPe(v1, r);
    const mareArc = (v1 - v0) / maxDisplay > 0.5 ? 1 : 0;
    return 'M ' + p0.x + ' ' + p0.y + ' A ' + r + ' ' + r + ' 0 ' + mareArc + ' 1 ' + p1.x + ' ' + p1.y;
  }
  zone.forEach(z => svg.appendChild(elNS('path', { d: arc(z.de, z.pana, radius), fill: 'none', stroke: z.culoare, 'stroke-width': grosime })));
  const valAfisat = Math.min(valoare, maxDisplay);
  const acUnghi = unghiPe(valAfisat);
  const acLungime = radius - grosime / 2 - 4;
  const acX = cx + acLungime * Math.cos(acUnghi), acY = cy - acLungime * Math.sin(acUnghi);
  svg.appendChild(elNS('line', { x1: cx, y1: cy, x2: acX, y2: acY, stroke: 'var(--text)', 'stroke-width': 3, 'stroke-linecap': 'round' }));
  svg.appendChild(elNS('circle', { cx: cx, cy: cy, r: 6, fill: 'var(--text)' }));
  zone.forEach(z => {
    const mid = (z.de + z.pana) / 2;
    const p = punctPe(mid, radius + 18);
    const t = elNS('text', { x: p.x, y: p.y, 'text-anchor': 'middle', 'font-size': 10, fill: 'var(--text-muted)', 'font-family': 'var(--font-body)' });
    t.textContent = z.eticheta;
    svg.appendChild(t);
  });
  const labelVal = elNS('text', { x: cx, y: cy - 14, 'text-anchor': 'middle', 'font-family': 'var(--font-mono)', 'font-size': 20, fill: 'var(--text)', 'font-weight': 700 });
  labelVal.textContent = (valoare > maxDisplay ? '>' : '') + Math.round(valAfisat) + '%';
  svg.appendChild(labelVal);
  return svg;
}
```

Utilizare: `buildGaugeChart(r.ri, 120, [{de:0, pana:10, culoare:'var(--good)', eticheta:'Moderată'}, {de:10, pana:60, culoare:'var(--mark)', eticheta:'Galopantă'}, {de:60, pana:120, culoare:'var(--bad)', eticheta:'Spre hiperinflație'}])`. Eticheta afișată încheie mereu cu `%` - dacă valoarea nu e un procent (ex. un coeficient de elasticitate), scalează-l tu înainte să-l pasezi (vezi Capitolul 8, unde `e*33.33` mapează pragul de elasticitate unitară exact la mijlocul zonei corespunzătoare).

### 3.6 `buildMiniBarPair` — ultima opțiune, doar când nimic altceva nu se potrivește

```js
function buildMiniBarPair(items, maxVal) {
  const width = 220, height = 130, barW = 46, gap = 26, top = 10, bottom = 32;
  const chartH = height - top - bottom;
  const scale = maxVal > 0 ? chartH / maxVal : 0;
  const totalW = items.length * barW + (items.length - 1) * gap;
  const startX = (width - totalW) / 2;
  const baseY = top + chartH;
  const svg = elNS('svg', { width: '100%', viewBox: '0 0 ' + width + ' ' + height, role: 'img', 'aria-label': items.map(i => i.label + ': ' + i.val).join(', ') });
  svg.appendChild(elNS('line', { x1: startX - 10, y1: baseY, x2: startX + totalW + 10, y2: baseY, stroke: 'var(--text-muted)', 'stroke-width': 1 }));
  items.forEach((it, i) => {
    const x = startX + i * (barW + gap);
    const valAbs = Math.max(0, Math.min(Math.abs(it.val), maxVal));
    const h = Math.max(2, valAbs * scale);
    svg.appendChild(elNS('rect', { x: x, y: baseY - h, width: barW, height: h, fill: it.color, rx: 3 }));
    const labelVal = elNS('text', { x: x + barW / 2, y: baseY - h - 6, 'text-anchor': 'middle', 'font-family': 'var(--font-mono)', 'font-size': 12, fill: 'var(--text)', 'font-weight': 600 });
    labelVal.textContent = Math.round(it.val * 100) / 100;
    svg.appendChild(labelVal);
    const labelName = elNS('text', { x: x + barW / 2, y: baseY + 16, 'text-anchor': 'middle', 'font-size': 10.5, fill: 'var(--text-muted)' });
    labelName.textContent = it.label;
    svg.appendChild(labelName);
  });
  return svg;
}
```

### 3.7 Cum se conectează, indiferent de graficul ales

```js
const chartWrap = el('div', 'diagrama');
box.appendChild(chartWrap);   // undeva intre randuri si rezultat

// in recalc():
chartWrap.innerHTML = '';
chartWrap.appendChild(buildDonutChart([...]));  // sau oricare din cele 6, dupa caz
```

Golește și reconstruiește `chartWrap` la fiecare `recalc()` - mai simplu decât să ții evidența elementelor individuale de actualizat. Toate cele 6 funcții sunt deja incluse în fiecare din cele 19 fișiere HTML - nu trebuie adăugate din nou, doar apelate cu datele potrivite.

---

## 4. Șablon gol pentru un grafic nou

Când vrei un grafic #2 sau #3, nu reinventezi scheletul de axe - refolosești `creazaGraficBaza`, care există deja și nu trebuie atinsă. Doar completezi ce e marcat mai jos.

```js
function buildDiagramaNOUA() {
  // 1) Piata-exemplu pentru acest grafic: Ce(Q) = a - bP, Of(Q) = c + dP
  const a = 0, b = 0, c = 0, d = 0; // <- pune aici valorile tale
  const rez = calcEchilibru(a, b, c, d);
  const puncte = puncteCurbe(a, b, c, d, 12);
  const maxPret = puncte[puncte.length - 1].pret || 1;
  const maxCant = Math.max.apply(null, puncte.map(p => Math.max(p.cerere, p.oferta)).concat([1]));

  // 2) Axele si grid-ul - functie comuna, nu se modifica
  const g = creazaGraficBaza(maxPret, maxCant, { aria: 'Descrie aici ce arata graficul, pentru cititoarele de ecran' });

  // 3) Adauga aici formele tale: linii (elNS('polyline', {...})),
  //    poligoane umplute (elNS('polygon', {...})), puncte (elNS('circle', {...})),
  //    text (elNS('text', {...})). Foloseste g.sx(pret) si g.sy(cantitate)
  //    ca sa transformi o valoare economica intr-o coordonata pe ecran.

  const wrap = el('div', 'diagrama');
  wrap.appendChild(g.svg);

  // 4) (optional) legenda, la fel ca la celelalte 3 diagrame:
  // const legenda = el('div', 'legenda');
  // legenda.appendChild(legendItem('var(--accent)', 'Eticheta 1'));
  // wrap.appendChild(legenda);

  return wrap;
}
```

Apoi, în `buildTeorieBox`, lângă celelalte trei linii `if (item.diagrama === ...)`, adaugi:

```js
if (item.diagrama === 'numeNouDiagrama') body.appendChild(buildDiagramaNOUA());
```

și în datele secțiunii de teorie respective pui `diagrama: 'numeNouDiagrama'`.

---

## Instrucțiuni pentru implementare (om sau AI)

1. Nu modifica `creazaGraficBaza`, `calcEchilibru`, `cantitateCeruta`, `cantitateOferita`, `puncteCurbe`, `el`, `elNS`, `buildDumbbellChart`, `buildWaterfallChart`, `buildDonutChart`, `buildRadarChart`, `buildGaugeChart`, `buildMiniBarPair` - sunt motorul comun, folosit de tot ce există deja.
2. Adaugi funcții noi (diagrame, exerciții) **lângă** cele existente, nu în locul lor.
3. Fiecare funcție nouă se activează printr-un singur `if` nou, într-un singur loc (fie în `buildTeorieBox`, fie în asamblarea paginii) - niciodată prin editarea unei funcții existente deja validate.
4. **Înainte să pui un grafic într-un calculator, verifică tabelul din secțiunea 3.0** - alege graficul după relația reală dintre valori (compoziție → donut, sumă → waterfall, înainte/după → dumbbell, multi-criteriu → radar, poziție pe o scală → gauge), nu implicit bare.
5. Testează sintaxa înainte să livrezi: `node --check` pe scriptul extras din HTML detectează instant orice paranteză/virgulă greșită.
