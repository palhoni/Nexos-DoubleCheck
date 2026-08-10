import { test, type APIRequestContext, type APIResponse } from '@playwright/test';

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'fetch']);
const MAX_BODY_CHARS = 5000;

function truncate(text: string): string {
  return text.length > MAX_BODY_CHARS
    ? `${text.slice(0, MAX_BODY_CHARS)}\n... (truncado, ${text.length} caracteres no total)`
    : text;
}

function redactHeaders(headers: Record<string, string> | undefined): Record<string, string> {
  if (!headers) return {};
  const clone = { ...headers };
  for (const key of Object.keys(clone)) {
    if (key.toLowerCase() === 'authorization') {
      clone[key] = clone[key].replace(/^(Bearer\s+).+/i, '$1<redacted>');
    }
  }
  return clone;
}

function summarizeMultipart(multipart: unknown): string {
  if (multipart instanceof FormData) {
    const fields: string[] = [];
    multipart.forEach((value, key) => {
      if (value instanceof File) {
        fields.push(`  ${key}: <file "${value.name}", ${value.size} bytes, ${value.type || 'sem content-type'}>`);
      } else {
        fields.push(`  ${key}: ${value}`);
      }
    });
    return fields.join('\n');
  }
  return truncate(JSON.stringify(multipart));
}

function summarizeRequestBody(data: unknown): string {
  if (data === undefined) return '';
  if (Buffer.isBuffer(data)) return `[Buffer, ${data.length} bytes]`;
  if (typeof data === 'string') return truncate(data);
  return truncate(JSON.stringify(data, null, 2));
}

function summarizeRequestOptions(options: Record<string, unknown> | undefined): string {
  if (!options) return '(sem opções)';

  const lines: string[] = [];
  const headers = options.headers as Record<string, string> | undefined;
  if (headers) lines.push(`Headers: ${JSON.stringify(redactHeaders(headers))}`);

  const params = options.params as Record<string, unknown> | undefined;
  if (params) lines.push(`Query params: ${JSON.stringify(params)}`);

  if (options.data !== undefined) {
    lines.push(`Body:\n${summarizeRequestBody(options.data)}`);
  }
  if (options.multipart !== undefined) {
    lines.push(`Multipart:\n${summarizeMultipart(options.multipart)}`);
  }

  return lines.length ? lines.join('\n') : '(sem corpo)';
}

async function summarizeResponseBody(response: APIResponse): Promise<string> {
  const contentType = response.headers()['content-type'] ?? '';
  let buffer: Buffer;
  try {
    buffer = await response.body();
  } catch {
    return '[corpo indisponível]';
  }

  const isTextLike =
    contentType.includes('json') ||
    contentType.includes('text/') ||
    contentType.includes('xml') ||
    contentType === '';

  if (isTextLike) {
    return truncate(buffer.toString('utf-8'));
  }
  return `[binário: ${buffer.length} bytes, content-type: ${contentType || 'desconhecido'}]`;
}

/**
 * Wraps an APIRequestContext so every HTTP call it makes attaches a
 * request/response summary to the currently running test via testInfo.attach()
 * — picked up automatically by both the Playwright HTML report and Allure.
 * Non-HTTP methods (e.g. dispose, storageState) pass through unchanged.
 */
export function instrumentApiContext(context: APIRequestContext): APIRequestContext {
  return new Proxy(context, {
    get(target, prop, _receiver) {
      const value = (target as unknown as Record<string, unknown>)[prop as string];
      if (typeof value !== 'function') return value;
      if (typeof prop !== 'string' || !HTTP_METHODS.has(prop)) {
        return value.bind(target);
      }

      return async (urlOrRequest: unknown, options?: Record<string, unknown>) => {
        const method = prop.toUpperCase();
        const url = typeof urlOrRequest === 'string' ? urlOrRequest : String(urlOrRequest);
        const response = (await (value as (...args: unknown[]) => Promise<APIResponse>).apply(target, [
          urlOrRequest,
          options,
        ])) as APIResponse;

        try {
          const responseBody = await summarizeResponseBody(response);
          const attachment = [
            `${method} ${url}`,
            '',
            '--- REQUEST ---',
            summarizeRequestOptions(options),
            '',
            '--- RESPONSE ---',
            `Status: ${response.status()}`,
            `Headers: ${JSON.stringify(response.headers())}`,
            `Body:\n${responseBody}`,
          ].join('\n');

          await test.info().attach(`${method} ${url}`, {
            body: attachment,
            contentType: 'text/plain',
          });
        } catch {
          // Never let attachment logging break the actual test.
        }

        return response;
      };
    },
  });
}
