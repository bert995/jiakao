import { Link } from 'react-router-dom'
import { getProgress, getWrongBook, getExamHistory, getSettings, saveSettings } from '../lib/storage'
import { getQuestionSet, getNumberQuestions } from '../lib/questions'

const PASS_SCORE = 90
const NUMBER_THEME_NAME = '数字专题·扣分罚款'

export default function Home() {
  const settings = getSettings()
  const questions = getQuestionSet(settings.questionSet)
  const progress = getProgress()
  const wrongBook = getWrongBook()
  const examHistory = getExamHistory()
  const numberQuestionCount = getNumberQuestions('all').length
  const numberThemeDone = (() => {
    try {
      const done: string[] = JSON.parse(localStorage.getItem('jiakao_done_topics') || '[]')
      return done.includes(NUMBER_THEME_NAME)
    } catch { return false }
  })()

  const doneCount = questions.filter((q) => progress[q.id]).length
  const correctCount = questions.filter((q) => progress[q.id]?.correct).length
  const accuracy = doneCount > 0 ? Math.round((correctCount / doneCount) * 100) : 0
  const wrongCount = Object.keys(wrongBook).length
  const lastExam = examHistory[examHistory.length - 1]

  const toggleSet = () => {
    const next = settings.questionSet === 'all' ? 'select500' : 'all'
    saveSettings({ questionSet: next, lastPosition: 0 })
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 text-white px-6 py-8">
        <h1 className="text-2xl font-bold">驾考科目一</h1>
        <p className="text-blue-200 mt-1">C1 · 上海</p>

        <button
          onClick={toggleSet}
          className="mt-3 px-3 py-1 bg-blue-500 rounded-full text-sm"
        >
          当前：{settings.questionSet === 'select500' ? '精选 500 题' : `全部 ${questions.length} 题`}
          （点击切换）
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 px-6 -mt-4">
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <div className="text-2xl font-bold text-blue-600">{doneCount}</div>
          <div className="text-xs text-gray-500">已做</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <div className="text-2xl font-bold text-green-600">{accuracy}%</div>
          <div className="text-xs text-gray-500">正确率</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <div className="text-2xl font-bold text-red-500">{wrongCount}</div>
          <div className="text-xs text-gray-500">错题</div>
        </div>
      </div>

      <div className="px-6 mt-6 space-y-3">
        <Link
          to="/practice?mode=sequential"
          className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm"
        >
          <div>
            <div className="font-medium">顺序练习</div>
            <div className="text-sm text-gray-500">
              {doneCount}/{questions.length} 题
            </div>
          </div>
          <span className="text-gray-400">→</span>
        </Link>

        <Link
          to="/practice?mode=random"
          className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm"
        >
          <div>
            <div className="font-medium">随机练习</div>
            <div className="text-sm text-gray-500">优先未做和错题</div>
          </div>
          <span className="text-gray-400">→</span>
        </Link>

        <Link
          to={`/drill?topic=numbers&name=${encodeURIComponent(NUMBER_THEME_NAME)}`}
          className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm"
        >
          <div>
            <div className="font-medium flex items-center gap-2">
              数字专题 · 扣分/罚款/距离
              {numberThemeDone && (
                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">已练完</span>
              )}
            </div>
            <div className="text-sm text-gray-500">
              {numberQuestionCount} 道含数字题，反复刷到全对
            </div>
          </div>
          <span className="text-gray-400">→</span>
        </Link>

        <Link
          to="/exam"
          className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm"
        >
          <div>
            <div className="font-medium">模拟考试</div>
            <div className="text-sm text-gray-500">
              {lastExam ? `上次：${lastExam.score} 分` : '100题 · 45分钟 · 90分及格'}
            </div>
          </div>
          <span className="text-gray-400">→</span>
        </Link>

        <Link
          to="/wrong"
          className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm"
        >
          <div>
            <div className="font-medium">错题本</div>
            <div className="text-sm text-gray-500">
              {wrongCount > 0 ? `${wrongCount} 道错题待复习` : '暂无错题'}
            </div>
          </div>
          <span className="text-gray-400">→</span>
        </Link>
      </div>

      {examHistory.length > 0 && (
        <div className="px-6 mt-6">
          <h3 className="font-medium mb-3">考试记录</h3>
          <div className="space-y-2">
            {[...examHistory]
              .reverse()
              .slice(0, 5)
              .map((exam, i) => (
                <div key={i} className="bg-white rounded-lg p-3 flex justify-between text-sm">
                  <span className="text-gray-500">
                    {new Date(exam.date).toLocaleDateString('zh-CN')}
                  </span>
                  <span className={exam.score >= PASS_SCORE ? 'text-green-600' : 'text-red-600'}>
                    {exam.score} 分
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="h-8" />
    </div>
  )
}
