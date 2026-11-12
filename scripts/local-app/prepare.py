"""Prepare an isolated local stack; never copy linked project metadata or secrets."""
from pathlib import Path
import shutil

root = Path(__file__).resolve().parents[2]
target = root / 'tmp' / 'resident-app-local' / 'supabase'
target.mkdir(parents=True, exist_ok=True)
for name in ('config.toml', 'seed.sql'):
    shutil.copy2(Path(__file__).parent / name, target / name)
for name in ('migrations', 'tests'):
    dest = target / name
    source = root / 'supabase' / name
    if dest.is_symlink():
        if dest.resolve() != source.resolve():
            raise RuntimeError(f'Unexpected symlink: {dest}')
    elif not dest.exists():
        dest.symlink_to(source, target_is_directory=True)
    else:
        raise RuntimeError(f'Expected managed symlink: {dest}')
print(target.parent)
