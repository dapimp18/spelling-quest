---
name: add-words
description: Add this week's spelling words to the Spelling Quest app. Generates a kid-friendly memory hint and an example sentence for each word, writes them into data/words.json, then commits and pushes so the live GitHub Pages site updates. Use when the user gives a list of spelling words for the week, e.g. "/add-words cat, giraffe, necessary" or "here's this week's spelling list: ...".
---

# Add weekly spelling words

This repo is a static web app ("Spelling Quest") that reads its current word list from
`data/words.json`. This skill turns a raw list of words into a complete, practice-ready
list and publishes it.

## Steps

1. **Parse the input** the user gave (comma, newline, or numbered-list separated). Clean up
   stray punctuation/whitespace. If the user also gave a label for the week (e.g. "Week 7" or
   a date), use it; otherwise default the label to `Week of <coming Monday's date, "D MMMM">`.

2. **For each word, generate:**
   - `hint`: a short, kid-friendly memory aid aimed at a 9-11 year old (Y5-6). Prefer something
     that targets the specific tricky part of the word (a silent letter, a double letter, an
     unusual letter combination) over a generic mnemonic. Keep it to one short sentence/phrase.
     Examples already in the app: "one collar, two sleeves (1 c, 2 s)" for *necessary*, "big
     elephants are ugly" for *beautiful*.
   - `sentence`: one natural example sentence that uses the word, suitable for a child that age,
     using UK English spelling/vocabulary (this app's existing content uses UK conventions).
   - `id`: a short url-safe slug derived from the word (lowercase, non-letters stripped) plus the
     week's date, e.g. `necessary-2026-10-26`, so a repeated word in a later week gets a fresh id
     and fresh mastery tracking rather than silently reusing old progress.

3. **Write `data/words.json`**, replacing its current contents, matching this exact shape:
   ```json
   {
     "label": "Week of 26 October",
     "words": [
       { "id": "necessary-2026-10-26", "word": "necessary", "hint": "...", "sentence": "..." }
     ],
     "updatedAt": "<current ISO 8601 timestamp>"
   }
   ```

4. **Commit and push** directly to `main` (this has standing approval from the user — no need
   to ask each time this skill runs):
   ```bash
   git add data/words.json
   git commit -m "Add spelling words: <label>"
   git push
   ```
   Use the attribution footer from the system reminder in this session, if one is given.

5. **Confirm** to the user: list the words added with their generated hints, and note that the
   live site (GitHub Pages) will pick it up within about a minute. Remind them this doesn't touch
   any device's saved practice progress (mastery is tracked per device from the words' new ids).

## Notes

- If `data/words.json` or the repo isn't found in the current directory, say so rather than
  guessing a path.
- If the user's word list is empty or unparseable, ask them to resend it rather than guessing.
- Keep hints and sentences appropriately short — this renders on a phone-sized screen.
