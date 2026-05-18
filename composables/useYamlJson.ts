/**
 * useYamlJson
 *
 * Composable powering the YamlJson tool: bidirectional conversion
 * between YAML and JSON using `js-yaml`. Auto-detects the input format
 * (anything starting with `{`/`[` is tried as JSON first, then YAML)
 * and normalises parse errors to a common `{ msg, line, col }` shape so
 * the UI can render the same error component for both directions.
 */
import yaml from 'js-yaml'

/** Output of {@link useYamlJson.detectFormat}. */
export type DetectedFormat = 'json' | 'yaml' | 'empty' | 'unknown'

/** Normalised parse error returned by both conversion directions. */
export interface ConversionError {
  msg: string
  line: number | null
  col: number | null
}

export const useYamlJson = () => {
  /**
   * Heuristic: try JSON if the input opens with `{` or `[`, otherwise
   * try YAML. YAML is a strict superset of JSON in most respects, so
   * this ordering favours the cheaper / stricter parser when possible.
   */
  const detectFormat = (text: string): DetectedFormat => {
    const trimmed = text.trim()
    if (trimmed.length === 0) return 'empty'
    if (trimmed[0] === '{' || trimmed[0] === '[') {
      try {
        JSON.parse(trimmed)
        return 'json'
      } catch {
        // Fall through to try YAML.
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

  /**
   * Parse YAML and serialise it as JSON with the given indentation.
   * `js-yaml` errors carry a `mark` with `line`/`column` (0-based);
   * we re-emit them 1-based to match the way the UI shows positions.
   */
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

  /**
   * Parse JSON and serialise it as YAML. Indentation is clamped to
   * `1..10` (js-yaml's accepted range). On a JSON parse error we walk
   * the input to translate `position N` into `(line, col)` ourselves —
   * `JSON.parse` doesn't expose that directly across browsers.
   */
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
