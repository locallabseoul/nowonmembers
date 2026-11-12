"""Export only localhost URL + public anon key; never persist full CLI status."""
import json
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[2]
workdir = root / 'tmp' / 'resident-app-local'
result = subprocess.run(
    ['supabase', 'status', '--workdir', str(workdir), '-o', 'json'],
    capture_output=True, text=True, check=True,
)
status = json.loads(result.stdout)
if status.get('API_URL') != 'http://127.0.0.1:55321':
    raise RuntimeError('Refusing to export configuration from an unexpected endpoint')
key = status.get('ANON_KEY')
if not key:
    raise RuntimeError('Local public anon key missing')
target = root.parent / 'nowonmembers-app' / 'config'
target.mkdir(parents=True, exist_ok=True)
for filename, host in [('ios.local.json', '127.0.0.1'),
                       ('android.local.json', '10.0.2.2'),
                       ('test.local.json', '127.0.0.1')]:
    (target / filename).write_text(json.dumps({
        'SUPABASE_URL': f'http://{host}:55321',
        'SUPABASE_ANON_KEY': key,
    }, indent=2) + '\n')
print('Saved localhost URL and public anon key only. Local configs are Git-ignored.')
