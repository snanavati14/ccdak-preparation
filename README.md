# Offset

A personal study app for the Confluent Certified Developer for Apache Kafka
(CCDAK) exam. It runs entirely in the browser: no backend, no login. Progress
lives in `localStorage` and moves between devices through JSON export and
import in Settings.

- **Today**: countdown, readiness, and today's queue (diagnostic, due reviews,
  weak-topic drill, mock exam when it's time). Press Enter to start.
- **Practice**: mixed or topic sessions of 10, 20 or 30 questions with
  instant feedback. After a miss the explanation, the configs involved and a
  link to the topic notes come up first.
- **Review**: missed and flagged questions on an SM-2 schedule.
- **Mock exam**: 60 questions in 90 minutes, no feedback until you submit,
  then a per-domain breakdown, time per question and a weakest-topics drill.
- **Topics**: the syllabus with mastery per topic and Confirmed / Likely /
  Unsure badges, plus MDX study notes per topic.
- **Configs**: a fuzzy-searchable cheat-sheet of the configs the exam asks
  about, with 4.4 defaults and official links.
- **Resources**: verified links with trust labels, and what people report
  was on their exam.

Keyboard, while answering: `1`–`4` or `A`–`D` choose, `Enter` submits and
then moves on, `E` toggles the explanation, `F` flags. In the mock exam,
`←` and `→` move between questions. On Configs, `/` focuses search.

## Run it

Needs Node 24 or newer (the content scripts run TypeScript directly).

```sh
npm install
npm run dev          # http://localhost:3000
```

Other scripts:

| Script | What it does |
|---|---|
| `npm run validate` | Checks all content against the Zod schemas, plus the cross-file rules: every `correct` id exists in `options`, the first reference is official docs, no duplicate stems or ids, topics exist, every link has been verified. Prints the question count per domain. |
| `npm run verify-links` | Fetches every URL in `content/` that hasn't been verified yet and records the result in `content/link-checks.json`. Add `-- --all` to re-check everything. |
| `npm run build` | Static export into `out/`. |
| `npm run check` | validate, lint and build in one go. |

## Add questions

Read `content/CONTRIBUTING.md` first. It holds the rules: original questions
only, every answer checked against the official docs, no exam-dump sites, no
invented links.

1. Add the question to `content/questions/<domain>.json`. The shape is
   `QuestionSchema` in `src/lib/content/schema.ts`. Ids look like
   `prod-acks-053`.
2. Put the most specific official doc link first in `references`, ideally the
   per-config anchor, for example
   `https://kafka.apache.org/44/configuration/producer-configs/#producerconfigs_acks`.
3. Set `confidence` honestly. Use `unsure` with a `kafkaVersionNote` when the
   docs are ambiguous or the behaviour changed across versions; the app marks
   those questions.
4. Run `npm run verify-links` for any new URL, then `npm run validate`.

Topic notes are MDX files in `content/topics/<slug>.mdx`, one per topic in
`content/syllabus.json`. Configs are in `content/configs.json`, links in
`content/resources.json`. Sites that block scripted fetches (Reddit, Medium)
can be verified by hand and recorded in `content/link-checks-manual.json`.

## Deploy (optional)

`npm run build` writes plain static files to `out/`; any static host can serve
them (for example, drag the folder into Netlify Drop or import the project on
Vercel). To serve from a sub-path: `BASE_PATH=/offset npm run build`.

## How it decides what to study

- **Mastery** per topic is a rolling accuracy in which each older answer
  counts 0.8 times the one after it. It stays blank until a topic has 3
  answers.
- **Readiness** compares mastery per domain with the 70% target, weighted by
  each domain's estimated share of the exam. Confluent publishes neither the
  domain weights nor the pass mark, so both are estimates and the UI says so.
- **The daily plan** fills the daily goal with due reviews first, then a
  drill on the topics with the largest weighted gap to target.
- **Review** uses SM-2: a miss comes back tomorrow, and right answers push a
  card out to 1, 3, then interval × ease days.

## Design

`PRODUCT.md` records who it's for and the principles behind it, and
`DESIGN.md` documents the visual system. The look is a commit log: every
answer is a record with an offset, and the committed marker shows where you
are.
