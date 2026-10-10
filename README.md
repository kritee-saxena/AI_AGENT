# StudyPilot - Adaptive Study Agent

An educational AI agent that turns a learning goal into a checked study plan, offers lessons and quizzes, remembers results, and replans from feedback.

**Proposed assignment category:** (i) Agentic Agent.

**Repository:** https://github.com/kritee-saxena/AI_AGENT

**Development schema:** [Open the three-page PDF](docs/StudyPilot_Development_Schema.pdf) · [Read the architecture](docs/ARCHITECTURE.md)

## What it does

- Selects topics from a goal and includes prerequisite topics.
- Ranks study actions using knowledge gaps, goal relevance and review age.
- Schedules sessions without exceeding a daily time budget and reports deferred topics.
- Searches 12 original lessons plus user-provided notes.
- Grades 36 original practice questions, explains answers and updates learner memory.
- Automatically recomputes the plan after a quiz.
- Shows actual action outcomes in an agent trace.
- Exports a Markdown study plan and a JSON progress record.
- Includes an optional LLM coach that selects and executes allowlisted tools.

Two starter packs are included: **AI fundamentals** and **Manufacturing**. They are a small teaching dataset, not a complete university or GATE syllabus. Questions are original practice material, not previous-year exam questions.

## What kind of AI is this?

The default application is a **classical symbolic, goal-driven agent**. It uses a state-based controller, explicit rules, a priority heuristic, prerequisite planning, executable tools and persistent feedback. It does not use a hidden API key, a neural network or a language model in local mode. It does not learn a new policy from data; it updates learner-state estimates used by its policy.

The optional Node server adds a **real language-model tool-calling loop** through the OpenAI Responses API. The model can call `lookup_lessons`, `inspect_progress` and `create_study_plan`, observe their results, and explain a proposed next step. It is disabled until an API key and model are configured. The hosted static app runs the local symbolic mode.

The faculty's rubric determines the final category and marks. If it explicitly requires a language model for option (i), configure and demonstrate the optional coach.

## Run locally

Install **Node.js 22 or later**. No third-party npm packages are required.

```bash
git clone https://github.com/kritee-saxena/AI_AGENT.git
cd AI_AGENT
npm start
```

Open **http://localhost:3000**. Run the automated checks with:

```bash
npm test
```

For a static-only server, Python is another option:

```bash
python -m http.server 8000 --directory dist
```

Then open **http://localhost:8000**. Do not double-click `index.html`: ES modules need an HTTP server. Python/static hosting does not enable the optional coach.

## Optional LLM coach

1. Copy `.env.example` to `.env` locally.
2. Set `OPENAI_API_KEY` to your own API key and `OPENAI_MODEL` to a function-calling model available to your account. Do not commit `.env`.
3. Start the server with:

```bash
node --env-file=.env server.mjs
```

4. Open **Knowledge base → Optional AI coach**. Ask: “What should I study next, and why?”

The API may incur charges on your account. The server binds to `127.0.0.1`, limits request sizes and request frequency, validates tool arguments, limits execution rounds and rejects cross-origin browser API requests. The key never enters browser code. The prototype server is intended for local use; do not expose it publicly without adding authentication and appropriate deployment controls.

The question, goal and tool-selected progress/notes are sent to OpenAI only when the AI coach is used. Model storage is disabled in the request with `store: false`; this is not a claim of zero provider retention. The local planning, lessons and quizzes work without model calls.

Official API reference used: https://developers.openai.com/api/docs/guides/function-calling

## Demonstrate in two minutes

1. Enter **“Learn CNN and pooling”**, choose **AI fundamentals**, **3 days**, **45 minutes per day**.
2. Build the plan. Explain why **Machine learning basics → Neural networks → CNNs & pooling** is the prerequisite order.
3. Read the first lesson and open a quiz.
4. Complete the quiz with one or more incorrect answers. Show the explanations and updated progress estimate.
5. Return to the plan. Show the feedback entry in the action trace and how the result affects priority or review duration.
6. Export the plan and open **How the agent works** to explain the schema.

To show a visible priority change across independent topics, plan the whole AI pack with the goal **“Prepare this subject”**, then score poorly on **Model evaluation**. Its gap-based priority increases. Prerequisites still take precedence.

## Project files

| File | Purpose |
| --- | --- |
| `dist/index.html` | Accessible application shell |
| `dist/styles.css` | Responsive interface |
| `dist/app.js` | UI, local persistence, quiz interactions and exports |
| `dist/agent.js` | Goal handling, retrieval, policy, planning, auditing and grading |
| `dist/curriculum.js` | Lessons, prerequisite graph and question bank |
| `llm-agent.mjs` | Optional bounded LLM function-calling loop |
| `server.mjs` | Local static server and protected optional API |
| `tests/` | Behavior, tool-flow and HTTP tests |
| `docs/` | Development schema, architecture and viva guide |
| `.env.example` | Names of optional configuration variables; no credentials |

## Validation

**11 automated tests passed** during development. They verify prerequisite ordering, capacity limits across 40 budget combinations, explicit deferrals, actual changes after quiz feedback, recency weighting, source retrieval, bad input handling, question-bank consistency, model/tool exchange with a mock, bounded execution and local HTTP behavior.

The optional model flow was tested with a deterministic mock; no paid live API call was made. Browser visual/interaction automation was unavailable in the authoring environment. The schema PDF was rendered and visually reviewed.

## Known limits

- The local planner recognizes keywords from the two built-in packs. An unmatched goal falls back to the selected pack and says so in the action trace.
- The scheduler is a greedy heuristic, not a globally optimal planner. It may leave unused capacity when a full lesson cannot fit.
- Knowledge estimates use a tiny question bank and are not calibrated or predictive of exam marks. Repeated questions can overestimate understanding.
- Notes are keyword-searchable; they do not automatically add topics or generate quizzes.
- Progress belongs to this browser and origin. Changing devices or clearing site data loses it. JSON export is a backup record; automatic import is not implemented.
- Marking a session complete records activity only; it does not increase the knowledge estimate.
- The agent waits for the learner to study and answer questions. It does not run in the background or send notifications.
- No university submission portal has been accessed. Share the repository link and upload the schema PDF through the required course portal.

## Example submission text

> Project: StudyPilot - Adaptive Study Agent. Proposed category: (i) Agentic Agent. The agent accepts a learning goal, plans prerequisite-aware study sessions, retrieves lessons, assesses quiz responses and adapts its plan using persistent learner feedback. Source code, setup instructions, tests and the development schema are available at https://github.com/kritee-saxena/AI_AGENT.
