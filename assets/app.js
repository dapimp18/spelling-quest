// Shared utilities: local storage, GitHub sync, speech, small UI helpers.
const Store = {
  KEYS: {
    LIST: "sq_word_list",
    PROGRESS: "sq_progress",
    GITHUB: "sq_github_config",
  },

  getList() {
    try {
      const raw = localStorage.getItem(this.KEYS.LIST);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setList(list) {
    localStorage.setItem(this.KEYS.LIST, JSON.stringify(list));
  },

  getProgress() {
    try {
      const raw = localStorage.getItem(this.KEYS.PROGRESS);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  setProgress(progress) {
    localStorage.setItem(this.KEYS.PROGRESS, JSON.stringify(progress));
  },

  resetProgress() {
    localStorage.removeItem(this.KEYS.PROGRESS);
  },

  getGithubConfig() {
    try {
      const raw = localStorage.getItem(this.KEYS.GITHUB);
      return raw ? JSON.parse(raw) : { owner: "", repo: "", token: "", path: "data/words.json" };
    } catch {
      return { owner: "", repo: "", token: "", path: "data/words.json" };
    }
  },

  setGithubConfig(cfg) {
    localStorage.setItem(this.KEYS.GITHUB, JSON.stringify(cfg));
  },
};

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

// ---- Speech ----
const Speech = {
  speak(text, { rate = 0.9 } = {}) {
    if (!("speechSynthesis" in window)) return false;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = rate;
    utter.lang = "en-GB";
    window.speechSynthesis.speak(utter);
    return true;
  },
};

// ---- GitHub sync ----
const GitHub = {
  api(cfg) {
    return `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}`;
  },

  // Reads the word list the same way every device does: a plain fetch of the
  // file as published by GitHub Pages (same origin, no auth, no CORS issues).
  // This is what makes "sync" work — once manage.html pushes a new file,
  // every device loading the site sees it on next load.
  async loadLatest(cfg) {
    const path = cfg?.path || "data/words.json";
    try {
      const res = await fetch(path, { cache: "no-store" });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async push(cfg, list) {
    if (!cfg.token || !cfg.owner || !cfg.repo) {
      throw new Error("Add your GitHub owner, repo and token in Settings first.");
    }
    // Need the current sha (if the file already exists) to update it.
    let sha = null;
    const existing = await fetch(this.api(cfg), {
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        Accept: "application/vnd.github+json",
      },
    });
    if (existing.status === 200) {
      const data = await existing.json();
      sha = data.sha;
    } else if (existing.status !== 404) {
      throw new Error(`GitHub read failed (${existing.status})`);
    }

    const body = {
      message: `Update spelling list: ${list.label || "weekly words"}`,
      content: btoa(unescape(encodeURIComponent(JSON.stringify(list, null, 2)))),
      ...(sha ? { sha } : {}),
    };

    const res = await fetch(this.api(cfg), {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `GitHub save failed (${res.status})`);
    }
    return true;
  },
};

// ---- Toast ----
function showToast(message, ms = 2600) {
  let el = document.getElementById("sq-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "sq-toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove("show"), ms);
}

// ---- Nav active state ----
document.addEventListener("DOMContentLoaded", () => {
  const here = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("nav.tabs a").forEach((a) => {
    const target = a.getAttribute("href");
    if (target === here) a.classList.add("active");
  });
});
