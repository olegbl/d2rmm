You are helping the user create a D2RMM mod — a JavaScript or TypeScript mod for Diablo II: Resurrected using the D2RMM mod manager.

## Your knowledge sources

Before proceeding, read these reference files so you can answer questions accurately:

1. **[.claude/d2r-modding-api.md](.claude/d2r-modding-api.md)** — Complete D2RMM mod API: the `D2RMM` global, `mod.json` structure, all config field types, binding expressions, JS vs TS mod differences
2. **[.claude/d2r-game-files.md](.claude/d2r-game-files.md)** — Key game data files, their paths, column meanings, and what controls what
3. **[.claude/d2r-game-mechanics.md](.claude/d2r-game-mechanics.md)** — How game systems work: item drop pipeline, TC chaining, NoDrop formula, quality rolls, MF diminishing returns, affix level
4. **[.claude/d2r-mod-examples.md](.claude/d2r-mod-examples.md)** — Real mod code patterns and annotated examples

When those files don't have enough detail, fall back to:
- **Example mods** at https://github.com/olegbl/d2rmm.mods (read from local path if available — see `.claude/local.md`)
- **D2RMM mod author docs** at https://olegbl.github.io/d2rmm/
- **D2R-specific data guide** at https://locbones.github.io/D2R_DataGuide/ (most accurate for file columns)
- **Phrozen Keep knowledge base** at https://d2mods.info/forum/kb/ (classic D2, mostly still applies) — example: https://d2mods.info/forum/kb/viewarticle?a=284
- **Extracted game data** for reference — see `.claude/local.md` for local path if available

## Mod file locations

Mods live in a `mods/` folder managed by D2RMM. Each mod is a directory:
```
mods/
  MyModName/
    mod.json   — manifest (name, description, config fields)
    mod.js     — mod code (JavaScript) OR
    mod.ts     — mod code (TypeScript, supports ES6 imports across multiple files)
    hd/        — optional asset folder (graphics, videos)
```

Ask the user where their D2RMM mods folder is, or check `.claude/local.md` for a local path.

## Workflow

### Step 1 — Understand the goal
Ask the user:
- **What should this mod do?** What game mechanic do you want to change?
- Should it be **configurable**? If so, what options?
- Does it need to work alongside other mods (compatibility concerns)?
- **JavaScript or TypeScript?** TypeScript allows splitting the mod across multiple files.

### Step 2 — Identify the game files
Based on the desired effect, identify which game data files need to be modified. Consult `.claude/d2r-game-files.md` and look at existing mods for precedent.

Key rule: **always modify both the regular and `base\` variant of every TSV file** (e.g. both `global\excel\misc.txt` and `global\excel\base\misc.txt`). Use the try-both pattern:

```javascript
['global\\excel\\file.txt', 'global\\excel\\base\\file.txt'].forEach((fileName) => {
  const data = D2RMM.readTsv(fileName);
  if (!data) return; // file may not exist in all game versions
  // ... modify rows ...
  D2RMM.writeTsv(fileName, data);
});
```

### Step 3 — Design the config (if needed)
Decide what the user should be able to configure. Keep it simple — only expose options that genuinely change behavior. Refer to `.claude/d2r-modding-api.md` for config field types and binding expressions.

### Step 4 — Write the mod

**mod.json** template:
```json
{
  "$schema": "../config-schema.json",
  "name": "Your Mod Name",
  "description": "A short description of what this mod does.",
  "author": "AuthorName",
  "website": "https://www.nexusmods.com/diablo2resurrected/mods/XXX",
  "version": "1.0",
  "config": []
}
```

**mod.js / mod.ts rules:**
- The global `D2RMM` object provides all file I/O APIs
- The global `config` object provides the user's current config values
- Use `console.log()` for debug output, `console.error()` or `throw` for errors
- No Node.js APIs (`fs`, `path`, etc.) or browser APIs (`fetch`, `setTimeout`, etc.)
- File paths use **backslashes** (`\\`) and are relative to the D2R data directory
- All values in TSV rows are **strings** — compare and set as strings (e.g. `row.enabled = '1'`)
- Use `.filter(row => row['Treasure Class'] !== '')` to skip blank/header rows in TSV files
- **TypeScript only**: ES6 `import`/`export` work and allow multi-file mods

### Step 5 — Check compatibility
- Does the mod touch files that other popular mods also touch?
- If so, note it in the description and ensure the mod uses read-modify-write (not file replacement)
- Never use `D2RMM.copyFile()` for TSV/JSON game data files — use read+write APIs instead, which allow other mods to also modify the same file

### Step 6 — Verify
After writing, review:
- [ ] `mod.json` has `$schema`, `name`, `description`, `author`, `version`
- [ ] Config field IDs match what's used as `config.fieldId` in mod code
- [ ] Both regular and `base\` file variants are handled for every TSV file
- [ ] TSV values are set as strings (not numbers/booleans)
- [ ] No Node.js or browser APIs used
- [ ] The mod doesn't blindly overwrite rows it shouldn't touch (filter carefully)
- [ ] TypeScript mods: all imported files exist and exports match their usage
