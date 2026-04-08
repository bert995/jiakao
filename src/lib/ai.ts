const API_URL = 'https://www.right.codes/codex/v1/chat/completions'
const API_KEY = 'sk-e77632623987431696b80200286ad2b3'
const MODEL = 'gpt-5.4'

export interface TopicGroup {
  name: string
  tip: string
  questionIndices: number[] // indices into the wrong question array
}

export interface AnalysisResult {
  topics: TopicGroup[]
}

export async function analyzeWrongQuestions(
  questions: { index: number; question: string; correctAnswer: string }[],
): Promise<AnalysisResult> {
  const questionList = questions
    .map((q) => `[${q.index}] ${q.question} (答案: ${q.correctAnswer})`)
    .join('\n')

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `你是驾考教练。把学员的错题按知识点归类为若干专题，每个专题是一组相似/相关的题目。

严格要求：
1. 按知识点相似性把题目分成 3-8 个专题组（如"罚款金额"、"记分规则"、"灯光使用"、"标志标线"等）
2. 每个专题给一个简短的名称和一句话记忆技巧
3. 每道题必须且只能归入一个专题
4. 返回纯 JSON，不要任何其他文字，格式如下：
{"topics":[{"name":"专题名","tip":"一句话记忆技巧","questionIndices":[0,3,7]}]}
其中 questionIndices 是题目前面方括号里的编号`,
        },
        {
          role: 'user',
          content: `以下是我做错的 ${questions.length} 道题，请归类：\n\n${questionList}`,
        },
      ],
    }),
  })

  if (!res.ok) {
    throw new Error(`API 请求失败: ${res.status}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content || ''

  // Extract JSON from response (might be wrapped in markdown code block)
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('AI 返回格式异常')
  }

  return JSON.parse(jsonMatch[0]) as AnalysisResult
}
