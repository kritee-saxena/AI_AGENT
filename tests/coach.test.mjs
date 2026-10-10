import test from 'node:test';
import assert from 'node:assert/strict';
import {runCoach,executeTool} from '../llm-agent.mjs';
import {freshMemory} from '../dist/agent.js';
const input={message:'Make my study plan',goal:{text:'Learn CNN',pack:'ai',days:3,minutes:45},memory:freshMemory(),notes:''};
test('optional LLM loop executes tools and returns their outputs to the model',async()=>{
 const requests=[];let n=0;
 const fetchImpl=async(url,opts)=>{requests.push(JSON.parse(opts.body));const output=n++===0?[{type:'function_call',call_id:'call_1',name:'create_study_plan',arguments:'{}'}]:[{type:'message',content:[{type:'output_text',text:'Your plan starts with machine learning.'}]}];return {ok:true,json:async()=>({status:'completed',output})};};
 const r=await runCoach(input,{apiKey:'test-only',model:'test-model',fetchImpl});
 assert.equal(r.trace[0].name,'create_study_plan');assert.equal(r.plan.audit.ok,true);assert.equal(requests[1].input.at(-1).type,'function_call_output');assert.equal(requests[1].input.at(-1).call_id,'call_1');assert.equal(requests[0].store,false);
});
test('the coach rejects unavailable configuration and disallowed tools',async()=>{
 await assert.rejects(()=>runCoach(input,{}),/not configured/);
 assert.throws(()=>executeTool('execute_shell',{},input),/not allowed/);
 assert.throws(()=>executeTool('lookup_lessons',{query:12},input),/Invalid lookup/);
});
test('a looping model is stopped by the bounded controller',async()=>{
 const fetchImpl=async()=>({ok:true,json:async()=>({status:'completed',output:[{type:'function_call',call_id:'repeat',name:'inspect_progress',arguments:'{}'}]})});
 await assert.rejects(()=>runCoach(input,{apiKey:'test-only',model:'test-model',fetchImpl}),/iteration limit/);
});
