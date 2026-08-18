-- 최종 admin_send_message 오버로드의 대상 역할 검증에 주민을 추가한다.
-- 수신자 쿼리는 이미 profiles.role과 문자열을 비교하므로 검증 목록만 확장하면 된다.
do $migration$
declare
  function_definition text;
  old_validation text := 'role_filter not in (''all'', ''creator'', ''business'')';
  new_validation text := 'role_filter not in (''all'', ''creator'', ''business'', ''resident'')';
begin
  select pg_get_functiondef(
    'public.admin_send_message(text,text[],text,text,text,text,text,boolean,boolean)'::regprocedure
  ) into function_definition;

  if position(old_validation in function_definition) = 0 then
    raise exception 'admin_send_message 역할 검증 구문을 찾을 수 없습니다.';
  end if;

  execute replace(function_definition, old_validation, new_validation);
end;
$migration$;
