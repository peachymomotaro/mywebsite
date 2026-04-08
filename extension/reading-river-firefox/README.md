# Reading River Firefox Extension

## Load It Temporarily

1. Open Firefox and go to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on**.
3. Select `extension/reading-river-firefox/manifest.json` from this repo.

## Test Login

1. Open the extension popup from the toolbar.
2. Sign in with a Reading River account.
3. After a successful login, the popup should switch to the save form.

## Test Saving A Page

1. Visit an article on `https://petercurry.org`.
2. Open the extension popup.
3. Confirm the current page URL and title are prefilled.
4. Enter a priority score and click **Save article**.
5. A successful save shows a confirmation message in the popup.
