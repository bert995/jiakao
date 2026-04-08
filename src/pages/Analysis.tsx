import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getWrongBook, getProgress } from '../lib/storage'
import { getQuestionById } from '../lib/questions'
import { streamAnalysis } from '../lib/ai'
import type { Question } from '../types'

const CHAPTER_NAMES: Record<number, string> = {
  121: '驾驶证与机动车管理',
  122: '道路交通安全法律法规',
  123: '刑事责任与交通违法处罚',
  124: '交通事故处理与紧急情况',
  2014: '安全文明驾驶常识',
}

function getChapterName(id: number): string {
  return CHAPTER_NAMES[id] || `章节 ${id}`
}

interface ChapterStat {
  chapterId: number
  name: string
  wrongCount: number
  totalInChapter: number
}

export default function Analysis() {
  const navigate = useNavigate()
  const wrongBook = getWrongBook()
  const wrongIds = Object.keys(wrongBook).map(Number)

  const wrongQuestions: Question[] = wrongIds
    .map((id) => getQuestionById(id))
    .filter((q): q is Question => q !== undefined)

  const [report, setReport] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  // Chapter statistics
  const chapterStats: ChapterStat[] = (() => {
    const map = new Map<number, number>()
    for (const q of wrongQuestions) {
      map.set(q.chapterId, (map.get(q.chapterId) || 0) + 1)
    }
    return Array.from(map.entries())
      .map(([chapterId, wrongCount]) => ({
        chapterId,
        name: getChapterName(chapterId),
        wrongCount,
        totalInChapter: wrongCount,
      }))
      .sort((a, b) => b.wrongCount - a.wrongCount)
  })()

  const maxWrong = Math.max(...chapterStats.map((s) => s.wrongCount), 1)

  useEffect(() => {
    if (wrongQuestions.length === 0) return

    setLoading(true)
    setError(null)
    setReport('')
    setDone(false)

    const progress = getProgress()

    // Build prompt with all wrong questions
    const questionList = wrongQuestions
      .map((q, i) => {
        const p = progress[q.id]
        return `${i + 1}. [章节:${getChapterName(q.chapterId)}] ${q.question}\n   正确答案: ${q.answer}. ${q.options[q.answer.charCodeAt(0) - 65] || ''}\n   做错次数: ${p?.attempts || 1}`
      })
      .join('\n')

    const prompt = `我在驾考科目一练习中做错了以下 ${wrongQuestions.length} 道题，请帮我分析错误模式并给出记忆策略：\n\n${questionList}`

    streamAnalysis(
      prompt,
      (chunk) => {
        setReport((prev) => prev + chunk)
      },
      () => {
        setLoading(false)
        setDone(true)
      },
      (err) => {
        setLoading(false)
        setError(err.message)
      },
    )
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto scroll as content streams in
  useEffect(() => {
    if (reportRef.current && loading) {
      reportRef.current.scrollTop = reportRef.current.scrollHeight
    }
  }, [report, loading])

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
      {/* Top bar */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => navigate('/wrong')} className="text-blue-600">
          ← 返回错题本
        </button>
        <span className="text-sm text-gray-500">错题分析</span>
        <div />
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Chapter weakness stats */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-bold text-lg mb-3">薄弱章节分布</h2>
          <div className="text-sm text-gray-500 mb-3">共 {wrongQuestions.length} 道错题</div>
          <div className="space-y-3">
            {chapterStats.map((stat) => (
              <div key={stat.chapterId}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{stat.name}</span>
                  <span className="text-red-500 font-medium">{stat.wrongCount} 题</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-400 rounded-full transition-all"
                    style={{ width: `${(stat.wrongCount / maxWrong) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Analysis */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-bold text-lg mb-3">
            AI 分析报告
            {loading && <span className="ml-2 text-sm font-normal text-blue-500">生成中...</span>}
          </h2>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-3">
              {error}
            </div>
          )}

          <div
            ref={reportRef}
            className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap"
          >
            {report || (loading ? '正在分析你的错题...' : '')}
          </div>
        </div>

        {/* Training shortcuts */}
        {done && chapterStats.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-bold text-lg mb-3">强化训练</h2>
            <div className="space-y-2">
              {chapterStats.map((stat) => (
                <Link
                  key={stat.chapterId}
                  to={`/practice?mode=random&chapter=${stat.chapterId}`}
                  className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <div>
                    <div className="font-medium text-sm">{stat.name}</div>
                    <div className="text-xs text-gray-500">{stat.wrongCount} 道错题</div>
                  </div>
                  <span className="text-blue-600 text-sm font-medium">去练习 →</span>
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
