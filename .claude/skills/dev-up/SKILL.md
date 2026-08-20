---
name: dev-up
description: Start the Curio Expo dev server on the first free port from 8081 upward, so several git worktrees can each serve at once instead of fighting over 8081. Use when starting or running the dev server, the web app, or `expo start`; when a second worktree needs its own server; or when a start fails with a busy port, EADDRINUSE, "Use port N instead?", or "Skipping dev server".
---

# dev-up

Worktree-safe Expo dev server launcher. It walks up from 8081, reports who holds
the ports it skips, installs `node_modules` if the worktree has none, and waits
until the server actually answers before printing its address.

## Why this exists

Several worktrees all want 8081. When the port is busy `expo start` does **not**
move to the next one — it tries to *prompt* ("Use port N instead?",
`@expo/cli` `utils/port.js` `choosePortAsync`). With no TTY that prompt hits
`NON_INTERACTIVE`, returns `null`, and the command aborts. A backgrounded start
on a busy port therefore doesn't pick another port, it **silently doesn't start**.

`--port 0` is the one code path that walks upward without prompting, so that is
what this script launches. It does not pre-reserve a port and pass `--port N`:
between the probe and the bind another worktree can take it, and you are back at
the prompt. Expo scans at bind time; we read the result afterwards.

Reading it means reading `.expo/dev/logs/start.log`, not stdout — a non-TTY
`expo start` writes **zero bytes** to stdout, but always writes a
`{"_e":"metro:instantiate",…,"port":8083}` event to that file.

## Usage

Run from anywhere inside the repo or a worktree:

```bash
bash "$(git rev-parse --show-toplevel)/.claude/skills/dev-up/dev-up.sh"
```

In a terminal it hands the process straight to Expo, so Ctrl+C and the
interactive keys (`w` `r` `j`) work as usual.

```
dev-up  8081 busy — /…/hackathon 의 개발 서버 (pid 94881)
dev-up  port   -> 8082 부터 탐색
dev-up  web    -> http://localhost:8082
dev-up  lan    -> http://192.168.0.15:8082
dev-up  native -> RCT_METRO_PORT=8082
dev-up  ready  (6s)
```

When **Claude** runs this, launch it as a background task and report the printed
addresses. It stays in the foreground of that task on purpose: killing the task
kills the server, so nothing is orphaned holding a port. **Do not open a
browser** — hand the URLs to the user, who checks screens. Verify with `curl`.

Exit codes: `1` preconditions · `2` no free port · `3` Expo died before starting
· `4` readiness timed out. On `3`/`4` it prints the tail of `.claude/dev-up.log`
and the path to the event log.

### Options

```bash
dev-up.sh --print       # predicted addresses only, no launch, no install
dev-up.sh --port 8082   # that port or nothing (fails loudly if taken)
dev-up.sh --detach      # return once ready; you own `kill` afterwards
dev-up.sh --warm        # pull the web bundle once so the first page load is quick
PORT_BASE=8100 dev-up.sh
```

## Notes

- **Never pass `--clear`, and don't add a flag for it.** Metro's transform cache
  is `os.tmpdir()/metro-cache`, hardcoded in `@expo/metro-config`'s
  `ExpoMetroConfig.js` — **one directory shared by every worktree and every Expo
  project on the machine**. The key is content + project-*relative* path, so a
  fresh worktree starts warm off another's work; `--clear` throws that away for
  all of them. There is no per-worktree transform-cache reset. If a crawl is
  genuinely stale, delete only `$TMPDIR/metro-file-map-expo-*`, which is
  per-worktree.
- **This script cannot make Metro bundle faster.** Time-to-listening is ~1s; the
  wait is bundling (~5s warm over 3400 modules, far worse cold, because
  `experiments.reactCompiler` runs a babel plugin over every app module). What it
  can do is stop you discarding the cache and stop you paying `npm ci` twice. If
  a start still feels slow, run with `EXPO_PROFILE=1` and read
  `metro:bundling:done.ms` from the event log instead of guessing at flags.
- **`--localhost` is not a speed flag.** It and `--lan` both bind `::`; the only
  difference is the advertised host, and `--localhost` breaks phone access.
- **`expo start --help` is wrong about `--port` and web.** Its "(does not apply
  to web)" refers to the legacy webpack path, which needs `@expo/webpack-config`
  — not installed here. Web is served by Metro, on the Metro port.
- **The app does not care which port it gets.** Web builds path-only API URLs
  (`src/lib/config.ts`) and the dev proxy reads only `req.url`
  (`metro.config.js`). A non-8081 port survives the backend's
  `localhost:3000,localhost:8081` CORS allow-list only because
  `DROP_REQUEST = ['origin','referer']` strips `Origin`; without that line GETs
  would pass and login would come back 403.
- **The iOS dev build is pinned to 8082 at build time** —
  `ios/Curio/AppDelegate.swift` sets `jsLocation` to `<ip>:8082`, and `ios/` is
  gitignored so it isn't visible in a diff. For a native dev build run
  `dev-up.sh --port 8082`, or set the address in the dev menu, which wins.
- **A port holder is never killed.** It's reported and skipped, with the `kill`
  command printed when its worktree is gone or it stopped answering. A
  "not my directory → kill it" rule would kill servers you are using.
- **`.expo/dev/logs/start.log` contains `VERCEL_OIDC_TOKEN` in cleartext** (the
  `env:load` event dumps loaded variables). Gitignored — don't paste it into an
  issue or a PR.
