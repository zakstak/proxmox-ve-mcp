import { fetch, Agent, type RequestInit, type Response } from 'undici';

export function createFetch(verifySsl: boolean) {
  const agent = new Agent({
    connect: {
      rejectUnauthorized: verifySsl,
    },
    keepAliveTimeout: 10000,
    pipelining: 0,
  });

  return (url: string | URL, init?: RequestInit): Promise<Response> => {
    return fetch(url, {
      ...init,
      dispatcher: agent,
    });
  };
}
