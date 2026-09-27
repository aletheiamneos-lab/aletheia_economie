import { ArrowRightLeft, Calculator, ChartNoAxesCombined, MoveRight, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'

function numberValue(value: string) {
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

export function CostOpportunityCalculator() {
  const [lost, setLost] = useState('200')
  const [gained, setGained] = useState('100')
  const lostValue = numberValue(lost)
  const gainedValue = numberValue(gained)
  const result = lostValue !== null && gainedValue !== null && gainedValue !== 0
    ? Math.abs(lostValue / gainedValue)
    : null
  const comparisonMax = Math.max(Math.abs(lostValue ?? 0), Math.abs(gainedValue ?? 0), 1) * 1.15
  const gainedX = 30 + Math.abs(gainedValue ?? 0) / comparisonMax * 280
  const lostX = 30 + Math.abs(lostValue ?? 0) / comparisonMax * 280

  return (
    <div className="interactive-lab compact-lab">
      <div className="lab-title-row">
        <span className="lab-icon"><Calculator size={18} /></span>
        <div><span>Mini-laborator</span><h4>Costul alegerii tale</h4></div>
      </div>
      <div className="exchange-visual">
        <div className="exchange-side lost-side">
          <span>Renunți la</span>
          <label><input value={lost} onChange={(event) => setLost(event.target.value)} inputMode="decimal" aria-label="Cantitatea la care renunți" /><small>unități</small></label>
        </div>
        <div className="exchange-arrow"><ArrowRightLeft size={24} /></div>
        <div className="exchange-side gained-side">
          <span>Pentru a obține</span>
          <label><input value={gained} onChange={(event) => setGained(event.target.value)} inputMode="decimal" aria-label="Cantitatea obținută" /><small>unități</small></label>
        </div>
      </div>
      {result !== null && <div className="calculator-visual"><svg viewBox="0 0 340 105" role="img" aria-label={`Câștigi ${gainedValue}; sacrifici ${lostValue}`}>
        <line x1="30" y1="52" x2="310" y2="52" className="dumbbell-track" />
        <line x1={gainedX} y1="52" x2={lostX} y2="52" className="dumbbell-change" />
        <circle cx={gainedX} cy="52" r="9" className="dumbbell-start" />
        <circle cx={lostX} cy="52" r="9" className="dumbbell-end" />
        <text x={gainedX} y="28" textAnchor="middle">{Math.abs(gainedValue ?? 0)}</text>
        <text x={lostX} y="28" textAnchor="middle">{Math.abs(lostValue ?? 0)}</text>
        <text x="30" y="88">Câștigi (Δy)</text><text x="310" y="88" textAnchor="end">Sacrifici (Δx)</text>
      </svg></div>}
      <div className="lab-result">
        <span>Cost de oportunitate</span>
        <strong>{result === null ? '—' : result.toLocaleString('ro-RO', { maximumFractionDigits: 2 })}</strong>
        <p>{result === null ? 'Introdu două valori valide; a doua trebuie să fie diferită de zero.' : `Pentru fiecare unitate obținută renunți la ${result.toLocaleString('ro-RO', { maximumFractionDigits: 2 })} unități din alternativa abandonată.`}</p>
      </div>
    </div>
  )
}

export function IndicatorCalculator() {
  const [initial, setInitial] = useState('100')
  const [current, setCurrent] = useState('130')
  const initialValue = numberValue(initial)
  const currentValue = numberValue(current)
  const valid = initialValue !== null && currentValue !== null && initialValue !== 0
  const absolute = valid ? currentValue - initialValue : null
  const index = valid ? (currentValue / initialValue) * 100 : null
  const percentage = index === null ? null : index - 100
  const max = Math.max(Math.abs(initialValue ?? 0), Math.abs(currentValue ?? 0), 1) * 1.12
  const x0 = 20 + (Math.max(0, initialValue ?? 0) / max) * 280
  const x1 = 20 + (Math.max(0, currentValue ?? 0) / max) * 280

  return (
    <div className="interactive-lab compact-lab">
      <div className="lab-title-row">
        <span className="lab-icon"><TrendingUp size={18} /></span>
        <div><span>Calculator dinamic</span><h4>Cum s-a modificat indicatorul?</h4></div>
      </div>
      <div className="indicator-inputs">
        <label><span>Valoare inițială</span><input value={initial} onChange={(event) => setInitial(event.target.value)} inputMode="decimal" /></label>
        <MoveRight size={20} />
        <label><span>Valoare curentă</span><input value={current} onChange={(event) => setCurrent(event.target.value)} inputMode="decimal" /></label>
      </div>
      {valid && (
        <svg className="dumbbell-chart" viewBox="0 0 340 92" role="img" aria-label={`De la ${initialValue} la ${currentValue}`}>
          <line x1="20" y1="47" x2="320" y2="47" className="dumbbell-base" />
          <line x1={x0} y1="47" x2={x1} y2="47" className="dumbbell-change" />
          <circle cx={x0} cy="47" r="9" className="dumbbell-start" />
          <circle cx={x1} cy="47" r="9" className="dumbbell-end" />
          <text x={x0} y="24" textAnchor="middle">{initialValue}</text>
          <text x={x1} y="24" textAnchor="middle">{currentValue}</text>
          <text x="20" y="78">T₀</text><text x="320" y="78" textAnchor="end">T₁</text>
        </svg>
      )}
      <div className="indicator-results">
        <div><span>Modificare absolută</span><b>{absolute === null ? '—' : absolute.toFixed(2)}</b></div>
        <div><span>Indice</span><b>{index === null ? '—' : `${index.toFixed(1)}%`}</b></div>
        <div className={percentage !== null && percentage < 0 ? 'negative' : ''}><span>Modificare relativă</span><b>{percentage === null ? '—' : `${percentage > 0 ? '+' : ''}${percentage.toFixed(1)}%`}</b></div>
      </div>
    </div>
  )
}

const productionPoints = [
  { name: 'A', cheese: 800, yogurt: 0 },
  { name: 'B', cheese: 600, yogurt: 100 },
  { name: 'C', cheese: 300, yogurt: 200 },
  { name: 'D', cheese: 0, yogurt: 250 },
]

export function ProductionPossibilityExplorer() {
  const [index, setIndex] = useState(1)
  const active = productionPoints[index]
  const previous = productionPoints[Math.max(0, index - 1)]
  const cost = index === 0 ? null : (previous.cheese - active.cheese) / (active.yogurt - previous.yogurt)
  const pointCoordinates = useMemo(() => productionPoints.map((point) => ({
    ...point,
    x: 54 + (point.cheese / 800) * 390,
    y: 260 - (point.yogurt / 250) * 210,
  })), [])

  return (
    <div className="interactive-lab ppf-lab">
      <div className="lab-title-row">
        <span className="lab-icon"><ChartNoAxesCombined size={18} /></span>
        <div><span>Explorator vizual</span><h4>Frontiera posibilităților de producție</h4></div>
      </div>
      <p className="lab-description">Mută selectorul între variante și observă cum renunțarea la brânză permite producerea unei cantități mai mari de iaurt.</p>
      <div className="ppf-layout">
        <svg className="ppf-chart" viewBox="0 0 490 300" role="img" aria-label={`Varianta ${active.name}: ${active.cheese} kg brânză și ${active.yogurt} kg iaurt`}>
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ed704b" stopOpacity=".24" />
              <stop offset="100%" stopColor="#ed704b" stopOpacity=".02" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3, 4].map((line) => <line key={`h${line}`} x1="54" y1={50 + line * 52.5} x2="444" y2={50 + line * 52.5} className="chart-grid-line" />)}
          {[0, 1, 2, 3, 4].map((line) => <line key={`v${line}`} x1={54 + line * 97.5} y1="50" x2={54 + line * 97.5} y2="260" className="chart-grid-line" />)}
          <line x1="54" y1="260" x2="454" y2="260" className="chart-axis" />
          <line x1="54" y1="260" x2="54" y2="40" className="chart-axis" />
          <path d={`M ${pointCoordinates.map((point) => `${point.x} ${point.y}`).join(' L ')} L 54 260 Z`} fill="url(#areaGradient)" />
          <polyline points={pointCoordinates.map((point) => `${point.x},${point.y}`).join(' ')} className="ppf-line" />
          {pointCoordinates.map((point, pointIndex) => (
            <g key={point.name} className={pointIndex === index ? 'active-point' : ''}>
              <circle cx={point.x} cy={point.y} r={pointIndex === index ? 9 : 5} />
              <text x={point.x + (pointIndex === 3 ? -16 : 12)} y={point.y - 11}>{point.name}</text>
            </g>
          ))}
          <text x="444" y="286" textAnchor="end" className="axis-label">Brânză (kg)</text>
          <text x="46" y="28" className="axis-label">Iaurt (kg)</text>
        </svg>
        <div className="ppf-readout">
          <span className="readout-label">Varianta {active.name}</span>
          <div className="production-stat"><b>{active.cheese}</b><span>kg brânză</span></div>
          <div className="production-stat accent"><b>{active.yogurt}</b><span>kg iaurt</span></div>
          <div className="opportunity-stat"><span>Cost marginal</span><b>{cost === null ? '—' : `${cost} kg`}</b><small>brânză / kg iaurt</small></div>
        </div>
      </div>
      <div className="ppf-control">
        <div className="ppf-step-labels">{productionPoints.map((point) => <span key={point.name} className={point.name === active.name ? 'active' : ''}>{point.name}</span>)}</div>
        <input type="range" min="0" max="3" step="1" value={index} onChange={(event) => setIndex(Number(event.target.value))} aria-label="Varianta de producție" />
      </div>
    </div>
  )
}
