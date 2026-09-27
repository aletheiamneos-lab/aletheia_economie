# Arhitectură și decizii

## Materialele analizate

Directorul-sursă conține 19 pagini HTML, 20 JSON-uri, 20 documente DOCX, 10 arhive ZIP și un generator Python de hartă mentală. Nu conține PDF-uri.

Arhiva lecțiilor conține 19 obiecte JSON cu aceeași structură generală. În total, acestea descriu 103 secțiuni de teorie, 96 grile, 96 întrebări adevărat/fals, 56 probleme numerice, 19 exerciții de asociere, 22 de calculatoare și 9 diagrame/simulatoare.

Au fost identificate trei surse de evaluare:

1. `teste_economie_master.json`: 30 de întrebări pentru fiecare dintre cele 19 capitole;
2. `Capitolul_N_Date.json`: 40 de întrebări pentru fiecare capitol;
3. 36 de grile istorice de admitere, 2002–2025.

Prima colecție este tratată ca test final, a doua ca bancă suplimentară, iar grilele istorice sunt integrate într-un modul separat de admitere.

## Schema unificată

```text
Course
 ├─ categories[]
 └─ chapters[]
     ├─ metadata: number, slug, title, objectives
     ├─ theorySections[]
     │   ├─ paragraphs[]
     │   ├─ keyPoints[]
     │   ├─ classifications[]
     │   ├─ examples[]
     │   ├─ formulas[]
     │   └─ widget flags: calculator | diagram
     ├─ guidedPractice
     │   ├─ multipleChoice[]
     │   ├─ trueFalse[]
     │   ├─ numeric[]
     │   └─ matching[]
     └─ assessments
         ├─ final[]
         ├─ practiceBank[]
         └─ admissionArchive[]
```

Întrebările din cele două formate originale sunt normalizate în memorie la:

```ts
interface NormalizedQuestion {
  id: string
  source: 'final' | 'practice' | 'admission'
  kind: 'teorie' | 'exercitiu' | 'grila'
  prompt: string
  options: Array<{ id: string; text: string }>
  correctOptionId: string
  explanation: string
}
```

Fișierele originale rămân nemodificate și sunt păstrate în proiect pentru trasabilitate. La încărcare, aplicația normalizează micile diferențe dintre capitole (de exemplu, o colecție opțională absentă sau o bancă alcătuită exclusiv din teorie).

## Arhitectura aplicației

- React + TypeScript + Vite pentru interfață și compilare;
- rutare locală bazată pe hash, potrivită și pentru găzduire statică;
- un renderer comun pentru secțiunile de lecție;
- widgeturi React izolate pentru calculatoare și simulatoare;
- un singur motor de evaluare pentru testul final și antrenament;
- același motor de evaluare pentru grilele de admitere, încărcate la cerere din manifestul public;
- stare React exclusiv în memorie pentru marcajele manuale și notițele sesiunii;
- fără backend în prototip.

Un backend devine util când sunt necesare conturi, sincronizare între dispozitive, rapoarte pentru profesor sau protejarea strictă a răspunsurilor. În versiunea statică, răspunsurile nu sunt afișate înainte de momentul potrivit în interfață, dar există inevitabil în pachetul livrat browserului.

### Teste recapitulative

Modulul `Teste recapitulative` este separat de testul final al lecției și de antrenamentul cu feedback imediat. El oferă 19 teste a câte 40 de întrebări. Utilizatorul trebuie să răspundă la toate întrebările înainte de trimitere; numai apoi sunt afișate alegerea sa, răspunsul corect și explicația originală. Nu se păstrează recorduri; utilizatorul poate marca manual fiecare test drept Parcurs sau Neparcurs în sesiunea curentă.

### Teste de admitere

Modulul `Teste de admitere` încarcă 36 de grile istorice din perioada 2002–2025, cu 1.280 de întrebări. Catalogul este generat prin `npm run import:admission`, iar fiecare grilă este încărcată numai când este deschisă. Răspunsurile corecte, formulele și rezolvările rămân ascunse până la trimiterea testului.

La finalul unei grile, `admissionReport.ts` generează local un raport PDF A4 cu identitatea elevului, durata, scorul, graficul corecte/incorecte și analiza integrală. Descărcarea este disponibilă elevului. Pentru rolul de administrator, aplicația încearcă distribuirea PDF-ului prin Web Share și folosește ca rezervă descărcarea fișierului plus un mesaj `mailto:` precompletat. În versiunea cu backend, funcția de livrare poate fi înlocuită cu încărcarea raportului în arhiva profesorului și trimiterea prin serviciul de e-mail, fără modificarea generatorului PDF.

### Stare temporară și profiluri

Aplicația nu calculează o rată de progres și nu persistă starea de studiu. Lecțiile și testele recapitulative au marcaje binare, acționate manual, care se resetează la reîncărcarea paginii. Profilul este proiectat pentru două roluri: elev și administrator. Selectorul din prototip schimbă doar prezentarea în sesiunea curentă; într-o versiune conectată, rolul și permisiunile administrative trebuie furnizate și validate de backend.

## Direcția vizuală

Designul combină un stil editorial cu un dashboard modern:

- bleumarin petrol pentru structură și concentrare;
- coral pentru acțiuni și idei importante;
- verde-albăstrui pentru instrumente și răspunsuri corecte;
- fundal cald, nu alb clinic;
- Manrope pentru titluri, DM Sans pentru lectură și DM Mono pentru indicatori;
- vizualizări realizate nativ cu SVG și CSS;
- mișcare discretă și suport pentru `prefers-reduced-motion`.

## Presupuneri

- duratele capitolelor sunt estimări de interfață, nu metadate din sursă;
- toate cele 19 capitole sunt disponibile și au marcaj manual, test final și antrenament propriu;
- titlurile din sursă sunt păstrate, inclusiv suprapunerea editorială dintre capitolele 16 și 17;
- marcajele și notițele există numai în memoria sesiunii și se resetează la reîncărcare;
- grilele istorice constituie un modul separat, pentru a nu amesteca evaluarea de capitol cu simularea admiterii.

## Starea integrării

Rendererul comun încarcă toate cele 19 capitole. Conținutul JSON este redat fără rescriere; fișierele din `src/data/chapters` sunt identice octet cu sursele din `source-materials/json`.

Integrarea vizuală urmărește separat cele două poziții editoriale din HTML:

- cele 9 valori `diagrama` sunt randate în interiorul secțiunii teoretice care le declară; aici intră și exploratorul de exces de cerere/ofertă din secțiunea 11 a capitolului 8;
- cele 19 secțiuni finale de tip explorator/simulator sunt randate după activitățile lecției, cu numerotarea originală (IV, V sau VI); capitolul 9 conține două astfel de secțiuni;
- cele 20 de grafice asociate calculatoarelor sunt sincronizate cu valorile introduse și folosesc formele din HTML: dumbbell, donut, waterfall, gauge, radar și axă comparativă.

Seturile de date, formulele, etichetele pedagogice, ancorele și interpretările exploratoarelor provin din fișierele HTML de referință. Stilul lor a fost unificat cu aplicația (bleumarin, albastru, verde-albăstrui, coral și auriu), fără a schimba lecțiile.

Testele automate verifică existența tuturor lecțiilor, cele 30 de întrebări finale și cele 40 de întrebări de antrenament pentru fiecare capitol, titlurile tuturor exploratoarelor, cele 9 vizualuri teoretice și toate familiile de grafice ale calculatoarelor.

### Laboratorul de grafice V5.4

Pachetul V5.4 este păstrat în `public/graph-lab`. Cele 83 de fișiere selectate din pachet au fost copiate byte-cu-byte; configurațiile, formulele, denumirile și motorul nu sunt rescrise de aplicația React.

`GraphLabPage` aplică următorul flux:

1. citește catalogul exclusiv din `data/manifest.json`;
2. încarcă `integration/lesson_XX.integration.json` pentru lecția aleasă;
3. verifică versiunea, ordinea modulelor, formulele și `provenance.status` față de audit;
4. montează configurația exactă din câmpul `config` într-un document izolat care încarcă unicul `assets/graph-engine.js` și `assets/graph-lab.css`;
5. adaugă numai o temă vizuală de integrare pentru cromatica interfeței, fără a schimba tema economică globală `eco_graph_theme_v1`.

Izolarea în iframe este intenționată: motorul V5.4 folosește identificatori DOM globali și o stare proprie per modul. Astfel, resetarea graficului și resetarea lecției rămân conforme contractului, iar tema globală și setările administrative nu se amestecă cu starea temporară a aplicației principale. Iframe-ul comunică înălțimea conținutului și cererile de export către React pentru a evita scroll-ul interior și pentru a păstra separarea de rol. Culorile și etichetele de date sunt disponibile ambelor roluri, iar `Control profesor`, PNG și PDF sunt randate exclusiv pentru administrator. Setările profesorului actualizează cheia nativă `eco_graph_admin_v1`; blocarea formulelor ascunde inclusiv modul și câmpurile de editare a ecuațiilor.

`graphExport.ts` serializează SVG-ul curent și construiește local două formate: PNG 1920×1260 cu antet și raport PDF A4 multipagină. Raportul este alcătuit din grafic, valorile `.metric`, controalele curente din `.sidePanel` și formulele contractului modulului, astfel încât formulele rămân în raportul profesorului chiar dacă sunt blocate în vizualizarea elevului. Nu sunt trimise date către un serviciu extern.

Auditul `npm run test:graphs` execută motorul real pentru toate cele 19 lecții și toate cele 87 de module. El verifică randarea fără placeholder, 87 de resetări individuale, 19 resetări complete, păstrarea culorilor globale, stările A/B și T0/T1, precum și faptul că mișcarea punctului nu schimbă ecuațiile iar deplasarea T1 păstrează pantele.
