import Groq from 'groq-sdk'
import OpenAI from 'openai'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const MODELS = {
  OPUS: 'llama-3.3-70b-versatile',
  SONNET: 'llama-3.3-70b-versatile',
  HAIKU: 'llama-3.1-8b-instant',
}

function getOpenAIModel(groqModel: string): string {
  if (groqModel.includes('70b')) return 'gpt-4o-mini'
  if (groqModel.includes('8b')) return 'gpt-4o-mini'
  return 'gpt-4o-mini'
}

export async function generateWithFallback({
  model,
  system,
  prompt,
  maxTokens = 4000,
}: {
  model: string
  system: string
  prompt: string
  maxTokens?: number
}): Promise<string> {
  // 1. Try Groq first
  try {
    const completion = await groq.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    })
    return completion.choices[0].message.content || ''
  } catch (groqError: any) {
    console.warn('Groq failed, falling back to OpenAI:', groqError.message)
  }

  // 2. Fall back to OpenAI
  try {
    const openaiModel = getOpenAIModel(model)
    const completion = await openai.chat.completions.create({
      model: openaiModel,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      max_tokens: maxTokens,
    })
    return completion.choices[0].message.content || ''
  } catch (openaiError: any) {
    throw new Error('AI generation failed: ' + openaiError.message)
  }
}

export async function streamWithFallback({
  model,
  system,
  messages,
  maxTokens = 4000,
  onToken,
  onComplete,
  onFallback,
}: {
  model: string
  system: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  maxTokens?: number
  onToken: (token: string) => void
  onComplete: (fullText: string) => void
  onFallback?: () => void
}): Promise<void> {
  // 1. Try Groq streaming first
  try {
    let fullText = ''
    const stream = await groq.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: system },
        ...messages,
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
      stream: true,
    })

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || ''
      if (token) {
        fullText += token
        onToken(token)
      }
    }
    onComplete(fullText)
    return
  } catch (groqError: any) {
    console.warn('Groq streaming failed, falling back to OpenAI:', groqError.message)
    if (onFallback) onFallback()
  }

  // 2. Fall back to OpenAI streaming
  try {
    let fullText = ''
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        ...messages,
      ],
      max_tokens: maxTokens,
      stream: true,
    })

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || ''
      if (token) {
        fullText += token
        onToken(token)
      }
    }
    onComplete(fullText)
  } catch (openaiError: any) {
    throw new Error('Streaming failed: ' + openaiError.message)
  }
}
