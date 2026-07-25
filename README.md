# Gematria Studio

Interactive letter · number art. Type a word or phrase in Hebrew, Greek or English and watch its gematria values become art — including Hebrew *milui* (full-spelling) view.

Static site, no build step: `index.html` + `app.js` + `styles.css`, with the domain logic split into one module per calculation under `src/` (core text machinery, one file per alphabet, cipher registry, number insights, milui spellings / schemes / calculations). `gematria.js` assembles them into the flat `Gematria` facade the UI consumes; each module self-validates its tables at load.

Deployed automatically to GitHub Pages on every push to `main`.
