import yaml from 'js-yaml'

export type DetectedFormat = 'json' | 'yaml' | 'empty' | 'unknown'

export interface ConversionError {
  msg: string
  line: number | null
  col: number | null
}

export const useYamlJson = () => {
  const detectFormat = (text: string): DetectedFormat => {
    const trimmed = text.trim()
    if (trimmed.length === 0) return 'empty'
    if (trimmed[0] === '{' || trimmed[0] === '[') {
      try {
        JSON.parse(trimmed)
        return 'json'
      } catch {
        // fall through to try YAML
      }
    }
    try {
      const parsed = yaml.load(trimmed)
      if (parsed === undefined) return 'unknown'
      return 'yaml'
    } catch {
      return 'unknown'
    }
  }

  const yamlToJson = (
    text: string,
    indent: number,
  ): { output: string; error: ConversionError | null } => {
    try {
      const parsed = yaml.load(text)
      return { output: JSON.stringify(parsed, null, indent), error: null }
    } catch (err) {
      if (err instanceof yaml.YAMLException) {
        return {
          output: '',
          error: {
            msg: err.reason || err.message,
            line: err.mark ? err.mark.line + 1 : null,
            col: err.mark ? err.mark.column + 1 : null,
          },
        }
      }
      return { output: '', error: { msg: (err as Error).message, line: null, col: null } }
    }
  }

  const jsonToYaml = (
    text: string,
    indent: number,
  ): { output: string; error: ConversionError | null } => {
    try {
      const parsed = JSON.parse(text)
      const dumped = yaml.dump(parsed, {
        indent: Math.max(1, Math.min(indent, 10)),
        lineWidth: 120,
        noRefs: true,
      })
      return { output: dumped, error: null }
    } catch (err) {
      const msg = (err as Error).message
      const posMatch = msg.match(/position (\d+)/)
      if (posMatch) {
        const pos = Number(posMatch[1])
        let line = 1
        let col = 1
        for (let i = 0; i < pos && i < text.length; i++) {
          if (text[i] === '\n') {
            line++
            col = 1
          } else {
            col++
          }
        }
        return { output: '', error: { msg, line, col } }
      }
      return { output: '', error: { msg, line: null, col: null } }
    }
  }

  return { detectFormat, yamlToJson, jsonToYaml }
}
