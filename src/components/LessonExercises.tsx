import { Check, CheckCircle2, Link2, X, XCircle } from 'lucide-react'
import { useState } from 'react'
import type { MatchingExercise, MultipleChoiceExercise, NumericExercise, TrueFalseExercise } from '../types'

interface ActivityProps {
  activityId: string
  completed: boolean
  onComplete: (id: string) => void
}

export function InlineMultipleChoice({ item, index, activityId, completed, onComplete }: ActivityProps & { item: MultipleChoiceExercise; index: number }) {
  const [selected, setSelected] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const correct = selected === item.corect

  const verify = () => {
    if (selected === null) return
    setChecked(true)
    onComplete(activityId)
  }

  return (
    <article className={`exercise-card ${checked ? (correct ? 'is-correct' : 'is-wrong') : ''}`}>
      <div className="exercise-card-top"><span>Grilă {String(index + 1).padStart(2, '0')}</span>{completed && <span className="completed-label"><Check size={13} /> parcurs</span>}</div>
      <h4>{item.intrebare}</h4>
      <div className="exercise-options">
        {item.optiuni.map((option, optionIndex) => {
          const state = checked && optionIndex === item.corect ? 'correct' : checked && optionIndex === selected ? 'wrong' : selected === optionIndex ? 'selected' : ''
          return (
            <button key={option} className={state} disabled={checked} onClick={() => setSelected(optionIndex)}>
              <span>{String.fromCharCode(65 + optionIndex)}</span><b>{option}</b>
              {state === 'correct' && <Check size={17} />}{state === 'wrong' && <X size={17} />}
            </button>
          )
        })}
      </div>
      {!checked ? (
        <button className="button button-primary small-button" disabled={selected === null} onClick={verify}>Verifică răspunsul</button>
      ) : (
        <div className={`answer-feedback ${correct ? 'correct' : 'wrong'}`}>
          {correct ? <CheckCircle2 size={19} /> : <XCircle size={19} />}
          <div><b>{correct ? 'Exact.' : 'Nu chiar.'}</b><p>{item.explicatie}</p></div>
        </div>
      )}
    </article>
  )
}

export function TrueFalseCard({ item, index, activityId, completed, onComplete }: ActivityProps & { item: TrueFalseExercise; index: number }) {
  const [answer, setAnswer] = useState<boolean | null>(null)
  const correct = answer === item.corect

  const choose = (value: boolean) => {
    if (answer !== null) return
    setAnswer(value)
    onComplete(activityId)
  }

  return (
    <article className={`exercise-card compact-exercise ${answer !== null ? (correct ? 'is-correct' : 'is-wrong') : ''}`}>
      <div className="exercise-card-top"><span>Adevărat / Fals · {index + 1}</span>{completed && <span className="completed-label"><Check size={13} /> parcurs</span>}</div>
      <h4>{item.enunt}</h4>
      <div className="binary-options">
        <button disabled={answer !== null} className={answer === true ? (item.corect ? 'correct' : 'wrong') : ''} onClick={() => choose(true)}><Check size={18} /> Adevărat</button>
        <button disabled={answer !== null} className={answer === false ? (!item.corect ? 'correct' : 'wrong') : ''} onClick={() => choose(false)}><X size={18} /> Fals</button>
      </div>
      {answer !== null && <div className={`answer-feedback ${correct ? 'correct' : 'wrong'}`}><div><b>{correct ? 'Corect.' : 'Răspuns greșit.'}</b><p>{item.explicatie}</p></div></div>}
    </article>
  )
}

export function NumericCard({ item, index, activityId, completed, onComplete }: ActivityProps & { item: NumericExercise; index: number }) {
  const [value, setValue] = useState('')
  const [checked, setChecked] = useState(false)
  const numericValue = Number(value.replace(',', '.'))
  const correct = Number.isFinite(numericValue) && Math.abs(numericValue - item.corect) <= item.toleranta

  const verify = () => {
    if (!value.trim()) return
    setChecked(true)
    onComplete(activityId)
  }

  return (
    <article className={`exercise-card numeric-exercise ${checked ? (correct ? 'is-correct' : 'is-wrong') : ''}`}>
      <div className="exercise-card-top"><span>Problemă aplicată · {index + 1}</span>{completed && <span className="completed-label"><Check size={13} /> parcurs</span>}</div>
      <h4>{item.enunt}</h4>
      <div className="numeric-answer-row">
        <label><span>Răspunsul tău</span><div><input value={value} disabled={checked} onChange={(event) => setValue(event.target.value)} inputMode="decimal" placeholder="0" /><small>{item.unitate}</small></div></label>
        {!checked && <button className="button button-primary" disabled={!value.trim()} onClick={verify}>Verifică</button>}
      </div>
      {checked && <div className={`answer-feedback ${correct ? 'correct' : 'wrong'}`}><div><b>{correct ? 'Calcul corect.' : `Răspunsul corect este ${item.corect} ${item.unitate}.`}</b><p>{item.explicatie}</p></div></div>}
    </article>
  )
}

export function MatchingCard({ item, activityId, completed, onComplete }: ActivityProps & { item: MatchingExercise }) {
  const [activeLeft, setActiveLeft] = useState<string | null>(null)
  const [matched, setMatched] = useState<Record<string, string>>({})
  const [wrongPair, setWrongPair] = useState<string | null>(null)
  const done = Object.keys(matched).length === item.perechi.length

  const chooseRight = (rightId: string) => {
    if (!activeLeft || Object.values(matched).includes(rightId)) return
    const correct = item.perechi.some((pair) => pair.stanga === activeLeft && pair.dreapta === rightId)
    if (correct) {
      const next = { ...matched, [activeLeft]: rightId }
      setMatched(next)
      setActiveLeft(null)
      if (Object.keys(next).length === item.perechi.length) onComplete(activityId)
    } else {
      setWrongPair(`${activeLeft}-${rightId}`)
      window.setTimeout(() => setWrongPair(null), 650)
      setActiveLeft(null)
    }
  }

  return (
    <article className={`exercise-card matching-card ${done ? 'is-correct' : ''}`}>
      <div className="exercise-card-top"><span><Link2 size={14} /> Asociere</span>{completed && <span className="completed-label"><Check size={13} /> parcurs</span>}</div>
      <h4>{item.instructiune}</h4>
      <p className="matching-instruction">Selectează un termen din stânga, apoi definiția lui din dreapta.</p>
      <div className="matching-grid">
        <div>
          {item.coloanaA.map((entry) => (
            <button
              key={entry.id}
              disabled={Boolean(matched[entry.id])}
              className={`${activeLeft === entry.id ? 'selected' : ''} ${matched[entry.id] ? 'matched' : ''} ${wrongPair?.startsWith(`${entry.id}-`) ? 'shake wrong' : ''}`}
              onClick={() => setActiveLeft(entry.id)}
            >
              <span>{matched[entry.id] ? <Check size={15} /> : entry.id.replace('t', '')}</span>{entry.text}
            </button>
          ))}
        </div>
        <div>
          {item.coloanaB.map((entry) => {
            const isMatched = Object.values(matched).includes(entry.id)
            return <button key={entry.id} disabled={isMatched} className={`${isMatched ? 'matched' : ''} ${wrongPair?.endsWith(`-${entry.id}`) ? 'shake wrong' : ''}`} onClick={() => chooseRight(entry.id)}>{entry.text}</button>
          })}
        </div>
      </div>
      {done && <div className="answer-feedback correct"><CheckCircle2 size={19} /><div><b>Toate conexiunile sunt corecte.</b><p>{item.explicatie}</p></div></div>}
    </article>
  )
}
