---
title: "Install and verify"
description: "Use the supplied Windows PowerShell installer and verify discovery, directory links, and skill validation."
order: 20
section: "Get started"
---

The repository's `skills/` directory is a maintenance and distribution location. Placing Asgard.Skills inside an application repository does not automatically make its skills discoverable by Codex. They must be installed in a skill directory read by the current environment.

## Get the repository

With Git and Windows PowerShell available, clone the repository to a location you intend to keep:

```powershell
git clone https://github.com/BenLampson/Asgard.Skills.git
Set-Location Asgard.Skills
```

The installer uses directory links. Keep the repository at that path after installation; moving or deleting it breaks access through those links.

## Default Windows installation

From the repository root, run:

```powershell
.\scripts\install-skills.ps1
```

By default, the script links each skill directory containing `SKILL.md` into `$env:USERPROFILE\.agents\skills`. It creates Windows **Junctions**, rather than copying skill files. Updating the source checkout therefore changes the content exposed through the installed links.

The repository currently supplies a Windows PowerShell installer, with no companion Bash installer. These PowerShell arguments are not a cross-platform installation command. On other systems, use the client's supported skill-installation mechanism to place complete skill directories, then verify discovery in that client.

## Use an existing skill directory

The script declares only one parameter: `-Destination`. If the current environment already uses `.codex/skills`, select that location rather than introducing duplicate names across discovery paths:

```powershell
.\scripts\install-skills.ps1 -Destination "$env:USERPROFILE/.codex/skills"
```

For project-scoped use, select the project's `.agents/skills` directory. Replace this example with the actual project path:

```powershell
.\scripts\install-skills.ps1 -Destination "C:\Projects\MyApp\.agents\skills"
```

The script installs all directories containing `SKILL.md`. It has no skill-selection, force-overwrite, automatic-uninstall, or dependency-lock parameter. The destination cannot be the repository's `skills/` directory or a directory beneath it.

## Existing names and repeat installation

The installer checks all existing destinations before creating missing links:

- An existing Junction or SymbolicLink pointing to the corresponding skill in this checkout is retained, so rerunning is supported
- An ordinary directory, or a link pointing somewhere else, is preserved; the installer reports a conflict and stops
- A missing destination receives a Junction

Do not delete an existing skill just to bypass a conflict. First check its source, local modifications, and the discovery path used by the client. The maintainer can then decide whether to reconcile or replace it.

## Verify the installation

For a default installation, check that an explicit entry point is readable and inspect the links:

```powershell
Test-Path "$env:USERPROFILE/.agents/skills/asgard-framework-overview/SKILL.md"
Get-ChildItem "$env:USERPROFILE/.agents/skills" |
    Select-Object Name, LinkType, Target
```

If you supplied `-Destination`, use that directory instead. Then inspect Codex's available skill list and confirm the intended skill appears. The repository recommends restarting Codex if updates do not appear. A readable file is not proof that the client loaded it.

A low-risk routing task can help check that the correct instructions were loaded:

```text
Use $asgard-framework-overview to identify the plugin and starter responsibilities
in this project. List the specialized skills to read next and explain why.
Do not change code yet.
```

## Validate skill files

Skill maintenance and updates require Python and PyYAML for validation. Run from the repository root:

```powershell
python -X utf8 scripts/validate_skills.py
```

The validator checks skill names and YAML, descriptions, agent configuration, relative Markdown links, skill references, and selected template/API constraints. The **180-character** description limit is a repository maintenance convention, not a platform limit.

Static validation does not install skills, test Windows link permissions, measure automatic invocation reliability, or compile the target application. Verify installation, skill validation, and application tests separately.

## Troubleshooting

- **Conflicting skill name:** inspect `LinkType` and `Target`; the installer only reuses a link to the matching directory in this checkout
- **Readable source, missing skill:** verify that the selected directory is a discovery path for the current client, and avoid duplicates across `.agents/skills` and `.codex/skills`
- **Junction creation fails:** check the path, Windows filesystem support, and write permissions; the script does not change security settings
- **Missing `yaml` module:** make PyYAML available in the Python environment running the validator
- **Behavior changes after updating the repository:** installed links expose the updated files; inspect the changes and validate them against the target application's build and tests

Next: [choose a skill](/en/skills/docs/catalog/) or follow the [development and review workflow](/en/skills/docs/workflow/).

## Source references

- [Installation instructions](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/README.md)
- [Complete PowerShell installer](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/scripts/install-skills.ps1)
- [Static validator](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/scripts/validate_skills.py)
- [Explicit task entry point](https://github.com/BenLampson/Asgard.Skills/blob/4fb2e901b351b0f07cd23f6fa42092c7a9667d61/skills/asgard-framework-overview/SKILL.md)
