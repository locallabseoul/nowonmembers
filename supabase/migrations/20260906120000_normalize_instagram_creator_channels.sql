-- 초기 URL 검증은 http(s) 스킴만 확인해 http://아이디 형태도 통과시켰다.
-- 도메인 없이 저장된 인스타그램 채널을 정식 프로필 URL로 보정한다.
update public.creator_channels
set channel_url = 'https://www.instagram.com/'
  || trim(both '/' from regexp_replace(channel_url, '^(https?://)?@?', '', 'i'))
  || '/'
where platform = '인스타그램'
  and channel_url !~* '(^|\.)instagram\.com/'
  and trim(both '/' from regexp_replace(channel_url, '^(https?://)?@?', '', 'i'))
    ~ '^[A-Za-z0-9._]{1,30}$';
