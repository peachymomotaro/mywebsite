# Reading River Home Card Edit Design

**Date:** 2026-04-04

**Goal:** Update the Reading River homepage spotlight cards so they expose tags and a lightweight edit affordance, while simplifying the add-item forms by removing notes and manual-status inputs.

## Decisions

### Homepage card target

Apply the card changes to `HomeReadCard`, because that is the card surface currently rendered on `/reading-river`.

The unused `ReadingItemCard` component can stay unchanged for now.

### Edit interaction

Use a dedicated edit page instead of inline editing or a modal.

Flow:

1. Each homepage spotlight card gets a muted `Edit` link in the top-right corner.
2. The link routes to `/reading-river/items/[id]/edit`.
3. The edit page loads the current user's item and renders a focused form.
4. Saving returns the user to `/reading-river`.

This keeps the homepage calm, avoids extra client-side editing state, and fits the current server-action patterns.

### Tag display

Show tags in a muted treatment at the bottom-right of each homepage spotlight card.

Behavior:

- if the full tag list fits, render the full comma-separated tag list
- if it does not fit, collapse it to a clickable summary
- clicking the collapsed summary expands the full list inline

This requires the homepage data query to fetch tag names, because the current query does not include them.

### Edit-page fields

The first edit page should expose only the fields needed by the homepage card and near-term item maintenance:

- title
- source URL for URL-backed items
- estimated minutes
- priority
- tags

It should intentionally omit:

- notes
- status

Status remains controlled through the homepage actions such as `Mark as read` and `Skip`.

### Add-form simplification

Remove `Notes` from:

- `Paste a link`
- `Manual item`

Remove `Status` from:

- `Manual item`

Manual items will default to `unread` in the action layer when created.

Existing notes already stored in the database are left untouched. This is a UI and workflow simplification, not a schema migration.

## Testing Scope

Add coverage for:

- homepage cards rendering edit links and visible tags
- overflow-tag expansion behavior in the new interactive tag component
- homepage data fetching tag names
- edit page rendering the expected fields
- add-item forms no longer rendering notes or manual status
- manual item creation defaulting status to `unread`
