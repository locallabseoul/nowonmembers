type ErrorLike = {
  code?: unknown;
  message?: unknown;
  name?: unknown;
  status?: unknown;
};

function nonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function getErrorLogContext(error: unknown, displayError?: string | null) {
  const value = error && typeof error === "object" ? error as ErrorLike : null;
  const message = nonEmptyString(value?.message) ?? nonEmptyString(error) ?? "알 수 없는 오류";
  const code = nonEmptyString(value?.code);
  const name = nonEmptyString(value?.name);
  const status = typeof value?.status === "number" && Number.isFinite(value.status) ? value.status : null;

  return {
    error: message,
    ...(code ? { errorCode: code } : {}),
    ...(status !== null ? { errorStatus: status } : {}),
    ...(name ? { errorName: name } : {}),
    ...(displayError && displayError !== message ? { displayError } : {})
  };
}

export function isFailureEventName(event: string) {
  return event.endsWith("_failed") || event.endsWith(".failed");
}
