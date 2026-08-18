type TestPhoneBypassEnv = {
  NODE_ENV?: string;
  VERCEL_ENV?: string;
  AUTH_TEST_PHONE_BYPASS_ENABLED?: string;
  AUTH_TEST_PHONE_NUMBERS?: string;
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

/**
 * SMS를 실제로 발송하지 않는 QA 전용 가입 허용 목록이다.
 *
 * Vercel production과 일반 production 런타임에서는 환경변수가 잘못
 * 등록되어 있어도 항상 false를 반환한다. Vercel Preview는 빌드 시
 * NODE_ENV가 production이므로 VERCEL_ENV를 우선해서 구분한다.
 */
export function isTestPhoneBypassAllowed(
  phone: string,
  env: TestPhoneBypassEnv = process.env
) {
  if (env.VERCEL_ENV === "production") return false;
  if (!env.VERCEL_ENV && env.NODE_ENV === "production") return false;
  if (env.AUTH_TEST_PHONE_BYPASS_ENABLED !== "true") return false;

  const normalizedPhone = digitsOnly(phone);
  if (normalizedPhone.length < 10 || normalizedPhone.length > 11) return false;

  const allowedPhones = (env.AUTH_TEST_PHONE_NUMBERS ?? "")
    .split(",")
    .map(digitsOnly)
    .filter(Boolean);

  return allowedPhones.includes(normalizedPhone);
}
