import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import QuestionCard from '../components/QuestionCard'
import AnswerResult from '../components/AnswerResult'
import { getQuestionSet, getQuestionById } from '../lib/questions'
import {
  getSettings,
  saveSettings,
  saveQuestionResult,
  addToWrongBook,
  markWrongBookCorrect,
  getProgress,
  getWrongBook,
} from '../lib/storage'
import type { Question } from '../types'

export default function Practice() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const mode = searchParams.get('mode') === 'random' ? 'random' : 'sequential'

  const settings = getSettings()
  const chapterFilter = searchParams.get('chapter')
  const baseSet = getQuestionSet(settings.questionSet)
  const baseQuestions = chapterFilter
    ? baseSet.filter((q) => q.chapterId === Number(chapterFilter))
    : baseSet

  // Expand pool with wrong-book questions that aren't already in the base set
  const baseIds = new Set(baseQuestions.map((q) => q.id))
  const wrongBook = getWrongBook()
  const extraWrong: Question[] = Object.keys(wrongBook)
    .map(Number)
    .filter((id) => !baseIds.has(id))
    .map((id) => getQuestionById(id))
    .filter((q): q is Question => !!q)
  const questions: Question[] = [...baseQuestions, ...extraWrong]

  const [order, setOrder] = useState<number[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [autoNext, setAutoNext] = useState(settings.autoNext)

  useEffect(() => {
    // Split into wrong and non-wrong indices within the current questions pool
    const wrongIdxs: number[] = []
    const normalIdxs: number[] = []
    for (let i = 0; i < questions.length; i++) {
      if (wrongBook[questions[i].id]) wrongIdxs.push(i)
      else normalIdxs.push(i)
    }

    // Interleave: every 5 questions, the 5th is a wrong question (cycling)
    const interleave = (base: number[]): number[] => {
      if (wrongIdxs.length === 0) return base
      const result: number[] = []
      let wi = 0
      for (let i = 0; i < base.length; i++) {
        result.push(base[i])
        if ((i + 1) % 4 === 0) {
          result.push(wrongIdxs[wi % wrongIdxs.length])
          wi++
        }
      }
      return result
    }

    if (mode === 'random') {
      const shuffled = [...normalIdxs].sort(() => Math.random() - 0.5)
      const shuffledWrong = [...wrongIdxs].sort(() => Math.random() - 0.5)
      // Replace wrongIdxs inside interleave via closure — rebuild with shuffled wrongs
      const result: number[] = []
      let wi = 0
      for (let i = 0; i < shuffled.length; i++) {
        result.push(shuffled[i])
        if ((i + 1) % 4 === 0 && shuffledWrong.length > 0) {
          result.push(shuffledWrong[wi % shuffledWrong.length])
          wi++
        }
      }
      setOrder(result.length > 0 ? result : questions.map((_, i) => i))
      setCurrentIndex(0)
    } else {
      const seqOrder = interleave(normalIdxs)
      setOrder(seqOrder)
      const start = Math.min(settings.lastPosition, Math.max(0, seqOrder.length - 1))
      setCurrentIndex(start < 0 ? 0 : start)
    }
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  const question: Question | undefined = questions[order[currentIndex]]

  const goNext = useCallback(() => {
    setSelectedAnswer(null)
    // Loop back to start when reaching the end
    const next = (currentIndex + 1) % order.length
    setCurrentIndex(next)
    if (mode === 'sequential') {
      saveSettings({ lastPosition: next })
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentIndex, order.length, mode])

  const handleAnswer = (answer: string) => {
    if (selectedAnswer !== null) return
    setSelectedAnswer(answer)

    if (!question) return
    const isCorrect = answer === question.answer
    saveQuestionResult(question.id, isCorrect)

    if (isCorrect) {
      markWrongBookCorrect(question.id)
    } else {
      addToWrongBook(question.id)
    }

    if (isCorrect && autoNext) {
      setTimeout(goNext, 800)
    }
  }

  if (!question) {
    return (
      <div className="p-8 text-center">
        <p className="text-xl mb-4">全部做完了！</p>
        <button onClick={() => navigate('/')} className="text-blue-600 underline">
          返回首页
        </button>
      </div>
    )
  }

  const progress = getProgress()
  const doneCount = questions.filter((q) => progress[q.id]).length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => navigate('/')} className="text-blue-600">
          ← 返回
        </button>
        <span className="text-sm text-gray-500">
          {mode === 'sequential' ? '顺序练习' : '随机练习'}
        </span>
        <label className="flex items-center gap-1 text-sm text-gray-500">
          <input
            type="checkbox"
            checked={autoNext}
            onChange={(e) => {
              setAutoNext(e.target.checked)
              saveSettings({ autoNext: e.target.checked })
            }}
          />
          答对自动下一题
        </label>
      </div>

      <div className="h-1 bg-gray-200">
        <div
          className="h-full bg-blue-500 transition-all"
          style={{ width: `${(doneCount / questions.length) * 100}%` }}
        />
      </div>

      <div className="p-4 pb-8">
        <QuestionCard
          question={question}
          index={order[currentIndex]}
          total={questions.length}
          selectedAnswer={selectedAnswer}
          onAnswer={handleAnswer}
          disabled={selectedAnswer !== null}
        />

        {selectedAnswer && (
          <AnswerResult question={question} userAnswer={selectedAnswer} onNext={goNext} />
        )}
      </div>
    </div>
  )
}
