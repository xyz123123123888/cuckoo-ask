# cuckoo-ask · Ask

English | [简体中文](README.md)

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Cuckoo Plugin](https://img.shields.io/badge/Cuckoo-Plugin-4d6bfe)](https://github.com/wangyongpeng90/cuckoo-code)
[![GitHub](https://img.shields.io/badge/GitHub-cuckoo--ask-181717?logo=github)](https://github.com/xyz123123123888/cuckoo-ask)

A [Cuckoo Code](https://github.com/wangyongpeng90/cuckoo-code) plugin that lets AI ask the user questions through **questionnaire cards**.

AI emits an ```ask code block; a draggable questionnaire card pops up at the bottom-right of the page. After the user answers, the answers are sent back to the chat as a **new user message**, and the AI continues immediately.

---

## Why not a tool

Cuckoo plugin tools (`ctx.tools.register`) go through the reverse-IPC channel in `plugin-tools.ts`, which has a **hard-coded 30-second timeout** on the main-process side. If the user takes longer than 30 seconds to fill in the questionnaire, the tool returns a timeout error and the answers are lost.

This plugin instead listens to `cuckoo-ai-response` / `cuckoo-ai-stream` events to capture AI replies, and completes the whole interaction inside the renderer process — **no timeout at all**.

## How it works

```
AI emits an ask block
      v
listen to cuckoo-ai-response / cuckoo-ai-stream
      v
parse JSON -> validate questions -> show questionnaire card
      v
user answers (single / multi / skip / addendum / cancel)
      v
build plain-text summary
      v
ctx.agents.current().send()  ->  sent back as a user message
      v
AI receives the answers and continues
```

## ask block format

**Put every question you need answered this turn into the same questions array** — let the user answer them all at once instead of asking one at a time across multiple turns.

```ask
{
  "questions": [
    {
      "id": "q1",
      "text": "First question",
      "multiSelect": false,
      "options": [
        { "label": "Option A", "recommended": true },
        { "label": "Option B" }
      ]
    },
    {
      "id": "q2",
      "text": "Second question (multi-select)",
      "multiSelect": true,
      "options": [
        { "label": "Option C" },
        { "label": "Option D" }
      ]
    }
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `id` | string | Optional question identifier |
| `text` | string | Required, the question text |
| `multiSelect` | boolean | **Must be explicitly `true` to allow multiple selection**; otherwise single-select |
| `options` | array | Required, at least one item |
| `options[].label` | string | Option text |
| `options[].recommended` | boolean | Marks the recommended option; highlighted in UI |

## Interaction

| Action | Description |
|---|---|
| Click option | Single-select picks immediately; multi-select toggles |
| Up / Down | Move focus |
| Space | Toggle the focused option in multi-select |
| Enter | Select focused option if nothing selected; otherwise go to next question |
| Esc | Cancel the questionnaire |
| Skip | Skip current question; summary marks it as (skipped) |
| Addendum | Fixed row at the bottom of each question; checking it enables a text input, whose content is sent along with the answer |
| Drag | Hold the title bar to drag the whole card |

## UI

- **Floating card at the bottom-right**, not full-screen, click-through background, never blocks the page
- **Dual-mode positioning**: anchored to bottom-right by default and grows upward as content gets taller; after dragging, keeps its position and clamps back into the viewport when it would overflow
- **Height cap** computed from the viewport; overflowing content scrolls inside the card
- **Progress indicator** "Question X / N"
- **Confirmation page** before submitting, with a back-to-edit button
- **Animations**: card fades/floats in and shrinks/fades out; question switching slides horizontally (forward: out-left, in-right; backward: out-right, in-left); no whole-card animation when clicking options

## Answer format

After answering:

```
[Answers to the questionnaire]
1. Question text -> Option A
2. Question text -> Option B, Option C
   Addendum: user's note
3. Question text -> (skipped)
```

When cancelled:

```
[Answers to the questionnaire] The user cancelled this questionnaire.
```

## Installation

### Option 1: Plugin marketplace (recommended)

Search for **cuckoo-ask** in the Cuckoo Code plugin marketplace, then install and enable it.

### Option 2: npm

```bash
npm install cuckoo-ask
```

### Option 3: Manual

```bash
git clone https://github.com/xyz123123123888/cuckoo-ask.git
```

Then copy `cuckoo-ask/` into `~/.cuckoo/plugins/`. Windows path:

```
C:\Users\<you>\.cuckoo\plugins\cuckoo-ask\
```

> Warning: all three options require **restarting Cuckoo Code** before the plugin takes effect (plugins are not hot-reloaded).

## Project structure

```
cuckoo-ask/
├── plugin.json      # Plugin manifest
├── package.json     # npm package metadata
├── rules/
│   └── ask.md       # Prompt: teaches the AI when and how to emit ask blocks
├── ui/
│   └── ask.js       # Core logic (capture, parse, UI, send back)
├── LICENSE          # Apache License 2.0
├── NOTICE           # Copyright and upstream compatibility notice
├── README.md        # Chinese documentation
├── .gitignore
└── README.en.md
```

## Known limitations

- Only works on platforms using **network interception mode** (providers with `useIntercept: true`, such as DeepSeek / Claude / ChatGPT / MiMo). Platforms using DOM scraping do not emit `cuckoo-ai-response`.
- Only one questionnaire is shown at a time; new ask blocks are ignored while one is open.
- Plugin code changes require restarting Cuckoo Code to take effect.

## License

Licensed under the **Apache License 2.0**. Copyright 2026 魔汐-INT. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

### Relation to upstream Cuckoo Code

Cuckoo Code itself is licensed under **GPL-3.0**. This plugin is an independent plugin: it does **not** include, copy, modify, or link against Cuckoo Code's source code. It only interacts through Cuckoo's public plugin API (`ctx.ui` / `ctx.agents` / `window` custom events).

Per the Apache-2.0 definition of "Derivative Works" — which explicitly excludes *"merely link (or bind by name) to the interfaces of the Work"* — this plugin is not a derivative work of Cuckoo Code and may therefore be licensed independently under Apache-2.0.

If this plugin's code is merged into a GPLv3 project for distribution, Apache-2.0 and GPLv3 are one-way compatible, and the combined distribution as a whole falls under GPLv3.
