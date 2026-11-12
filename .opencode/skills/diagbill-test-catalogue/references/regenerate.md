# Regenerating the test catalogue references

The generated files are:

- `test-catalogue.md`
- `packages.md`

They must be regenerated after any change to starter tests, parameters or packages.

## Prerequisites

1. Build/install the current app and open it against a database that has the current starter catalogue.
2. Set WebView2 remote debugging:

```powershell
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS="--remote-debugging-port=9222"
& "$env:LOCALAPPDATA\OmniMed Core\medicore.exe"
```

3. Confirm `http://127.0.0.1:9222/json` returns a page target.

## Export the live catalogue

Use an OpenCode CDP helper (for example the existing `cdp-eval.mjs` in the OpenCode temp folder) to
evaluate `scripts/export-catalogue.js` against the running app.

Example with a local CDP helper:

```powershell
node <path-to-cdp-eval.mjs> "@.opencode\skills\diagbill-test-catalogue\scripts\export-catalogue.js" `
  > "$env:TEMP\omnimed-catalogue.json"
```

PowerShell 5.1 `>` may write UTF-16. Convert before rendering:

```powershell
$path = "$env:TEMP\omnimed-catalogue.json"
$text = [IO.File]::ReadAllText($path)
[IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding($false)))
```

## Render the references

```powershell
node .opencode\skills\diagbill-test-catalogue\scripts\render-catalogue.mjs `
  "$env:TEMP\omnimed-catalogue.json" `
  ".opencode\skills\diagbill-test-catalogue\references"
```

Expected output:

```text
Rendered 229 tests, 383 parameters and 29 packages.
```

The counts should match the current source and database. If they do not, fix the source/seeding first;
do not hand-edit the generated files.

## Verify before committing

- Tests by category: 186 Pathology + 43 X-ray = 229.
- Active parameters: 383.
- Combined packages: 29 (27 seeded + 2 original).
- No pathology test without a parameter.
- No X-ray test with a parameter.
- No duplicate parameter name per test.
- No empty package and no duplicate package/test link.
- `ABG` exists with 13 parameters.
- X-ray entries show `Parameters: none`.
- Package entries list component test codes and categories.

See the main `SKILL.md` for the full invariants and the update workflow.
