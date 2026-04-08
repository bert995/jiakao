import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import path from 'path'

const DELAY = 500

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface Question {
  id: number
  image: string | null
  [key: string]: unknown
}

async function main() {
  const dataPath = path.join(import.meta.dirname, '..', 'src', 'data', 'questions.json')
  const questions: Question[] = JSON.parse(readFileSync(dataPath, 'utf-8'))

  const withImages = questions.filter((q) => q.image)
  console.log(`Found ${withImages.length} questions with images out of ${questions.length} total`)

  const imgDir = path.join(import.meta.dirname, '..', 'public', 'images')
  if (!existsSync(imgDir)) mkdirSync(imgDir, { recursive: true })

  let downloaded = 0
  let skipped = 0
  let failed = 0

  for (const q of withImages) {
    const url = q.image!
    const ext = path.extname(new URL(url).pathname) || '.jpg'
    const filename = `${q.id}${ext}`
    const filepath = path.join(imgDir, filename)

    if (existsSync(filepath)) {
      skipped++
      continue
    }

    try {
      const res = await fetch(url)
      if (!res.ok) {
        console.error(`  Failed ${q.id}: HTTP ${res.status}`)
        failed++
        continue
      }
      const buffer = Buffer.from(await res.arrayBuffer())
      writeFileSync(filepath, buffer)
      downloaded++

      if (downloaded % 20 === 0) {
        console.log(`  Downloaded: ${downloaded}, Skipped: ${skipped}, Failed: ${failed}`)
      }

      await sleep(DELAY)
    } catch (err) {
      console.error(`  Error downloading ${q.id}:`, err)
      failed++
    }
  }

  console.log(`\nDone! Downloaded: ${downloaded}, Skipped: ${skipped}, Failed: ${failed}`)

  // Update questions.json to use local image paths
  const updated = questions.map((q) => {
    if (!q.image) return q
    const ext = path.extname(new URL(q.image).pathname) || '.jpg'
    return { ...q, image: `/images/${q.id}${ext}` }
  })
  writeFileSync(dataPath, JSON.stringify(updated, null, 2), 'utf-8')
  console.log('Updated questions.json with local image paths')
}

main().catch(console.error)
