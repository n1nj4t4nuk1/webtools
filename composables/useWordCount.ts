export interface WordCountStats {
  words: number
  charsWithSpaces: number
  charsNoSpaces: number
  lines: number
  paragraphs: number
  sentences: number
  readingTimeSeconds: number
}

const CJK_RE = /[　-〿぀-ゟ゠-ヿ一-鿿＀-￯]/g
const WORDS_PER_MINUTE = 200

export const useWordCount = () => {
  const compute = (input: string): WordCountStats => {
    const text = input ?? ''

    const charsWithSpaces = [...text].length
    const charsNoSpaces = [...text.replace(/\s+/g, '')].length

    const cjkChars = (text.match(CJK_RE) || []).length
    const nonCjkText = text.replace(CJK_RE, ' ')
    const latinWords = nonCjkText
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length
    const words = cjkChars + latinWords

    const lines = text.length === 0 ? 0 : text.split(/\r\n|\r|\n/).length

    const paragraphs = text
      .split(/\n\s*\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0).length

    const sentences = text
      .split(/[.!?…。！？]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0).length

    const readingTimeSeconds = Math.round((words / WORDS_PER_MINUTE) * 60)

    return {
      words,
      charsWithSpaces,
      charsNoSpaces,
      lines,
      paragraphs,
      sentences,
      readingTimeSeconds,
    }
  }

  return { compute }
}
