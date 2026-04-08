import type { Question } from '../types'
import allQuestions from '../data/questions.json'
import select500Ids from '../data/select500.json'

const questionsMap = new Map<number, Question>()
for (const q of allQuestions as Question[]) {
  questionsMap.set(q.id, q)
}

const select500Set = new Set(select500Ids as number[])

export function getAllQuestions(): Question[] {
  return allQuestions as Question[]
}

export function getSelect500(): Question[] {
  return (allQuestions as Question[]).filter((q) => select500Set.has(q.id))
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
