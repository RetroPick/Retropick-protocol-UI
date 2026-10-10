import {mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {Store} from './store.ts';
import {Indexer} from './sync.ts';
import { acquireDbLock, rpcEndpoints } from './server.ts';
const urls=rpcEndpoints(process.env);
const file=resolve(process.env.INDEXER_DB??'.data/monad-testnet.sqlite');
mkdirSync(dirname(file),{recursive:true});
const unlock=acquireDbLock(file);
const store=new Store(file);
try {const indexer=new Indexer(store,urls);await indexer.sync();if(indexer.error)process.exitCode=1;console.log(JSON.stringify(indexer.freshness()));}finally{store.close();unlock();}
