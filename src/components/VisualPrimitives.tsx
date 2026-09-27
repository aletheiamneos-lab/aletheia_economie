import type { ReactNode } from 'react'
import { ChartNoAxesCombined } from 'lucide-react'

export const chartColors = {
  navy: '#173e52',
  blue: '#2f7894',
  coral: '#df6b52',
  teal: '#2d8a7e',
  gold: '#bc8734',
  muted: '#87979f',
  grid: '#dfe8ec',
  paper: '#ffffff',
}

export interface Point { x: number; y: number }

export function points(values: Point[]) {
  return values.map((point) => `${point.x},${point.y}`).join(' ')
}

export function VisualSection({ id, eyebrow, subtitle, children }: { id: string; eyebrow: string; subtitle: string; children: ReactNode }) {
  return <section id={id} className="visual-section" aria-labelledby={`${id}-title`}>
    <header className="visual-section-heading">
      <span className="visual-section-index"><ChartNoAxesCombined size={17}/></span>
      <div><h3 id={`${id}-title`}>{eyebrow}</h3><p>{subtitle}</p></div>
    </header>
    {children}
  </section>
}

export function VisualCard({ note, children, className = '' }: { note: string; children: ReactNode; className?: string }) {
  return <div className={`visual-card ${className}`}>
    <p className="visual-note">{note}</p>
    {children}
  </div>
}

export function Chart({ label, children, viewBox = '0 0 420 280' }: { label: string; children: ReactNode; viewBox?: string }) {
  return <div className="chart-stage"><svg className="economic-chart" viewBox={viewBox} role="img" aria-label={label}>{children}</svg></div>
}

export function Axes({ left = 48, top = 24, width = 342, height = 210, xLabel, yLabel, horizontalGrid = 4, verticalGrid = 5 }: { left?: number; top?: number; width?: number; height?: number; xLabel: string; yLabel: string; horizontalGrid?: number; verticalGrid?: number }) {
  return <g className="chart-axes">
    {Array.from({ length: horizontalGrid }, (_, index) => {
      const y = top + ((index + 1) / (horizontalGrid + 1)) * height
      return <line key={`h-${index}`} x1={left} y1={y} x2={left + width} y2={y} className="chart-grid"/>
    })}
    {Array.from({ length: verticalGrid }, (_, index) => {
      const x = left + ((index + 1) / (verticalGrid + 1)) * width
      return <line key={`v-${index}`} x1={x} y1={top} x2={x} y2={top + height} className="chart-grid"/>
    })}
    <line x1={left} y1={top} x2={left} y2={top + height} className="chart-axis-line"/>
    <line x1={left} y1={top + height} x2={left + width} y2={top + height} className="chart-axis-line"/>
    <text x={left} y={14} className="chart-axis-label">{yLabel}</text>
    <text x={left + width} y={top + height + 29} textAnchor="end" className="chart-axis-label">{xLabel}</text>
  </g>
}

export function Legend({ items }: { items: Array<{ color: string; label: string; dashed?: boolean }> }) {
  return <div className="visual-legend">{items.map((item) => <span key={item.label}><i style={{ background: item.color }} className={item.dashed ? 'is-dashed' : ''}/>{item.label}</span>)}</div>
}

export function Control({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void }) {
  return <label className="visual-control">
    <span>{label}<b>{value.toLocaleString('ro-RO')}</b></span>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))}/>
  </label>
}

export function Controls({ children }: { children: ReactNode }) {
  return <div className="visual-controls">{children}</div>
}

export function Readouts({ items }: { items: Array<{ label: string; value: ReactNode; tone?: 'good' | 'bad' | 'accent' }> }) {
  return <div className="visual-readouts">{items.map((item) => <div key={item.label} data-tone={item.tone}><strong>{item.value}</strong><span>{item.label}</span></div>)}</div>
}

export function Insight({ children, tone = 'accent' }: { children: ReactNode; tone?: 'good' | 'bad' | 'accent' }) {
  return <div className="visual-insight" data-tone={tone}>{children}</div>
}
