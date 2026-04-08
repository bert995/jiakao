import type { Question } from '../types'

interface Props {
  question: Question
  userAnswer: string
  onNext: () => void
}

export default function AnswerResult({ question, userAnswer, onNext }: Props) {
  const isCorrect = userAnswer === question.answer

  return (
    <div className="max-w-2xl mx-auto mt-4 space-y-3">
      <div
        className={`p-4 rounded-lg ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
      >
        <div className="font-bold mb-1">
          {isCorrect ? '✓ 回答正确' : `✗ 回答错误，正确答案：${question.answer}`}
        </div>

        {question.mnemonicTip && (
          <div className="text-sm mt-2">
            <span className="font-medium text-amber-700">速记口诀：</span>
            {question.mnemonicTip}
          </div>
        )}

        {question.conciseExplain && (
          <div className="text-sm mt-2">
            <span className="font-medium text-gray-700">简要解析：</span>
            {question.conciseExplain}
          </div>
        )}

        {question.explain && (
          <details className="text-sm mt-2">
            <summary className="font-medium text-gray-700 cursor-pointer">详细解析</summary>
            <div
              className="mt-1 text-gray-600"
              dangerouslySetInnerHTML={{ __html: question.explain }}
            />
          </details>
        )}
      </div>

      <button
        onClick={onNext}
        className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors"
      >
        下一题 →
      </button>
    </div>
  )
}
