import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import QuestionCard from '../components/QuestionCard'
import AnswerResult from '../components/AnswerResult'
import {
  getWrongBook,
  saveQuestionResult,
  addToWrongBook,
  markWrongBookCorrect,
} from '../lib/storage'
import { getQuestionById } from '../lib/questions'
import type { Question } from '../types'

export default function Wrong() {
  const navigate = useNavigate()

  // Capture questions once on mount so the list stays stable during this session
  const questions: Question[] = useMemo(() => {
    const wrongBook = getWrongBook()
    const wrongIds = Object.keys(wrongBook).map(Number)
    return wrongIds
      .map((id) => getQuestionById(id))
      .filter((q): q is Question => q !== undefined)
  }, [])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
        <div className="text-4xl mb-4">🎉</div>
        <p className="text-xl mb-4">没有错题！</p>
        <button onClick={() => navigate('/')} className="text-blue-600 underline">
          返回首页
        </button>
      </div>
    )
  }

  const question = questions[currentIndex % questions.length]

  const handleAnswer = (answer: string) => {
    if (selectedAnswer !== null) return
    setSelectedAnswer(answer)
    const isCorrect = answer === question.answer
    saveQuestionResult(question.id, isCorrect)
    if (isCorrect) {
      markWrongBookCorrect(question.id)
    } else {
      addToWrongBook(question.id)
    }
  }

  const goNext = () => {
    setSelectedAnswer(null)
    if (currentIndex + 1 >= questions.length) {
      window.location.reload()
      return
    }
    setCurrentIndex(currentIndex + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => navigate('/')} className="text-blue-600">
          ← 返回
        </button>
        <span className="text-sm text-gray-500">错题本（{questions.length} 题）</span>
        <button
          onClick={() => {
            localStorage.removeItem('jiakao_analysis_cache')
            localStorage.removeItem('jiakao_done_topics')
            navigate('/analysis')
          }}
          className="text-blue-600 text-sm font-medium"
        >
          分析错题
        </button>
      </div>

      <div className="p-4 pb-8">
        <QuestionCard
          question={question}
          index={currentIndex}
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
