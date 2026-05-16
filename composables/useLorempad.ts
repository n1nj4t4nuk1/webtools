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

const CLASSIC_PHRASE = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit'

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min

const randomWord = () => WORDS[Math.floor(Math.random() * WORDS.length)]

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const buildSentenceOfLength = (length: number): string => {
  const len = Math.max(2, length)
  const words = Array.from({ length: len }, randomWord)
  if (len > 10 && Math.random() < 0.55) {
    const insertAt = randomInt(3, len - 4)
    words[insertAt] = words[insertAt] + ','
  }
  return capitalize(words.join(' ')) + '.'
}

const buildSentence = (): string => buildSentenceOfLength(randomInt(8, 18))

const buildParagraph = (sentenceCount?: number): string => {
  const length = sentenceCount ?? randomInt(4, 8)
  return Array.from({ length }, buildSentence).join(' ')
}

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

const CLASSIC_WORDS = CLASSIC_PHRASE.toLowerCase().replace(/[.,]/g, '').split(' ')

const buildClassicSentence = (targetSize: number): string => {
  if (targetSize <= CLASSIC_WORDS.length) {
    return capitalize(CLASSIC_WORDS.slice(0, targetSize).join(' ')) + '.'
  }
  const extra = targetSize - CLASSIC_WORDS.length
  const filler = Array.from({ length: extra }, randomWord)
  return capitalize([...CLASSIC_WORDS, ...filler].join(' ')) + '.'
}

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

export type LorempadMode = 'paragraphs' | 'sentences' | 'words'
export type OutputFormat = 'plain' | 'html'

export const useLorempad = () => {
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
