import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Markdown from 'react-markdown'
import { getWrongBook } from '../lib/storage'
import { getQuestionById } from '../lib/questions'
import { analyzeWrongQuestions } from '../lib/ai'
import type { Question } from '../types'

interface ResolvedTopic {
  name: string
  tip: string
  ids: number[]
}

export default function Analysis() {
  const navigate = useNavigate()
  const wrongBook = getWrongBook()
  const wrongIds = Object.keys(wrongBook).map(Number)

  const wrongQuestions: Question[] = wrongIds
    .map((id) => getQuestionById(id))
    .filter((q): q is Question => q !== undefined)

  const CACHE_KEY = 'jiakao_analysis_cache'

  const [analysis, setAnalysis] = useState('')
  const [resolvedTopics, setResolvedTopics] = useState<ResolvedTopic[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalysis = () => {
    if (wrongQuestions.length === 0) return

    setLoading(true)
    setError(null)
    setAnalysis('')
    setResolvedTopics([])

    const input = wrongQuestions.map((q, i) => ({
      index: i,
      question: q.question,
      correctAnswer: `${q.answer}. ${q.options[q.answer.charCodeAt(0) - 65] || ''}`,
    }))

    analyzeWrongQuestions(input)
      .then((result) => {
        const resolved: ResolvedTopic[] = result.topics.map((topic) => ({
          name: topic.name,
          tip: topic.tip,
          ids: topic.questionIndices
            .map((idx) => wrongQuestions[idx]?.id)
            .filter((id): id is number => id !== undefined),
        })).filter((t) => t.ids.length > 0)

        setAnalysis(result.analysis)
        setResolvedTopics(resolved)
        setLoading(false)
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          analysis: result.analysis,
          resolvedTopics: resolved,
        }))
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }

  useEffect(() => {
    // Check localStorage cache (survives tab close, cleared when entering from Wrong page)
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (parsed.analysis && Array.isArray(parsed.resolvedTopics)) {
          setAnalysis(parsed.analysis)
          setResolvedTopics(parsed.resolvedTopics)
          return
        }
      } catch { /* ignore bad cache */ }
    }
    fetchAnalysis()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (wrongQuestions.length === 0 && !analysis) {
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
        <span className="text-sm text-gray-500">错题分析 · {wrongQuestions.length} 题</span>
        <button
          onClick={() => {
            localStorage.removeItem(CACHE_KEY)
            fetchAnalysis()
          }}
          className="text-blue-600 text-sm"
        >
          重新分析
        </button>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 p-6 bg-white rounded-xl shadow-sm justify-center">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-600">AI 正在分析你的错题...</span>
          </div>
        )}

        {/* Error */}
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

        {/* Analysis section */}
        {analysis && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-bold text-lg mb-3">分析报告</h2>
            <div className="prose prose-sm max-w-none text-gray-700 [&_table]:w-full [&_table]:text-sm [&_th]:bg-gray-50 [&_th]:p-2 [&_th]:text-left [&_td]:p-2 [&_td]:border-t [&_ul]:space-y-1 [&_ol]:space-y-1 [&_li]:text-sm [&_p]:text-sm [&_p]:leading-relaxed [&_strong]:text-gray-900">
              <Markdown>{analysis}</Markdown>
            </div>
          </div>
        )}

        {/* Topic drills */}
        {resolvedTopics.length > 0 && (
          <div>
            <h2 className="font-bold text-lg mb-3">专项练习</h2>
            <div className="space-y-3">
              {resolvedTopics.map((topic, i) => (
                <Link
                  key={i}
                  to={`/drill?ids=${topic.ids.join(',')}&name=${encodeURIComponent(topic.name)}`}
                  className="block bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{topic.name}</h3>
                      <span className="text-xs text-gray-400 shrink-0 ml-2">{topic.ids.length} 题</span>
                    </div>
                    <p className="text-sm text-amber-700 mt-1">💡 {topic.tip}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {topic.ids.slice(0, 4).map((id) => {
                        const q = getQuestionById(id)
                        if (!q) return null
                        return (
                          <span key={id} className="text-xs text-gray-400 bg-gray-50 rounded px-1.5 py-0.5 truncate max-w-[200px]">
                            {q.question.slice(0, 20)}...
                          </span>
                        )
                      })}
                      {topic.ids.length > 4 && (
                        <span className="text-xs text-gray-400">+{topic.ids.length - 4}</span>
                      )}
                    </div>
                  </div>
                  <div className="py-2.5 bg-blue-50 text-center text-blue-600 text-sm font-medium border-t">
                    开始练习 →
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="h-8" />
      </div>
    </div>
  )
}
