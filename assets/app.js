// Shared utilities: local storage, GitHub sync, speech, small UI helpers.
const Store = {
  KEYS: {
    LIST: "sq_word_list",
    PROGRESS: "sq_progress",
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
};

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

// ---- Published word list ----
const GitHub = {
  // Reads the word list the same way every device does: a plain fetch of the
  // file as published by GitHub Pages (same origin, no auth, no CORS issues).
  // Words are added via the repo's `/add-words` Claude Code skill, which
  // commits data/words.json directly — this just picks up what it published.
  async loadLatest(path = "data/words.json") {
    try {
      const res = await fetch(path, { cache: "no-store" });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
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
