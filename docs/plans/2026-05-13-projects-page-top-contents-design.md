# Projects Page Top Contents Design

## Goal

Make the Projects page open with a clear page title and contents list before any individual project content.

## Design

The top of the page will become:

1. `Projects` heading.
2. A vertical contents navigation linking to the top-level projects.
3. The first project section, `#chatham-house`.

The Fizz / Chatham House copy that currently sits beside the `Projects` heading will move into the Chatham House project section. The Chatham House collaboration logo panel will move with it. This keeps the top of the page as a page-level index and makes the Chatham House / scenario-builder material read as one project.

The contents navigation will remain metadata-driven so future projects can be added by extending the project links array. Its visual layout will change from a wrapped horizontal list to a vertical stacked list.

## Testing

Update the Projects page tests to assert that:

- The `Projects` heading appears before the contents navigation.
- The contents navigation appears before the first project section content.
- The Chatham House / Fizz copy and collaboration panel remain present.
- The contents links still point to the three top-level project anchors.
