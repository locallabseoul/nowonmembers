"""Repeatable integration tests against the isolated app DB using disposable fixtures."""
from pathlib import Path
import subprocess
import uuid

root = Path(__file__).resolve().parents[2]
app = root.parent / 'nowonmembers-app'
container = 'supabase_db_nowonmembers-app-dev'
coupon_id = str(uuid.uuid4())
member_id = str(uuid.uuid4())
phone = "8210000" + f"{uuid.uuid4().int % 100000:05d}"

def sql(statement):
    subprocess.run(['docker', 'exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q'],
                   input=statement, text=True, check=True, stdout=subprocess.DEVNULL)

sql(f"""
insert into auth.users(id,instance_id,aud,role,phone,encrypted_password,phone_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change)
values('{member_id}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','{phone}',extensions.crypt('LocalSaved2026!',extensions.gen_salt('bf')),now(),'{{"provider":"phone","providers":["phone"]}}','{{"role":"resident","nickname":"저장 기능 자동검증"}}',now(),now(),'','','','');
insert into public.coupons(id,business_id,title,benefit_type,benefit_value,terms,total_quantity,start_date,end_date,status)
values('{coupon_id}','d2000000-0000-4000-8000-000000000001','자동 테스트 전용 쿠폰','fixed_amount','1000','가상 테스트',2,(now() at time zone 'Asia/Seoul')::date-1,(now() at time zone 'Asia/Seoul')::date+1,'approved');
insert into public.coupon_redemption_secrets(coupon_id,code_hash)
values('{coupon_id}',extensions.crypt('654321',extensions.gen_salt('bf',10)));
update public.coupons set redemption_code_configured=true where id='{coupon_id}';
""")
try:
    result = subprocess.run(['flutter','test','--reporter','expanded',
      '--dart-define-from-file=config/test.local.json','--dart-define=RUN_LOCAL_INTEGRATION=true',
      f'--dart-define=TEST_COUPON_ID={coupon_id}',f'--dart-define=TEST_SAVED_PHONE=+{phone}'],cwd=app)
finally:
    # Only UUIDs created by this run are removed, including dependent test data.
    sql(f"delete from public.coupons where id='{coupon_id}'; delete from auth.users where id='{member_id}';")
raise SystemExit(result.returncode)
