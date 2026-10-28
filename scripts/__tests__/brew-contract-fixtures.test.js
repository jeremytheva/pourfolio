import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createBrewFixtureTracker, createBrewFixtureCheckpoint } from '../brew-contract-fixtures.js'
import { openBonusFixtureReceipt } from '../bonus-fixture-receipt.js'
const namespace = 'brew-fixture-test-1234567890'
const payload = { user_id: 'owner', creator_participant_id: 'owner', creation_idempotency_key: `owner:${namespace}:one` }
const setup = (checkpoint = async () => {}) => {
  const rows = new Map(); const calls = []
  const provider = { create: async (c,p) => { calls.push('create'); const r={...p,id:1};rows.set('1',r);return r },
    get: async () => rows.get('1') ?? null, remove: async () => {calls.push('delete');rows.delete('1')} }
  return { rows, calls, provider, tracker: createBrewFixtureTracker({ provider, checkpoint, ownerId:'owner', namespace }) }
}
test('intent precedes create, acknowledgement persists, delete is followed by absence proof',async()=>{
 const phases=[];const s=setup(async p=>phases.push(p.stage));await s.tracker.create('brew_done_it_games',payload);await s.tracker.cleanup()
 assert.deepEqual(phases,['create-intent','create-acknowledged','delete-intent','delete-verified','finished']);assert.deepEqual(s.calls,['create','delete'])
})
test('failed intent checkpoint prevents all provider writes',async()=>{
 const s=setup(async()=>{throw Error('disk')});await assert.rejects(s.tracker.create('brew_done_it_games',payload));assert.deepEqual(s.calls,[])
})
test('lost create response retains unknown intent, never retries or deletes an unacknowledged row',async()=>{
 const receipts=[];const s=setup(async p=>receipts.push(p));s.provider.create=async()=>{s.calls.push('create');throw Error('lost')}
 await assert.rejects(s.tracker.create('brew_done_it_games',payload));await assert.rejects(s.tracker.create('brew_done_it_games',payload));await assert.rejects(s.tracker.cleanup())
 assert.equal(receipts.at(-1).fixtures[0].create,'UNKNOWN');assert.deepEqual(s.calls,['create'])
})
test('acknowledgement failure stops further writes while retaining prior intent',async()=>{
 const s=setup(async p=>{if(p.stage==='create-acknowledged')throw Error('disk')})
 await assert.rejects(s.tracker.create('brew_done_it_games',payload));await assert.rejects(s.tracker.cleanup());assert.deepEqual(s.calls,['create'])
})
test('foreign identity is never deleted',async()=>{
 const s=setup();await s.tracker.create('brew_done_it_games',payload);s.rows.get('1').user_id='other';await assert.rejects(s.tracker.cleanup());assert.deepEqual(s.calls,['create'])
})
test('a successful DELETE without actual absence fails verification',async()=>{
 const s=setup();s.provider.remove=async()=>s.calls.push('delete');await s.tracker.create('brew_done_it_games',payload);await assert.rejects(s.tracker.cleanup())
 await assert.rejects(s.tracker.cleanup());await assert.rejects(s.tracker.create('brew_done_it_games',payload));assert.deepEqual(s.calls,['create','delete'])
})
test('ambiguous delete is accepted only after exact absence readback',async()=>{
 const s=setup();s.provider.remove=async()=>{s.calls.push('delete');s.rows.delete('1');throw Error('lost')};await s.tracker.create('brew_done_it_games',payload);await s.tracker.cleanup();assert.deepEqual(s.calls,['create','delete'])
})
test('checkpoint stores encrypted identities and minimised summary, rejects invalid key',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'brew-receipt-'));const secret=Buffer.alloc(32,7).toString('base64');const candidateCommit='a'.repeat(40); const baseUrl='https://api.nocodebackend.com/'; const instance='fixture_test_instance'
 try {
  assert.throws(()=>createBrewFixtureCheckpoint({directory,secret:'bad',candidateCommit,namespace}))
  const writer=createBrewFixtureCheckpoint({directory,secret,candidateCommit,namespace,baseUrl,instance});const s=setup(writer);await s.tracker.create('brew_done_it_games',payload)
  const receipt=JSON.parse(await fs.readFile(path.join(directory,namespace,'receipt.json'),'utf8'));const summary=await fs.readFile(path.join(directory,namespace,'summary.json'),'utf8')
  assert.equal(openBonusFixtureReceipt(receipt,secret).fixtures[0].id,'1');assert.throws(()=>openBonusFixtureReceipt(receipt,'wrong'));assert.ok(!summary.includes('owner'));assert.ok(!JSON.stringify(receipt).includes(namespace))
 } finally {await fs.rm(directory,{recursive:true,force:true})}
})
test('cleanup removes child before parent and verifies both identities', async()=>{
 const rows=new Map();const deleted=[];let next=1
 const provider={create:async(c,p)=>{const r={...p,id:next++};rows.set(String(r.id),r);return r},get:async(c,id)=>rows.get(String(id))??null,remove:async(c,id)=>{deleted.push(c);rows.delete(String(id))}}
 const tracker=createBrewFixtureTracker({provider,checkpoint:async()=>{},ownerId:'owner',namespace})
 const game=await tracker.create('brew_done_it_games',payload)
 await tracker.create('brew_done_it_rounds',{user_id:'owner',game_id:game.id,round_number:1,selected_product_id:2})
 await tracker.cleanup();assert.deepEqual(deleted,['brew_done_it_rounds','brew_done_it_games']);assert.equal(rows.size,0)
})
test('invalid scope is rejected before any create',async()=>{
 const s=setup();await assert.rejects(s.tracker.create('ratings',payload));await assert.rejects(s.tracker.create('brew_done_it_games',{...payload,user_id:'foreign'}));assert.deepEqual(s.calls,[])
})
test('unconfirmed create readback prevents every subsequent mutation',async()=>{
 const s=setup();s.provider.get=async()=>({...payload,id:1,user_id:'foreign'})
 await assert.rejects(s.tracker.create('brew_done_it_games',payload));await assert.rejects(s.tracker.create('brew_done_it_games',payload));await assert.rejects(s.tracker.cleanup());assert.deepEqual(s.calls,['create'])
})
test('wrong record ID returned by an exact read prevents cleanup writes',async()=>{
 const s=setup();await s.tracker.create('brew_done_it_games',payload)
 s.provider.get=async()=>({...payload,id:2})
 await assert.rejects(s.tracker.cleanup());assert.deepEqual(s.calls,['create'])
})
test('children cannot attach to a foreign game or round even with a run-scoped key',async()=>{
 const s=setup()
 await assert.rejects(s.tracker.create('brew_done_it_rounds', {
  user_id:'owner',game_id:999,round_number:2,round_creation_idempotency_key:`owner:${namespace}:round-two`
 }))
 await assert.rejects(s.tracker.create('brew_done_it_guesses', {
  user_id:'owner',round_id:999,idempotency_key:`owner:${namespace}:guess`
 }))
 await assert.rejects(s.tracker.create('brew_done_it_deductions', {
  user_id:'owner',round_id:999,idempotency_key:`owner:${namespace}:deduction`
 }))
 assert.deepEqual(s.calls,[])
})
test('namespace substrings do not authorise another actor request key',async()=>{
 const s=setup()
 await assert.rejects(s.tracker.create('brew_done_it_games', {
  ...payload,creation_idempotency_key:`foreign:prefix-${namespace}:one`
 }))
 assert.deepEqual(s.calls,[])
})
test('every exact read requests fresh provider data and a finished tracker cannot write again',async()=>{
 const s=setup();const options=[];const get=s.provider.get
 s.provider.get=async(c,id,opts)=>{options.push(opts);return get(c,id)}
 await s.tracker.create('brew_done_it_games',payload);await s.tracker.cleanup()
 assert.equal(options.length,3);assert.ok(options.every(o=>o?.fresh===true))
 await assert.rejects(s.tracker.create('brew_done_it_games',payload));assert.deepEqual(s.calls,['create','delete'])
})
test('recovery artifacts bind a canonical provider instance without exposing configuration',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'brew-target-'))
 const config={directory,namespace,secret:Buffer.alloc(32,9).toString('base64'),candidateCommit:'b'.repeat(40),baseUrl:'https://api.nocodebackend.com/',instance:'first_private_instance'}
 try {
  assert.throws(()=>createBrewFixtureCheckpoint({...config,instance:''}))
  assert.throws(()=>createBrewFixtureCheckpoint({...config,baseUrl:'https://untrusted.invalid'}))
  const writer=createBrewFixtureCheckpoint(config);const s=setup(writer);await s.tracker.create('brew_done_it_games',payload)
  const readSummary=async root=>JSON.parse(await fs.readFile(path.join(root,namespace,'summary.json'),'utf8'))
  const before=await readSummary(directory)
  const receipt=JSON.parse(await fs.readFile(path.join(directory,namespace,'receipt.json'),'utf8'))
  assert.match(before.providerRef,/^sha256:[a-f0-9]{64}$/)
  assert.equal(openBonusFixtureReceipt(receipt,config.secret).providerRef,before.providerRef)
  assert.ok(Number.isFinite(Date.parse(before.capturedAt)))
  const secondDirectory=path.join(directory,'second')
  const second=createBrewFixtureCheckpoint({...config,directory:secondDirectory,instance:'second_private_instance'})
  const other=setup(second);await other.tracker.create('brew_done_it_games',payload)
  assert.notEqual((await readSummary(secondDirectory)).providerRef,before.providerRef)
  assert.ok(!JSON.stringify(before).includes(config.instance));assert.ok(!JSON.stringify(before).includes(config.baseUrl))
 } finally {await fs.rm(directory,{recursive:true,force:true})}
})
