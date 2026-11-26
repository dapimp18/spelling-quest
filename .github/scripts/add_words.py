#!/usr/bin/env python3
"""Turn an issue body's raw word list into data/words.json, using Claude to
generate hints and example sentences. Invoked by .github/workflows/add-words.yml.

Reads:
  ISSUE_BODY       - the GitHub issue body text
  ANTHROPIC_API_KEY - used implicitly by the anthropic client

Writes data/words.json and prints a short Markdown summary to stdout (the
workflow captures it for the confirmation comment).
"""
import json
import os
import re
import sys
from datetime import date, datetime, timedelta, timezone

import anthropic

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
WORDS_PATH = os.path.join(REPO_ROOT, "data", "words.json")


def fail(message):
    print(f"::error::{message}", file=sys.stderr)
    sys.exit(1)


def parse_field(body, field_name):
    match = re.search(rf"^{field_name}\s*:\s*(.*)$", body, re.IGNORECASE | re.MULTILINE)
    return match.group(1).strip() if match else ""


def parse_words(raw):
    parts = re.split(r"[,\n]+", raw)
    words = [p.strip() for p in parts if p.strip()]
    # de-duplicate while preserving order
    seen = set()
    unique = []
    for w in words:
        key = w.lower()
        if key not in seen:
            seen.add(key)
            unique.append(w)
    return unique


def coming_monday(today=None):
    today = today or date.today()
    days_ahead = (7 - today.weekday()) % 7  # Monday == 0
    if days_ahead == 0:
        days_ahead = 7
    return today + timedelta(days=days_ahead)


def slugify(word):
    return re.sub(r"[^a-z0-9]+", "", word.lower())


def generate_hints_and_sentences(words):
    client = anthropic.Anthropic()
    word_list = ", ".join(words)
    prompt = f"""You are writing spelling practice content for the "Spelling Quest" app, \
used by a child aged 9-11 (UK Year 5-6).

For each word below, produce:
- "hint": a short, kid-friendly memory aid that targets the specific tricky part of the \
word (a silent letter, a double letter, an unusual letter combination) rather than a \
generic mnemonic. One short phrase or sentence.
- "sentence": one natural example sentence using the word, suitable for a child that age, \
in UK English spelling and vocabulary.

Words (in this exact order): {word_list}

Respond with ONLY a JSON array, no markdown code fences, no commentary before or after, \
in this exact shape, one object per word, in the same order as given:
[{{"word": "...", "hint": "...", "sentence": "..."}}]"""

    response = client.messages.create(
        model="claude-opus-5-5",
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}],
    )

    text = "".join(block.text for block in response.content if block.type == "text").strip()
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip())

    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        fail(f"Could not parse Claude's response as JSON: {e}\nRaw response:\n{text}")

    if not isinstance(data, list) or len(data) != len(words):
        fail(f"Expected {len(words)} items back from Claude, got: {data!r}")

    return data


def main():
    body = os.environ.get("ISSUE_BODY", "")
    raw_words = parse_field(body, "Words")
    label = parse_field(body, "Label")

    words = parse_words(raw_words)
    if not words:
        fail("No words found in the issue body (expected a 'Words: ...' line).")

    monday = coming_monday()
    if not label:
        label = f"Week of {monday.strftime('%-d %B')}"
    date_suffix = monday.isoformat()

    generated = generate_hints_and_sentences(words)

    entries = []
    for original_word, item in zip(words, generated):
        entries.append({
            "id": f"{slugify(original_word)}-{date_suffix}",
            "word": original_word.lower(),
            "hint": item.get("hint", "").strip(),
            "sentence": item.get("sentence", "").strip(),
        })

    payload = {
        "label": label,
        "words": entries,
        "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
    }

    with open(WORDS_PATH, "w") as f:
        json.dump(payload, f, indent=2)
        f.write("\n")

    summary_lines = [f"**{label}** &mdash; {len(entries)} words published:", ""]
    summary_lines += [f"- **{e['word']}** &mdash; {e['hint']}" for e in entries]
    summary = "\n".join(summary_lines)

    github_output = os.environ.get("GITHUB_OUTPUT")
    if github_output:
        with open(github_output, "a") as f:
            f.write(f"label={label}\n")
            delimiter = "SUMMARY_EOF"
            f.write(f"summary<<{delimiter}\n{summary}\n{delimiter}\n")

    print(summary)


if __name__ == "__main__":
    main()
