# Yapgrab site

Public pages for the Yapgrab Chrome extension, served by GitHub Pages at https://suiiusbv.github.io/blurt/

- `index.html`: product page
- `privacy/`: privacy policy (linked from the Chrome Web Store listing). Keep it in sync with `docs/privacy-policy.md` in the extension repo.
- `config.json`: Yapgrab's signed remote config (kill switch, disabled strategies, banner). Data only. Signed in the extension repo, see `docs/remote-config.md` there. Never edit it by hand: an unsigned or altered file is ignored.
- `status/`: status page, linked from Yapgrab's "Extraction failed" message. To change the status, edit the marked block in `status/index.html`.

© 2026 SUIIUS bv.
