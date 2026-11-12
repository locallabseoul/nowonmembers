"""Compatibility entry point: run the complete local app integration suite."""
from pathlib import Path
import runpy

runpy.run_path(str(Path(__file__).with_name("test_app.py")), run_name="__main__")
