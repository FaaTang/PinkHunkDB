export type JsonFormatMode = 'pretty' | 'compact';

export type FormatJsonResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

const findNextNonWhitespace = (value: string, startIndex: number): string => {
  for (let i = startIndex; i < value.length; i++) {
    if (!/\s/.test(value[i])) {
      return value[i];
    }
  }
  return '';
};

const readJsonStringToken = (value: string, startIndex: number): { token: string; nextIndex: number } => {
  let index = startIndex + 1;
  let escaped = false;
  while (index < value.length) {
    const char = value[index];
    if (escaped) {
      escaped = false;
      index++;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      index++;
      continue;
    }
    if (char === '"') {
      return { token: value.slice(startIndex, index + 1), nextIndex: index + 1 };
    }
    index++;
  }
  return { token: value.slice(startIndex), nextIndex: value.length };
};

const readJsonPrimitiveToken = (value: string, startIndex: number): { token: string; nextIndex: number } => {
  let index = startIndex;
  while (index < value.length && !/[\s,\]}]/.test(value[index])) {
    index++;
  }
  return { token: value.slice(startIndex, index), nextIndex: index };
};

const formatJsonStringToken = (token: string): string => {
  try {
    return JSON.stringify(JSON.parse(token));
  } catch {
    return token;
  }
};

const rewriteJsonPreservingNumberLiterals = (value: string, mode: JsonFormatMode): string => {
  const pretty = mode === 'pretty';
  const indentUnit = '  ';
  const indent = (depth: number) => indentUnit.repeat(Math.max(0, depth));
  let result = '';
  let depth = 0;
  let index = 0;
  let lastToken: 'open' | 'value' | 'close' | 'comma' | 'colon' | '' = '';

  while (index < value.length) {
    const char = value[index];
    if (/\s/.test(char)) {
      index++;
      continue;
    }

    if (char === '"') {
      const { token, nextIndex } = readJsonStringToken(value, index);
      result += formatJsonStringToken(token);
      lastToken = 'value';
      index = nextIndex;
      continue;
    }

    if (char === '{' || char === '[') {
      const closeChar = char === '{' ? '}' : ']';
      result += char;
      depth++;
      lastToken = 'open';
      if (pretty && findNextNonWhitespace(value, index + 1) !== closeChar) {
        result += `\n${indent(depth)}`;
      }
      index++;
      continue;
    }

    if (char === '}' || char === ']') {
      depth--;
      if (pretty && lastToken !== 'open') {
        result += `\n${indent(depth)}`;
      }
      result += char;
      lastToken = 'close';
      index++;
      continue;
    }

    if (char === ',') {
      result += pretty ? `,\n${indent(depth)}` : ',';
      lastToken = 'comma';
      index++;
      continue;
    }

    if (char === ':') {
      result += pretty ? ': ' : ':';
      lastToken = 'colon';
      index++;
      continue;
    }

    const { token, nextIndex } = readJsonPrimitiveToken(value, index);
    result += token;
    lastToken = 'value';
    index = nextIndex;
  }

  return result;
};

/**
 * Format JSON text without converting number literals through JS Number,
 * so values beyond Number.MAX_SAFE_INTEGER keep their original digits.
 */
export const tryFormatJsonPreservingNumberLiterals = (
  value: string,
  mode: JsonFormatMode = 'pretty',
): FormatJsonResult => {
  try {
    JSON.parse(value);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  return { ok: true, text: rewriteJsonPreservingNumberLiterals(value, mode) };
};

/** Convenience wrapper that returns null for invalid JSON. */
export const formatJsonPreservingNumberLiterals = (
  value: string,
  mode: JsonFormatMode = 'pretty',
): string | null => {
  const result = tryFormatJsonPreservingNumberLiterals(value, mode);
  return result.ok ? result.text : null;
};
