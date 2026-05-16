# Reading River Firefox Extension

## Unlisted Signing For Testers

1. Upload `dist/reading-river-firefox-0.1.1-amo-upload.zip` to the Firefox Add-on Developer Hub.
2. Choose the unlisted or self-distributed signing flow.
3. Download the signed `.xpi` Mozilla returns.
4. Share that `.xpi` directly with testers so they can install it in Firefox.

Mozilla docs:

- https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/
- https://extensionworkshop.com/documentation/publish/submitting-an-add-on/
- https://extensionworkshop.com/documentation/publish/install-self-distributed/

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

## Current Caveats

- Firefox only for now.
- v1 saves the page URL, title, and priority score.
- v1 does not estimate reading time during save.
