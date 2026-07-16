type LogLevel = "info" | "warning" | "error";

type SafeLogContext = {
  requestId?: string | null;
  route?: string;
  operation?: string;
  schoolId?: string;
  actorId?: string;
  role?: string;
  status?: number | string;
  durationMs?: number;
  readinessStatus?: string;
  errorCategory?: string;
};

export function requestId(request: Request) {
  return request.headers.get("x-vercel-id") ?? request.headers.get("x-request-id") ?? crypto.randomUUID();
}

export function logEvent(level: LogLevel, message: string, context: SafeLogContext = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warning") console.warn(line);
  else console.info(line);
}

export async function withOperationLog<T>(
  context: SafeLogContext,
  operation: () => Promise<T>,
) {
  const startedAt = Date.now();
  logEvent("info", "operation_started", context);
  try {
    const result = await operation();
    logEvent("info", "operation_completed", { ...context, durationMs: Date.now() - startedAt });
    return result;
  } catch (error) {
    logEvent("error", "operation_failed", {
      ...context,
      durationMs: Date.now() - startedAt,
      errorCategory: error instanceof Error ? error.name : "unknown_error",
    });
    throw error;
  }
}
