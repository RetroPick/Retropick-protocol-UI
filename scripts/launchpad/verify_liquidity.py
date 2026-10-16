#!/usr/bin/env python3
"""Run deterministic qualification checks and retain an exact command/result ledger.

Never loads signing credentials, starts the production indexer, or broadcasts.
Browser fixtures use their existing isolated server and network guards.
"""
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--evidence', required=True, type=Path)
    parser.add_argument('--browser', action='store_true')
    parser.add_argument('--contracts', action='store_true')
    args = parser.parse_args()
    output = args.evidence.resolve()
    output.mkdir(parents=True, exist_ok=False)
    head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    dirty = subprocess.check_output(['git', 'status', '--porcelain'], cwd=ROOT, text=True).splitlines()
    checks = [
        ('abi-integrity', ROOT, ['python3', '-m', 'unittest', 'scripts/launchpad/test_abi_export.py'], {}),
        ('sdk-types', ROOT, ['pnpm', '--filter', '@retropick/launchpad-sdk', 'typecheck'], {}),
        ('sdk-tests', ROOT, ['pnpm', '--filter', '@retropick/launchpad-sdk', 'test'], {'RUN_SDK_NETWORK_TESTS': '0'}),
        ('indexer-types', ROOT, ['pnpm', '--filter', '@retropick/indexer', 'typecheck'], {}),
        ('indexer-tests', ROOT, ['pnpm', '--filter', '@retropick/indexer', 'test'], {}),
        ('ui-types', ROOT, ['pnpm', 'typecheck:ui'], {}),
        ('ui-domain', ROOT, ['pnpm', 'test:ui'], {}),
    ]
    for name in ['product', 'terminal', 'indexed-record', 'media', 'add-to-wallet', 'vault', 'liquidity']:
        checks.append((f'ui-{name}', ROOT, ['pnpm', '--filter', '@retropick/retro-ui', f'test:{name}'], {}))
    checks.append(('ui-build', ROOT / 'apps/retro-ui', ['pnpm', 'exec', 'vite', 'build', '--outDir', '/tmp/retropick-v2-ui-qualification-dist', '--emptyOutDir'], {}))
    if args.contracts:
        for name in ['unit', 'invariant']:
            checks.append((f'foundry-{name}', ROOT / 'contracts', ['forge', 'test', '--match-path', f'test/v2/{name}/*.t.sol'], {'FOUNDRY_PROFILE': 'test'}))
    if args.browser:
        checks.append(('browser-fixture', ROOT / 'apps/retro-ui', ['pnpm', 'exec', 'playwright', 'test', '--config', 'playwright.config.ts'], {'E2E_TARGET': 'fixture', 'E2E_EVIDENCE_DIR': str(output / 'browser'), 'PLAYWRIGHT_HTML_OPEN': 'never'}))
    results = []
    for name, cwd, command, overrides in checks:
        started = dt.datetime.now(dt.timezone.utc).isoformat()
        log = output / f'{name}.log'
        print(f'Running {name}', flush=True)
        with log.open('w') as stream:
            try:
                result = subprocess.run(command, cwd=cwd, env={**os.environ, **overrides}, stdout=stream, stderr=subprocess.STDOUT, timeout=1200, check=False)
                code = result.returncode
            except (OSError, subprocess.TimeoutExpired) as error:
                stream.write(f'CHECK_RUNNER_ERROR: {type(error).__name__}\n')
                code = 124 if isinstance(error, subprocess.TimeoutExpired) else 127
        results.append({'name': name, 'command': command, 'cwd': str(cwd.relative_to(ROOT)), 'environmentOverrides': overrides, 'startedAt': started, 'finishedAt': dt.datetime.now(dt.timezone.utc).isoformat(), 'exitCode': code, 'log': log.name, 'logSHA256': hashlib.sha256(log.read_bytes()).hexdigest()})
        (output / 'commands.json').write_text(json.dumps({'head': head, 'dirtyPathsAtStart': dirty, 'checks': results}, indent=2) + '\n')
        print(f'{name}: {"PASS" if code == 0 else "FAIL"} ({code})', flush=True)
    return int(any(row['exitCode'] != 0 for row in results))


if __name__ == '__main__':
    sys.exit(main())
