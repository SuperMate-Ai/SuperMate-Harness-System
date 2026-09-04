# DSH Upgrade Runbook (distilled 2026-09-04)

Goal: upgrade any DSH install (laptop / cloud PC / this box) to a newer official tag
WITHOUT repeating today's failures.

## Golden rules
1. Write/edit any JSON/config with **UTF-8 no BOM** only.
   (PowerShell 5.1 `Set-Content -Encoding utf8` writes a BOM; newer DSH `JSON.parse`
   rejects BOM-prefixed files -> "file is not valid JSON".)
2. Fetch official source with **git clone**, never tar-extract the codeload archive
   (repo contains symlinks; Windows bsdtar fails with Invalid argument).
3. Source lives in a NEW directory; DSH_HOME data is never touched. Old dir = rollback.
4. Before upgrading a machine that patched official packages: export diffs/new files.
   After upgrading: TEST native behavior first; port patches only if still missing.

## Steps (per machine)
1. Backup DSH_HOME data (sessions/settings/storages/skills) to a dated temp folder.
2. Find latest official tag: https://github.com/deepseek-ai/deepseek-harness/releases
   (e.g. dsh-v0.1.3-alpha.1).
3. `git clone --depth 1 --branch <tag> https://github.com/deepseek-ai/deepseek-harness.git <NEW DIR>`
4. `cd <NEW DIR> && npx -y pnpm@11.7.0 install && npx -y pnpm@11.7.0 build`
5. Data preflight (run before first start of the new version):
   `powershell -ExecutionPolicy Bypass -File scripts\preflight.ps1 [-DshHome <path>]`
   - strips UTF-8 BOM from every storages\*.json and validates JSON.parse
   - prints files that fail; fix first, then start.
6. Start new version and read the first schema error; older records may miss newly
   required fields (e.g. workspace record missing `sessionIds`) -> add defaults
   (`"sessionIds": []`). Use utf8NoBOM when editing.
7. Repoint EVERY launcher entry to the new dir (miss one and "one-click start" breaks):
   - startup bat/vbs (e.g. harness_quark_launch.bat)
   - skill config: .dsh\skills\*\launcher\config.ps1  `$HarnessStartCmd`
   - .dsh\restart-harness.cmd
   - desktop shortcut target/working dir
   - any helper scripts that Start-Process the old path
8. Local patches (if any): test new version natively first (e.g. paste an image into
   chat - new versions may ship image support), port only what is still missing.
9. Verify: UI on 3080, workspace list, model list, one message, one image paste,
   full one-click restart from the bat. Old dir stays as rollback.

## Known version facts (2026-09-04)
- rc.5 tolerated BOM + omitted optional fields; 0.1.2/0.1.3 use strict JSON + Zod
  all-fields-required -> preflight is mandatory.
- 0.1.3 llm-deepseek already contains image attachment pipeline natively (check
  before porting any "vision bridge" patch).

## v0.1.3+ extra pitfalls (newer than first distil)
- dsh web now requires per-launch token auth: it prints
  "dsh web: http://127.0.0.1:3080/?token=..." and the browser must open THAT URL once
  (mints a signed cookie). Opening the bare URL returns 401
  ("dsh web authentication required").
- dsh web auto-opens the default browser; pass --no-open and open the token URL in
  the browser you actually want (Quark).
- One-click launchers must (a) treat 401 as "server up", (b) parse the token URL from the
  server log, (c) open it in the target browser. Supermate-harness-launcher does this
  automatically and still supports legacy rc.5 (200 -> plain URL).