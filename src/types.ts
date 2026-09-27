export type CategoryId = 'fundamente' | 'micro' | 'piete' | 'macro' | 'stat'

export interface ChapterMeta {
  number: number
  slug: string
  title: string
  shortTitle: string
  category: CategoryId
  duration: number
  available: boolean
}

export interface KeyPointObject {
  termen: string
  descriere: string
}

export interface ClassificationCategory {
  nume: string
  definitie?: string
}

export interface Classification {
  criteriu: string
  orientare?: 'orizontal' | 'vertical'
  categorii: Array<string | ClassificationCategory>
}

export interface Formula {
  nume: string
  formula: string
}

export interface TheorySection {
  id: string
  nr: string
  titlu: string
  text: string[]
  puncteCheie?: Array<string | KeyPointObject>
  clasificari?: Classification[]
  exemple?: string[]
  formule?: Formula[]
  calculator?: string
  diagrama?: string
  notaLegatura?: { href: string; text: string }
}

export interface MultipleChoiceExercise {
  intrebare: string
  optiuni: string[]
  corect: number
  explicatie: string
}

export interface TrueFalseExercise {
  enunt: string
  corect: boolean
  explicatie: string
}

export interface NumericExercise {
  enunt: string
  unitate: string
  corect: number
  toleranta: number
  explicatie: string
  tip?: string
  custom?: string
}

export interface MatchingExercise {
  instructiune: string
  coloanaA: Array<{ id: string; text: string }>
  coloanaB: Array<{ id: string; text: string }>
  perechi: Array<{ stanga: string; dreapta: string }>
  explicatie?: string
}

export interface LessonData {
  capitol: {
    numar: number
    titlu: string
    obiective: string[]
  }
  teorie: TheorySection[]
  grila: MultipleChoiceExercise[]
  af: TrueFalseExercise[]
  probleme: NumericExercise[]
  asociere: MatchingExercise[]
}

export interface NormalizedQuestion {
  id: string
  source: 'final' | 'practice' | 'admission'
  kind: 'teorie' | 'exercitiu' | 'grila'
  prompt: string
  options: Array<{ id: string; text: string }>
  correctOptionId: string
  explanation: string
  formula?: string
  originalNumber?: number
  topic?: string
  difficulty?: 'usor' | 'mediu' | 'greu' | 'foarte_greu'
}

export type UserRole = 'student' | 'admin'

export interface SessionState {
  isAuthenticated: boolean
  userName: string
  userEmail: string
  completedSections: string[]
  completedActivities: string[]
  completedChapters: number[]
  completedRecapTests: number[]
  notes: string
  lastVisitedSections: Record<string, string>
  lastChapter: number
  userRole: UserRole
}

export type Route =
  | { page: 'dashboard' }
  | { page: 'library' }
  | { page: 'lessons' }
  | { page: 'lesson'; chapter: number; section?: string }
  | { page: 'assessment'; chapter: number; mode: 'final' | 'practice' }
  | { page: 'graph-lab'; lesson?: number }
  | { page: 'math-workspace' }
  | { page: 'flashcards' }
  | { page: 'recap-tests' }
  | { page: 'recap-assessment'; chapter: number }
  | { page: 'admission-tests' }
  | { page: 'admission-assessment'; testId: string }
  | { page: 'games' }
  | { page: 'game'; gameId: string }
  | { page: 'profile' }
  | { page: 'admin-reports' }
  | { page: 'map' }
