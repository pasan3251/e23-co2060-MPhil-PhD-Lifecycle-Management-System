import { sanitizeForLog } from "@/lib/validation/schemas";

type MonitoringContext = {
  route?: string;
  method?: string;
  userId?: string | null;
  role?: string | null;
  status?: number;
  metadata?: Record<string, unknown>;
};

type OptionalSentryModule = {
  captureException: (
    error: unknown,
    scopeCallback?: (scope: {
      setTag: (key: string, value: string) => void;
      setUser: (user: Record<string, unknown> | null) => void;
      setContext: (name: string, context: Record<string, unknown>) => void;
      setLevel: (level: string) => void;
    }) => void,
  ) => void;
};

let sentryModulePromise: Promise<OptionalSentryModule | null> | null = null;

async function getOptionalSentryModule() {
  if (!sentryModulePromise) {
    sentryModulePromise = import("@sentry/nextjs")
      .then((module) => module as OptionalSentryModule)
      .catch(() => null);
  }

  return sentryModulePromise;
}

export async function captureServerException(
  error: unknown,
  context: MonitoringContext = {},
) {
  const sentry = await getOptionalSentryModule();

  if (!sentry) {
    return false;
  }

  sentry.captureException(error, (scope) => {
    scope.setLevel("error");

    if (context.route) {
      scope.setTag("route", context.route);
    }

    if (context.method) {
      scope.setTag("method", context.method);
    }

    if (context.status) {
      scope.setTag("status", String(context.status));
    }

    if (context.role) {
      scope.setTag("role", context.role);
    }

    if (context.userId) {
      scope.setUser({ id: context.userId });
    } else {
      scope.setUser(null);
    }

    scope.setContext("request", sanitizeForLog(context.metadata ?? {}) as Record<
      string,
      unknown
    >);
  });

  return true;
}

