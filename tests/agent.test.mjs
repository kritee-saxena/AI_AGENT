import test from 'node:test';
import assert from 'node:assert/strict';
import {runAgent,freshMemory,gradeQuiz,retrieve,validMemory} from '../dist/agent.js';
import {TOPICS,topicById} from '../dist/curriculum.js';
const goal={text:'Learn CNN and pooling',pack:'ai',days:3,minutes:45};
test('a goal for an advanced topic includes its prerequisites in order',()=>{
 const r=runAgent(goal),order=[...new Set(r.plan.days.flatMap(d=>d.tasks.map(t=>t.topicId)))];
 assert.deepEqual(order,['ml','neural','cnn']);assert.equal(r.audit.ok,true);assert.equal(r.trace.at(-1).action,'finish');
});
test('every valid budget respects daily limits and reports unplanned work',()=>{
 for(const pack of ['ai','manufacturing'])for(const days of [1,2,5,30])for(const minutes of [15,16,29,60,180]){
  const r=runAgent({text:'Prepare this subject',pack,days,minutes});
  assert(r.plan.days.every(d=>d.used<=minutes));assert(r.plan.used<=days*minutes);assert.equal(r.audit.ok,true);
  const scheduled=new Set(r.plan.days.flatMap(d=>d.tasks.map(t=>t.topicId)));
  assert.equal(scheduled.size+r.plan.deferred.length,r.plan.scope.length);
 }
 const r=runAgent({...goal,days:1,minutes:15});assert.equal(r.plan.deferred.length,3);assert.equal(r.plan.used,0);
});
test('quiz feedback actually changes the plan priority and does not mutate the prior memory',()=>{
 const g={text:'Prepare this subject',pack:'ai',days:3,minutes:60},before=freshMemory(),first=runAgent(g,before);
 const q=topicById('evaluation').questions;
 const failed=gradeQuiz('evaluation',q.map(x=>(x.answer+1)%4),before);
 const after=runAgent(g,failed.memory);
 assert.equal(Object.keys(before.topics).length,0);assert.equal(failed.mastery,0);
 assert(after.plan.ranked.find(x=>x.id==='evaluation').score>first.plan.ranked.find(x=>x.id==='evaluation').score);
 assert.notDeepEqual(after.plan.days,first.plan.days);
});
test('correct feedback moves a topic to review and repeated attempts use recency weighting',()=>{
 const q=topicById('cnn').questions,first=gradeQuiz('cnn',q.map(x=>x.answer));
 assert.equal(first.mastery,1);assert.equal(runAgent(goal,first.memory).plan.days.flatMap(d=>d.tasks).find(x=>x.topicId==='cnn').mode,'review');
 const second=gradeQuiz('cnn',q.map(x=>(x.answer+1)%4),first.memory);assert.equal(second.mastery,.3);
});
test('retrieval identifies sources, returns notes only when they match, and has an empty result for unknown text',()=>{
 assert.equal(retrieve('max pooling','ai')[0].id,'cnn');
 assert(retrieve('ultrasonic welding','manufacturing','Ultrasonic welding uses vibration.').some(x=>x.id==='personal-notes'));
 assert.deepEqual(retrieve('zzzzzzunknown',null),[]);
});
test('bad goals, incomplete quizzes and corrupted memory are handled',()=>{
 assert.throws(()=>runAgent({...goal,days:0}));assert.throws(()=>runAgent({...goal,minutes:14}));assert.throws(()=>runAgent({...goal,days:1.5}));
 assert.throws(()=>gradeQuiz('cnn',[0,1,null]));assert.throws(()=>gradeQuiz('missing',[0,1,2]));
 assert.deepEqual(validMemory(null),freshMemory());assert.deepEqual(validMemory({version:99,topics:{},attempts:[]}),freshMemory());
});
test('the question bank and prerequisite graph are internally consistent',()=>{
 assert.equal(TOPICS.length,12);assert.equal(new Set(TOPICS.map(t=>t.id)).size,12);
 const questions=TOPICS.flatMap(t=>t.questions);assert.equal(questions.length,36);assert.equal(new Set(questions.map(q=>q.id)).size,36);
 for(const t of TOPICS){assert(t.prerequisites.every(p=>topicById(p)));for(const q of t.questions){assert(q.answer>=0&&q.answer<q.options.length);assert.equal(q.options.length,4);}}
});
