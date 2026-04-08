export interface Question {
  id: number
  question: string
  options: string[]
  optionType: 'judge' | 'choice'
  answer: string
  explain: string
  conciseExplain: string
  mnemonicTip: string
  wrongRate: number
  difficulty: number
  image: string | null
  chapterId: number
  label: number
}

export interface QuestionProgress {
  correct: boolean
  attempts: number
  lastAttempt: string
}

export interface WrongBookEntry {
  consecutiveCorrect: number
  addedAt: string
}

export interface ExamRecord {
  date: string
  score: number
  total: number
  duration: number
  correct: number
}

export interface Settings {
  autoNext: boolean
  questionSet: 'select500' | 'all'
  lastPosition: number
}
