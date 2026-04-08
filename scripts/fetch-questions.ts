import { generateR } from './generate-r.js'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import path from 'path'

const API_BASE = 'http://api2.jiakaobaodian.com'
const CITY_CODE = '310100' // Shanghai
const COURSE = 'kemu1'
const CAR_TYPE = 'car'
const BATCH_SIZE = 25
const DELAY_MIN = 2000
const DELAY_MAX = 5000

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function randomDelay() {
  return sleep(DELAY_MIN + Math.random() * (DELAY_MAX - DELAY_MIN))
}

function decodeAnswer(code: number): string {
  if (code === 16) return 'A'
  if (code === 32) return 'B'
  if (code === 64) return 'C'
  if (code === 128) return 'D'
  return String(code)
}

interface RawQuestion {
  questionId: number
  question: string
  optionA: string
  optionB: string
  optionC: string | null
  optionD: string | null
  optionType: number
  answer: number
  explain: string
  conciseExplain: string
  illiteracyExplain: string
  wrongRate: number
  difficulty: number
  mediaContent: string
  mediaKey: string
  mediaType: number
  chapterId: number
  label: number
}

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

function transformQuestion(raw: RawQuestion): Question {
  const options: string[] = []
  if (raw.optionA) options.push(raw.optionA)
  if (raw.optionB) options.push(raw.optionB)
  if (raw.optionC) options.push(raw.optionC)
  if (raw.optionD) options.push(raw.optionD)

  return {
    id: raw.questionId,
    question: raw.question,
    options,
    optionType: raw.optionType === 0 ? 'judge' : 'choice',
    answer: decodeAnswer(raw.answer),
    explain: raw.explain || '',
    conciseExplain: raw.conciseExplain || '',
    mnemonicTip: raw.illiteracyExplain || '',
    wrongRate: raw.wrongRate,
    difficulty: raw.difficulty,
    image: raw.mediaContent || null,
    chapterId: raw.chapterId,
    label: raw.label,
  }
}

async function fetchSequence(): Promise<number[]> {
  const url = `${API_BASE}/api/open/exercise/sequence.htm?_r=${generateR()}&course=${COURSE}&carType=${CAR_TYPE}&cityCode=${CITY_CODE}`
  console.log('Fetching question IDs...')
  const res = await fetch(url)
  const data = await res.json()

  if (!data.data) {
    console.error('Failed to fetch sequence:', JSON.stringify(data))
    process.exit(1)
  }

  const ids: number[] = data.data
  console.log(`Got ${ids.length} question IDs`)
  return ids
}

async function fetchBatch(ids: number[]): Promise<RawQuestion[]> {
  const url = `${API_BASE}/api/open/question/question-list.htm?_r=${generateR()}&questionIds=${ids.join(',')}`
  const res = await fetch(url)
  const data = await res.json()

  if (!data.data) {
    console.error('Failed to fetch batch:', JSON.stringify(data).slice(0, 200))
    return []
  }

  return data.data
}

async function main() {
  const ids = await fetchSequence()
  const allQuestions: Question[] = []

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(ids.length / BATCH_SIZE)
    console.log(`Fetching batch ${batchNum}/${totalBatches} (${batch.length} questions)...`)

    const rawQuestions = await fetchBatch(batch)
    const transformed = rawQuestions.map(transformQuestion)
    allQuestions.push(...transformed)

    console.log(`  Total fetched: ${allQuestions.length}/${ids.length}`)

    if (i + BATCH_SIZE < ids.length) {
      await randomDelay()
    }
  }

  // Sort by label
  allQuestions.sort((a, b) => a.label - b.label)

  // Save full question bank
  const outDir = path.join(import.meta.dirname, '..', 'src', 'data')
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

  const outPath = path.join(outDir, 'questions.json')
  writeFileSync(outPath, JSON.stringify(allQuestions, null, 2), 'utf-8')
  console.log(`\nSaved ${allQuestions.length} questions to ${outPath}`)

  // Generate select500 by wrongRate + difficulty
  const select500 = [...allQuestions]
    .sort((a, b) => {
      const scoreA = a.wrongRate * 0.7 + a.difficulty * 0.3
      const scoreB = b.wrongRate * 0.7 + b.difficulty * 0.3
      return scoreB - scoreA
    })
    .slice(0, 500)
    .sort((a, b) => a.label - b.label)

  const select500Path = path.join(outDir, 'select500.json')
  const select500Ids = select500.map((q) => q.id)
  writeFileSync(select500Path, JSON.stringify(select500Ids, null, 2), 'utf-8')
  console.log(`Saved select500 IDs (${select500Ids.length}) to ${select500Path}`)
}

main().catch(console.error)
