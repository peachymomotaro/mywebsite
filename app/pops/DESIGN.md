# POps design contract

POps lives inside petercurry.org and inherits its design system. Do not
restyle it independently; extend this contract instead.

## Inherited (the site's own choices, not ours to change)

- Colours: `--bg` stone ground, `--bg-elevated` lighter stone, `--text` ink,
  `--muted` warm grey, `--accent` Malevich red, `--border` hairline. Dark
  mode values come from `styles/globals.css`.
- Type: Literata for everything readable; Fira Code only for literal code
  (API paths, JSON, prompts).

## Roles

- **Ink** carries titles and content. Task titles in lists are ink, not red.
- **Red** means "you can act on this": links, the "decision waiting" flag,
  errors. Never decorative labels.
- **Elevated stone panels** (10px radius, no border) mark the few things
  that need the owner: the "Needs you" block, an open decision, an agent
  suggestion, an Anki card. Never nest one panel inside another.
- **Hairline rules** only on the main task list, where rows are scanned.
  Everything else is separated by space.

## Type scale

h1 2rem, section heading 1.15rem/600 in sentence case, body 1rem,
secondary 0.86–0.9rem muted. No all-caps or letter-spaced labels. A section
heading only appears when it says something the content does not.

## Layout and rhythm

One 760px column. 48px before a section, 12px under its heading, 6–10px
between list items. Secondary tools (edit, add subtask, paste report, notes,
version history, scopes, API reference) sit behind a quiet "+" disclosure.

## Copy

Metadata is written as plain language with commas ("Active, last touched 5
days ago"), not `A · B · C`. No decorative arrows on links. Buttons say what
they do ("Decide", "Copy prompt").
