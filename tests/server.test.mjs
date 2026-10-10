import test from 'node:test';
import assert from 'node:assert/strict';
import {createAppServer} from '../server.mjs';
test('the local server serves the app, reports missing AI configuration, and protects its API',async t=>{
 const server=createAppServer({apiKey:'',model:''});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base=`http://127.0.0.1:${server.address().port}`;
 const page=await fetch(base);assert.equal(page.status,200);assert((await page.text()).includes('StudyPilot'));
 assert.deepEqual(await (await fetch(base+'/api/config')).json(),{coachAvailable:false});
 const off=await fetch(base+'/api/coach',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(off.status,503);
 const cross=await fetch(base+'/api/coach',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://untrusted.example'},body:'{}'});assert.equal(cross.status,403);
 assert.equal((await fetch(base+'/.env')).status,404);assert.equal((await fetch(base+'/server.mjs')).status,404);
});
