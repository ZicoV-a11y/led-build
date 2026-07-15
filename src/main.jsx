import React from "react";
import ReactDOM from "react-dom/client";
import LoomBuilder from "./LoomBuilder.jsx";
import billyProject from "./billy_talent.json";

// window.storage shim backed by localStorage, so save/load/projects work in a browser
const P = "loombuilder:";

// one-time preload of the Billy Talent show, so it opens already loaded and also
// shows up under Projects. Guarded by a flag so it never overwrites later edits.
try {
  if (!localStorage.getItem(P + "__billy_seeded")) {
    localStorage.setItem(P + "loom-builder-show", JSON.stringify(billyProject.show));
    localStorage.setItem(P + "project:billy-talent", JSON.stringify(billyProject));
    localStorage.setItem(P + "__billy_seeded", "1");
  }
} catch { /* storage unavailable — app still starts fresh */ }
if (!window.storage) {
  window.storage = {
    async get(key) { const v = localStorage.getItem(P + key); return v == null ? null : { key, value: v }; },
    async set(key, value) { localStorage.setItem(P + key, value); return { key, value }; },
    async delete(key) { localStorage.removeItem(P + key); return { key, deleted: true }; },
    async list(prefix) {
      const out = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(P)) { const bare = k.slice(P.length); if (!prefix || bare.startsWith(prefix)) out.push(bare); }
      }
      return { keys: out };
    },
  };
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LoomBuilder />
  </React.StrictMode>
);
