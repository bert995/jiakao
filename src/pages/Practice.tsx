import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import QuestionCard from '../components/QuestionCard'
import AnswerResult from '../components/AnswerResult'
import { getQuestionSet } from '../lib/questions'
import {
  getSettings,
  saveSettings,
  saveQuestionResult,
  addToWrongBook,
  markWrongBookCorrect,
  getProgress,
} from '../lib/storage'
import type { Question } from '../types'

export default function Practice() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const mode = searchParams.get('mode') === 'random' ? 'random' : 'sequential'

  const settings = getSettings()
  const chapterFilter = searchParams.get('chapter')
  const allQuestions = getQuestionSet(settings.questionSet)
  const questions = chapterFilter
    ? allQuestions.filter((q) => q.chapterId === Number(chapterFilter))
    : allQuestions

  const [order, setOrder] = useState<number[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [autoNext, setAutoNext] = useState(settings.autoNext)

  useEffect(() => {
    if (mode === 'random') {
      const progress = getProgress()
      const unanswered = questions
        .map((_, i) => i)
        .filter((i) => !progress[questions[i].id] || !progress[questions[i].id].correct)
      const shuffled = unanswered.sort(() => Math.random() - 0.5)
      setOrder(shuffled.length > 0 ? shuffled : questions.map((_, i) => i).sort(() => Math.random() - 0.5))
      setCurrentIndex(0)
    } else {
      const seqOrder = questions.map((_, i) => i)
      setOrder(seqOrder)
      const progress = getProgress()
      const start = Math.min(settings.lastPosition, Math.max(0, questions.length - 1))
      let idx = seqOrder.findIndex((i, pos) => pos >= start && !progress[questions[i].id])
      if (idx === -1) {
        idx = seqOrder.findIndex((i) => !progress[questions[i].id])
      }
      setCurrentIndex(idx === -1 ? start : idx)
    }
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  const question: Question | undefined = questions[order[currentIndex]]

  const goNext = useCallback(() => {
    setSelectedAnswer(null)
    const next = currentIndex + 1
    if (next >= order.length) {
      navigate('/')
      return
    }
    setCurrentIndex(next)
    if (mode === 'sequential') {
      saveSettings({ lastPosition: next })
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentIndex, order.length, mode, navigate])

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
