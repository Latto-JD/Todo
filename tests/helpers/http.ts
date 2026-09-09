import { testApiHandler } from "next-test-api-route-handler";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AppHandler = NonNullable<Parameters<typeof testApiHandler>[0]["appHandler"]>;

export interface Result {
  status: number;
  body: any;
  headers: Headers;
}

async function readBody(res: Response): Promise<any> {
  if (res.status === 204) return undefined;
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function run(
  appHandler: AppHandler,
  opts: { method: string; body?: unknown; params?: Record<string, string>; url?: string },
): Promise<Result> {
  let result: Result | undefined;
  await testApiHandler({
    appHandler,
    params: opts.params,
    url: opts.url,
    async test({ fetch }) {
      const init: RequestInit = { method: opts.method };
      if (opts.body !== undefined) {
        init.headers = { "content-type": "application/json" };
        init.body = JSON.stringify(opts.body);
      }
      const res = await fetch(init);
      result = { status: res.status, body: await readBody(res), headers: res.headers };
    },
  });
  return result!;
}

export const listReq = (h: AppHandler, url?: string) => run(h, { method: "GET", url });
export const createReq = (h: AppHandler, body: unknown) => run(h, { method: "POST", body });
export const getReq = (h: AppHandler, id: string) => run(h, { method: "GET", params: { id } });
export const patchReq = (h: AppHandler, id: string, body: unknown) =>
  run(h, { method: "PATCH", params: { id }, body });
export const deleteReq = (h: AppHandler, id: string) => run(h, { method: "DELETE", params: { id } });
