import type { Question } from '../types'
import allQuestions from '../data/questions.json'
import select500Ids from '../data/select500.json'

const questions = allQuestions as unknown as Question[]

const questionsMap = new Map<number, Question>()
for (const q of questions) {
  questionsMap.set(q.id, q)
}

const select500Set = new Set(select500Ids as number[])

export function getAllQuestions(): Question[] {
  return questions
}

export function getSelect500(): Question[] {
  return questions.filter((q) => select500Set.has(q.id))
}

export function getQuestionById(id: number): Question | undefined {
  return questionsMap.get(id)
}

export function getQuestionSet(mode: 'all' | 'select500'): Question[] {
  return mode === 'select500' ? getSelect500() : getAllQuestions()
}

export function pickExamQuestions(questions: Question[], count = 100): Question[] {
  const shuffled = [...questions].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

const NUMBER_UNIT_PATTERN = /\d+\s*(分钟|小时|个月|周岁|公里|km\/h|km|分|元|米|岁|年|日|天|秒|%|‰)/

export function getNumberQuestions(mode: 'all' | 'select500' = 'all'): Question[] {
  const pool = getQuestionSet(mode)
  return pool.filter((q) => {
    if (q.options.some((opt) => /\d/.test(opt))) return true
    if (NUMBER_UNIT_PATTERN.test(q.question)) return true
    return false
  })
}
