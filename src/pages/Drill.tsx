import { useState, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import QuestionCard from '../components/QuestionCard'
import AnswerResult from '../components/AnswerResult'
import { getQuestionById } from '../lib/questions'
import { saveQuestionResult, addToWrongBook } from '../lib/storage'
import type { Question } from '../types'

export default function Drill() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const name = searchParams.get('name') || '专项练习'
  const idList = useMemo(() => {
    const raw = searchParams.get('ids') || ''
    return raw.split(',').map(Number).filter(Boolean)
  }, [searchParams])

  const allQuestions: Question[] = useMemo(
    () => idList.map((id) => getQuestionById(id)).filter((q): q is Question => q !== undefined),
    [idList],
  )

  // Track which questions still need to be answered correctly
  const [remaining, setRemaining] = useState<number[]>(() => allQuestions.map((_, i) => i))
  const [currentPos, setCurrentPos] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [roundCorrect, setRoundCorrect] = useState(0)
  const [roundWrong, setRoundWrong] = useState(0)
  const [finished, setFinished] = useState(false)

  const currentIndex = remaining[currentPos]
  const question = allQuestions[currentIndex]

  const handleAnswer = (answer: string) => {
    if (selectedAnswer !== null || !question) return
    setSelectedAnswer(answer)
    const isCorrect = answer === question.answer
    saveQuestionResult(question.id, isCorrect)

    if (isCorrect) {
      setRoundCorrect((c) => c + 1)
    } else {
      addToWrongBook(question.id)
      setRoundWrong((c) => c + 1)
    }
  }

  const goNext = () => {
    if (!question) return
    const isCorrect = selectedAnswer === question.answer
    setSelectedAnswer(null)

    // Build next remaining list — remove correctly answered ones
    const nextRemaining = isCorrect
      ? remaining.filter((_, i) => i !== currentPos)
      : remaining

    if (nextRemaining.length === 0) {
      // Mark this topic as completed
      try {
        const done: string[] = JSON.parse(localStorage.getItem('jiakao_done_topics') || '[]')
        if (!done.includes(name)) {
          done.push(name)
          localStorage.setItem('jiakao_done_topics', JSON.stringify(done))
        }
      } catch { /* ignore */ }
      setFinished(true)
      return
    }

    const nextPos = isCorrect
      ? currentPos >= nextRemaining.length ? 0 : currentPos
      : currentPos + 1 >= remaining.length ? 0 : currentPos + 1

    setRemaining(nextRemaining)
    setCurrentPos(nextPos)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (allQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
        <p className="text-xl mb-4">没有题目</p>
        <button onClick={() => navigate('/analysis')} className="text-blue-600 underline">
          返回分析
        </button>
      </div>
    )
  }

  if (finished) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
        <div className="bg-white rounded-xl p-8 shadow-sm text-center max-w-sm">
          <div className="text-4xl mb-3">🎉</div>
          <h2 className="text-xl font-bold mb-2">全部掌握！</h2>
          <p className="text-gray-500 text-sm mb-1">「{name}」专题已全部答对</p>
          <p className="text-sm text-gray-400 mb-6">
            本轮答对 {roundCorrect} 次 · 答错 {roundWrong} 次
          </p>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/analysis')}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium"
            >
              继续练其他专题
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 border rounded-lg text-gray-600"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => navigate('/analysis')} className="text-blue-600">
          ← 返回
        </button>
        <span className="text-sm text-gray-500 truncate max-w-[200px]">{name}</span>
        <span className="text-xs text-gray-400">剩余 {remaining.length} 题</span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-200">
        <div
          className="h-full bg-green-500 transition-all"
          style={{
            width: `${((allQuestions.length - remaining.length) / allQuestions.length) * 100}%`,
          }}
        />
      </div>

      <div className="p-4 pb-8">
        <QuestionCard
          question={question}
          index={allQuestions.length - remaining.length}
          total={allQuestions.length}
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
