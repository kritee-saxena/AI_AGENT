import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {runCoach} from './llm-agent.mjs';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.pdf':'application/pdf','.png':'image/png','.json':'application/json'};
export function createAppServer({apiKey=process.env.GROQ_API_KEY||process.env.OPENAI_API_KEY,model=process.env.GROQ_MODEL||process.env.OPENAI_MODEL||(process.env.GROQ_API_KEY?'llama-3.3-7
