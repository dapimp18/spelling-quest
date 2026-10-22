# Spelling Quest

A small, static web app for helping a child learn weekly spelling words: enter the list, then practice with **Look-Say-Cover-Write-Check**, **Listen & Spell** (dictation), and a mixed **Quick Quiz** mode. Built with plain HTML/CSS/JS so it can be hosted for free on GitHub Pages &mdash; no server, database or build step required.

## How it works

- **This Week's Words** (`manage.html`) &mdash; type in the words to learn, with an optional memory hint and example sentence.
- **Practice** (`practice.html`) &mdash; your daughter picks a mode and works through the list. Words she gets wrong come back around again in the same session; two correct answers in a row marks a word "mastered". The browser speaks each word aloud (via the Web Speech API) so she can practice by ear too.
- **Home** (`index.html`) &mdash; shows this week's list and how many words are mastered.

Progress and the word list are saved in the browser (`localStorage`), so they persist between visits on the same device.

### Using it across more than one device

If your daughter practices on a different device than the one you use to type in the words, turn on GitHub sync (in **This Week's Words → ⚙️ GitHub sync settings**):

1. Create a GitHub [fine-grained personal access token](https://github.com/settings/tokens?type=beta) scoped to **only this repository**, with **Contents: Read and write** permission, and an expiry date (90 days is a reasonable default &mdash; you'll just generate a new one when it expires).
2. In the app, fill in your GitHub username, this repo's name, and paste the token in. It's stored only in that browser's `localStorage` and is only ever sent to `api.github.com`.
3. Click **Save & sync to GitHub**. This commits `data/words.json` straight to the repo.
4. Any device that opens the published site will pick up the new list automatically (GitHub Pages usually updates within a minute of the push).

Only the device used to *edit* the list needs the token. Every device can *read* the published list with no token at all &mdash; it's just a file served by the site.

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

1. Sunday night: open **This Week's Words**, clear out last week's list (or just overwrite each field), type in the new words, add any hints, hit **Save** (or **Save & sync to GitHub** if using another device for practice).
2. Through the week: your daughter opens **Practice** and works through a mode for a few minutes a day.
3. Mastered words show a "Mastered" badge on the home page &mdash; a nice visual reward.

## Notes

- Word pronunciation uses the browser's built-in text-to-speech, so quality depends on the device/browser (Chrome, Edge and Safari all support it well; make sure the device isn't muted).
- There's no login and no backend: all data lives in the browser (and, optionally, in the `data/words.json` file in this repo if you turn on sync).
