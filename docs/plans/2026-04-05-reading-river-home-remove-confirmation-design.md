# Reading River Home Remove Confirmation Design

**Date:** 2026-04-05

**Goal:** Add a permanent `Remove` action to the Reading River homepage cards, confirm the delete the first time a user uses it, and let each browser remember when the user no longer wants to see that confirmation.

## Decisions

### Removal behavior

`Remove` should permanently delete the reading item from Reading River.

The existing `deleteReadingItem` server action already matches that behavior, so this feature should reuse it rather than introducing a softer archived or hidden state.

### Confirmation interaction

Use a small inline confirmation surface anchored to the homepage card action area instead of a full modal.

Flow:

1. The user clicks `Remove`.
2. If the browser has not opted out of confirmations, the card expands a compact confirmation panel.
3. The panel asks `Are you sure?`, shows a `Don't ask this again in future` checkbox, and includes a confirm button that completes the delete.
4. Once confirmed, the item is removed and the homepage revalidates through the existing server action behavior.

This keeps the interaction lightweight and close to the button that triggered it.

### Preference storage

Store the confirmation preference in `localStorage`, scoped to the current browser.

Behavior:

- default state is to ask for confirmation
- if the user checks `Don't ask this again in future` and confirms removal, persist a local preference
- future clicks on `Remove` should immediately submit the delete without showing the confirmation panel

If JavaScript or `localStorage` is unavailable, the safe fallback is to keep asking for confirmation in the inline flow.

### Component shape

Keep `HomeReadCard` server-rendered, but move the interactive remove affordance into a small client component.

That client component should:

- render the `Remove` button
- manage confirmation-panel visibility
- read and write the saved preference
- submit the existing server action when appropriate

`Skip` and `Mark as read` can remain in their current server-action form setup.

### Testing scope

Add coverage for:

- homepage cards rendering the new `Remove` button
- the inline confirmation appearing on first remove
- the checkbox-controlled `localStorage` preference being saved on confirmation
- future remove clicks bypassing the confirmation once the preference is stored
