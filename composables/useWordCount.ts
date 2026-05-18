/**
 * useWordCount
 *
 * Composable powering the Wordy tool: counts words, characters, lines,
 * paragraphs and sentences in a text. CJK (Chinese / Japanese / Korean)
 * characters are counted as individual words because they don't use
 * spaces as word separators — without this fix, an entire Japanese
 * essay would be reported as "1 word".
 *
 * Reading time uses 200 words/min, the commonly cited average adult
 * silent reading speed.
 */

/** Aggregated counters returned by {@link useWordCount.compute}. */
export interface WordCountStats {
  words: number
  charsWithSpaces: number
  charsNoSpaces: number
  lines: number
  paragraphs: number
  sentences: number
  readingTimeSeconds: number
}

/**
 * Character class matching CJK ideographs and full-width punctuation,
 * used to count CJK characters as separate words and to strip them
 * before doing Latin word splitting.
 */
const CJK_RE = /[　-〿぀-ゟ゠-ヿ一-鿿＀-￯]/g
/** Average silent reading speed; used to convert word count to seconds. */
const WORDS_PER_MINUTE = 200

export const useWordCount = () => {
  /**
   * Compute every counter in one pass over `input`. Uses `[...text]`
   * for character counts so multi-code-unit characters (emojis,
   * surrogate pairs) are counted as one, not two. Paragraphs are
   * separated by blank lines; sentences by `.!?…。！？`.
   */
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
