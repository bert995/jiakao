import type { QuestionProgress, WrongBookEntry, ExamRecord, Settings } from '../types'

const KEYS = {
  progress: 'jiakao_progress',
  wrongBook: 'jiakao_wrongBook',
  examHistory: 'jiakao_examHistory',
  settings: 'jiakao_settings',
} as const

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

// Progress
export function getProgress(): Record<number, QuestionProgress> {
  return load(KEYS.progress, {})
}

export function saveQuestionResult(questionId: number, correct: boolean) {
  const progress = getProgress()
  const prev = progress[questionId]
  progress[questionId] = {
    correct,
    attempts: (prev?.attempts ?? 0) + 1,
    lastAttempt: new Date().toISOString(),
  }
  save(KEYS.progress, progress)
}

// Wrong book
export function getWrongBook(): Record<number, WrongBookEntry> {
  return load(KEYS.wrongBook, {})
}

export function addToWrongBook(questionId: number) {
  const book = getWrongBook()
  if (!book[questionId]) {
    book[questionId] = { consecutiveCorrect: 0, addedAt: new Date().toISOString() }
  } else {
    book[questionId].consecutiveCorrect = 0
  }
  save(KEYS.wrongBook, book)
}

export function markWrongBookCorrect(questionId: number) {
  const book = getWrongBook()
  if (!book[questionId]) return
  book[questionId].consecutiveCorrect += 1
  if (book[questionId].consecutiveCorrect >= 2) {
    delete book[questionId]
  }
  save(KEYS.wrongBook, book)
}

// Exam history
export function getExamHistory(): ExamRecord[] {
  return load(KEYS.examHistory, [])
}

export function saveExamRecord(record: ExamRecord) {
  const history = getExamHistory()
  history.push(record)
  save(KEYS.examHistory, history)
}

// Settings
const DEFAULT_SETTINGS: Settings = {
  autoNext: true,
  questionSet: 'select500',
  lastPosition: 0,
}

export function getSettings(): Settings {
  return load(KEYS.settings, DEFAULT_SETTINGS)
}

export function saveSettings(settings: Partial<Settings>) {
  const current = getSettings()
  save(KEYS.settings, { ...current, ...settings })
}
