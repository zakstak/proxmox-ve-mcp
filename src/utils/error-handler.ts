import { z } from 'zod';

export function getErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return `Validation Error: ${JSON.stringify(error.format())}`;
  }

  if (error instanceof Error) {
    const anyError = error as any;
    if (anyError.response) {
      const status = anyError.response.status;
      const statusText = anyError.response.statusText;
      const data = anyError.response.data;

      let details = '';
      if (data) {
        if (typeof data === 'string') {
          details = data;
        } else if (typeof data === 'object') {
           details = JSON.stringify(data);
        }
      }

      return `Proxmox API Error ${status} ${statusText}: ${details}`;
    }

    return error.message;
  }

  return String(error);
}

export function createErrorResponse(error: unknown) {
  return {
    content: [{ type: 'text' as const, text: `Error: ${getErrorMessage(error)}` }],
    isError: true,
  };
}

export function withErrorHandling<T, R>(fn: (args: T) => Promise<R>) {
  return async (args: T) => {
    try {
      return await fn(args);
    } catch (error) {
      return createErrorResponse(error);
    }
  };
}
