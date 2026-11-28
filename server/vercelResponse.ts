import type { Response } from 'express';

/** Add the small Express response surface used by shared handlers to a native Vercel response. */
export function adaptExpressResponse(res: Response): Response {
  const native = res as unknown as {
    statusCode: number;
    headersSent: boolean;
    setHeader(name: string, value: string): unknown;
    end(body?: string): unknown;
    status?: (code: number) => unknown;
    json?: (body: unknown) => unknown;
  };

  if (typeof native.status !== 'function') {
    native.status = (code: number) => {
      native.statusCode = code;
      return res;
    };
  }
  if (typeof native.json !== 'function') {
    native.json = (body: unknown) => {
      if (!native.headersSent) native.setHeader('Content-Type', 'application/json; charset=utf-8');
      native.end(JSON.stringify(body));
      return res;
    };
  }
  return res;
}

export default { adaptExpressResponse };
