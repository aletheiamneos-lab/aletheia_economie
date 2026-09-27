// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ChapterExplorer } from './ChapterExplorer'
import { CalculatorVisual, TheoryVisual } from './TheoryVisuals'

afterEach(cleanup)

const expectedExplorers: Record<number, string[]> = {
  1: ['V. Explorator: curba posibilităților de producție'],
  3: ['V. Simulator: eficiența și echilibrul consumatorului'],
  4: ['VI. Explorator: structura capitalului tehnic'],
  5: ['V. Explorator: legea randamentelor neproporționale'],
  6: ['V. Explorator: curbele costurilor'],
  7: ['V. Explorator: renta funciară diferențiată'],
  8: ['IV. Simulatorul cerere-ofertă'],
  9: ['V. Explorator: spectrul structurilor de piață', 'VI. Explorator: radar comparativ al structurilor de piață'],
  10: ['V. Explorator: dobânda simplă vs. compusă, în timp'],
  11: ['V. Explorator: inflația prin cerere vs. prin ofertă'],
  12: ['V. Explorator: operațiune la termen (speculatori)'],
  13: ['V. Explorator: cererea de muncă și numărul optim de angajați'],
  14: ['V. Explorator: șomajul involuntar'],
  15: ['V. Explorator: multiplicatorul investițiilor'],
  16: ['V. Explorator: evoluția PIB pe locuitor, în timp'],
  17: ['V. Explorator: fazele ciclului economic'],
  18: ['V. Explorator: structura bugetului de stat'],
  19: ['V. Explorator: eficiența comerțului exterior'],
}

describe('elementele vizuale preluate din HTML', () => {
  it('afișează toate exploratoarele, cu numerotarea și titlurile originale', () => {
    Object.entries(expectedExplorers).forEach(([chapter, headings]) => {
      const view = render(<ChapterExplorer chapter={Number(chapter)} />)
      headings.forEach((heading) => expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument())
      view.unmount()
    })
  })

  it('arată diferența esențială dintre inflația prin cerere și cea prin ofertă', () => {
    render(<ChapterExplorer chapter={11} />)
    expect(screen.getByText('50 → 65')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Inflație prin ofertă' }))
    expect(screen.getByText('50 → 35')).toBeInTheDocument()
    expect(screen.getByText(/producția SCADE/)).toBeInTheDocument()
  })

  it('păstrează exploratorul excesului în secțiunea teoretică și presetările sale', () => {
    render(<TheoryVisual type="excesExplorer" />)
    expect(screen.getByText(/Piața este în echilibru, fără exces/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Exemplu: plafon (preț mic)' }))
    expect(screen.getByText(/exces de cerere \(deficit\)/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Exemplu: podea (preț mare)' }))
    expect(screen.getByText(/exces de ofertă \(excedent\)/)).toBeInTheDocument()
  })

  it('afișează toate cele nouă tipuri de vizualuri din interiorul teoriei', () => {
    const types = ['checklistFunctionala', 'circuitEconomic', 'utilitateChart', 'biancaChart', 'bugetChart', 'substitutie', 'echilibruStatic', 'surplus', 'excesExplorer']
    types.forEach((type) => {
      const view = render(<TheoryVisual type={type} />)
      expect(view.container).not.toBeEmptyDOMElement()
      view.unmount()
    })
  })

  it('randă graficele asociate calculatoarelor din HTML', () => {
    const cases: Array<[string, Record<string, number>]> = [
      ['amortizare',{total:500,fix:80,rata:20}],['rms',{x:180,y:90}],['productivitate',{l0:10,q0:600,l1:15,q1:750}],
      ['costMediu',{cf:50,cv:100,q:5}],['rateProfit',{capital:1000,fix:50,ani:5,salarii:100,pret:10,q:100}],
      ['elasticitateCerere',{q:-20,p:10}],['profitMaxim',{cmg:20,vmg:25,pret:30}],['masaMonetara',{p:2.5,q:100,v:10}],
      ['dobanda',{capital:200000,rata:30,ani:3}],['inflatie',{p0:50,p1:60,nominal:600}],
      ['randamentActiune',{cumparare:100000,vanzare:150000,dividend:5000}],['cursObligatiune',{cupon:20000,rata:20}],
      ['salariuReal',{sn:400,preturi:1.1,ocupata:12,activa:15}],['rataSomajului',{ocupata:12,activa:15}],
      ['consumEconomii',{vd0:100,c0:80,vd1:125,c1:96}],['pibPeLocuitor',{pib0:250000,pop0:25,pib1:275000,pop1:23.75}],
      ['soldBugetar',{venituri:100,cheltuieli:115}],['eficientaComertExterior',{pie:10000,pve:10000,pii:50000,taxe:5000,pvi:10000}],
    ]
    cases.forEach(([type, values]) => {
      const view = render(<CalculatorVisual type={type} values={values}/>)
      expect(view.container.querySelector('svg')).toBeInTheDocument()
      view.unmount()
    })
  })
})
