import { z } from 'zod';

interface AxiosErrorLike {
  response?: {
    status: number;
    statusText: string;
    data?: unknown;
  };
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return `Validation Error: ${JSON.stringify(error.format())}`;
  }

  if (error instanceof Error) {
    const axiosError = error as unknown as AxiosErrorLike;
    if (axiosError.response) {
      const status = axiosError.response.status;
      const statusText = axiosError.response.statusText;
      const data = axiosError.response.data;

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

export function withErrorHandling<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (args: T, ...rest: any[]) => Promise<any>
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (args: T, ...rest: any[]) => {
    try {
      return await handler(args, ...rest);
    } catch (error) {
      return createErrorResponse(error);
    }
  };
}
