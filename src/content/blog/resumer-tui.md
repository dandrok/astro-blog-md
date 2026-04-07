---
title: "Building a TUI to Tailor a Resume for a Job Offer"
description: "I built Resumer to make resume tailoring less repetitive: pick a PDF, paste a job link, answer a few questions, and export a cleaner version."
pubDate: 2026-04-06
---

## Overview

When I started applying for jobs again, I ran into the same annoying problem every time: my resume was mostly fine, but it never matched the job post in quite the right way.

I did not want to rewrite the whole thing for every application. Usually I just needed to:

- bring a few stronger points to the top,
- trim details that were less relevant,
- and make the resume feel closer to the role I was applying for.

That is what led me to build **Resumer**. It is a small CLI/TUI app that takes an existing resume, reads a job description, asks a few smart follow-up questions, and produces a tailored version in Markdown before exporting it back to a PDF.

The idea was not to let AI "write my story" for me. The idea was to remove the repetitive part of editing while still keeping the result accurate and personal.

If you want to look at the code, the repository is here: [github.com/dandrok/resumer](https://github.com/dandrok/resumer).

## What Resumer Does

Resumer is an AI-powered terminal application built with **TypeScript**, **Node.js**, and **React Ink**. The flow is pretty simple:

1. Choose a resume PDF.
2. Paste a job offer URL.
3. Extract text from both sources.
4. Analyze which recent roles should be highlighted.
5. Ask short follow-up questions about impact, ownership, and missing skills.
6. Generate a tailored resume in **Markdown**.
7. Export the approved version as a new PDF.

That is really the whole point. A good resume usually does not need more words. It needs better focus.

## Why I Built It as a TUI

I built it as a terminal app because I wanted something faster than opening a document editor and cleaner than bouncing between browser tabs, notes, and AI chats.

The TUI format works well here because it keeps everything in one place:

- no browser tabs full of half-finished notes,
- no copy-pasting between multiple tools,
- no need to build a full desktop app just for one workflow.

It also keeps the tool lightweight and local, which matters when you are working with resume data and API keys.

## How the Flow Works

This is the flow inside the app:

1. Open Resumer.
2. Configure the provider and model you want to use.
3. Select your resume PDF.
4. Paste the job offer URL.
5. Let the app extract the resume text and the job description.
6. Review the analysis of which roles should be emphasized and which skills look weak or missing.
7. Answer a few short follow-up questions.
8. Review the generated Markdown draft.
9. Export the tailored version as a PDF.

The part I like most is the interview step. Instead of letting the model make things up, the app asks for details such as:

- what system or product you worked on,
- what you actually owned,
- what changed because of your work,
- whether you have relevant experience in a skill that looks weak or missing.

That small step makes a big difference. The final draft feels much more grounded in real experience instead of generic AI filler.

## How Resumer Stays Useful Instead of Generic

One thing I wanted to avoid from the start was the typical AI-generated resume style: vague, overstuffed, and full of keywords that do not really say much. Resumer tries to avoid that by splitting the process into two stages.

### 1. Analysis First

First, the app compares the resume and the job description, then returns structured JSON with:

- up to two recent roles to prioritize,
- up to three weak or missing skills,
- a few notes about what should be preserved instead of deleted.

This gives the whole process some structure before any rewriting starts.

### 2. Generation Second

Only after that does it generate the tailored Markdown version. I added a few strict constraints to keep the result useful:

- keep it to one page,
- omit education,
- preserve strong recent experience,
- compress low-priority content before removing it,
- highlight matching skills with restraint,
- never invent facts, metrics, or technologies.

That combination pushes the result closer to editing than hallucinating, which is exactly what I wanted.

## Input and Output

The app needs two main inputs:

- a **PDF resume** with extractable text,
- a **job offer URL**.

From there it:

- extracts text from the PDF,
- scrapes the job post through **Jina Reader**,
- generates a tailored **Markdown** draft,
- converts that Markdown into a final PDF.

The exported file is saved next to the original resume as:

```text
your-cv_tailored.pdf
```

Using Markdown in the middle of the workflow is intentional. It makes the output much easier to read, edit, and review before turning it back into a PDF.

## Supported AI Providers

I also did not want the project tied to a single model provider. Through the **Vercel AI SDK**, Resumer supports:

- OpenAI
- Anthropic
- Google Gemini
- xAI
- Mistral
- DeepSeek
- Ollama for local models

That gives the tool some flexibility. If you want a hosted model, you can use one. If you want to run something locally through Ollama, you can do that too.

## Privacy and Local-First Approach

Because resumes contain personal data, I wanted the tool to feel local-first.

Resumer stores configuration on the local machine using the `conf` package. There is no extra backend run by the app where your resume or API keys get routed through. The tool talks directly from your machine to the selected AI provider and, when needed, to Jina Reader for job-post extraction.

It is not fully offline, but it is a much simpler and more transparent setup than uploading resumes to some separate service.

## Tech Stack

The stack is intentionally small and practical:

- **TypeScript** for the application code
- **Node.js** as the runtime
- **Ink** for the React-based terminal UI
- **Vercel AI SDK** for provider integration
- **pdf-parse** for reading PDF resumes
- **Jina Reader** for extracting job descriptions from URLs
- **md-to-pdf** for exporting the final tailored resume

Nothing here is especially fancy, and that is part of the appeal. The workflow matters more than the complexity.

## What I Like About This Approach

What I like most about this approach is that it does not try to automate judgment completely. It helps with the repetitive part, but it still keeps the user in the loop.

That matters for resumes. A strong resume is not just "optimized text." It is a selective version of your real experience. The follow-up questions and review step are what keep the final result believable.

## Final Thoughts

Resumer started as a side project built around a very ordinary frustration: tailoring a resume for each job offer takes time, and a lot of that time is repetitive.

A terminal app turned out to be a really good fit for this. It keeps the workflow focused, lightweight, and local, while still being powerful enough to do the parts that are actually helpful.

The part I like most is the mix of **analysis**, **human confirmation**, and **Markdown output**. It makes the tool useful without making it feel like a black box.

If you also find yourself rewriting the same resume over and over again, this is exactly the kind of tool I wanted to have on hand.
