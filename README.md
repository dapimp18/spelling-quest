# Spelling Quest

A small, static web app for helping a child learn weekly spelling words: practice with **Look-Say-Cover-Write-Check**, **Listen & Spell** (dictation), and a mixed **Quick Quiz** mode. Built with plain HTML/CSS/JS so it can be hosted for free on GitHub Pages &mdash; no server, database or build step required.

## How it works

- **Home** (`index.html`) &mdash; shows this week's list and how many words are mastered.
- **Practice** (`practice.html`) &mdash; your daughter picks a mode and works through the list. Words she gets wrong come back around again in the same session; two correct answers in a row marks a word "mastered". The browser speaks each word aloud (via the Web Speech API) so she can practice by ear too.

The word list lives in `data/words.json` and is published as part of the site, so every device that opens it sees the same list, no accounts or sync setup needed. Practice progress is saved per-device in the browser (`localStorage`).

### Adding the weekly words

Words aren't entered in the app itself. There are two ways to add them:

**From Claude Code**, using the `/add-words` skill, from this project's directory:

```
here's this week's spelling list: excellent, existence, foreign, voyage, disaster
```

Claude generates a kid-friendly memory hint and an example sentence for each word, writes them into `data/words.json`, and commits + pushes automatically.

**From anywhere on the web**, using the [submission form](https://dapimp18.github.io/spelling-quest/submit.html) (`submit.html`). Typing the words there opens a pre-filled GitHub issue; after you (the repo owner) create it, a GitHub Action calls Claude via the Anthropic API to generate the same hints/sentences, publishes `data/words.json`, and comments back on the issue. See **Setting up the submission form** below &mdash; it needs a one-time Anthropic API key.

Either way, GitHub Pages picks up the change within about a minute.

### Setting up the submission form

The form itself needs no setup, but the automation behind it (`.github/workflows/add-words.yml`) needs an Anthropic API key:

1. Create a key at [console.anthropic.com](https://console.anthropic.com/settings/keys).
2. Add it as a repo secret: **Settings &rarr; Secrets and variables &rarr; Actions &rarr; New repository secret**, named `ANTHROPIC_API_KEY`.
3. That's it &mdash; the workflow calls the key only from GitHub's servers, never from the public form page.

The workflow only processes issues opened by the GitHub usernames listed in `AUTHORIZED_LOGINS` at the top of `.github/workflows/add-words.yml` (currently just `dapimp18`) &mdash; since the repo is public, anyone could technically open an issue via the form, but only an authorized owner's submission is ever turned into a publish. Add more usernames there (comma-separated) if someone else should be able to submit words too.

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

1. Sunday night: either open this project in Claude Code and give it the new word list, or fill in the [submission form](https://dapimp18.github.io/spelling-quest/submit.html) from any device (see above).
2. Through the week: your daughter opens **Practice** and works through a mode for a few minutes a day.
3. Mastered words show a "Mastered" badge on the home page &mdash; a nice visual reward.

## Notes

- Word pronunciation uses the browser's built-in text-to-speech, so quality depends on the device/browser (Chrome, Edge and Safari all support it well; make sure the device isn't muted).
- There's no login and no backend: all data lives in the published `data/words.json` file and, for practice progress, each device's browser storage.
- `manifest.json` pins this app's installable-webapp identity (`id`/`scope`/`start_url`) to `/spelling-quest/`, so "Add to Home Screen" treats it as a separate app from anything else hosted under the same `github.io` account (e.g. other GitHub Pages projects on the same username).
