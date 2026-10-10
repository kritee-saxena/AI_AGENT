import { TOPICS, topicById } from './curriculum.js';

export const VERSION = 1;
export const TARGET = 0.8;
const clamp = (v,min,max) => Math.min(max,Math.max(min,v));
const tokens = s => String(s).toLowerCase().match(/[a-z0-9]+/g) || [];
export function freshMemory(){return {version:VERSION,topics:{},attempts:[],completed:[],lastRun:null};}
export function validMemory(raw){
 if(!raw || raw.version!==VERSION || !raw.topics || !Array.isArray(raw.attempts)) return freshMemory();
 const safe=freshMemory();
 for(const t of TOPICS){const p=raw.topics[t.id];if(p && Number.isFinite(p.mastery) && p.mastery>=0 && p.mastery<=1) safe.topics[t.id]={mastery:p.mastery,lastReviewed:typeof p.lastReviewed==='string'?p.lastReviewed:null,attempts:Number.isInteger(p.attempts)?clamp(p.attempts,0,100000):0};}
 safe.attempts=raw.attempts.filter(a=>topicById(a.topicId)&&Number.isFinite(a.score)&&a.score>=0&&a.score<=1&&typeof a.at==='string').slice(-100);
 safe.completed=Array.isArray(raw.completed)?raw.completed.filter(x=>typeof x==='string').slice(-1000):[];
 return safe;
}
export function mastery(memory,id){return memory.topics[id]?.mastery ?? 0.35;}
export function normalizeGoal(raw){
 if(!raw || typeof raw!=='object')throw new Error('Enter a study goal.');
 const text=String(raw.text??'').trim();
 if(text.length<3 || text.length>600)throw new Error('Use a goal between 3 and 600 characters.');
 const days=Number(raw.days),minutes=Number(raw.minutes);
 if(!Number.isInteger(days)||days<1||days>30)throw new Error('Choose 1 to 30 study days.');
 if(!Number.isInteger(minutes)||minutes<15||minutes>180)throw new Error('Choose 15 to 180 minutes per day.');
 if(!['ai','manufacturing'].includes(raw.pack))throw new Error('Select a supported subject.');
 return {text,days,minutes,pack:raw.pack};
}
export function retrieve(query,pack,notes=''){
 const queryTokens=new Set(tokens(query));
 const docs=TOPICS.filter(t=>!pack||t.pack===pack).map(t=>({id:t.id,title:t.title,text:t.summary,source:'Built-in lesson',terms:tokens(t.title+' '+t.keywords.join(' ')+' '+t.summary)}));
 if(notes.trim())docs.push({id:'personal-notes',title:'Your study notes',text:notes.slice(0,12000),source:'User-provided notes (not independently verified)',terms:tokens(notes)});
 const scored=docs.map(d=>{let score=0;for(const term of queryTokens){const tf=d.terms.filter(x=>x===term).length;if(!tf)continue;const df=docs.filter(o=>o.terms.includes(term)).length;score+=(1+Math.log(tf))*Math.log(1+(docs.length+1)/(df+1));}return {id:d.id,title:d.title,text:d.text,source:d.source,score:Number(score.toFixed(3))};});
 return scored.filter(d=>d.score>0).sort((a,b)=>b.score-a.score).slice(0,4);
}
export function selectScope(goal){
 const available=TOPICS.filter(t=>t.pack===goal.pack),words=new Set(tokens(goal.text));
 const matched=available.filter(t=>t.keywords.some(k=>words.has(k))||tokens(t.title).some(w=>words.has(w)&&w.length>3));
 const requested=matched.length?matched:available;
 const ids=new Set();
 function add(t){for(const pre of t.prerequisites)add(topicById(pre));ids.add(t.id);}
 requested.forEach(add);
 return {ids:[...ids],requested:requested.map(t=>t.id),inferred:matched.length===0};
}
export function rankTopics(ids,goal,memory,now=new Date()){
 const words=new Set(tokens(goal.text));
 return ids.map(id=>{const t=topicById(id),m=mastery(memory,id),p=memory.topics[id];
 const relevance=t.keywords.filter(k=>words.has(k)).length?1:0;
 const age=p?.lastReviewed?(now-new Date(p.lastReviewed))/86400000:0;
 const overdue=Number.isFinite(age)&&age>=3?0.5:0;
 return {id,mastery:m,score:Number((3*(1-m)+2*relevance+overdue).toFixed(2)),reason:relevance?'Matches your goal':p&&m<TARGET?'Needs reinforcement':p?'Keep it fresh':'Build the foundation'};
 }).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
}
export function buildPlan(goal,memory,scope=selectScope(goal),now=new Date()){
 const ranked=rankTopics(scope.ids,goal,memory,now),ordered=[],pending=[...ranked],placed=new Set();
 while(pending.length){
  const i=pending.findIndex(r=>topicById(r.id).prerequisites.every(p=>!scope.ids.includes(p)||placed.has(p)||mastery(memory,p)>=TARGET));
  if(i<0)throw new Error('The topic prerequisites contain a cycle.');
  const next=pending.splice(i,1)[0];ordered.push(next);placed.add(next.id);
 }
 const days=Array.from({length:goal.days},(_,i)=>({day:i+1,tasks:[],used:0}));
 let dayIndex=0;const deferred=[];
 for(const r of ordered){
  const topic=topicById(r.id),mode=r.mastery>=TARGET?'review':'learn';
  let remaining=mode==='review'?15:topic.minutes;
  let part=1;
  const room=days.reduce((s,d)=>s+goal.minutes-d.used,0);
  if(room<remaining){deferred.push(r.id);continue;}
  // Dependencies must actually fit before a dependent topic is scheduled.
  if(topic.prerequisites.some(p=>deferred.includes(p)&&mastery(memory,p)<TARGET)){deferred.push(r.id);continue;}
  while(remaining>0 && dayIndex<days.length){
   const day=days[dayIndex],available=goal.minutes-day.used;
   if(!available){dayIndex++;continue;}
   const duration=Math.min(remaining,available);
   day.tasks.push({id:`${r.id}-${mode}-${part}`,topicId:r.id,title:topic.title,mode,minutes:duration,part,reason:r.reason,priority:r.score});
   day.used+=duration;remaining-=duration;part++;
  }
 }
 const used=days.reduce((n,d)=>n+d.used,0);
 return {goal,days,scope:scope.ids,requested:scope.requested,deferred,ranked,used,capacity:goal.days*goal.minutes,createdAt:now.toISOString(),note:deferred.length?`${deferred.length} topic(s) do not fit yet. Increase the time budget to cover them.`:'All selected topics fit. Unallocated time is available for practice and breaks.'};
}
export function auditPlan(plan){
 const issues=[];
 for(const d of plan.days){if(d.used>plan.goal.minutes)issues.push(`Day ${d.day} exceeds the time budget.`);if(d.used!==d.tasks.reduce((n,t)=>n+t.minutes,0))issues.push('Task duration mismatch.');}
 const seen=new Set();
 for(const task of plan.days.flatMap(d=>d.tasks)){
  if(!topicById(task.topicId)){issues.push('Unknown topic.');continue;}
  for(const p of topicById(task.topicId).prerequisites){const ranked=plan.ranked.find(r=>r.id===p);if(ranked&&ranked.mastery<TARGET&&!seen.has(p))issues.push(`Missing prerequisite before ${task.title}.`);}
  seen.add(task.topicId);
 }
 return {ok:issues.length===0,issues,scheduled:seen.size,deferred:plan.deferred.length};
}

// The next action depends on observed state; it is not a canned sequence of chat replies.
export function nextAction(state){
 if(!state.scope)return 'inspect_goal';
 if(!state.evidence)return 'retrieve_lessons';
 if(!state.plan)return 'schedule_sessions';
 if(!state.audit)return 'check_constraints';
 if(!state.audit.ok)return 'stop_with_error';
 return 'finish';
}
export function runAgent(rawGoal,rawMemory=freshMemory(),notes='',now=new Date()){
 const goal=normalizeGoal(rawGoal),memory=validMemory(rawMemory),state={goal},trace=[];
 for(let step=0;step<8;step++){
  const action=nextAction(state);let observation;
  if(action==='inspect_goal'){
   state.scope=selectScope(goal);
   observation=state.scope.inferred?`No specific lesson matched; using the ${goal.pack==='ai'?'AI fundamentals':'Manufacturing'} starter pack (${state.scope.ids.length} topics).`:`Selected ${state.scope.requested.length} goal topic(s), plus prerequisites: ${state.scope.ids.map(id=>topicById(id).title).join(', ')}.`;
  }else if(action==='retrieve_lessons'){
   state.evidence=retrieve(goal.text,goal.pack,notes);
   observation=`Retrieved ${state.evidence.length} matching source(s); read ${Object.keys(memory.topics).length} saved topic score(s). Priority uses gaps, goal relevance and review age.`;
  }else if(action==='schedule_sessions'){
   state.plan=buildPlan(goal,memory,state.scope,now);
   observation=`Allocated ${state.plan.used} of ${state.plan.capacity} available minutes; deferred ${state.plan.deferred.length} topic(s). Prerequisites are considered before priority.`;
  }else if(action==='check_constraints'){
   state.audit=auditPlan(state.plan);observation=state.audit.ok?'Daily limits and prerequisite order passed. Scheduled study is not evidence of mastery.':state.audit.issues.join(' ');
  }else if(action==='finish'){
   trace.push({step:step+1,action,observation:'Plan ready. Waiting for learner practice; quiz feedback will trigger replanning.'});
   return {plan:state.plan,trace,evidence:state.evidence,audit:state.audit,mode:'Local symbolic agent'};
  }else throw new Error('Plan verification failed. '+state.audit.issues.join(' '));
  trace.push({step:step+1,action,observation});
 }
 throw new Error('The agent reached its step limit.');
}
export function gradeQuiz(topicId,answers,memory=freshMemory(),now=new Date()){
 const topic=topicById(topicId);if(!topic)throw new Error('Unknown quiz topic.');
 if(!Array.isArray(answers)||answers.length!==topic.questions.length||answers.some((a,i)=>!Number.isInteger(a)||a<0||a>=topic.questions[i].options.length))throw new Error('Answer every question before checking the result.');
 const detail=topic.questions.map((q,i)=>({questionId:q.id,correct:answers[i]===q.answer,selected:answers[i],answer:q.answer,explanation:q.explanation}));
 const correct=detail.filter(r=>r.correct).length,score=correct/detail.length,next=validMemory(memory),previous=next.topics[topicId];
 // First quiz is the first measured estimate; later quizzes use a recency-weighted update.
 const estimate=previous?0.7*score+0.3*previous.mastery:score;
 next.topics[topicId]={mastery:Number(estimate.toFixed(4)),lastReviewed:now.toISOString(),attempts:(previous?.attempts||0)+1};
 const attempt={topicId,correct,total:detail.length,score,at:now.toISOString()};
 next.attempts.push(attempt);next.attempts=next.attempts.slice(-100);
 return {correct,total:detail.length,score,mastery:estimate,detail,memory:next,attempt};
}
export function exportMarkdown(result,memory){
 const p=result.plan;
 return ['# StudyPilot study plan','',`Goal: ${p.goal.text}`,`Subject: ${p.goal.pack}`,`Budget: ${p.goal.days} days × ${p.goal.minutes} minutes`,`Mode: ${result.mode}`,'',...p.days.flatMap(d=>[`## Day ${d.day} · ${d.used} min`,...d.tasks.map(t=>`- ${t.title}: ${t.mode}, ${t.minutes} min (part ${t.part})`),...(d.tasks.length?[]:['- Open time for practice or rest.']),'']),p.note,'','## Agent actions',...result.trace.map(t=>`- ${t.action}: ${t.observation}`),'','## Saved knowledge estimates',...Object.entries(memory.topics).map(([id,p])=>`- ${topicById(id)?.title||id}: ${Math.round(p.mastery*100)}%`),'','Estimates are based on a small practice bank, not validated predictions of exam performance.'].join('\n');
}
