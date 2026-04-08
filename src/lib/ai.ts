const API_URL = 'https://www.right.codes/codex/v1/chat/completions'
const API_KEY = 'sk-e77632623987431696b80200286ad2b3'
const MODEL = 'gpt5.4'

export async function streamAnalysis(
  prompt: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        messages: [
          {
            role: 'system',
            content: `你是一位经验丰富的驾考教练和学习顾问。你需要分析学员的错题，找出错误模式，提供针对性的记忆策略。

要求：
1. 分析所有错题，归纳主要错误模式（如"混淆罚款金额区间"、"记反了扣分规则"、"交通标志识别混淆"等）
2. 按错误模式分组，每组给出：
   - 错误模式名称
   - 涉及的题目数量
   - 针对性记忆策略和口诀
   - 关键知识点梳理
3. 识别最薄弱的章节，说明需要重点复习的内容
4. 给出总体学习建议和备考策略
5. 输出格式为 Markdown，使用清晰的标题和列表`,
          },
          { role: 'user', content: prompt },
        ],
      }),
    })

    if (!res.ok) {
      throw new Error(`API 请求失败: ${res.status} ${res.statusText}`)
    }

    const reader = res.body?.getReader()
    if (!reader) throw new Error('无法读取响应流')

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue
        const data = trimmed.slice(6)
        if (data === '[DONE]') continue

        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) onChunk(content)
        } catch {
          // skip malformed JSON
        }
      }
    }

    onDone()
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)))
  }
}
