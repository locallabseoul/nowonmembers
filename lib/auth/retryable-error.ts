type AuthErrorLike = {
  name?: unknown;
  status?: unknown;
};

// Supabase가 응답 성공 여부를 확정하지 못한 경우에만 가입 요청을 한 번 더
// 확인한다. 일반적인 4xx 오류는 입력/중복 문제이므로 재시도하지 않는다.
export function isRetryableAuthError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const value = error as AuthErrorLike;
  if (value.name === "AuthRetryableFetchError") return true;

  return value.status === 502 || value.status === 503 || value.status === 504;
}
