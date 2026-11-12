# 주민 앱 전용 로컬 DB

기존 웹 로컬 DB(54321/54322), 연결된 원격 프로젝트와 독립적인 개발 환경입니다.
프로젝트 이름은 `nowonmembers-app-dev`, API 포트는 55321, DB 포트는 55322입니다.
회원·가게는 모두 `seed.sql`의 가상 데이터입니다. 운영 데이터를 복사하지 않습니다.

## 시작

웹 저장소 루트에서 실행합니다.

```sh
python3 scripts/local-app/prepare.py
supabase start --workdir tmp/resident-app-local -x realtime,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
python3 scripts/local-app/export_config.py
```

Docker가 실행 중이어야 합니다. 첫 실행은 이미지 다운로드가 필요합니다.
`prepare.py`는 설정·가상 데이터와 마이그레이션/테스트 연결만 준비합니다.
기존 `supabase/.temp` 또는 원격 프로젝트 연결 정보는 복사하지 않습니다.
이미 시작한 DB에는 새 마이그레이션이 자동 적용되지 않으므로, 해당 로컬 환경에만
`supabase migration up --local --workdir tmp/resident-app-local`을 사용합니다.
원격 `db push`, 기존 DB reset은 이 작업에 필요하지 않습니다.

## 검증

```sh
supabase test db supabase/tests/resident_business_filters.sql supabase/tests/resident_saved_places.sql supabase/tests/resident_app_coupons.sql supabase/tests/resident_app_businesses.sql supabase/tests/resident_members.sql supabase/tests/coupons.sql --workdir tmp/resident-app-local
```

앱 저장소에서는 다음을 실행합니다.

```sh
flutter test test/local_backend_test.dart --dart-define-from-file=config/test.local.json --dart-define=RUN_LOCAL_INTEGRATION=true
```

## 가상 로그인 계정

| 용도 | 전화번호 | 로컬 전용 비밀번호 |
|---|---|---|
| 활성 주민 | 01000000001 | LocalResident2026! |
| 정지 주민 | 01000000002 | LocalResident2026! |
| 공개 가게 운영자 | 01000000003 | LocalBusiness2026! |
| 비공개 가게 운영자 | 01000000004 | LocalBusiness2026! |

CLI 2.75는 SMS 제공자가 없으면 전화 로그인도 비활성화합니다. 이를 위해 실제로 사용할 수 없는 로컬 전용 Twilio 자리표시자와 테스트 OTP를 설정했습니다. 전체 신규 가입은 꺼두었으며, 이번 구현은 비밀번호 로그인만 사용하고 SMS를 발송하지 않습니다. 실제 문자 인증은 별도 작업입니다.
정지 상태는 로그인 성공 후 앱의 프로필 판정에서 제한됩니다.

`export_config.py`는 CLI 상태를 메모리에서 읽고 공개 anon 키와 로컬 주소 두 항목만
앱의 Git-ignored 설정에 저장합니다. 서비스 역할 키·DB 비밀번호는 앱에 전달하지 않습니다.

## 중지

```sh
supabase stop --workdir tmp/resident-app-local
```

앱용 컨테이너만 중지하고 로컬 데이터를 보존합니다. `--no-backup`은 사용하지 않습니다.

## 쿠폰 연결 검증

```sh
python3 scripts/local-app/test_coupons.py
```

새 UUID의 가상 쿠폰을 생성해 Flutter 전체 테스트와 실제 로그인·발급·취소·잠금·사용을 검증하고, 해당 테스트 쿠폰만 삭제합니다. Docker 컨테이너 이름은 앱 전용 환경으로 고정돼 있습니다.

수동 확인용 쿠폰: `커피 1,000원 할인 (테스트)`, 테스트 사용 코드 `654321`. 실제 혜택이나 영업점 코드는 아닙니다. 기존 로컬 DB에 추가하려면 다음 명령으로 가상 seed만 보충합니다.

```sh
docker exec -i supabase_db_nowonmembers-app-dev psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q < scripts/local-app/seed.sql
```

`20261112100000_secure_resident_coupon_reads.sql`은 일반 사용자의 쿠폰 원본 행 접근을 제한합니다. 공개 조회는 기존 `get_public_coupons`, 보유 내역은 새 `get_my_coupon_claims` RPC를 사용합니다. 가게 운영자·관리자 원본 조회 권한은 유지합니다. 웹 `lib/coupons.ts`, `app/sitemap.ts`, 내 쿠폰 상태 표시 변경과 함께 검증해 배포해야 합니다. 현재는 앱용 로컬 DB에만 적용했습니다.

약관은 웹 `lib/legal.ts`의 원문·버전을 앱 `assets/legal/terms.json`에 포함했습니다. 개정 시 두 내용을 함께 갱신해야 하며 서버는 현재 버전과 다른 동의를 거절합니다. 앱이 자동으로 동의하지 않고 체크박스와 확인 버튼을 통해 기록합니다.

검증: SQL 71개, 앱 17개(실제 로컬 통합 테스트 포함), 웹 50개 통과. 웹 타입 검사 및 변경 파일 ESLint 통과. 저장소 전체 ESLint는 기존 임시 파일 `tmp/toss-deck/find-account.cjs`의 require 규칙 오류 2건으로 실패하며 이번 수정과 관련 없는 파일은 변경하지 않았습니다.

## 관심 동네·단골 저장

앱 `오늘`의 가게 목록·상세에서 하트를 눌러 단골을 저장/해제합니다. `마이 → 관심 동네·단골`에서 관심 동네를 복수 선택하고 저장한 가게를 확인합니다. 전체 동네 해제도 가능합니다.

관심 동네는 기존 웹의 5개 동네(공릉·월계·하계·중계·상계동)와 동일합니다. 이번 단계는 저장·복원까지이며 관심 동네에 따른 홈 추천·지도 필터는 후속 작업입니다.

마이그레이션: `20261112110000_add_resident_saved_places.sql`. 본인 전용 `resident_interested_districts`, `resident_favorite_businesses` 테이블과 검증 RPC 3개를 추가했습니다. 직접 쓰기는 허용하지 않으며 본인·활성 회원·공개 가게 조건을 서버에서 확인합니다. 비공개 또는 정지 운영자 가게는 저장 내역에 비공개 표시만 반환하고 이름·동네를 숨깁니다. 가게 삭제 시 해당 단골 연결도 삭제됩니다.

통합 검증은 웹 저장소에서 실행합니다.

```sh
python3 scripts/local-app/test_app.py
```

새 가상 회원과 쿠폰을 만들고 앱 전체 테스트를 실행한 후 해당 UUID의 데이터만 정리합니다. 기존 `test_coupons.py` 명령도 같은 전체 검증을 실행합니다. 앱 테스트 26개, SQL 테스트 104개 통과. 새로운 인증 클라이언트에서도 저장 내용이 유지되는 것을 확인했습니다.

## 동네 필터와 지도

`20261112120000_filter_resident_app_businesses.sql`의 새 공개 RPC `search_resident_app_businesses`는 동네 필터를 페이지 조회 전에 적용합니다. null 필터는 전체, 빈 배열은 결과 없음이며 기존 상세 RPC는 그대로 유지됩니다. 비공개·정지 운영자 가게는 제외합니다.

앱 테스트 32개, SQL 테스트 115개 통과. 동네지도는 현재 조회한 페이지들의 좌표만 표시합니다. 네이버 앱용 키는 별도 `config/naver.local.json`으로 전달하며 로컬 DB 설정 내보내기와 독립적으로 유지합니다. 앱 README에 현재 패키지/Bundle ID 및 등록 절차가 있습니다. 실제 지도 배경·인증·핀 클릭 검증은 키 설정 후 수행합니다.

## 산책코스 (2026-11-12)

기획서 S02/S04/S06과 `docs/resident-app-design/prototype.html`을 기준으로 구현했습니다.
`20261112130000_resident_walking_courses.sql`은 코스·순서별 장소·회원 저장을 추가합니다.
공개 조회는 `get_resident_courses`, 본인 저장은 `get_resident_saved_courses` / `set_resident_saved_course`,
관리자 편집은 `admin_save_walking_course`를 사용합니다. 일반 장소는 자체 좌표,
참여 가게는 최신 공개 프로필의 좌표를 사용합니다. 지도 핀은 방문 순서이며 경로 안내가 아닙니다.

앱: 오늘의 추천 카드 → 코스 상세 → 가게와 혜택 → 쿠폰. 마이 → 저장한 코스에서 재방문·해제합니다.
표시 시간은 체류 합계 + 운영자가 입력한 이동 시간입니다. 종료·비공개 코스는 개인 저장 목록에서 이름을 숨기고 해제를 허용합니다.

웹: `/admin/courses`에서 작성·편집·장소 추가/삭제/순서 변경·초안/공개/종료·추천/노출 순서를 설정합니다.
공개 코스는 2~20곳이며 비공개·정지 가게 연결 시 공개 저장을 거부합니다. 동시 편집은 갱신 시각으로 충돌을 감지합니다.
대표 이미지는 HTTPS URL 입력을 지원하며 업로드 관리 기능은 별도입니다.

로컬 웹 확인:

```sh
python3 scripts/local-app/run_web.py
```

`http://localhost:3105/auth`에서 개발 전용 관리자 `01000000005` / `LocalAdmin2026!`로 로그인한 뒤 `/admin/courses`로 이동합니다.
이 계정과 예시 코스는 seed에만 있으며 운영 마이그레이션에는 포함되지 않습니다.
기존 웹 dev 서버와 동시에 같은 체크아웃을 실행하면 `.next` 빌드 경로가 충돌할 수 있으므로 하나만 실행합니다.

검증: 앱 테스트 41개(실제 로컬 코스 조회·저장 복원 포함), DB 142개, 웹 50개.
운영 DB 반영, 실제 지역 콘텐츠 검수, 운영 배포는 아직 수행하지 않았습니다.
