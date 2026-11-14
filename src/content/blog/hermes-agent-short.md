---
title: 'A Month With Hermes Agent: the Harness Beat the Model'
description: 'A month with Hermes Agent as a daily driver: one Docker sandbox, my Obsidian vault, a cheap API key, and a harness that remembers.'
pubDate: 2026-11-11
tags: ['ai-agents', 'hermes', 'tooling', 'workflow']
---

Every morning I ran the same loop: calendar, notes, project list, then a guess about what the day actually looked like. Three tabs for a question I already knew the answer to.

So I installed [Hermes Agent](https://github.com/NousResearch/hermes-agent), an open-source, MIT-licensed agent from Nous Research that lives in your terminal. I gave it one job: answer "what am I doing today?" from my notes. It ended up writing code, opening PRs, and remembering my preferences better than some people I work with. 🤖

This is what a month of that actually looked like — including the part where it broke something.

## The One Decision That Mattered

An over-eager agent once destroyed one of my config files while installing a desktop plugin. Nothing catastrophic; just a state that was annoying and hard to spot. I did not enjoy the surprise.

So the agent lives in a box now, and the box gets exactly one directory: my Obsidian vault. Meeting notes, calls, projects, and the decisions I would otherwise forget all live there, which makes the vault a decent little database and the only thing the agent needs to see.

The entire change was one command:

```bash
hermes config set terminal.backend docker
```

That is the sandbox, and it is a config option rather than a philosophy. Hermes ships six terminal backends — local, Docker, SSH, Modal, Daytona, and Vercel Sandbox — plus plugins for things like Apptainer and Sprites. Each one decides where the agent's shell commands actually run.

Switching turns an agent with shell access into an agent with _scoped_ shell access, which is all I ever wanted from a personal assistant. It does not need my home directory. It needs my notes.

> **Why this is the point of the post:** the model is one thing, the harness is another, and the setup around it — instruction files, skills, MCP servers — is a third. A great model in a dumb harness loses to a good model wired into a setup that matches how you think. The sandbox is the first place that distinction shows up.

## What It Runs On

Deliberately boring and cheap:

| Piece         | My choice                                       | Why                                                     |
| ------------- | ----------------------------------------------- | ------------------------------------------------------- |
| Model         | DeepSeek `v4-flash` via API key, paid per token | Value for money. No subscription to justify every month |
| Harness       | Hermes Agent (`hermes --tui`)                   | Terminal-native, scriptable, customisable               |
| Isolation     | `terminal.backend: docker`                      | One path in: the Obsidian vault                         |
| Customisation | My own skills, context files, and MCP servers   | This is the actual product, honestly                    |

`v4-flash` is not the strongest model on the market. For open-source work, note-keeping, and a daily assistant loop it is more than good enough, and paying per token means I never think about the bill the way I did with subscriptions. I have cancelled subscriptions that cost more and delivered less.

## How It Remembers You

This was the part I underestimated. Hermes is shaped by four markdown files, and knowing which one does what is the difference between "it forgot" and "I put it in the wrong place".

| File                       | Who writes it | What it holds                                         |
| -------------------------- | ------------- | ----------------------------------------------------- |
| `SOUL.md`                  | You           | Personality and tone — slot #1 of the system prompt   |
| `USER.md`                  | The agent     | Your profile: name, role, preferences, expectations   |
| `MEMORY.md`                | The agent     | Its own notes: environment facts, conventions, quirks |
| `AGENTS.md` / `.hermes.md` | You           | Project instructions, loaded from the repo            |

The two memory files are the interesting ones. They are capped hard — 2,200 characters for `MEMORY.md` (8–15 entries), 1,375 for `USER.md` — because they sit in every single request. That cap is a feature: it forces compact, reusable facts ("notes in English even when I ask in Polish", "no author trailers in commits") instead of a growing wiki.

Both are injected as a frozen snapshot at session start. Save something mid-session and it hits the disk immediately but will not appear in the prompt until the next session — on purpose, because rewriting the prompt prefix would throw away the provider's prompt cache. On a pay-per-token model that is the difference between cheap and not cheap.

## Skills Are the Real Product

I expected skills to be prompt templates. They are closer to procedural memory: a name, a one-line description, and a body that loads only when the agent decides it is relevant. Hermes calls the pattern progressive disclosure, and the numbers explain why it works:

- **Level 0:** the skill list — names, descriptions, categories. About 3k tokens for the whole catalog.
- **Level 1:** the full body of the one skill that got picked.
- **Level 2:** a reference file inside that skill, loaded only if needed.

Fifty skills cost fifty lines of prompt. The one that matters loads in full.

Two things keep that from rotting. The agent writes its own skills — when it works out a multi-step workflow, or hits a dead end and finds the path around it, it can save the procedure for next time. And a [curator](https://hermes-agent.nousresearch.com/docs/user-guide/features/curator) tracks how often each skill is viewed and used, then moves the ignored ones through active → stale → archived. It never deletes anything; the worst case is a file in `~/.hermes/skills/.archive/`.

Writing a skill also beats repeating yourself. Every time I explain the same convention twice, that is a skill waiting to be written.

## On a Normal Day

![A terminal session asking Hermes what is on today's calendar, and getting a summary built from the Obsidian vault](../../assets/hermes-tui-demo.gif)

It reads the vault, understands the structure, and hands me a summary I can read while the coffee is still brewing. I have stopped updating my calendar and my notes by hand: I ask, it answers, and sometimes it writes the note for me.

The TUI (`hermes --tui`) is where I live now. It has modal panels for the model picker, sessions and approvals; typing is never blocked, so the next message queues while the agent is still thinking; and resume works by whatever I remember, `hermes --tui --resume "release notes"`, or `--resume latest --in ./repo` per project. It is the same agent as the classic REPL underneath — both write to `~/.hermes/state.db`, so a session started in one resumes in the other.

## What It Does at Work

Hermes ships a browser it can actually drive, so research is a real use case: competitor teardowns, library comparisons, "what changed in this release". The result lands in the vault as a note.

For code, my loop is boring on purpose:

1. **I write the instruction** — what the feature does, what it must not break, how I will verify it.
2. **It writes the code**, following the repo's context file.
3. **The gates catch the rest:** pre-commit hooks, typecheck, lint, tests, GitHub Actions from day one.
4. **It commits and opens a PR** with a written summary, so future me can read the history.
5. **I review.** Always.

For parallel work, `hermes -w` gives the agent its own git worktree, so a second agent on the same repo cannot fight over my working copy.

## What Is Not Great

- **You build your own flows.** The harness gives primitives. The value comes from your skills and conventions, and that is Saturday-morning work.
- **A cheap model is cheap for a reason.** Loose instructions become loose results, so tight prompts and gates matter more, not less.
- **The failure mode is silent competence.** It will happily do the wrong thing well, and describe it confidently. Review the diff, not the summary.
- **Customisation is a rabbit hole.** I have spent evenings tuning skills that saved me ten minutes. Enjoyable, not always rational.

## What I Have Not Wired Up Yet

The features I found late, in the order I would reach for them:

- **Messaging gateway** — the same agent, memory and tools on 21+ platforms, so "what's on today" works from a phone ([docs](https://hermes-agent.nousresearch.com/docs/user-guide/messaging)).
- **Cron in plain English** — `every weekday at 9am: read my vault, send me a briefing` ([docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/cron)).
- **Subagents** — isolated child agents with their own context, so eight offers do not flood one session ([docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/delegation)).
- **Code execution** — one script that calls the tools beats ten round trips, at a fraction of the tokens ([docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/code-execution)).

Honestly, the docs are the killer feature. [`llms.txt`](https://hermes-agent.nousresearch.com/docs/llms.txt) is a single index of every page, so I paste that URL into the agent instead of describing what I want it to look up.

## Where to Start

If you take one thing from this post, take the ordering:

1. **Pick the harness first.** It decides what the model can do.
2. **Give it one folder, not your whole machine.**
3. **Write the skills.** That is where your taste becomes the agent's behaviour.
4. **Keep the gates.** Lint, typecheck, tests, review. Always.

Then ask it what you are doing today. That is the gateway drug. 😄

The [installation guide](https://hermes-agent.nousresearch.com/docs/getting-started/installation) is one `curl`, and the [repo](https://github.com/NousResearch/hermes-agent) is where the source lives. If you get stuck on skills, read [Work with skills](https://hermes-agent.nousresearch.com/docs/guides/work-with-skills) before you write your tenth one — it would have saved me a weekend.

Have a nice day, keep coding, and never stop learning! 🚀
