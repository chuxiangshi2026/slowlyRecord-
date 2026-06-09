# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**慢记单词本** — A vocabulary learning app based on the Ebbinghaus forgetting curve. Supports uTools plugin, Electron desktop app, Web browser, WeChat Mini Program, and Android/iOS App.

Core features: word management with spaced repetition, dictation practice, number/text/shortcut memory training, OCR word capture, translation (10+ engines), focus mode (mini floating window), custom word banks, multi-platform sync.

## Platform Architecture

This is a **monorepo** with two separate codebases:

### Desktop (`/src`) — Vue 3 + Vite + Pinia + Element Plus
- **uTools plugin**: Primary target, uses `utools.createBrowserWindow()` for focus mode, `utools.db` for storage
- **Electron app**: Secondary target, uses IndexedDB via adapter, `electron/main.cjs` for main process
- **Web app**: Tertiary target, same codebase as Electron, uses IndexedDB

### Mobile (`/mobile`) — UniApp + Vue 3
- WeChat Mini Program, Douyin Mini Program, Android/iOS App
- Uses `uni` APIs, completely separate codebase from desktop

## Build Commands

```bash
# Desktop (uTools / Web)
npm run dev              # Dev server (uTools)
npm run build            # Production build (uTools)
npm run test             # Run vitests (watch mode)
npm run test:run         # Run vitests once
npm run type-check       # TypeScript type checking

# Electron
npm run dev:electron     # Dev server (Electron)
npm run build:electron   # Production build
npm run pack:electron    # Package installer

# Web
npm run dev:web          # Dev server (Web)
npm run build:web        # Production build

# Mobile (UniApp)
cd mobile
npm install
npm run dev:mp-weixin    # WeChat Mini Program dev
npm run build:mp-weixin  # WeChat Mini Program build
```

## Key Source Directories (Desktop)

```
src/
├── adapters/            # Cross-platform abstractions
│   ├── db.ts            # Database adapter interface + auto-select
│   ├── platform.ts      # Platform detection (utools/electron/web/mp/app)
│   ├── impl/            # Platform-specific implementations
│   │   ├── db-utools.ts         # uTools utools.db proxy
│   │   ├── db-indexeddb.ts      # IndexedDB for Electron/Web
│   │   └── db-miniprogram.ts    # wx.Storage for Mini Programs
│   ├── capture.ts       # Screen capture abstraction
│   ├── clipboard.ts     # Clipboard abstraction
│   ├── tts.ts           # Text-to-speech abstraction
│   └── theme.ts         # Theme (dark/light) abstraction
├── stores/              # Pinia stores
│   ├── words.ts         # Main word store (words, word banks, settings)
│   ├── textMemory.ts    # Text/poetry memory training
│   ├── numberMemory.ts  # Number memory training
│   ├── shortcutMemory.ts # Keyboard shortcut memory
│   └── memory.ts        # General memory test
├── views/               # Vue pages
│   ├── Word/            # Word list (main page) + WordFilter, DetailDrawer
│   ├── Dictation/       # Dictation practice
│   ├── NumberMemory/    # Number memory training
│   ├── TextMemory/      # Text/poetry memory
│   ├── ShortcutMemory/  # Keyboard shortcut memory
│   ├── MemoryTest/      # Vocabulary test
│   ├── Translate/       # Quick translate
│   ├── LetterMemory/    # Letter mapping memory
│   └── Home/            # App shell (sidebar, header, breadcrumb)
├── utils/               # Shared utilities
│   ├── str-util.ts      # Word parsing, addWord, batchAddWords
│   ├── translation-api.ts  # Multi-engine translation (youdao/baidu/ali/tencent/ai...)
│   ├── pic-translate.ts # OCR screenshot translation
│   ├── db-util.ts       # Old database CRUD helpers
│   ├── wordbank-manager.ts  # Word bank CRUD
│   ├── wordbank-service.ts  # Built-in word bank loader
│   ├── word-util.ts     # Export/import helpers
│   ├── sync-manager.ts  # Multi-device sync
│   └── logger.ts        # Logging utility
├── components/          # Shared components
│   ├── DebugPanel.vue
│   └── SyncDialog.vue
├── types/               # TypeScript type definitions
│   ├── words.d.ts       # Word, TranslationPlatform, OcrPlatform types
│   └── user-set.d.ts    # User settings, FocusModeSettings types
├── constants/           # Constants (DEFAULT_INTERVALS, USAGE_LIMITS, API keys)
├── router/              # Vue Router config
└── main.ts              # App entry point
```

### Focus Mode (`public/focus.html`)

A standalone HTML file (not a Vue component) that runs in a separate `utools.createBrowserWindow()` mini window. It:
- Loads words from the current word bank via `utools.db`
- Supports standard/spelling/dictation modes
- Has window controls: always-on-top, edge-stick/hide, opacity slider
- Communicates with the parent window via `localStorage` events + `utools.sendToParent()`

## Key Architecture Patterns

### Database Adapter Pattern
The app uses a unified `DbAdapter` interface that mimics `utools.db`'s API. The adapter is auto-selected at runtime based on platform:
- uTools: direct `utools.db` proxy (sync API)
- Electron/Web: IndexedDB-backed with in-memory cache (sync get/allDocs after async preload)
- Mini Programs: `wx.Storage`-backed

Always call `await getDbAdapterAsync()` before using `getDbAdapter()` in non-uTools environments.

### Word Bank System
Words are stored in named "word banks" (default + custom). Each bank is a `WordBank` object with a unique `id`, `name`, and `words[]` array. Banks are persisted via the DB adapter. The active bank ID is stored in the Pinia store and persisted to `localStorage`. The old single-document database (`words-list` docs) is still supported for backward compatibility.

### Focus Mode Communication
The focus mode window and the parent Vue app communicate through three channels:
1. **`localStorage` events** — The focus window writes to `slowly-record-focus-mode-action` key; parent listens via `StorageEvent`
2. **`utools.sendToParent()`** — Direct uTools IPC when available
3. **DB-based pending actions** — Falls back to `user-set.focusMode.pendingAction` in the database

### Spaced Repetition Algorithm
`DEFAULT_INTERVALS = [1, 5, 30, 360, 720, 1440, 2880, 5760, 10080, 21600, 43200, 129600, 259200, 518400]` (in minutes). Each word has a `level` (1-14) and `isReview` flag. `upReview()` recalculates `isReview` based on `learnDate + intervals[level]`. Correct answer → `level++`, wrong → `level--`. At level 7+ → `remember = true` (permanently mastered).

### Translation Engine Support
Supports 15+ translation platforms: youdao, baidu, ali, tencent, utoolsai, ollama, deepseek, qwen, kimi, glm, local, openai, gemini, claude, volc. Each has appkey/key credentials stored in `user-set` DB document.

## Testing

```bash
# Run all tests
npm run test:run

# Run a single test file
npx vitest run src/stores/words.test.ts

# Run tests with coverage
npm run test:coverage
```

Tests use Vitest with `@testing-library/vue` for component tests and `fake-indexeddb` for database tests. Test files are co-located with source files as `*.test.ts`.

## Log Levels

Controlled by `__LOG_LEVEL__` define in `vite.config.ts`:
- 0 = DEBUG (all logs)
- 1 = INFO (default)
- 2 = WARN
- 4 = SILENT

Production builds use esbuild `pure: ['log.d', 'log.i']` to strip debug/info calls.
