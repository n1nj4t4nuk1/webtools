/**
 * useLorempad
 *
 * Composable powering the Lorempad tool: generates lorem-ipsum filler
 * text in paragraphs, sentences or plain words, either as raw text or
 * wrapped in `<p>` tags. Optionally seeds the output with the classic
 * "Lorem ipsum dolor sit amet…" opening so designers immediately
 * recognise the placeholder.
 *
 * The word list is a static curated set drawn from the traditional
 * Cicero passage — no library, no network call.
 */

/** Word pool used by the generator. */
const WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
  'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
  'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
  'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
  'velit', 'esse', 'cillum', 'eu', 'fugiat', 'nulla', 'pariatur', 'excepteur',
  'sint', 'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui',
  'officia', 'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum',
  'at', 'vero', 'eos', 'accusamus', 'iusto', 'odio', 'dignissimos', 'ducimus',
  'blanditiis', 'praesentium', 'voluptatum', 'deleniti', 'atque', 'corrupti',
  'quos', 'quas', 'molestias', 'excepturi', 'occaecati', 'provident', 'similique',
  'rem', 'aperiam', 'eaque', 'ipsa', 'illo', 'inventore', 'veritatis',
  'quasi', 'architecto', 'beatae', 'vitae', 'dicta', 'explicabo', 'nemo',
  'voluptas', 'aspernatur', 'aut', 'odit', 'fugit', 'magni', 'dolores',
  'ratione', 'sequi', 'nesciunt', 'neque', 'porro', 'quisquam', 'dolorem',
  'numquam', 'eius', 'modi', 'tempora', 'incidunt', 'quaerat', 'voluptatem',
  'tempore', 'cumque', 'nihil', 'impedit', 'quo', 'minus', 'maxime', 'placeat',
  'facere', 'possimus', 'omnis', 'assumenda', 'repellendus', 'temporibus',
  'autem', 'quibusdam', 'officiis', 'debitis', 'rerum', 'necessitatibus',
  'saepe', 'eveniet', 'voluptates', 'repudiandae', 'recusandae', 'itaque',
  'earum', 'hic', 'tenetur', 'a', 'sapiente', 'delectus', 'reiciendis',
  'maiores', 'alias', 'perferendis', 'doloribus', 'asperiores', 'repellat',
]

/** The canonical opening phrase that triggers reader recognition. */
const CLASSIC_PHRASE = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit'

/** Integer in `[min, max]` (inclusive). Uses `Math.random` (not crypto). */
const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min

/** One word picked uniformly at random from the pool. */
const randomWord = () => WORDS[Math.floor(Math.random() * WORDS.length)]

/** Uppercase the first character of a string. */
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * Build a sentence containing exactly `length` words (clamped to ≥2).
 * Long sentences may receive a single comma at a random interior
 * position, with 55% probability, to break up the rhythm.
 */
const buildSentenceOfLength = (length: number): string => {
  const len = Math.max(2, length)
  const words = Array.from({ length: len }, randomWord)
  if (len > 10 && Math.random() < 0.55) {
    const insertAt = randomInt(3, len - 4)
    words[insertAt] = words[insertAt] + ','
  }
  return capitalize(words.join(' ')) + '.'
}

/** Sentence of natural-looking length (8–18 words). */
const buildSentence = (): string => buildSentenceOfLength(randomInt(8, 18))

/** Paragraph of 4–8 random sentences (or `sentenceCount` if supplied). */
const buildParagraph = (sentenceCount?: number): string => {
  const length = sentenceCount ?? randomInt(4, 8)
  return Array.from({ length }, buildSentence).join(' ')
}

/**
 * Build a paragraph whose total word count is approximately `totalWords`.
 * Greedily emits 8–18-word sentences until the remaining budget is small
 * enough to fit in one final sentence.
 */
const buildParagraphOfWords = (totalWords: number): string => {
  const target = Math.max(3, totalWords)
  const sentences: string[] = []
  let remaining = target
  while (remaining > 0) {
    if (remaining <= 18) {
      sentences.push(buildSentenceOfLength(remaining))
      remaining = 0
      break
    }
    const sentLen = randomInt(8, 18)
    sentences.push(buildSentenceOfLength(sentLen))
    remaining -= sentLen
  }
  return sentences.join(' ')
}

/** Lowercased, comma-stripped words of {@link CLASSIC_PHRASE}. */
const CLASSIC_WORDS = CLASSIC_PHRASE.toLowerCase().replace(/[.,]/g, '').split(' ')

/** Sentence of `targetSize` words that always starts with the classic opener. */
const buildClassicSentence = (targetSize: number): string => {
  if (targetSize <= CLASSIC_WORDS.length) {
    return capitalize(CLASSIC_WORDS.slice(0, targetSize).join(' ')) + '.'
  }
  const extra = targetSize - CLASSIC_WORDS.length
  const filler = Array.from({ length: extra }, randomWord)
  return capitalize([...CLASSIC_WORDS, ...filler].join(' ')) + '.'
}

/** Paragraph that begins with the canonical opener and grows to `targetSize`. */
const buildClassicParagraph = (targetSize: number): string => {
  if (targetSize <= CLASSIC_WORDS.length) {
    return capitalize(CLASSIC_WORDS.slice(0, targetSize).join(' ')) + '.'
  }
  const remaining = targetSize - CLASSIC_WORDS.length
  if (remaining < 3) {
    const extra = Array.from({ length: remaining }, randomWord)
    return capitalize([...CLASSIC_WORDS, ...extra].join(' ')) + '.'
  }
  return `${CLASSIC_PHRASE}. ${buildParagraphOfWords(remaining)}`
}

/** Output granularity chosen by the user. */
export type LorempadMode = 'paragraphs' | 'sentences' | 'words'
/** Wrap each paragraph in `<p>` tags (`html`) or leave it plain. */
export type OutputFormat = 'plain' | 'html'

export const useLorempad = () => {
  /**
   * Produce the requested filler text.
   *
   * @param mode          paragraphs / sentences / words.
   * @param count         number of units to emit (clamped to 1..1000).
   * @param classic       prepend the canonical opener.
   * @param format        wrap in `<p>` tags or emit plain text.
   * @param wordsPerUnit  if ≥3, force every sentence/paragraph to that
   *                      word count; otherwise lengths vary naturally.
   */
  const generate = (
    mode: LorempadMode,
    count: number,
    classic: boolean,
    format: OutputFormat,
    wordsPerUnit: number,
  ): string => {
    const safeCount = Math.max(1, Math.min(Math.floor(count) || 1, 1000))
    const fixedSize =
      Number.isFinite(wordsPerUnit) && wordsPerUnit >= 3 ? Math.floor(wordsPerUnit) : 0

    if (mode === 'words') {
      let words: string[]
      if (classic) {
        const classicWords = CLASSIC_PHRASE.toLowerCase()
          .replace(/[.,]/g, '')
          .split(' ')
        const remaining = Math.max(0, safeCount - classicWords.length)
        words = [...classicWords, ...Array.from({ length: remaining }, randomWord)].slice(
          0,
          safeCount,
        )
      } else {
        words = Array.from({ length: safeCount }, randomWord)
      }
      const text = capitalize(words.join(' '))
      return format === 'html' ? `<p>${text}</p>` : text
    }

    if (mode === 'sentences') {
      const sentences: string[] = []
      if (classic) {
        sentences.push(fixedSize > 0 ? buildClassicSentence(fixedSize) : CLASSIC_PHRASE + '.')
      }
      while (sentences.length < safeCount) {
        sentences.push(fixedSize > 0 ? buildSentenceOfLength(fixedSize) : buildSentence())
      }
      const text = sentences.join(' ')
      return format === 'html' ? `<p>${text}</p>` : text
    }

    const paragraphs: string[] = []
    if (classic) {
      if (fixedSize > 0) {
        paragraphs.push(buildClassicParagraph(fixedSize))
      } else {
        paragraphs.push(
          [CLASSIC_PHRASE + '.', buildSentence(), buildSentence(), buildSentence()].join(' '),
        )
      }
    }
    while (paragraphs.length < safeCount) {
      paragraphs.push(fixedSize > 0 ? buildParagraphOfWords(fixedSize) : buildParagraph())
    }
    if (format === 'html') return paragraphs.map((p) => `<p>${p}</p>`).join('\n')
    return paragraphs.join('\n\n')
  }

  return { generate }
}
