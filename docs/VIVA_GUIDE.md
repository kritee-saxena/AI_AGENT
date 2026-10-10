# Short viva guide

**What problem does this solve?**

Students often know what they need to learn but struggle to choose an order and adjust after mistakes. StudyPilot uses their goal, available time and quiz feedback to suggest the next study actions.

**Why is it an agent rather than just a chatbot?**

It maintains a goal and learner state, chooses study actions, executes tools, checks constraints and changes its later plan after observing quiz results. A chat reply alone does not demonstrate those capabilities.

**Where is the AI?**

The default version uses classical symbolic AI: an explicit controller, a priority heuristic and dependency-aware planning. It is not secretly calling a language model. The optional coach uses actual language-model function calling when configured.

**Is the agent completely autonomous?**

It autonomously organizes and revises study actions inside the supplied constraints. The learner still reads lessons and answers questions. It does not learn on the student's behalf or run background reminders.

**What is the objective?**

Prioritize relevant knowledge gaps while respecting prerequisites and the daily time budget. The implementation uses a greedy heuristic, so it does not guarantee a globally optimal schedule.

**What are the sensors and actuators?**

Inputs such as the goal, time constraints and quiz scores act as observations. Tool calls such as retrieval, scheduling and grading act on the study environment. Browser memory preserves learner state between sessions.

**How does feedback change the plan?**

An incorrect answer lowers the measured estimate, increasing the gap component of priority. A strong score can change a topic from a longer learning session to a shorter review session. Dependencies may keep a topic in the same order even if its priority changes.

**Does it train a machine-learning model?**

No. The local policy is fixed and interpretable. Learner estimates change from feedback; policy parameters are not fitted. The optional coach calls an existing model rather than training one.

**What is stored?**

The goal, notes, topic estimates, recent quiz attempts and checked sessions are stored in browser localStorage. The server does not maintain a student database.

**How is it tested?**

Use `npm test`. Tests exercise prerequisite order, budgets, explicit deferrals, actual replanning after quiz feedback, grading, retrieval, bad inputs, the optional model/tool exchange using a mock, execution limits and HTTP protections. No live model request was made without an API key.

**What would you improve next?**

Add a larger reviewed question bank, stronger knowledge tracing, semantic retrieval, opt-in cross-device storage and independent evaluation of learning outcomes. Those are future extensions, not current features.
