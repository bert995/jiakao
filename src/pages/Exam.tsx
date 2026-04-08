import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import QuestionCard from '../components/QuestionCard'
import { getQuestionSet, pickExamQuestions } from '../lib/questions'
import { getSettings, saveExamRecord } from '../lib/storage'
import type { Question, ExamRecord } from '../types'

const EXAM_COUNT = 100
const EXAM_DURATION = 45 * 60
const PASS_SCORE = 90

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function Exam() {
  const navigate = useNavigate()
  const settings = getSettings()

  const [examQuestions] = useState<Question[]>(() =>
    pickExamQuestions(getQuestionSet(settings.questionSet), EXAM_COUNT)
  )
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION)
  const [finished, setFinished] = useState(false)
  const startTime = useRef(Date.now())

  useEffect(() => {
    if (finished) return
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [finished])

  useEffect(() => {
    if (timeLeft === 0 && !finished) {
      handleSubmit()
    }
  }, [timeLeft]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnswer = (answer: string) => {
    const q = examQuestions[currentIndex]
    setAnswers((prev) => ({ ...prev, [q.id]: answer }))
    if (currentIndex < examQuestions.length - 1) {
      setTimeout(() => setCurrentIndex((prev) => prev + 1), 300)
    }
  }

  const handleSubmit = () => {
    const correctCount = examQuestions.filter((q) => answers[q.id] === q.answer).length
    const duration = Math.floor((Date.now() - startTime.current) / 1000)

    const record: ExamRecord = {
      date: new Date().toISOString(),
      score: correctCount,
      duration,
      total: examQuestions.length,
      correct: correctCount,
    }
    saveExamRecord(record)
    setFinished(true)
  }

  const question = examQuestions[currentIndex]
  const answeredCount = Object.keys(answers).length

  if (finished) {
    const correctCount = examQuestions.filter((q) => answers[q.id] === q.answer).length
    const passed = correctCount >= PASS_SCORE

    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div
            className={`text-center py-8 rounded-xl mb-6 ${passed ? 'bg-green-50' : 'bg-red-50'}`}
          >
            <div className="text-6xl font-bold mb-2">{correctCount}</div>
            <div className="text-lg text-gray-600">/ {examQuestions.length} 分</div>
            <div className={`text-xl font-bold mt-2 ${passed ? 'text-green-600' : 'text-red-600'}`}>
              {passed ? '恭喜通过！' : '未通过，继续加油！'}
            </div>
          </div>

          <h3 className="font-bold text-lg mb-4">
            错题回顾（{examQuestions.length - correctCount} 题）
          </h3>
          <div className="space-y-6">
            {examQuestions
              .filter((q) => answers[q.id] !== q.answer)
              .map((q, i) => (
                <div key={q.id} className="bg-white rounded-lg p-4 border">
                  <div className="text-sm text-gray-500 mb-1">第 {i + 1} 题</div>
                  <div className="font-medium mb-2">{q.question}</div>
                  {q.image && <img src={q.image} alt="" className="max-h-40 rounded mb-2" />}
                  <div className="text-sm space-y-1">
                    {q.options.map((opt, j) => {
                      const label = ['A', 'B', 'C', 'D'][j]
                      const isCorrect = label === q.answer
                      const isUserAnswer = label === answers[q.id]
                      return (
                        <div
                          key={j}
                          className={`${isCorrect ? 'text-green-700 font-medium' : ''} ${isUserAnswer && !isCorrect ? 'text-red-600 line-through' : ''}`}
                        >
                          {label}. {opt}
                        </div>
                      )
                    })}
                  </div>
                  {q.conciseExplain && (
                    <div className="text-sm text-gray-600 mt-2">解析：{q.conciseExplain}</div>
                  )}
                </div>
              ))}
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-full mt-6 py-3 bg-blue-600 text-white rounded-lg font-medium"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => navigate('/')} className="text-blue-600">
          ← 退出
        </button>
        <span className={`font-mono font-bold ${timeLeft < 300 ? 'text-red-600' : ''}`}>
          {formatTime(timeLeft)}
        </span>
        <span className="text-sm text-gray-500">
          {answeredCount}/{examQuestions.length}
        </span>
      </div>

      <div className="bg-white border-b px-4 py-2 flex gap-1 overflow-x-auto">
        {examQuestions.map((q, i) => (
          <button
            key={q.id}
            onClick={() => setCurrentIndex(i)}
            className={`w-8 h-8 rounded text-xs shrink-0 ${
              i === currentIndex
                ? 'bg-blue-600 text-white'
                : answers[q.id]
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="p-4">
        <QuestionCard
          question={question}
          index={currentIndex}
          total={examQuestions.length}
          selectedAnswer={answers[question.id] || null}
          onAnswer={handleAnswer}
          disabled={false}
        />
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="flex-1 py-3 border rounded-lg disabled:opacity-30"
          >
            上一题
          </button>
          {currentIndex < examQuestions.length - 1 ? (
            <button
              onClick={() => setCurrentIndex(currentIndex + 1)}
              className="flex-1 py-3 border rounded-lg"
            >
              下一题
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium"
            >
              交卷（{answeredCount}/{examQuestions.length}）
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
