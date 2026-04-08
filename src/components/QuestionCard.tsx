import type { Question } from '../types'

const LABELS = ['A', 'B', 'C', 'D']

interface Props {
  question: Question
  index: number
  total: number
  selectedAnswer: string | null
  onAnswer: (answer: string) => void
  disabled: boolean
}

export default function QuestionCard({
  question,
  index,
  total,
  selectedAnswer,
  onAnswer,
  disabled,
}: Props) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-sm text-gray-500 mb-2">
        {index + 1} / {total}
        <span className="ml-2 text-xs">
          {question.optionType === 'judge' ? '判断题' : '单选题'}
        </span>
      </div>

      <h2 className="text-lg font-medium mb-4 leading-relaxed">{question.question}</h2>

      {question.image && (
        <img
          src={question.image}
          alt="题目配图"
          className="max-w-full max-h-64 rounded-lg mb-4"
        />
      )}

      <div className="space-y-3">
        {question.options.map((option, i) => {
          const label = LABELS[i]
          const isSelected = selectedAnswer === label
          const isCorrect = label === question.answer
          const showResult = selectedAnswer !== null

          let className =
            'w-full text-left p-4 rounded-lg border-2 transition-colors flex items-start gap-3'

          if (!showResult) {
            className += ' border-gray-200 hover:border-blue-400 hover:bg-blue-50 active:bg-blue-100'
          } else if (isCorrect) {
            className += ' border-green-500 bg-green-50'
          } else if (isSelected && !isCorrect) {
            className += ' border-red-500 bg-red-50'
          } else {
            className += ' border-gray-200 opacity-60'
          }

          return (
            <button
              key={label}
              className={className}
              onClick={() => onAnswer(label)}
              disabled={disabled}
            >
              <span className="font-bold text-gray-500 shrink-0">{label}.</span>
              <span>{option}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
