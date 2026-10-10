import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {runCoach} from './llm-agent.mjs';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.pdf':'application/pdf','.png':'image/png','.json':'application/json'};
export function createAppServer({apiKey=process.env.GROQ_API_KEY||process.env.OPENAI_API_KEY,model=process.env.GROQ_MODEL||process.env.OPENAI_MODEL||(process.env.GROQ_API_KEY?'llama-3.3-70b-versatile':''),coach=runCoach}={}){
 const attempts=[];
 return http.createServer(async(req,res)=>{
  const send=(status,body,type='application/json; charset=utf-8')=>{res.writeHead(status,{'Content-Type':type,'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-store'});res.end(type.startsWith('application/json')?JSON.stringify(body):body);};
  try{
   const host=req.headers.host||'';
   if(!host)return send(400,{error:'Missing Host header.'});
   const isLocal=/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
   if(process.env.STRICT_LOCAL==='true'&&!isLocal)return send(403,{error:'This demo server accepts local hosts only.'});
   const url=new URL(req.url,`http://${host}`);
   if(url.pathname==='/api/config'&&req.method==='GET')return send(200,{coachAvailable:Boolean(apiKey&&(model||apiKey.startsWith('gsk_')))});
   if(url.pathname==='/api/coach'){
    if(req.method!=='POST')return send(405,{error:'Use POST.'});
    if(req.headers.origin){
     try{
      const originHost=new URL(req.headers.origin).host;
      if(originHost!==host)return send(403,{error:'Cross-origin requests are not allowed.'});
     }catch{return send(403,{error:'Invalid origin.'});}
    }
    if(!String(req.headers['content-type']).startsWith('application/json'))return send(415,{error:'Use an application/json request.'});
    if(!apiKey||!model)return send(503,{error:'The optional AI coach is not configured. The local study agent is fully available.'});
    const now=Date.now();while(attempts.length&&attempts[0]<now-60000)attempts.shift();
    if(attempts.length>=6)return send(429,{error:'Please wait a minute before asking again.'});
    attempts.push(now);
    let body='',size=0;
    for await(const chunk of req){size+=chunk.length;if(size>65536)return send(413,{error:'Request is too large.'});body+=chunk;}
    let input;try{input=JSON.parse(body);}catch{return send(400,{error:'The request must contain valid JSON.'});}
    if(!input||typeof input!=='object'||Array.isArray(input))return send(400,{error:'The request must be an object.'});
    const answer=await coach(input,{apiKey,model});return send(200,answer);
   }
   if(req.method!=='GET'&&req.method!=='HEAD')return send(405,{error:'Method not allowed.'});
   const requested=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
   const target=path.resolve(root,'.'+requested);
   if(!target.startsWith(root+path.sep))return send(403,{error:'Path not allowed.'});
   const ext=path.extname(target);if(!types[ext])return send(404,{error:'File not found.'});
   let data;try{data=await readFile(target);}catch{return send(404,{error:'File not found.'});}
   res.writeHead(200,{'Content-Type':types[ext],'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:data);
  }catch(error){send(error.status||400,{error:error.name==='TimeoutError'?'The model request timed out. Please try again.':error.message||'Unable to complete the request.'});}
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const port=Number(process.env.PORT||3000);createAppServer().listen(port,'0.0.0.0',()=>console.log(`StudyPilot is ready at http://0.0.0.0:${port}`));
}
