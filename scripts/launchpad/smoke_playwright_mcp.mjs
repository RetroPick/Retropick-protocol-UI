// Verify the pinned isolated developer MCP with actual stdio initialization/tool calls.
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {resolve} from 'node:path';

const child=spawn(process.execPath,['scripts/launchpad/run_playwright_mcp.mjs'],{cwd:resolve(import.meta.dirname,'../..'),stdio:['pipe','pipe','pipe']});
let next=0;
const pending=new Map();
const timer=setTimeout(()=>{for(const task of pending.values())task.reject(Error('MCP smoke timed out'));child.kill();},45000);
child.stderr.on('data',()=>{}); // Never echo arbitrary subprocess/environment diagnostics.
createInterface({input:child.stdout}).on('line',line=>{
  let msg;try{msg=JSON.parse(line);}catch{return;}
  if(msg.method==='roots/list'){child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:msg.id,result:{roots:[]}})+'\n');return;}
  if(!pending.has(msg.id))return;
  const task=pending.get(msg.id);pending.delete(msg.id);
  if(msg.error)task.reject(Error(msg.error.message));else task.resolve(msg.result);
});
const call=(method,params)=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});
try{
  const init=await call('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'retropick-toolkit-smoke',version:'1.0.0'}});
  child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
  const list=await call('tools/list',{});
  const result=await call('tools/call',{name:'browser_navigate',arguments:{url:'about:blank'}});
  if(result.isError)throw Error(JSON.stringify(result.content));
  const close=await call('tools/call',{name:'browser_close',arguments:{}});
  if(close.isError)throw Error('Browser close failed');
  console.log(JSON.stringify({server:init.serverInfo,toolCount:list.tools.length,isolatedBrowserNavigation:'PASS',url:'about:blank',broadcast:false}));
}catch(error){console.error('MCP_SMOKE_FAILED:',error.message);process.exitCode=1;}
finally{clearTimeout(timer);child.stdin.end();child.kill();}
