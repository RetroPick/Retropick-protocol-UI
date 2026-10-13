#!/usr/bin/env python3
"""Install isolated RetroPick system units. Run as root after uploading the release.

Owns only /opt/retropick-staging, /etc/retropick-staging,
/var/lib/retropick-staging and retropick-staging-* units/users.
No package-manager, Docker, firewall, DNS or existing-service changes.
"""
import os
import pathlib
import pwd
import socket
import subprocess

ROOT = pathlib.Path('/opt/retropick-staging')
STATE = pathlib.Path('/var/lib/retropick-staging')
CONFIG = pathlib.Path('/etc/retropick-staging')
ORIGIN = 'https://retropick-metropolis-retro-ui-stagi.vercel.app'
HOST = 'api-staging.retropick.xyz'
NODE = str(ROOT / 'runtime/node/bin/node')


def run(*args):
    subprocess.run(args, check=True)


def directory(path, user, mode=0o750):
    path.mkdir(parents=True, exist_ok=True)
    account = pwd.getpwnam(user)
    os.chown(path, account.pw_uid, account.pw_gid)
    path.chmod(mode)


def main():
    if os.geteuid() != 0:
        raise SystemExit('Run as root.')
    # Initial installation only: do not replace a running installation silently.
    if pathlib.Path('/etc/systemd/system/retropick-staging.target').exists():
        raise SystemExit('Already installed; review the existing release before upgrading.')
    for port in (80, 443, 8787, 8788, 8790, 8791, 8799):
        with socket.socket() as probe:
            probe.bind(('0.0.0.0', port))
    for user in ('retropick-staging', 'retropick-staging-caddy'):
        try:
            pwd.getpwnam(user)
        except KeyError:
            run('useradd', '--system', '--user-group', '--home-dir', str(STATE),
                '--no-create-home', '--shell', '/usr/sbin/nologin', user)
    directory(STATE, 'root', 0o755)
    directory(CONFIG, 'root', 0o755)
    for name in ('indexer', 'referral', 'media', 'radar'):
        directory(STATE / name, 'retropick-staging')
    directory(STATE / 'caddy', 'retropick-staging-caddy')
    for name in ('media.env', 'radar.env'):
        path = CONFIG / name
        if not path.exists():
            raise SystemExit(f'Missing protected environment file: {path}')
        os.chown(path, 0, 0)
        path.chmod(0o600)
    if not pathlib.Path(NODE).is_file() or not (ROOT / 'runtime/caddy').is_file():
        raise SystemExit('Upload verified private Node and Caddy binaries first.')
    # The archive can retain private workspace modes. Release code contains no
    # secrets; the service accounts must be able to traverse and read it.
    run('chmod', '-R', 'a+rX', str(ROOT / 'release'))
    rpc = 'https://testnet-rpc.monad.xyz'
    services = {
        'indexer': ('apps/indexer', 'src/server.ts', {
            'INDEXER_DB': str(STATE / 'indexer/monad-testnet.sqlite'),
            'INDEXER_PORT': '8787', 'MONAD_TESTNET_RPC_URLS': rpc}),
        'referral': ('apps/referral-service', 'src/server.ts', {
            'REFERRAL_DB': str(STATE / 'referral/referral-attribution.sqlite'),
            'REFERRAL_PORT': '8788', 'REFERRAL_INDEXER_URL': 'http://127.0.0.1:8787',
            'REFERRAL_RPC_URL': rpc, 'REFERRAL_ORIGIN': ORIGIN}),
        'media': ('apps/media-service', 'src/server.ts', {
            'MEDIA_DIR': str(STATE / 'media'), 'MEDIA_PORT': '8790',
            'MEDIA_ORIGIN': ORIGIN, 'MEDIA_PUBLIC_BASE': ORIGIN}),
        'radar': ('integrations/envio-market-radar', 'src/server.ts', {
            'RADAR_STATE_DIR': str(STATE / 'radar'), 'RADAR_PORT': '8791',
            'RADAR_CHAIN_ID': '10143', 'RADAR_RPC_URL': rpc,
            'RADAR_FACTORY': '0xa7f18b9eceb0A9852b08408854A45D00fc682454',
            'RADAR_COORDINATOR': '0xaD62309242EA65BB07C833669EC6a4ED23AF738F'}),
        'gateway': ('.', 'scripts/staging/gateway.mjs', {'STAGING_GATEWAY_RADAR': '1'}),
    }
    unit_dir = pathlib.Path('/etc/systemd/system')
    for name, (cwd, entry, env) in services.items():
        env_file = f'EnvironmentFile={CONFIG / (name + ".env")}\n' if name in ('media', 'radar') else ''
        writable = f'ReadWritePaths={STATE / name}\n' if name != 'gateway' else ''
        memory = '2G' if name == 'indexer' else '1G' if name == 'radar' else '512M'
        body = f'''[Unit]
Description=Isolated RetroPick staging {name}
After=network-online.target
Wants=network-online.target
PartOf=retropick-staging.target
StartLimitIntervalSec=0

[Service]
User=retropick-staging
Group=retropick-staging
WorkingDirectory={ROOT / 'release' / cwd}
Environment=NODE_ENV=production
Environment=PATH={ROOT / 'runtime/node/bin'}:/usr/bin:/bin
{env_file}''' + ''.join(f'Environment={key}={value}\n' for key, value in env.items()) + f'''ExecStart={NODE} --experimental-strip-types {entry}
Restart=always
RestartSec=10
TimeoutStopSec=60
UMask=0077
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
{writable}MemoryMax={memory}

[Install]
WantedBy=retropick-staging.target
'''
        (unit_dir / f'retropick-staging-{name}.service').write_text(body)
    (CONFIG / 'Caddyfile').write_text(f'''{{
    admin off
}}
{HOST} {{
    reverse_proxy 127.0.0.1:8799
}}
''')
    (unit_dir / 'retropick-staging-caddy.service').write_text(f'''[Unit]
Description=Isolated RetroPick staging HTTPS ingress
After=network-online.target retropick-staging-gateway.service
Wants=network-online.target
PartOf=retropick-staging.target
StartLimitIntervalSec=0

[Service]
User=retropick-staging-caddy
Group=retropick-staging-caddy
Environment=HOME={STATE / 'caddy'}
Environment=XDG_DATA_HOME={STATE / 'caddy/data'}
Environment=XDG_CONFIG_HOME={STATE / 'caddy/config'}
ExecStart={ROOT / 'runtime/caddy'} run --config {CONFIG / 'Caddyfile'} --adapter caddyfile
Restart=always
RestartSec=10
TimeoutStopSec=30
UMask=0077
AmbientCapabilities=CAP_NET_BIND_SERVICE
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths={STATE / 'caddy'}
MemoryMax=512M

[Install]
WantedBy=retropick-staging.target
''')
    names = [f'retropick-staging-{name}.service' for name in (*services, 'caddy')]
    (unit_dir / 'retropick-staging.target').write_text(f'''[Unit]
Description=Isolated RetroPick staging backend
Wants={' '.join(names)}

[Install]
WantedBy=multi-user.target
''')
    run('systemctl', 'daemon-reload')
    run('systemctl', 'enable', 'retropick-staging.target')
    print('Installed and enabled for boot; import preserved state before starting the target.')


if __name__ == '__main__':
    main()
