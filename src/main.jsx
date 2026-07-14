import React from "react";
import ReactDOM from "react-dom/client";
import LoomBuilder from "./LoomBuilder.jsx";

// window.storage shim backed by localStorage, so save/load/projects work in a browser
const P = "loombuilder:";
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
