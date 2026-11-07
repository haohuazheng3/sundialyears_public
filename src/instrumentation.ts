import type { Instrumentation } from "next";

/** Every server-side render / route / action error lands in the self-hosted error inbox. */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    console.error("[error-inbox] edge error", err);
    return;
  }
  const { captureError } = await import("@/lib/server/errors");
  const e = err as Error & { digest?: string };
  await captureError({
    source: "server",
    name: e?.name ?? "Error",
    message: e?.message ?? String(err),
    stack: e?.stack ?? null,
    route: context.routePath,
    sample: {
      path: request.path,
      method: request.method,
      digest: e?.digest ?? null,
      routeType: context.routeType,
      renderSource: (context as { renderSource?: string }).renderSource ?? null,
    },
  });
};
