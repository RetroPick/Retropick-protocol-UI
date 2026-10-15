import {DatabaseSync} from 'node:sqlite';
import {jsonExact} from '@retropick/launchpad-sdk/events';
export type JournalEvent={id:string;chainId:number;address:string;name:string;args:Record<string,unknown>;block:number;blockHash:string;transactionHash:string;transactionIndex:number;logIndex:number;timestamp:number};
export class Store {
 db:DatabaseSync;
 cache=new Map<string,unknown>();
 constructor(file:string){this.db=new DatabaseSync(file);this.db.exec(`PRAGMA journal_mode=WAL;CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,stage TEXT NOT NULL,block INTEGER NOT NULL,payload TEXT NOT NULL);CREATE INDEX IF NOT EXISTS events_block ON events(block);CREATE TABLE IF NOT EXISTS checkpoints(stage TEXT NOT NULL,block INTEGER NOT NULL,hash TEXT NOT NULL,PRIMARY KEY(stage,block));CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);`);}
 get<T>(key:string):T|undefined{if(this.cache.has(key))return this.cache.get(key) as T;const r=this.db.prepare('SELECT value FROM meta WHERE key=?').get(key);if(!r)return undefined;const value=JSON.parse(String(r.value)) as T;this.cache.set(key,value);return value;}
 set(key:string,value:unknown){this.db.prepare('INSERT OR REPLACE INTO meta VALUES(?,?)').run(key,jsonExact(value));this.cache.set(key,JSON.parse(jsonExact(value)));}
 cursor(stage:string,start:number){const row=this.db.prepare('SELECT MAX(block) AS block FROM checkpoints WHERE stage=?').get(stage);return row?.block===null?start-1:Number(row?.block??start-1);}
 stages():string[]{return (this.db.prepare('SELECT DISTINCT stage FROM checkpoints').all() as {stage:string}[]).map(r=>r.stage);}
 checkpoints(stage:string){return this.db.prepare('SELECT block,hash FROM checkpoints WHERE stage=? ORDER BY block DESC').all(stage) as {block:number;hash:string}[];}
 commit(stage:string,block:number,hash:string,events:JournalEvent[]){this.db.exec('BEGIN IMMEDIATE');try{const insert=this.db.prepare('INSERT OR IGNORE INTO events VALUES(?,?,?,?)');for(const e of events)insert.run(e.id,stage,e.block,jsonExact(e));this.db.prepare('INSERT OR REPLACE INTO checkpoints VALUES(?,?,?)').run(stage,block,hash);this.db.exec('COMMIT');}catch(e){this.db.exec('ROLLBACK');throw e;}}
 rollback(block:number){const revision=(this.get<number>('reorgRevision')??0)+1;this.db.exec('BEGIN IMMEDIATE');try{this.db.prepare('DELETE FROM events WHERE block>?').run(block);this.db.prepare('DELETE FROM checkpoints WHERE block>?').run(block);this.db.exec("DELETE FROM meta WHERE key IN ('snapshot','discovery')");this.db.prepare('INSERT OR REPLACE INTO meta VALUES(?,?)').run('reorgRevision',String(revision));this.db.exec('COMMIT');this.cache.clear();}catch(e){this.db.exec('ROLLBACK');throw e;}}
 events(stage?:string):JournalEvent[]{const rows=stage?this.db.prepare('SELECT payload FROM events WHERE stage=? ORDER BY block,json_extract(payload,\'$.transactionIndex\'),json_extract(payload,\'$.logIndex\')').all(stage):this.db.prepare('SELECT payload FROM events ORDER BY block,json_extract(payload,\'$.transactionIndex\'),json_extract(payload,\'$.logIndex\')').all();return rows.map(r=>JSON.parse(String(r.payload)));}
 close(){this.db.close();}
}
