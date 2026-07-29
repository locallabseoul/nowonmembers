// 폼 액션이 돌려주는 검증 결과. 성공하면 액션이 redirect 하므로, 이 값이 돌아왔다는
// 것 자체가 입력을 고쳐야 한다는 뜻이다.
export type FormState = {
  fieldErrors?: Record<string, string>;
  // 특정 입력창에 붙일 수 없는 에러 (포인트 부족 등)
  formError?: string;
  // 화면 이동 없이 끝나는 동작의 성공 안내 (인증번호 재발송 등)
  successMessage?: string;
  // React 19는 form action이 끝나면 비제어 입력을 비운다. 다시 채워 넣을 값을
  // 여기에 담아 돌려준다. 비밀번호처럼 민감한 값은 절대 넣지 않는다.
  values?: Record<string, string>;
};

export const emptyFormState: FormState = {};

export function fieldError(name: string, message: string): FormState {
  return { fieldErrors: { [name]: message } };
}

export function formError(message: string): FormState {
  return { formError: message };
}

// 검증을 한 번에 모아 돌려줄 때 쓴다. 하나씩 return 하면 사용자가 고칠 때마다 다음
// 에러를 새로 만나게 된다. 값이 없는 항목은 걸러지고, 전부 통과하면 빈 객체가 나온다.
export function collectFieldErrors(entries: Record<string, string | null | undefined>): FormState {
  const collected: Record<string, string> = {};

  for (const [name, message] of Object.entries(entries)) {
    if (message) collected[name] = message;
  }

  return Object.keys(collected).length ? { fieldErrors: collected } : {};
}

export function hasErrors(state: FormState | undefined) {
  return Boolean(state?.formError || (state?.fieldErrors && Object.keys(state.fieldErrors).length));
}

// 되돌려줄 입력값을 모은다. 비밀번호처럼 민감한 항목은 호출부에서 애초에 넘기지 않는다.
export function keepValues(formData: FormData, names: string[]): Record<string, string> {
  const values: Record<string, string> = {};

  for (const name of names) {
    const value = String(formData.get(name) ?? "");
    if (value) values[name] = value;
  }

  return values;
}
