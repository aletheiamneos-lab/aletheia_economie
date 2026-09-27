import { Calculator, CheckCircle2, Landmark, Network, SlidersHorizontal, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CostOpportunityCalculator, IndicatorCalculator } from './InteractiveWidgets'
import { CalculatorVisual, TheoryVisual } from './TheoryVisuals'

type Values = Record<string, number>
type Field = { key: string; label: string; value: number; suffix?: string }
type Result = { label: string; value: number | string | null; suffix?: string }
type CalculatorDefinition = {
  title: string
  description: string
  fields: Field[]
  calculate: (values: Values) => Result[]
}

const divide = (a: number, b: number) => b === 0 ? null : a / b
const percent = (value: number, base: number) => base === 0 ? null : value / base * 100

const calculators: Record<string, CalculatorDefinition> = {
  amortizare: {
    title: 'Structura și consumul capitalului',
    description: 'Modifică datele firmei și urmărește capitalul fix, circulant și amortizarea anuală.',
    fields: [
      { key: 'total', label: 'Capital total', value: 500, suffix: 'u.m.' },
      { key: 'fix', label: 'Capital fix', value: 80, suffix: '%' },
      { key: 'rata', label: 'Rata amortizării', value: 20, suffix: '%' },
    ],
    calculate: ({ total, fix, rata }) => {
      const capitalFix = total * fix / 100
      const circulant = total - capitalFix
      const amortizare = capitalFix * rata / 100
      return [
        { label: 'Capital fix', value: capitalFix, suffix: 'u.m.' },
        { label: 'Capital circulant', value: circulant, suffix: 'u.m.' },
        { label: 'Amortizare anuală', value: amortizare, suffix: 'u.m.' },
        { label: 'Capital consumat', value: amortizare + circulant, suffix: 'u.m.' },
      ]
    },
  },
  rms: {
    title: 'Rata marginală de substituție',
    description: 'Află câte unități din factorul X sunt necesare pentru a înlocui o unitate din factorul Y.',
    fields: [
      { key: 'substituit', label: 'Productivitatea factorului substituit (Y)', value: 180 },
      { key: 'substituent', label: 'Productivitatea factorului care substituie (X)', value: 90 },
    ],
    calculate: ({ substituit, substituent }) => [{
      label: 'Rata marginală de substituție',
      value: divide(substituit, substituent),
      suffix: 'unități X pentru 1 unitate Y',
    }],
  },
  productivitate: {
    title: 'Productivitatea muncii',
    description: 'Compară două perioade și separă productivitatea medie de cea marginală.',
    fields: [
      { key: 'l0', label: 'Lucrători T₀', value: 10 }, { key: 'q0', label: 'Producție T₀', value: 600, suffix: 'buc.' },
      { key: 'l1', label: 'Lucrători T₁', value: 15 }, { key: 'q1', label: 'Producție T₁', value: 750, suffix: 'buc.' },
    ],
    calculate: ({ l0, q0, l1, q1 }) => {
      const w0 = divide(q0, l0); const w1 = divide(q1, l1)
      return [
        { label: 'Productivitate T₀', value: w0, suffix: 'buc./lucrător' },
        { label: 'Productivitate T₁', value: w1, suffix: 'buc./lucrător' },
        { label: 'Productivitate marginală', value: divide(q1 - q0, l1 - l0), suffix: 'buc./lucrător' },
        { label: 'Modificare relativă', value: w0 === null || w1 === null ? null : w1 / w0 * 100 - 100, suffix: '%' },
      ]
    },
  },
  costMediu: {
    title: 'Structura costului unitar',
    description: 'Vezi cum costurile fixe și variabile se distribuie asupra producției.',
    fields: [
      { key: 'cf', label: 'Costuri fixe', value: 50, suffix: 'u.m.' },
      { key: 'cv', label: 'Costuri variabile', value: 100, suffix: 'u.m.' },
      { key: 'q', label: 'Producție', value: 5, suffix: 'buc.' },
    ],
    calculate: ({ cf, cv, q }) => [
      { label: 'Cost total', value: cf + cv, suffix: 'u.m.' },
      { label: 'Cost fix mediu', value: divide(cf, q), suffix: 'u.m./buc.' },
      { label: 'Cost variabil mediu', value: divide(cv, q), suffix: 'u.m./buc.' },
      { label: 'Cost total mediu', value: divide(cf + cv, q), suffix: 'u.m./buc.' },
    ],
  },
  profitBrutNet: {
    title: 'Profit brut și profit net',
    description: 'Calculează rezultatul firmei înainte și după impozit.',
    fields: [
      { key: 'ca', label: 'Cifra de afaceri', value: 1000, suffix: 'u.m.' },
      { key: 'ct', label: 'Cost total', value: 500, suffix: 'u.m.' },
      { key: 'impozit', label: 'Impozit pe profit', value: 15, suffix: '%' },
    ],
    calculate: ({ ca, ct, impozit }) => {
      const brut = ca - ct
      return [{ label: 'Profit brut', value: brut, suffix: 'u.m.' }, { label: 'Profit net', value: brut * (1 - impozit / 100), suffix: 'u.m.' }]
    },
  },
  profitNormalEconomic: {
    title: 'Profit contabil și economic',
    description: 'Include costurile implicite ale antreprenorului pentru a afla profitul economic real.',
    fields: [
      { key: 'capital', label: 'Capital propriu', value: 50000, suffix: 'u.m.' },
      { key: 'dobanda', label: 'Dobândă alternativă', value: 3, suffix: '%' },
      { key: 'salariuAlt', label: 'Salariu alternativ', value: 19000, suffix: 'u.m.' },
      { key: 'chirieAlt', label: 'Chirie alternativă', value: 10000, suffix: 'u.m.' },
      { key: 'ca', label: 'Cifra de afaceri', value: 50000, suffix: 'u.m.' },
      { key: 'costuri', label: 'Costuri explicite', value: 15000, suffix: 'u.m.' },
      { key: 'impozit', label: 'Impozit', value: 10, suffix: '%' },
    ],
    calculate: ({ capital, dobanda, salariuAlt, chirieAlt, ca, costuri, impozit }) => {
      const normal = capital * dobanda / 100 + salariuAlt + chirieAlt
      const brut = ca - costuri
      const net = brut * (1 - impozit / 100)
      return [{ label: 'Profit normal', value: normal, suffix: 'u.m.' }, { label: 'Profit contabil net', value: net, suffix: 'u.m.' }, { label: 'Profit economic', value: net - normal, suffix: 'u.m.' }]
    },
  },
  rateProfit: {
    title: 'Ratele profitului',
    description: 'Raportează profitul la capital, cost și cifra de afaceri.',
    fields: [
      { key: 'capital', label: 'Capital total', value: 1000, suffix: 'u.m.' }, { key: 'fix', label: 'Capital fix', value: 50, suffix: '%' },
      { key: 'ani', label: 'Durata capitalului fix', value: 5, suffix: 'ani' }, { key: 'salarii', label: 'Salarii', value: 100, suffix: 'u.m.' },
      { key: 'pret', label: 'Preț unitar', value: 10, suffix: 'u.m.' }, { key: 'q', label: 'Cantitate', value: 100, suffix: 'buc.' },
    ],
    calculate: ({ capital, fix, ani, salarii, pret, q }) => {
      const kf = capital * fix / 100; const ct = divide(kf, ani)
      const cost = (ct ?? 0) + (capital - kf) + salarii; const ca = pret * q; const profit = ca - cost
      return [{ label: 'Profit', value: profit, suffix: 'u.m.' }, { label: 'Rata la capital', value: percent(profit, capital), suffix: '%' }, { label: 'Rata la cost', value: percent(profit, cost), suffix: '%' }, { label: 'Rata la cifra de afaceri', value: percent(profit, ca), suffix: '%' }]
    },
  },
  elasticitateCerere: {
    title: 'Elasticitatea cererii',
    description: 'Compară variația procentuală a cantității cerute cu variația prețului.',
    fields: [{ key: 'q', label: 'Modificarea cantității', value: -20, suffix: '%' }, { key: 'p', label: 'Modificarea prețului', value: 10, suffix: '%' }],
    calculate: ({ q, p }) => {
      const e = divide(-q, p)
      const type = e === null ? 'Date insuficiente' : e > 1 ? 'Cerere elastică' : e < 1 ? 'Cerere inelastică' : 'Elasticitate unitară'
      return [{ label: 'Coeficient de elasticitate', value: e }, { label: 'Interpretare', value: type }]
    },
  },
  profitMaxim: {
    title: 'Regula profitului maxim',
    description: 'Verifică simultan condițiile Cmg ≤ Vmg și Vmg < P.',
    fields: [{ key: 'cmg', label: 'Cost marginal', value: 20 }, { key: 'vmg', label: 'Venit marginal', value: 25 }, { key: 'pret', label: 'Preț', value: 30 }],
    calculate: ({ cmg, vmg, pret }) => [
      { label: 'Cmg ≤ Vmg', value: cmg <= vmg ? 'Da' : 'Nu' },
      { label: 'Vmg < P', value: vmg < pret ? 'Da' : 'Nu' },
      { label: 'Decizie', value: cmg <= vmg && vmg < pret ? 'Producția poate continua' : 'Reevaluează producția' },
    ],
  },
  masaMonetara: {
    title: 'Ecuația schimbului',
    description: 'Estimează masa monetară necesară pentru volumul tranzacțiilor.',
    fields: [{ key: 'p', label: 'Nivelul prețurilor', value: 2.5 }, { key: 'q', label: 'Volumul bunurilor', value: 100 }, { key: 'v', label: 'Viteza banilor', value: 10 }],
    calculate: ({ p, q, v }) => [{ label: 'Masa monetară', value: divide(p * q, v), suffix: 'u.m.' }],
  },
  dobanda: {
    title: 'Dobânda simplă și compusă',
    description: 'Compară rezultatul celor două metode pentru aceeași sumă și perioadă.',
    fields: [{ key: 'capital', label: 'Capital', value: 200000, suffix: 'u.m.' }, { key: 'rata', label: 'Rata anuală', value: 30, suffix: '%' }, { key: 'ani', label: 'Perioada', value: 3, suffix: 'ani' }],
    calculate: ({ capital, rata, ani }) => {
      const simpla = capital * rata / 100 * ani; const sumaCompusa = capital * Math.pow(1 + rata / 100, ani)
      return [{ label: 'Dobândă simplă', value: simpla, suffix: 'u.m.' }, { label: 'Sumă finală simplă', value: capital + simpla, suffix: 'u.m.' }, { label: 'Dobândă compusă', value: sumaCompusa - capital, suffix: 'u.m.' }, { label: 'Sumă finală compusă', value: sumaCompusa, suffix: 'u.m.' }]
    },
  },
  inflatie: {
    title: 'Indicele prețurilor și puterea de cumpărare',
    description: 'Transformă evoluția prețului într-o rată a inflației și o valoare reală.',
    fields: [{ key: 'p0', label: 'Preț T₀', value: 50, suffix: 'u.m.' }, { key: 'p1', label: 'Preț T₁', value: 60, suffix: 'u.m.' }, { key: 'nominal', label: 'Venit nominal T₁', value: 600, suffix: 'u.m.' }],
    calculate: ({ p0, p1, nominal }) => {
      const ipc = percent(p1, p0)
      return [{ label: 'Indicele prețurilor', value: ipc, suffix: '%' }, { label: 'Rata inflației', value: ipc === null ? null : ipc - 100, suffix: '%' }, { label: 'Venit real', value: ipc === null ? null : divide(nominal, ipc / 100), suffix: 'u.m.' }, { label: 'Puterea de cumpărare', value: ipc === null ? null : divide(10000, ipc), suffix: '%' }]
    },
  },
  randamentActiune: {
    title: 'Randamentul unei acțiuni',
    description: 'Combină câștigul de capital cu dividendul încasat.',
    fields: [{ key: 'cumparare', label: 'Preț cumpărare', value: 100000, suffix: 'u.m.' }, { key: 'vanzare', label: 'Preț vânzare', value: 150000, suffix: 'u.m.' }, { key: 'dividend', label: 'Dividend', value: 5000, suffix: 'u.m.' }],
    calculate: ({ cumparare, vanzare, dividend }) => [{ label: 'Câștig total', value: vanzare - cumparare + dividend, suffix: 'u.m.' }, { label: 'Randament', value: percent(vanzare - cumparare + dividend, cumparare), suffix: '%' }],
  },
  cursObligatiune: {
    title: 'Cursul obligațiunii',
    description: 'Estimează valoarea obligațiunii pornind de la cupon și rata dobânzii.',
    fields: [{ key: 'cupon', label: 'Venit anual (cupon)', value: 20000, suffix: 'u.m.' }, { key: 'rata', label: 'Rata dobânzii', value: 20, suffix: '%' }],
    calculate: ({ cupon, rata }) => [{ label: 'Curs estimat', value: rata === 0 ? null : cupon / (rata / 100), suffix: 'u.m.' }],
  },
  salariuReal: {
    title: 'Salariul real și ocuparea',
    description: 'Leagă salariul nominal de nivelul prețurilor și de piața muncii.',
    fields: [{ key: 'sn', label: 'Salariu nominal', value: 400, suffix: 'u.m.' }, { key: 'preturi', label: 'Indice prețuri', value: 1.1 }, { key: 'ocupata', label: 'Populație ocupată', value: 12, suffix: 'mil.' }, { key: 'activa', label: 'Populație activă', value: 15, suffix: 'mil.' }],
    calculate: ({ sn, preturi, ocupata, activa }) => [{ label: 'Salariu real', value: divide(sn, preturi), suffix: 'u.m.' }, { label: 'Rata ocupării', value: percent(ocupata, activa), suffix: '%' }, { label: 'Șomeri', value: activa - ocupata, suffix: 'mil.' }],
  },
  rataSomajului: {
    title: 'Rata șomajului',
    description: 'Calculează numărul șomerilor și cele două raportări întâlnite în exerciții.',
    fields: [{ key: 'activa', label: 'Populație activă', value: 15, suffix: 'mil.' }, { key: 'ocupata', label: 'Populație ocupată', value: 12, suffix: 'mil.' }],
    calculate: ({ activa, ocupata }) => { const someri = activa - ocupata; return [{ label: 'Șomeri', value: someri, suffix: 'mil.' }, { label: 'Rată raportată la activi', value: percent(someri, activa), suffix: '%' }, { label: 'Rată raportată la ocupați', value: percent(someri, ocupata), suffix: '%' }] },
  },
  consumEconomii: {
    title: 'Consum, economii și multiplicator',
    description: 'Compară două perioade și calculează înclinațiile medii și marginale.',
    fields: [{ key: 'vd0', label: 'Venit T₀', value: 100 }, { key: 'c0', label: 'Consum T₀', value: 80 }, { key: 'vd1', label: 'Venit T₁', value: 125 }, { key: 'c1', label: 'Consum T₁', value: 96 }],
    calculate: ({ vd0, c0, vd1, c1 }) => {
      const e0 = vd0 - c0; const e1 = vd1 - c1; const deltaV = vd1 - vd0; const eMarg = divide(e1 - e0, deltaV)
      return [{ label: 'Economii T₀', value: e0 }, { label: 'Economii T₁', value: e1 }, { label: 'Înclinație medie spre consum', value: percent(c0, vd0), suffix: '%' }, { label: 'Înclinație marginală spre consum', value: divide(c1 - c0, deltaV) }, { label: 'Multiplicator', value: eMarg === null ? null : divide(1, eMarg) }]
    },
  },
  pibPeLocuitor: {
    title: 'PIB pe locuitor',
    description: 'Separă creșterea producției totale de evoluția nivelului mediu pe locuitor.',
    fields: [{ key: 'pib0', label: 'PIB T₀', value: 250000 }, { key: 'pop0', label: 'Populație T₀', value: 25 }, { key: 'pib1', label: 'PIB T₁', value: 275000 }, { key: 'pop1', label: 'Populație T₁', value: 23.75 }],
    calculate: ({ pib0, pop0, pib1, pop1 }) => { const a = divide(pib0, pop0); const b = divide(pib1, pop1); return [{ label: 'PIB/locuitor T₀', value: a }, { label: 'PIB/locuitor T₁', value: b }, { label: 'Creștere pe locuitor', value: a === null || b === null ? null : b / a * 100 - 100, suffix: '%' }] },
  },
  soldBugetar: {
    title: 'Soldul bugetar',
    description: 'Compară veniturile publice cu cheltuielile și identifică starea bugetului.',
    fields: [{ key: 'venituri', label: 'Venituri', value: 100, suffix: 'mld.' }, { key: 'cheltuieli', label: 'Cheltuieli', value: 115, suffix: 'mld.' }],
    calculate: ({ venituri, cheltuieli }) => { const sold = venituri - cheltuieli; return [{ label: 'Sold', value: sold, suffix: 'mld.' }, { label: 'Situație', value: sold === 0 ? 'Buget echilibrat' : sold > 0 ? 'Excedent bugetar' : 'Deficit bugetar' }] },
  },
  eficientaComertExterior: {
    title: 'Eficiența comerțului exterior',
    description: 'Compară cursul de revenire la export cu cel la import.',
    fields: [{ key: 'pie', label: 'Preț intern export', value: 10000 }, { key: 'pve', label: 'Preț extern export', value: 10000 }, { key: 'pii', label: 'Preț intern import', value: 50000 }, { key: 'taxe', label: 'Taxe import', value: 5000 }, { key: 'pvi', label: 'Preț extern import', value: 10000 }],
    calculate: ({ pie, pve, pii, taxe, pvi }) => { const cre = divide(pie, pve); const cri = divide(pii - taxe, pvi); return [{ label: 'Curs revenire export', value: cre }, { label: 'Curs revenire import', value: cri }, { label: 'Avantaj pe unitate valutară', value: cre === null || cri === null ? null : cri - cre }, { label: 'Evaluare', value: cre !== null && cri !== null && cre < cri ? 'Comerț eficient' : 'Comerț ineficient' }] },
  },
}

function formatValue(value: number | string | null) {
  if (value === null || (typeof value === 'number' && !Number.isFinite(value))) return '—'
  if (typeof value === 'string') return value
  return value.toLocaleString('ro-RO', { maximumFractionDigits: 2 })
}

function FormulaCalculator({ definition, type }: { definition: CalculatorDefinition; type: string }) {
  const [values, setValues] = useState<Values>(() => Object.fromEntries(definition.fields.map((field) => [field.key, field.value])))
  const results = useMemo(() => definition.calculate(values), [definition, values])

  return (
    <section className="interactive-lab formula-calculator">
      <div className="lab-title-row"><span className="lab-icon"><Calculator size={18} /></span><div><span>Calculator interactiv</span><h4>{definition.title}</h4></div></div>
      <p className="lab-description">{definition.description}</p>
      <div className="calculator-fields">
        {definition.fields.map((field) => (
          <label key={field.key}><span>{field.label}</span><div><input type="number" step="any" value={values[field.key]} onChange={(event) => setValues((current) => ({ ...current, [field.key]: Number(event.target.value) }))} /><small>{field.suffix}</small></div></label>
        ))}
      </div>
      <div className="calculator-results">
        {results.map((result) => <div key={result.label}><span>{result.label}</span><b>{formatValue(result.value)}</b>{result.suffix && <small>{result.suffix}</small>}</div>)}
      </div>
      <CalculatorVisual type={type} values={values} />
    </section>
  )
}

const diagramCopy: Record<string, { title: string; description: string }> = {
  checklistFunctionala: { title: 'Semnele unei economii de piață funcționale', description: 'Instituțiile, concurența și libertatea economică funcționează împreună.' },
  circuitEconomic: { title: 'Circuitul economic', description: 'Fluxurile reale și monetare leagă principalii agenți economici.' },
  utilitateChart: { title: 'Utilitatea totală și marginală', description: 'Utilitatea totală crește tot mai lent, în timp ce utilitatea marginală scade.' },
  biancaChart: { title: 'Programul optim al Biancăi', description: 'Echilibrul apare când utilitatea marginală raportată la preț devine egală pentru cele două bunuri.' },
  bugetChart: { title: 'Structura unui buget echilibrat', description: 'Veniturile acoperă integral cheltuielile, fără deficit sau excedent.' },
  substitutie: { title: 'Substituirea factorilor de producție', description: 'Mai mult capital poate compensa reducerea muncii, menținând producția.' },
  echilibruStatic: { title: 'Echilibrul pieței', description: 'Intersecția cererii cu oferta stabilește prețul și cantitatea de echilibru.' },
  surplus: { title: 'Surplusul participanților la piață', description: 'Zona de deasupra prețului revine consumatorilor, iar cea de dedesubt producătorilor.' },
}

function MarketSvg({ surplus = false }: { surplus?: boolean }) {
  return <svg className="concept-svg" viewBox="0 0 520 250" role="img" aria-label="Graficul cererii și ofertei">
    <line x1="55" y1="215" x2="485" y2="215" className="diagram-axis"/><line x1="55" y1="215" x2="55" y2="25" className="diagram-axis"/>
    {surplus && <><path d="M55 40 L275 125 L55 125 Z" className="consumer-area"/><path d="M55 210 L275 125 L55 125 Z" className="producer-area"/></>}
    <line x1="75" y1="45" x2="455" y2="195" className="demand-line"/><line x1="75" y1="200" x2="455" y2="50" className="supply-line"/>
    <line x1="55" y1="125" x2="275" y2="125" className="guide-line"/><line x1="275" y1="125" x2="275" y2="215" className="guide-line"/>
    <circle cx="275" cy="125" r="7" className="diagram-point"/><text x="287" y="116">E</text><text x="465" y="196">Cerere</text><text x="458" y="48">Ofertă</text><text x="64" y="119">Pₑ</text><text x="266" y="235">Qₑ</text>
  </svg>
}

function ExcessExplorer() {
  const [price, setPrice] = useState(10)
  const demand = Math.max(90 - 3 * price, 0); const supply = 6 * price; const delta = demand - supply
  return <section className="interactive-lab diagram-lab">
    <div className="lab-title-row"><span className="lab-icon"><SlidersHorizontal size={18}/></span><div><span>Simulator de piață</span><h4>Excesul de cerere și de ofertă</h4></div></div>
    <p className="lab-description">Mută prețul și observă reacția celor două cantități. Echilibrul este la 10 u.m.</p>
    <div className="excess-control"><label><span>Preț ales</span><b>{price} u.m.</b></label><input type="range" min="0" max="25" value={price} onChange={(event) => setPrice(Number(event.target.value))}/></div>
    <div className="excess-bars"><div><span>Cerere · {demand}</span><i style={{width:`${demand / 90 * 100}%`}}/></div><div><span>Ofertă · {supply}</span><i style={{width:`${Math.min(supply / 150 * 100,100)}%`}}/></div></div>
    <div className={`market-reading ${delta === 0 ? 'balanced' : ''}`}><b>{delta === 0 ? 'Piața este în echilibru' : delta > 0 ? `Exces de cerere: ${delta} buc.` : `Exces de ofertă: ${Math.abs(delta)} buc.`}</b><span>{delta > 0 ? 'Prețul tinde să crească.' : delta < 0 ? 'Prețul tinde să scadă.' : 'Nu există presiune asupra prețului.'}</span></div>
  </section>
}

function ConceptDiagram({ type }: { type: string }) {
  if (['checklistFunctionala', 'circuitEconomic', 'utilitateChart', 'biancaChart', 'bugetChart', 'substitutie', 'echilibruStatic', 'surplus', 'excesExplorer'].includes(type)) return <TheoryVisual type={type} />
  if (type === 'excesExplorer') return <ExcessExplorer />
  const copy = diagramCopy[type]
  if (!copy) return null
  return <section className="interactive-lab diagram-lab">
    <div className="lab-title-row"><span className="lab-icon">{type === 'circuitEconomic' ? <Network size={18}/> : type === 'checklistFunctionala' ? <CheckCircle2 size={18}/> : <TrendingUp size={18}/>}</span><div><span>Schemă vizuală</span><h4>{copy.title}</h4></div></div>
    <p className="lab-description">{copy.description}</p>
    {type === 'checklistFunctionala' && <div className="market-checklist">{['Proprietate privată protejată','Prețuri formate liber','Concurență reală','Instituții și reguli stabile','Libertatea inițiativei'].map((item)=><div key={item}><CheckCircle2 size={17}/><span>{item}</span></div>)}</div>}
    {type === 'circuitEconomic' && <div className="economic-circuit"><div><Landmark size={20}/><b>Firme</b><small>bunuri, salarii</small></div><span>plăți ↔ resurse</span><div><Network size={20}/><b>Menaje</b><small>muncă, consum</small></div><span>taxe ↔ servicii</span><div><Landmark size={20}/><b>Stat</b><small>reguli, transferuri</small></div></div>}
    {type === 'utilitateChart' && <svg className="concept-svg" viewBox="0 0 520 250"><line x1="50" y1="215" x2="485" y2="215" className="diagram-axis"/><line x1="50" y1="215" x2="50" y2="25" className="diagram-axis"/><path d="M55 205 C115 85 235 48 465 42" className="utility-total"/><path d="M55 48 C170 95 300 165 465 198" className="utility-marginal"/><text x="390" y="35">UT</text><text x="430" y="190">Umg</text><text x="455" y="235">Cantitate</text></svg>}
    {type === 'biancaChart' && <svg className="concept-svg" viewBox="0 0 520 250"><line x1="50" y1="215" x2="485" y2="215" className="diagram-axis"/><line x1="50" y1="215" x2="50" y2="25" className="diagram-axis"/><polyline points="65,45 145,75 225,105 305,130 385,160 465,185" className="demand-line"/><polyline points="65,190 145,165 225,140 305,130 385,118 465,105" className="supply-line"/><circle cx="305" cy="130" r="8" className="diagram-point"/><text x="317" y="122">optim: 5 + 5</text><text x="390" y="178">Umg/P covrigi</text><text x="355" y="98">Umg/P pateuri</text></svg>}
    {type === 'bugetChart' && <div className="budget-visual"><div><span>Venituri</span><b>25 u.m.</b><i style={{width:'100%'}}/></div><div><span>Cheltuieli</span><b>25 u.m.</b><i style={{width:'100%'}}/></div><strong>Sold: 0 · buget echilibrat</strong></div>}
    {type === 'substitutie' && <svg className="concept-svg" viewBox="0 0 520 250"><line x1="55" y1="215" x2="485" y2="215" className="diagram-axis"/><line x1="55" y1="215" x2="55" y2="25" className="diagram-axis"/><path d="M85 55 C120 145 230 185 460 196" className="substitution-line"/><circle cx="145" cy="133" r="7" className="diagram-point"/><circle cx="335" cy="187" r="7" className="diagram-point secondary"/><path d="M153 138 Q235 182 325 186" className="guide-arrow"/><text x="100" y="119">mai multă muncă</text><text x="335" y="174">mai mult capital</text></svg>}
    {type === 'echilibruStatic' && <MarketSvg/>}{type === 'surplus' && <MarketSvg surplus/>}
  </section>
}

export function TheoryWidget({ calculator, diagram }: { calculator?: string; diagram?: string }) {
  return <>
    {calculator === 'costOportunitate' && <CostOpportunityCalculator />}
    {calculator === 'indicatori' && <IndicatorCalculator />}
    {calculator && calculators[calculator] && <FormulaCalculator definition={calculators[calculator]} type={calculator} />}
    {diagram && <ConceptDiagram type={diagram} />}
  </>
}
