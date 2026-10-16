// Reuse the canonical app's installed Chromium; do not read a user's browser profile.
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..');
const require=createRequire(resolve(root,'apps/retro-ui/package.json'));
const {chromium}=require('@playwright/test');
const child=spawn(process.execPath,[resolve(root,'.agents/tools/playwright-mcp/node_modules/@playwright/mcp/cli.js'),'--headless','--isolated','--browser','chromium','--executable-path',chromium.executablePath(),'--block-service-workers','--output-dir',resolve(root,'.playwright-mcp')],{cwd:root,stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('error',()=>{console.error('Pinned Playwright MCP is unavailable; see TOOLKIT.md.');process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
