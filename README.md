# Spelling Quest

A small, static web app for helping a child learn weekly spelling words: practice with **Look-Say-Cover-Write-Check**, **Listen & Spell** (dictation), and a mixed **Quick Quiz** mode. Built with plain HTML/CSS/JS so it can be hosted for free on GitHub Pages &mdash; no server, database or build step required.

## How it works

- **Home** (`index.html`) &mdash; shows this week's list and how many words are mastered.
- **Practice** (`practice.html`) &mdash; your daughter picks a mode and works through the list. Words she gets wrong come back around again in the same session; two correct answers in a row marks a word "mastered". The browser speaks each word aloud (via the Web Speech API) so she can practice by ear too.

The word list lives in `data/words.json` and is published as part of the site, so every device that opens it sees the same list, no accounts or sync setup needed. Practice progress is saved per-device in the browser (`localStorage`).

### Adding the weekly words

Words aren't entered in the app itself &mdash; they're added with the `/add-words` skill in Claude Code, from this project's directory:

```
here's this week's spelling list: excellent, existence, foreign, voyage, disaster
```

Claude generates a kid-friendly memory hint and an example sentence for each word, writes them into `data/words.json`, and commits + pushes automatically. GitHub Pages picks up the change within about a minute.

## Hosting on GitHub Pages

This repo is already set up for Pages. If you ever need to redo it:

```bash
git push origin main
gh api repos/<owner>/<repo>/pages -X POST -f "source[branch]=main" -f "source[path]=/" 2>/dev/null || \
gh api repos/<owner>/<repo>/pages -X PUT -f "source[branch]=main" -f "source[path]=/"
```

Then the site is live at `https://<owner>.github.io/<repo>/`.

## Local development

Any static file server works, e.g.:

```bash
python3 -m http.server 4173
```

then open `http://localhost:4173`.

## Weekly workflow

1. Sunday night: open this project in Claude Code and give it the new word list (see above).
2. Through the week: your daughter opens **Practice** and works through a mode for a few minutes a day.
3. Mastered words show a "Mastered" badge on the home page &mdash; a nice visual reward.

## Notes

- Word pronunciation uses the browser's built-in text-to-speech, so quality depends on the device/browser (Chrome, Edge and Safari all support it well; make sure the device isn't muted).
- There's no login and no backend: all data lives in the published `data/words.json` file and, for practice progress, each device's browser storage.
- `manifest.json` pins this app's installable-webapp identity (`id`/`scope`/`start_url`) to `/spelling-quest/`, so "Add to Home Screen" treats it as a separate app from anything else hosted under the same `github.io` account (e.g. other GitHub Pages projects on the same username).
