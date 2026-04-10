const API_URL = 'https://www.right.codes/codex/v1/chat/completions'
const API_KEY = 'sk-e77632623987431696b80200286ad2b3'
const MODEL = 'gpt-5.4'

export interface TopicGroup {
  name: string
  tip: string
  questionIndices: number[]
}

export interface AnalysisResult {
  analysis: string
  topics: TopicGroup[]
}

async function callApi(
  body: string,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

export async function analyzeWrongQuestions(
  questions: { index: number; question: string; correctAnswer: string }[],
): Promise<AnalysisResult> {
  const questionList = questions
    .map((q) => `[${q.index}] ${q.question} (答案: ${q.correctAnswer})`)
    .join('\n')

  const body = JSON.stringify({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `你是驾考教练。分析学员错题并按细分知识点归类。

返回纯 JSON（不要 markdown 代码块包裹），格式：
{
  "analysis": "简要分析文本，Markdown格式",
  "topics": [{"name": "知识点名", "tip": "记忆技巧", "questionIndices": [0,1,2]}]
}

analysis 要求（控制在 400 字以内）：
- 第一段：一句话总结主要薄弱方向
- 第二段"易错知识点"：列出 3-5 个最关键的易混淆知识点，每个用一行，写清正确结论（如"醉驾=吊销+5年禁驾，酒驾=暂扣6个月"）
- 第三段"记忆口诀"：给 2-3 个实用口诀帮助记忆
- 不要废话，不要写"建议多练习"之类的套话

topics 要求：
- 按具体知识点分组，越细越好（如"罚款200-2000的情形"而不是"罚款类"）
- 每组 2-8 道题，如果某个知识点只有 1 道题就合并到相近组
- 每道题只归入一个组
- tip 写一句话记忆技巧，要具体实用
- questionIndices 是题目前方括号里的编号`,
      },
      {
        role: 'user',
        content: `我做错了 ${questions.length} 道题：\n\n${questionList}`,
      },
    ],
  })

  // Try up to 2 times with 60s timeout each
  let lastErr: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await callApi(body, 60000)
      if (!res.ok) {
        throw new Error(`API 请求失败: ${res.status}`)
      }
      const data = await res.json()
      const content: string = data.choices?.[0]?.message?.content || ''
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('AI 返回格式异常')
      }
      return JSON.parse(jsonMatch[0]) as AnalysisResult
    } catch (err) {
      lastErr = err
      if (attempt === 0) {
        // brief wait before retry
        await new Promise((r) => setTimeout(r, 1500))
        continue
      }
    }
  }

  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr)
  if (msg.includes('abort') || msg.toLowerCase().includes('load failed')) {
    throw new Error('网络加载失败，请检查网络后重试')
  }
  throw new Error(`分析失败：${msg}`)
}
