import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
mkdirSync('tmp/key-qa',{recursive:true});
const outfile=resolve('tmp/key-qa/keys.mjs');
await build({stdin:{contents:`export * from './src/lib/aiKeys'; export * from './src/integrations/gemini'; export * from './src/lib/geminiApiKey'; export * from './src/lib/researchKeys';`,resolveDir:process.cwd()},outfile,bundle:true,platform:'node',format:'esm',packages:'external',alias:{'@':resolve('src')},define:{'import.meta.env':'{}'},plugins:[{name:'db-fixture',setup(build){build.onLoad({filter:/integrations[\\/]supabase[\\/]client\.ts$/},()=>({contents:'export const supabase = { from: (...args) => globalThis.testDb.from(...args) };',loader:'ts'}));}}]});
const api=await import(pathToFileURL(outfile));
const proxy=await import('../functions/api/gemini.js');
const validator=await import('../functions/api/validate-gemini-key.js');
const first='AIza'+'A'.repeat(35), second='AIza'+'B'.repeat(35);
const ring=()=>[{id:'one',label:'Primary',value:first},{id:'two',label:'Backup',value:second}];
let passed=0;
const check=async(name,run)=>{await run();passed++;console.log('PASS '+name);};
const mock=async(fetcher,run)=>{const previous=globalThis.fetch;globalThis.fetch=fetcher;try{await run();}finally{globalThis.fetch=previous;}};
const failure=(status,code)=>new Response(JSON.stringify({error:'Request rejected',code}),{status});
const success=()=>new Response(JSON.stringify({text:'Synthetic draft only.'}));
await check('Keys support legacy and AQ formats without a fictitious fixed AQ length',()=>{
  assert.equal(api.getGeminiApiKeyIssue(first),'');assert.equal(api.getGeminiApiKeyIssue('AQ.'+'s'.repeat(50)),'');assert.match(api.getGeminiApiKeyIssue('AIza123'),/39/);
});
await check('Ring rejects duplicates and more than five keys',()=>{
  assert.throws(()=>api.parseResearchKeys([...ring(),ring()[0]]),/already saved/);
  assert.throws(()=>api.parseResearchKeys(Array(6).fill(ring()[0])),/five/);
});
await check('Generation goes through the app endpoint, not browser-to-Google',async()=>{
  api.setResearchKeys(ring());
  await mock(async(url,options)=>{assert.equal(url,'/api/gemini');assert.equal(JSON.parse(options.body).apiKey,first);assert.ok(options.signal);return success();},async()=>assert.equal((await api.generateResearchResponse('Synthetic')).text,'Synthetic draft only.'));
});
await check('One backup is attempted only after key-specific authentication failure',async()=>{
  api.setResearchKeys(ring());let calls=0;
  await mock(async(_,options)=>{calls++;assert.equal(JSON.parse(options.body).apiKey,calls===1?first:second);return calls===1?failure(400,'API_KEY_INVALID'):success();},async()=>await api.generateResearchResponse('Synthetic'));
  assert.equal(calls,2);assert.equal(api.getBrowserGeminiApiKey(),first);
});
await check('Quota, billing, restrictions, model errors and outages never rotate keys',async()=>{
  for(const [status,code] of [[429,'RESOURCE_EXHAUSTED'],[402,'payment_required'],[403,'PERMISSION_DENIED'],[404,'NOT_FOUND'],[503,'UNAVAILABLE']]){
    api.setResearchKeys(ring());let calls=0;
    await mock(async()=>{calls++;return failure(status,code);},async()=>await assert.rejects(api.generateResearchResponse('Synthetic')));
    assert.equal(calls,1);
  }
});
await check('Network failure never silently rotates, nor repeats generation',async()=>{
  api.setResearchKeys(ring());let calls=0;
  await mock(async()=>{calls++;throw new TypeError('Failed to fetch');},async()=>await assert.rejects(api.generateResearchResponse('Synthetic')));assert.equal(calls,1);
});
await check('Signed-out sessions cannot inherit a persisted previous-user key',()=>{
  globalThis.window={localStorage:{getItem:()=>first}};
  api.setBrowserGeminiApiKey('');assert.deepEqual(api.getResearchKeys(),[]);assert.equal(api.getBrowserGeminiApiKey(),'');delete globalThis.window;
});
await check('Invalid key errors redact supplied credentials and preserve provider status',async()=>{
  await mock(async()=>new Response(JSON.stringify({error:{message:`Invalid ${first}`,status:'API_KEY_INVALID'}}),{status:400}),async()=>{
    const result=await proxy.onRequestPost({request:new Request('https://example.org/api/gemini',{method:'POST',body:JSON.stringify({apiKey:first,prompt:'Synthetic'})}),env:{}});
    const body=await result.json();assert.equal(result.status,400);assert.equal(body.code,'API_KEY_INVALID');assert.ok(!body.error.includes(first));assert.equal(result.headers.get('cache-control'),'no-store');
  });
});
await check('The server returns a bounded connection error without leaking keys',async()=>{
  await mock(async()=>{throw new Error(first);},async()=>{
    const result=await proxy.onRequestPost({request:new Request('https://example.org/api/gemini',{method:'POST',body:JSON.stringify({apiKey:first,prompt:'Synthetic'})}),env:{}});
    assert.equal(result.status,502);assert.ok(!(await result.text()).includes(first));
  });
});
await check('Verification errors remain actionable and do not mislabel quota as an invalid key',async()=>{
  await mock(async()=>new Response('{}',{status:429}),async()=>{
    const result=await validator.onRequestPost({request:new Request('https://example.org/api/validate-gemini-key',{method:'POST',body:JSON.stringify({apiKey:first})})});
    assert.equal(result.status,429);assert.match((await result.json()).error,/limited key verification/);
  });
  await mock(async()=>new Response(JSON.stringify({error:'Specific verification advice'}),{status:403}),async()=>await assert.rejects(api.verifyGeminiApiKey(first),/Specific verification advice/));
});
await check('Preview-session keys can save and remove without writing localStorage',async()=>{
  await api.saveResearchKeys('demo',ring());assert.equal(api.getResearchKeys().length,2);await api.saveResearchKeys('demo',[]);assert.equal(api.getBrowserGeminiApiKey(),'');
});
await check('Migration isolates all reads and writes to auth.uid with no anonymous grants',()=>{
  const sql=readFileSync('supabase/migrations/202610210001_research_keyrings.sql','utf8');
  assert.match(sql,/enable row level security/);assert.match(sql,/revoke all .* from anon/);assert.equal((sql.match(/auth.uid\(\)/g)||[]).length,5);assert.match(sql,/jsonb_array_length\(keys\) <= 5/);
});
const owner='11111111-1111-4111-8111-111111111111';
const readDb=result=>({from(name){assert.equal(name,'research_keyrings');return {select(){return {eq(field,id){assert.equal(field,'user_id');assert.equal(id,owner);return {maybeSingle:async()=>result};}};}};}});
await check('An empty cloud ring does not resurrect a removed legacy key',async()=>{
  globalThis.testDb=readDb({data:{keys:[]},error:null});
  api.setBrowserGeminiApiKey(first);assert.deepEqual(await api.loadResearchKeys(owner,first),[]);assert.equal(api.getBrowserGeminiApiKey(),'');
});
await check('Existing signup keys remain usable before the owner-only migration',async()=>{
  globalThis.testDb=readDb({data:null,error:{code:'PGRST205'}});
  assert.equal((await api.loadResearchKeys(owner,first))[0].value,first);
});
await check('A failed cloud save never replaces the working in-memory key',async()=>{
  api.setResearchKeys(ring());
  globalThis.testDb={from(){return {upsert(){return {select(){return {single:async()=>({data:null,error:{code:'42501'}})};}};}};}};
  await assert.rejects(api.saveResearchKeys(owner,[ring()[1]]),/could not be saved/);assert.equal(api.getBrowserGeminiApiKey(),first);
});
await check('A late cloud load cannot restore keys after sign out',async()=>{
  let deliver;
  globalThis.testDb={from(){return {select(){return {eq(){return {maybeSingle:()=>new Promise(resolve=>{deliver=resolve;})};}};}};}};
  api.setResearchKeys(ring());const pending=api.loadResearchKeys(owner,first);api.setBrowserGeminiApiKey('');deliver({data:{keys:ring()},error:null});await pending;assert.equal(api.getBrowserGeminiApiKey(),'');
});
console.log(`\n${passed} research-key checks passed. Mocked Google only; no real credentials.`);
