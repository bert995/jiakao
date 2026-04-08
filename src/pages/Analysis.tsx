import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getWrongBook } from '../lib/storage'
import { getQuestionById } from '../lib/questions'
import { analyzeWrongQuestions } from '../lib/ai'
import type { TopicGroup } from '../lib/ai'
import type { Question } from '../types'

export default function Analysis() {
  const navigate = useNavigate()
  const wrongBook = getWrongBook()
  const wrongIds = Object.keys(wrongBook).map(Number)

  const wrongQuestions: Question[] = wrongIds
    .map((id) => getQuestionById(id))
    .filter((q): q is Question => q !== undefined)

  const [topics, setTopics] = useState<TopicGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (wrongQuestions.length === 0) return

    setLoading(true)
    setError(null)

    const input = wrongQuestions.map((q, i) => ({
      index: i,
      question: q.question,
      correctAnswer: `${q.answer}. ${q.options[q.answer.charCodeAt(0) - 65] || ''}`,
    }))

    analyzeWrongQuestions(input)
      .then((result) => {
        setTopics(result.topics)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (wrongQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
        <p className="text-xl mb-4">没有错题可分析</p>
        <button onClick={() => navigate('/wrong')} className="text-blue-600 underline">
          返回错题本
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => navigate('/wrong')} className="text-blue-600">
          ← 返回
        </button>
        <span className="text-sm text-gray-500">错题分析</span>
        <div />
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="text-sm text-gray-500">
          共 {wrongQuestions.length} 道错题，AI 正在按知识点归类...
        </div>

        {loading && (
          <div className="flex items-center gap-2 p-4 bg-white rounded-xl shadow-sm">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-600">正在分析归类中...</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
            <button
              onClick={() => window.location.reload()}
              className="ml-2 text-red-600 underline"
            >
              重试
            </button>
          </div>
        )}

        {topics.map((topic, i) => {
          const ids = topic.questionIndices
            .map((idx) => wrongQuestions[idx]?.id)
            .filter((id): id is number => id !== undefined)

          if (ids.length === 0) return null

          return (
            <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold">{topic.name}</h3>
                    <div className="text-xs text-gray-400 mt-0.5">{ids.length} 道题</div>
                  </div>
                </div>
                <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-2 mt-2">
                  💡 {topic.tip}
                </p>
                {/* Preview wrong questions in this topic */}
                <div className="mt-3 space-y-1">
                  {ids.slice(0, 3).map((id) => {
                    const q = getQuestionById(id)
                    if (!q) return null
                    return (
                      <div key={id} className="text-xs text-gray-500 truncate">
                        · {q.question}
                      </div>
                    )
                  })}
                  {ids.length > 3 && (
                    <div className="text-xs text-gray-400">...还有 {ids.length - 3} 题</div>
                  )}
                </div>
              </div>
              <Link
                to={`/drill?ids=${ids.join(',')}&name=${encodeURIComponent(topic.name)}`}
                className="block w-full py-3 bg-blue-50 text-center text-blue-600 text-sm font-medium hover:bg-blue-100 transition-colors border-t"
              >
                开始强化练习 →
              </Link>
            </div>
          )
        })}

        <div className="h-8" />
      </div>
    </div>
  )
}
