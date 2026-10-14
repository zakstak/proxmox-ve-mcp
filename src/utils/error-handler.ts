import { z } from "zod";

const httpErrorSchema = z.object({
  response: z.object({ status: z.number().int().min(400).max(599) }),
});

type ToolError =
  | { code: "api_error"; message: string; status: number }
  | {
      code: "validation_error";
      message: string;
      issues: { path: string; code: string }[];
    }
  | { code: "network_error" | "unexpected_error"; message: string };

function parseToolError(error: unknown): ToolError {
  if (error instanceof z.ZodError) {
    return {
      code: "validation_error",
      message: "Validation Error: invalid resource or request",
      issues: error.issues.map((issue) => ({
        path: issue.path.map(String).join("."),
        code: issue.code,
      })),
    };
  }

  const httpError = httpErrorSchema.safeParse(error);
  if (httpError.success) {
    const status = httpError.data.response.status;
    return {
      code: "api_error",
      message: `Proxmox API Error ${status}`,
      status,
    };
  }

  if (error instanceof Error) {
    // proxmox-api 1.1.1 throws plain Errors, not Axios response objects. Only
    // parse its transport prefix; never return URLs, status text or API bodies.
    const statusMatch =
      /^(?:GET|POST|PUT|DELETE) https?:\/\/\S+ (?:return Error|connection failed with) ([45][0-9]{2})\b/.exec(
        error.message,
      );
    if (statusMatch) {
      const status = Number(statusMatch[1]);
      return {
        code: "api_error",
        message: `Proxmox API Error ${status}`,
        status,
      };
    }
    if (
      /^(?:FaILED to call|Failed to fetch) (?:GET|POST|PUT|DELETE) https?:\/\//.test(
        error.message,
      )
    ) {
      return {
        code: "network_error",
        message: "Proxmox API connection failed",
      };
    }
    if (
      /^(?:GET|POST|PUT|DELETE) https?:\/\/\S+ unexpected contentType/.test(
        error.message,
      )
    ) {
      return {
        code: "unexpected_error",
        message: "Unexpected Proxmox API response",
      };
    }
  }

  return { code: "unexpected_error", message: "Unexpected tool error" };
}

export function getErrorMessage(error: unknown): string {
  return parseToolError(error).message;
}

export function createErrorResponse(error: unknown) {
  const toolError = parseToolError(error);
  return {
    content: [{ type: "text" as const, text: `Error: ${toolError.message}` }],
    structuredContent: { error: toolError },
    isError: true,
  };
}
