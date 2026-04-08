import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'fs'
import path from 'path'

interface Question {
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
  label: number
  chapterId: number
}

const LABELS = ['A', 'B', 'C', 'D']

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>')
}

function buildFront(q: Question): string {
  let html = `<div style="text-align:left;font-size:16px;">`
  html += `<div style="color:#666;font-size:12px;margin-bottom:8px;">#${q.label} · ${q.optionType === 'judge' ? '判断题' : '单选题'}</div>`
  html += `<div style="font-weight:bold;margin-bottom:12px;">${escapeHtml(q.question)}</div>`

  if (q.image) {
    const filename = path.basename(q.image)
    html += `<div style="margin-bottom:12px;"><img src="${filename}" style="max-width:100%;max-height:200px;"></div>`
  }

  q.options.forEach((opt, i) => {
    html += `<div style="margin:4px 0;padding:6px 10px;background:#f5f5f5;border-radius:6px;">${LABELS[i]}. ${escapeHtml(opt)}</div>`
  })

  html += `</div>`
  return html
}

function buildBack(q: Question): string {
  let html = `<div style="text-align:left;font-size:16px;">`

  html += `<div style="font-size:24px;font-weight:bold;color:#16a34a;margin-bottom:12px;">正确答案：${q.answer}</div>`

  q.options.forEach((opt, i) => {
    const label = LABELS[i]
    const isCorrect = label === q.answer
    const bg = isCorrect ? '#dcfce7' : '#f5f5f5'
    const color = isCorrect ? '#16a34a' : '#333'
    html += `<div style="margin:4px 0;padding:6px 10px;background:${bg};color:${color};border-radius:6px;${isCorrect ? 'font-weight:bold;' : ''}">${label}. ${escapeHtml(opt)}</div>`
  })

  if (q.mnemonicTip) {
    html += `<div style="margin-top:12px;padding:8px;background:#fef3c7;border-radius:6px;font-size:14px;"><b>速记口诀：</b>${escapeHtml(q.mnemonicTip)}</div>`
  }

  if (q.conciseExplain) {
    html += `<div style="margin-top:8px;font-size:14px;color:#666;"><b>解析：</b>${escapeHtml(q.conciseExplain)}</div>`
  }

  html += `<div style="margin-top:8px;font-size:12px;color:#999;">错误率 ${q.wrongRate}% · 难度 ${q.difficulty}</div>`
  html += `</div>`
  return html
}

function main() {
  const dataPath = path.join(import.meta.dirname, '..', 'src', 'data', 'questions.json')
  const questions: Question[] = JSON.parse(readFileSync(dataPath, 'utf-8'))

  const select500Path = path.join(import.meta.dirname, '..', 'src', 'data', 'select500.json')
  const select500Ids: number[] = JSON.parse(readFileSync(select500Path, 'utf-8'))
  const select500Set = new Set(select500Ids)

  const outDir = path.join(import.meta.dirname, '..', 'dist-anki')
  const mediaDir = path.join(outDir, 'media')
  if (!existsSync(mediaDir)) mkdirSync(mediaDir, { recursive: true })

  const imgSrcDir = path.join(import.meta.dirname, '..', 'public', 'images')

  for (const [deckName, qs] of [
    ['驾考科目一-全部题库', questions],
    ['驾考科目一-精选500题', questions.filter((q) => select500Set.has(q.id))],
  ] as const) {
    const rows: string[] = []

    for (const q of qs) {
      const front = buildFront(q)
      const back = buildBack(q)

      if (q.image) {
        const filename = path.basename(q.image)
        const src = path.join(imgSrcDir, filename)
        if (existsSync(src)) {
          copyFileSync(src, path.join(mediaDir, filename))
        }
      }

      const tag = `jiakao::chapter${q.chapterId}`
      rows.push(`"${front.replace(/"/g, '""')}"\t"${back.replace(/"/g, '""')}"\t${tag}`)
    }

    const csvPath = path.join(outDir, `${deckName}.txt`)
    writeFileSync(csvPath, rows.join('\n'), 'utf-8')
    console.log(`Exported ${rows.length} cards to ${csvPath}`)
  }

  console.log(`\nMedia files copied to ${mediaDir}`)
  console.log('\nTo import into Anki:')
  console.log('1. Open Anki → File → Import')
  console.log('2. Select the .txt file')
  console.log('3. Set separator to Tab, check "Allow HTML in fields"')
  console.log('4. Copy media/ contents to your Anki media folder')
  console.log('   macOS: ~/Library/Application Support/Anki2/<profile>/collection.media/')
}

main()
