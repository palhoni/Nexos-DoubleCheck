/**
 * Extração defensiva de JSON possivelmente truncado (timeout, corte por limite de
 * saída, etc.). Não é específico de nenhum provedor — a mesma lógica já existia
 * duplicada em agents.service.ts e test-designer.service.ts; este módulo é a
 * versão única e compartilhada.
 */

function repairEscapedQuotes(value: string): string {
  return value.replace(/(:\s*)\\"/g, '$1"').replace(/\\"(?=\s*[,}\]])/g, '"');
}

export function tryParseJson<T>(value: string): T | undefined {
  const repaired = repairEscapedQuotes(value);
  for (const candidate of [value, repaired]) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // tenta o próximo candidato
    }
  }
  return undefined;
}

/**
 * Extrai o valor de uma chave de nível superior (objeto ou array) percorrendo o
 * texto por profundidade de chaves/colchetes, mesmo que o JSON completo não seja
 * parseável (ex.: cortado no meio de um campo posterior).
 */
export function extractJsonSection<T>(raw: string, key: string): T | undefined {
  const keyIndex = raw.indexOf(`"${key}"`);
  if (keyIndex < 0) return undefined;
  const colonIndex = raw.indexOf(':', keyIndex + key.length + 2);
  if (colonIndex < 0) return undefined;
  const openBracketOffset = raw.slice(colonIndex + 1).search(/[[{]/);
  if (openBracketOffset < 0) return undefined;
  const absoluteStart = colonIndex + 1 + openBracketOffset;

  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let index = absoluteStart; index < raw.length; index += 1) {
    const char = raw[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{' || char === '[') stack.push(char);
    else if (char === '}' || char === ']') {
      stack.pop();
      if (stack.length === 0)
        return tryParseJson<T>(raw.slice(absoluteStart, index + 1));
    }
  }
  return undefined;
}

/**
 * Para um campo de nível superior que é um array de objetos, extrai somente os
 * objetos que já fecharam corretamente — útil quando o array foi cortado no meio
 * de um item (ex.: resposta truncada por limite de tokens).
 */
export function extractCompletedObjects<T>(raw: string, key: string): T[] {
  const keyIndex = raw.indexOf(`"${key}"`);
  if (keyIndex < 0) return [];
  const arrayStart = raw.indexOf('[', keyIndex + key.length + 2);
  if (arrayStart < 0) return [];

  const results: T[] = [];
  const stack: string[] = [];
  let itemStart = -1;
  let inString = false;
  let escaped = false;

  for (let index = arrayStart; index < raw.length; index += 1) {
    const char = raw[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
    } else if (char === '[') {
      stack.push(char);
    } else if (char === '{') {
      if (stack.length === 1) itemStart = index;
      stack.push(char);
    } else if (char === '}') {
      if (stack.length === 2 && itemStart >= 0) {
        const parsed = tryParseJson<T>(raw.slice(itemStart, index + 1));
        if (parsed) results.push(parsed);
        itemStart = -1;
      }
      stack.pop();
    } else if (char === ']') {
      stack.pop();
      if (stack.length === 0) break;
    }
  }
  return results;
}
