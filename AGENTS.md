# Asgard documentation

## Scope

Maintain a current-release, bilingual documentation site. The latest user decision replaces the earlier baseline registry, historical-version pages, compatibility-route migration and legacy typed-content system. Do not reintroduce them.

## Sources

Current implementation in BenLampson/Asgard, BenLampson/Asgard.Heimdall and BenLampson/Asgard.Skills is authoritative. Verify public names, signatures, configuration, defaults, runtime wiring, versions and examples in the owning source before documenting them. Read relevant source repository instructions and Skills. Do not advertise planned or declared-but-unwired capabilities as shipped. Do not copy secrets into examples.

Use Chinese and English with the same slugs and technical meaning. Product documentation lives in `content/{zh,en}/{asgard,heimdall,skills}/*.md`; metadata is frontmatter. Navigation, search, Markdown and AI discovery derive from that content. Put source evidence links in each guide. Current product metadata is in `lib/products.json`.

## UI

Use active BRAND / NEW / DOCS frames in `asgardDocument.pen`; Archive frames are not current requirements. Respect the graphite/coral tokens, semantic article components, readable code/tables, accessible keyboard controls and reduced motion. Keep responsive behavior usable even though the current design prioritizes desktop.

Search must work against the generated content corpus. Agent context copy is local; do not pretend there is an AI execution backend. Preserve source constraints and full Markdown in copied context.

## Delivery

Use npm and its lockfile. Run `npm run verify`, then real-browser checks of portal, all products, both locales, a narrow viewport, search, copy, context open/close and navigation. Preserve the Pen file and relevant assets. No push, PR, release or deployment unless the user asks. Old code is recoverable through local Git history; never purge unrelated repositories or services.
