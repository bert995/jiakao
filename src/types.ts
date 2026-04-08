export interface Question {
  id: number
  question: string
  options: string[]
  optionType: 'judge' | 'choice'
  answer: string
  explain: string
  conciseExplain: string
  mnemonicTip: string
  wrongRate: number
  difficulty: number
  image: string | null
  chapterId: number
  label: number
}
