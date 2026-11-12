"""Run the admin editor against the app-only local DB (no production keys)."""
import json
import os
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[2]
config = json.loads((root.parent / 'nowonmembers-app/config/test.local.json').read_text())
if config['SUPABASE_URL'] != 'http://127.0.0.1:55321':
    raise RuntimeError('Only the isolated resident-app local DB is allowed')
env = dict(os.environ)
env.update(NEXT_PUBLIC_SUPABASE_URL=config['SUPABASE_URL'], NEXT_PUBLIC_SUPABASE_ANON_KEY=config['SUPABASE_ANON_KEY'])
# Prevent accidental privileged server access through a loaded .env.local value.
env['SUPABASE_SERVICE_ROLE_KEY'] = ''
print('Local app admin: http://localhost:3105/admin/courses', flush=True)
raise SystemExit(subprocess.call(['npm','run','dev','--','--port','3105'],cwd=root,env=env))
