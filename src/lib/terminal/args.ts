/**
 * Command-line parsing: quoting, pipelines, redirection and flags.
 *
 * The shell is honest about what it supports — if a construct is not
 * implemented (`&&`, `$(...)`, globs in the middle of a word) it is left
 * as a literal argument, exactly like a shell without that feature.
 */

export type Segment = {
  argv: string[];
  /** Parallel to `argv`: true when that word was quoted or escaped. */
  quoted: boolean[];
  /** `>` or `>>` target, empty for none. */
  stdout: { path: string; append: boolean } | null;
  /** `<` source, empty for none. */
  stdin: string | null;
};

export type Token = {
  text: string;
  /** the word contained quotes or escapes anywhere */
  quoted: boolean;
  /** the word *began* with a quote or escape, so a leading operator is literal */
  leading: boolean;
};

export type ParsedLine = {
  segments: Segment[];
  /** Trailing `&` — accepted, ignored (the job finishes immediately). */
  background: boolean;
};

export class ParseError extends Error {}

/**
 * Split a command line into tokens, honouring quotes and backslashes.
 * Each token remembers whether it carried quotes: an operator inside quotes is
 * a literal character, and a quoted pattern is never glob-expanded.
 */
export function tokenizeTokens(line: string): Token[] {
  const tokens: Token[] = [];
  let current = '';
  let started = false;
  let sawQuote = false;
  let leadingQuote = false;
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quote) {
      if (char === quote) {
        quote = null;
        continue;
      }
      if (char === '\\' && quote === '"' && i + 1 < line.length) {
        current += line[++i];
        continue;
      }
      current += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      if (!started) leadingQuote = true;
      started = true;
      sawQuote = true;
      continue;
    }
    if (char === '\\' && i + 1 < line.length) {
      current += line[++i];
      if (!started) leadingQuote = true;
      started = true;
      sawQuote = true;
      continue;
    }
    if (/\s/.test(char)) {
      if (started) {
        tokens.push({ text: current, quoted: sawQuote, leading: leadingQuote });
        current = '';
        started = false;
        sawQuote = false;
        leadingQuote = false;
      }
      continue;
    }
    current += char;
    started = true;
  }

  if (quote) throw new ParseError(`unexpected EOF while looking for matching ${quote}`);
  if (started) tokens.push({ text: current, quoted: sawQuote, leading: leadingQuote });
  return tokens;
}

/** Token texts only — the historical shape of `tokenize`. */
export function tokenize(line: string): string[] {
  return tokenizeTokens(line).map((token) => token.text);
}

export function parseLine(line: string): ParsedLine {
  const trimmed = line.trim();
  const background = /&\s*$/.test(trimmed) && !/[|>]\s*&/.test(trimmed);
  const body = background ? trimmed.replace(/&\s*$/, '') : trimmed;

  const segments: Segment[] = [];
  const fresh = (): Segment => ({ argv: [], quoted: [], stdout: null, stdin: null });
  let current = fresh();
  const tokens = tokenizeTokens(body);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    // a `|`, `>` or `>>` that *starts* quoted is an argument, but a quoted
    // destination after an unquoted operator (`>"out file"`) is still a redirect
    const operator = token.leading ? null : token.text;
    if (operator === '|') {
      if (current.argv.length === 0) throw new ParseError('syntax error near unexpected token `|\'');
      segments.push(current);
      current = fresh();
      continue;
    }
    if (operator === '>' || operator === '>>' || operator === '<') {
      const target = tokens[++i];
      if (!target) throw new ParseError(`syntax error near unexpected token \`${operator}'`);
      if (operator === '<') current.stdin = target.text;
      else current.stdout = { path: target.text, append: operator === '>>' };
      continue;
    }
    // `>file` / `2>file` written without spaces
    const redirect = operator ? /^(\d?)(>>?)(.+)$/.exec(operator) : null;
    if (redirect && redirect[1] !== '2' && redirect[3]) {
      current.stdout = { path: redirect[3], append: redirect[2] === '>>' };
      continue;
    }
    current.argv.push(token.text);
    current.quoted.push(token.quoted);
  }

  if (current.argv.length === 0) throw new ParseError('syntax error near unexpected token `newline\'');
  segments.push(current);
  return { segments, background };
}

export type FlagSpec = Record<string, 'bool' | 'value'>;

export type ParsedFlags = {
  flags: Set<string>;
  values: Record<string, string>;
  operands: string[];
};

export class FlagError extends Error {}

const VALUE_DEFAULTS: Record<string, string> = {};

/**
 * Parse flags for one command. Supports `-l`, `-la`, `--long`,
 * `--name=value`, `--name value`, `--` as end-of-flags and clustered
 * short values (`-n5`).
 */
export function parseFlags(argv: string[], spec: FlagSpec, valueDefaults: Record<string, string> = VALUE_DEFAULTS): ParsedFlags {
  const flags = new Set<string>();
  const values: Record<string, string> = { ...valueDefaults };
  const operands: string[] = [];
  let endOfFlags = false;

  const resolve = (name: string): string | null => {
    if (name in spec) return name;
    const candidates = Object.keys(spec).filter((key) => key.startsWith(name) && !key.includes('='));
    if (candidates.length === 1) return candidates[0];
    return null;
  };

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (endOfFlags || token === '-' || !token.startsWith('-')) {
      operands.push(token);
      continue;
    }
    if (token === '--') {
      endOfFlags = true;
      continue;
    }
    if (token.startsWith('--')) {
      const [rawName, inlineValue] = token.slice(2).split('=');
      const name = resolve(rawName);
      if (!name) throw new FlagError(`unrecognized option '--${rawName}'`);
      if (spec[name] === 'value') {
        const value = inlineValue ?? argv[++i];
        if (value === undefined) throw new FlagError(`option '--${name}' requires an argument`);
        values[name] = value;
      } else {
        flags.add(name);
      }
      continue;
    }
    // clustered short flags: -la, -n5
    for (let j = 1; j < token.length; j++) {
      const short = token[j];
      const name = resolve(short);
      if (!name) throw new FlagError(`invalid option -- '${short}'`);
      if (spec[name] === 'value') {
        const rest = token.slice(j + 1);
        const value = rest || argv[++i];
        if (value === undefined) throw new FlagError(`option requires an argument -- '${short}'`);
        values[name] = value;
        j = token.length;
      } else {
        flags.add(name);
      }
    }
  }

  return { flags, values, operands };
}

/** Minimum-width integer, used by ls -l / wc style output. */
export function pad(value: string | number, width: number, align: 'left' | 'right' = 'right'): string {
  const text = String(value);
  return align === 'right' ? text.padStart(width) : text.padEnd(width);
}
