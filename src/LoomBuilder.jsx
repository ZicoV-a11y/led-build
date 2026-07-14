import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Cable, Plus, Trash2, Copy, X, Pencil, Check, ChevronDown, RotateCcw,
  ArrowUp, ArrowDown, Sun, Moon, ImagePlus, ClipboardPaste, Lock, Unlock, Maximize2, ZoomIn, ZoomOut, Undo2, Redo2,
  FolderOpen, Save, Download, Upload, Image as ImageIcon, Minus, GripVertical, BarChart3, Ruler, Tag,
  Calendar, MapPin, Plug, Wrench, Package, LayoutGrid, Monitor, Move, Zap, Square, Info, Pin
} from "lucide-react";

// load the app's fonts (Archivo + IBM Plex) wherever it runs; harmless if blocked
if (typeof document !== "undefined" && !document.getElementById("led-build-fonts")) {
  const l = document.createElement("link");
  l.id = "led-build-fonts";
  l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=IBM+Plex+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap";
  document.head.appendChild(l);
}


// ---------------- constants ----------------
const CABLE_TYPES = ["CAT5", "CAT6", "SOCA", "TRUE1"];
const LENGTHS = [5, 10, 25, 50, 100, 200, 300];
const POWER_TYPES = ["SOCA", "TRUE1"];
// Resistor color code, SOCA B..J = 1..9 (brown, red, orange, yellow, green, blue, violet, grey, white).
// A gets no color; K wraps back to B (1), L to C (2), and so on.
const RESISTOR_COLORS = ["#8b4513","#dc2626","#f97316","#facc15","#16a34a","#2563eb","#7c3aed","#6b7280","#f5f5f5"];
const socaLetterColor = (label) => {
  if (!label) return null;
  const m = String(label).match(/(?:^|\s)([A-Z])(?![A-Z])/i);
  if (!m) return null;
  const raw = m[1].toUpperCase().charCodeAt(0) - 65; // A=0, B=1, ..., Z=25
  if (raw === 0) return null; // A gets no color
  const idx = (raw - 1) % RESISTOR_COLORS.length; // B=0..J=8, K wraps to B, etc.
  return RESISTOR_COLORS[idx] || null;
};
// pick a contrasting label color for a resistor swatch
const contrastOn = (hex) => {
  const h = hex.replace("#","");
  const n = parseInt(h.length===3? h.split("").map(c=>c+c).join(""): h, 16);
  const r = (n>>16)&255, g = (n>>8)&255, b = n&255;
  const yiq = (r*299 + g*587 + b*114) / 1000;
  return yiq >= 150 ? "#111" : "#fff";
};

// colors resolve through CSS variables so both themes share one codebase
const TYPE_COLORS = {
  CAT5: { text: "var(--cat5)", border: "var(--cat5-b)", bg: "var(--cat5-bg)" },
  CAT6: { text: "var(--cat6)", border: "var(--cat6-b)", bg: "var(--cat6-bg)" },
  SOCA: { text: "var(--soca)", border: "var(--soca-b)", bg: "var(--soca-bg)" },
  TRUE1: { text: "var(--true1)", border: "var(--true1-b)", bg: "var(--true1-bg)" },
};
const ORANGE = "var(--orange)", ORANGE_B = "var(--orange-b)";
const GREEN = "var(--green)", GREEN_B = "var(--green-b)";
const PURPLE = "var(--purple)", PURPLE_B = "var(--purple-b)";
const BLUE = "var(--blue)";

const THEME_VARS = {
  light: {
    "--bg": "#E7E6E2", "--card": "#FAFAF8", "--border": "#C9C8C2", "--border-soft": "#E5E4DF",
    "--text": "#171715", "--sub": "#5F5E58", "--faint": "#8B8A84", "--thead": "#F0EFEA",
    "--input-bg": "#FFFFFF", "--header-bg": "#171715", "--tab-bg": "#ECEBE6", "--tab-text": "#45443F",
    "--toggle-off": "#C9C8C2", "--primary": "#15803D", "--blue": "#1D4ED8",
    "--blue-b": "#A9BEF2", "--blue-bg": "#E7EDFB",
    "--orange": "#C2410C", "--orange-b": "#EFB49A",
    "--green": "#15803D", "--green-b": "#9CCFAD",
    "--purple": "#6D28D9", "--purple-b": "#CBB8F0",
    "--danger": "#B91C1C", "--danger-b": "#E9A8A8",
    "--cat5": "#15803D", "--cat5-b": "#9CCFAD", "--cat5-bg": "#E3F1E5",
    "--cat6": "#1565C0", "--cat6-b": "#A9C4EE", "--cat6-bg": "#E6EEFB",
    "--soca": "#C2410C", "--soca-b": "#EFB49A", "--soca-bg": "#FBE9DD",
    "--true1": "#C2185B", "--true1-b": "#EBA8C6", "--true1-bg": "#FAE4EE",
    "--amber": "#B45309", "--amber-b": "#E2BC7E", "--amber-bg": "#F8EEDC",
  },
  dark: {
    "--bg": "#131311", "--card": "#1C1C19", "--border": "#3C3C36", "--border-soft": "#2A2A25",
    "--text": "#F2F1ED", "--sub": "#97968F", "--faint": "#6E6D66", "--thead": "#232320",
    "--input-bg": "#161613", "--header-bg": "#0B0B09", "--tab-bg": "#262622", "--tab-text": "#CFCEC8",
    "--toggle-off": "#4A4A44", "--primary": "#1F8A47", "--blue": "#7AA5F8",
    "--blue-b": "#2C4373", "--blue-bg": "#17233D",
    "--orange": "#FB923C", "--orange-b": "#6B3410",
    "--green": "#4ADE80", "--green-b": "#1E5233",
    "--purple": "#A78BFA", "--purple-b": "#46337A",
    "--danger": "#F87171", "--danger-b": "#6E2020",
    "--cat5": "#4ADE80", "--cat5-b": "#1E5233", "--cat5-bg": "#102B19",
    "--cat6": "#60A5FA", "--cat6-b": "#23406E", "--cat6-bg": "#14243F",
    "--soca": "#FB923C", "--soca-b": "#6B3410", "--soca-bg": "#3A1E0C",
    "--true1": "#F472B6", "--true1-b": "#7A2450", "--true1-bg": "#3B1229",
    "--amber": "#F5A93B", "--amber-b": "#6E4A12", "--amber-bg": "#38290F",
  },
};

// sequential shade ramps per cable type: index 0 = 5', index 6 = 300'.
// steps of one hue, light -> deep, so lengths of the same type read as a family.
const LEN_RAMPS = {
  light: {
    cat5: ["#66BB6A", "#4CAF50", "#43A047", "#388E3C", "#2E7D32", "#1B5E20", "#0F3D13"],
    cat6: ["#42A5F5", "#2196F3", "#1E88E5", "#1976D2", "#1565C0", "#0D47A1", "#092E67"],
    soca: ["#FFA726", "#FB8C00", "#F57C00", "#EF6C00", "#E65100", "#BF360C", "#8C2708"],
    true1: ["#EC407A", "#E91E63", "#D81B60", "#C2185B", "#AD1457", "#880E4F", "#5E0936"],
  },
  dark: {
    cat5: ["#A5D6A7", "#81C784", "#66BB6A", "#4CAF50", "#388E3C", "#2E7D32", "#1B5E20"],
    cat6: ["#90CAF9", "#64B5F6", "#42A5F5", "#1E88E5", "#1565C0", "#0D47A1", "#08306B"],
    soca: ["#FFCC80", "#FFB74D", "#FFA726", "#FB8C00", "#EF6C00", "#E65100", "#BF360C"],
    true1: ["#F48FB1", "#F06292", "#EC407A", "#E91E63", "#C2185B", "#AD1457", "#880E4F"],
  },
};
Object.entries(LEN_RAMPS).forEach(([theme, ramps]) => {
  Object.entries(ramps).forEach(([t, steps]) => {
    steps.forEach((hex, i) => { THEME_VARS[theme][`--${t}-l${i}`] = hex; });
  });
});

const HW_PRESETS = [
  { id: "bumper", label: "BUMPER", variants: ["Single", "Double", "4-Wide"] },
  { id: "chicago", label: "CHICAGO", variants: [] },
  { id: "gacflex", label: "GAC FLEX", variants: ["3ft", "4ft", "6ft", "8ft"] },
  { id: "shackle", label: "5/8 SHACKLE", variants: [] },
  { id: "sling", label: "SLING", variants: [] },
];

const UTIL_PRESETS = [
  { id: "jump", label: "CAT5 JUMP", variants: ["3ft", "5ft"] },
  { id: "coupler", label: "CAT COUPLER", variants: [] },
  { id: "twofer", label: "TRUE1 2-FER", variants: [] },
  { id: "splay", label: "208 SOCA SPLAY", variants: [] },
];

// each placed overlay item gets its own color
const MARK_COLORS = { jump: "var(--cat5)", coupler: "var(--purple)", twofer: "var(--true1)", splay: "var(--soca)" };
const markKind = (name) =>
  name?.startsWith("CAT5 Jump") ? "jump"
  : name?.startsWith("CAT Coupler") ? "coupler"
  : name?.startsWith("TRUE1") ? "twofer"
  : name?.startsWith("208 SOCA") ? "splay" : null;

// different lengths wear different shades of the type color: 5' palest, 300' full
const lenT = (len) => {
  const i = LENGTHS.indexOf(Number(len));
  return i < 0 ? 1 : i / (LENGTHS.length - 1);
};
const lenShade = (base, len) => {
  const t = /cat6/.test(base) ? "cat6"
    : /cat5/.test(base) ? "cat5"
    : /soca/.test(base) ? "soca"
    : /true1/.test(base) ? "true1" : null;
  if (!t) return base;
  return `var(--${t}-l${Math.round(lenT(len) * 6)})`;
};
const lineLen = (l) => l.len ?? (Number((l.name || "").match(/(\d+)'/)?.[1]) || null);

const utilItemName = (presetId, variant) => {
  switch (presetId) {
    case "jump": return `CAT5 Jump ${variant}`;
    case "coupler": return "CAT Coupler";
    case "twofer": return "TRUE1 2-Fer";
    case "splay": return "208 SOCA Splay";
    default: return "Item";
  }
};

const hwItemName = (presetId, variant) => {
  switch (presetId) {
    case "bumper": return `Bumper (${variant})`;
    case "chicago": return "Chicago";
    case "gacflex": return `GAC Flex ${variant}`;
    case "shackle": return '5/8" Shackle';
    case "sling": return "Sling";
    default: return "Item";
  }
};

// "A1" -> "A2", "SOCA 1" -> "SOCA 2", "SOCA B" -> "SOCA C", "TRUE1 Z" -> "TRUE1 AA".
// A trailing letter only counts when it stands alone (whole label, or after a space/dash),
// so "SOCA" stays "SOCA" instead of becoming "SOCB".
const nextLabel = (label) => {
  const s = label.trimEnd();
  const num = s.match(/^(.*?)(\d+)$/);
  if (num) return num[1] + (parseInt(num[2], 10) + 1);
  const letter = s.match(/^(.*?[^A-Za-z0-9]|)([A-Za-z])$/);
  if (letter) {
    const ch = letter[2];
    if (ch === "z") return letter[1] + "aa";
    if (ch === "Z") return letter[1] + "AA";
    return letter[1] + String.fromCharCode(ch.charCodeAt(0) + 1);
  }
  return label;
};

const uid = () => Math.random().toString(36).slice(2, 10);
const cable = (label, type, length, notes = "") => ({ id: uid(), label, type, length, notes });

// shrink uploaded photos so they fit comfortably in saved-show storage
const compressImage = (file, maxDim = 1400, quality = 0.75) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        let out = canvas.toDataURL("image/jpeg", quality);
        if (out.length > 2500000) out = canvas.toDataURL("image/jpeg", 0.5);
        resolve(out);
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const emptyShow = () => ({
  name: "New Show",
  venue: "",
  dates: "",
  dark: false,
  walls: [{ id: uid(), name: "Wall 1", looms: [], individual: [] }],
});

const STORAGE_KEY = "loom-builder-show";

const loomKind = (l) => {
  const p = l.power.length > 0, d = l.data.length > 0;
  if (p && d) return { label: "COMBINED", color: GREEN };
  if (p) return { label: "POWER ONLY", color: ORANGE };
  if (d) return { label: "DATA ONLY", color: GREEN };
  return { label: "EMPTY", color: "var(--faint)" };
};

// ---------------- tiny ui bits ----------------
const Btn = ({ children, onClick, variant = "ghost", style = {} }) => {
  const variants = {
    primary: { background: "var(--primary)", borderColor: "var(--primary)", color: "#fff" },
    danger: { background: "var(--card)", borderColor: "var(--danger-b)", color: "var(--danger)" },
    ghost: {},
  };
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
      borderRadius: 0, fontSize: 12.5, fontWeight: 700, letterSpacing: 0.4, padding: "8px 14px",
      border: "2px solid var(--border)", background: "var(--card)", color: "var(--text)",
      fontFamily: "inherit", ...variants[variant], ...style,
    }}>{children}</button>
  );
};

const IconBtn = ({ children, onClick, title }) => (
  <button onClick={onClick} title={title} style={{
    background: "none", border: "none", cursor: "pointer", padding: 4,
    display: "inline-flex", alignItems: "center", color: "var(--sub)",
  }}>{children}</button>
);

const Toggle = ({ on, onChange, color, title }) => (
  <button onClick={onChange} title={title} style={{
    width: 36, height: 20, borderRadius: 0, border: "none", cursor: "pointer",
    background: on ? color : "var(--toggle-off)", position: "relative", padding: 0, flexShrink: 0,
  }}>
    <span style={{
      position: "absolute", top: 2, left: on ? 18 : 2, width: 16, height: 16,
      borderRadius: 0, background: "#fff", transition: "left .15s ease",
      boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
    }} />
  </button>
);

const EditableText = ({ value, onChange, style = {}, placeholder, trailing = null }) => {
  const [editing, setEditing] = useState(false);
  if (editing) return (
    <input autoFocus value={value} placeholder={placeholder}
      size={Math.max((value || "").length, (placeholder || "").length, 4)}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => setEditing(false)}
      onKeyDown={(e) => e.key === "Enter" && setEditing(false)}
      style={{
        border: "1px solid var(--border)", borderRadius: 0, padding: "3px 8px",
        fontFamily: "inherit", background: "var(--input-bg)", color: "var(--text)",
        width: "auto", ...style,
      }} />
  );
  return (
    <span onDoubleClick={() => setEditing(true)} title="Double-click to edit"
      style={{ cursor: "text", display: "inline-flex", alignItems: "center", gap: 6, userSelect: "none", ...style }}>
      {value || <span style={{ color: "var(--faint)" }}>{placeholder}</span>}
      {trailing}
    </span>
  );
};

const th = { textAlign: "left", padding: "7px 10px", fontWeight: 600 };
const td = { padding: "8px 10px", color: "var(--text)" };

// like EditableText, but offers existing names from the project as one-click options
const EditableName = ({ value, onChange, suggestions = [], style = {}, placeholder }) => {
  const [editing, setEditing] = useState(false);
  const origRef = useRef(value);
  const startEdit = () => { origRef.current = value; setEditing(true); };
  if (editing) {
    const others = suggestions.filter((s) => s !== value);
    const filtered = value === origRef.current
      ? others
      : others.filter((s) => s.toLowerCase().includes(value.toLowerCase()));
    return (
      <span style={{ position: "relative", display: "inline-block" }}>
        <input autoFocus value={value} placeholder={placeholder}
          size={Math.max((value || "").length, (placeholder || "").length, 4)}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => e.key === "Enter" && setEditing(false)}
          style={{
            border: "1px solid var(--border)", borderRadius: 0, padding: "3px 8px",
            fontFamily: "inherit", background: "var(--input-bg)", color: "var(--text)",
            width: "auto", ...style,
          }} />
        {filtered.length > 0 && (
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 500,
            background: "var(--card)", border: "1px solid var(--border)", borderRadius: 0,
            boxShadow: "0 6px 18px rgba(0,0,0,0.25)", minWidth: 180, maxHeight: 220,
            overflowY: "auto", padding: 4,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: "var(--faint)", padding: "4px 8px" }}>
              NAMES IN THIS SHOW
            </div>
            {filtered.map((s) => (
              <div key={s}
                onMouseDown={(e) => { e.preventDefault(); onChange(s); setEditing(false); }}
                style={{
                  padding: "6px 8px", borderRadius: 0, fontSize: 13, fontWeight: 600,
                  cursor: "pointer", color: "var(--text)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--tab-bg)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                {s}
              </div>
            ))}
          </div>
        )}
      </span>
    );
  }
  return (
    <span onDoubleClick={startEdit} title="Double-click to edit"
      style={{ cursor: "text", display: "inline-flex", alignItems: "center", gap: 6, ...style }}>
      {value || <span style={{ color: "var(--faint)" }}>{placeholder}</span>}
    </span>
  );
};


// ---- photo geometry helpers ----
const containRect = (boxW, boxH, imgW, imgH) => {
  const s = Math.min(boxW / imgW, boxH / imgH);
  const w = imgW * s, h = imgH * s;
  return { x: (boxW - w) / 2, y: (boxH - h) / 2, w, h };
};

const cropImageToDataUrl = (src, rect) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(rect.w));
    canvas.height = Math.max(1, Math.round(rect.h));
    canvas.getContext("2d").drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, canvas.width, canvas.height);
    resolve(canvas.toDataURL("image/jpeg", 0.88));
  };
  img.onerror = reject;
  img.src = src;
});

const pvBtn = (disabled) => ({
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  width: 26, height: 24, borderRadius: 0, border: "1px solid var(--border)",
  background: "var(--card)", color: "var(--text)", cursor: disabled ? "default" : "pointer",
  opacity: disabled ? 0.4 : 1, fontFamily: "inherit", padding: 0,
});

// self-contained zoomable photo tile: drag a box -> Zoom tab -> crop; +/- zoom; lock; reset
const PhotoViewer = ({
  photo, label, onRemove, onMinimize, onLightbox,
  marks = [], onAddMark, onRemoveMark,
  lines = [], onAddLine, onRemoveLine, onKeepCrop, indLocked = false, tall = false, ar = null,
  pinned = false, onPin = null, onRename = null,
}) => {
  const boxRef = useRef(null);
  const selRef = useRef(null);
  const draggedRef = useRef(false);
  const hadPendingRef = useRef(false);
  const fullDimsRef = useRef(null);
  const cropRef = useRef(null);
  const [crop, setCropState] = useState(null);
  const [zoomX, setZoomX] = useState(1);
  const [locked, setLocked] = useState(false);
  const [sel, setSel] = useState(null);
  const [pendingSel, setPendingSel] = useState(null);
  const [hover, setHover] = useState(false);
  const [viewScale, setViewScale] = useState(1);
  const [utilItem, setUtilItem] = useState(null);   // preset id while placing utilities
  const [utilVariant, setUtilVariant] = useState("3ft");
  const [cableMode, setCableMode] = useState(false); // drawing cable lines
  const [activeTool, setActiveTool] = useState(null); // "util" | "cable" — which one a click uses when both are open
  const [cableType, setCableType] = useState("CAT5");
  const [cableLen, setCableLen] = useState(25);
  const [cableLabel, setCableLabel] = useState("");
  const [lineStart, setLineStart] = useState(null);  // full-image fractions of the first click
  const [cursorPx, setCursorPx] = useState(null);    // live preview endpoint (view px)
  const [, setImgDims] = useState(null);            // rerender once the image loads so marks can position

  const setCrop = (c) => { cropRef.current = c; setCropState(c); };
  useEffect(() => { selRef.current = sel; }, [sel]);

  useEffect(() => {
    setCrop(null); setSel(null); setPendingSel(null); setZoomX(1); setViewScale(1);
    fullDimsRef.current = null;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      fullDimsRef.current = { w: img.naturalWidth, h: img.naturalHeight };
      setImgDims(fullDimsRef.current);
    };
    img.src = photo.src;
    return () => { cancelled = true; };
  }, [photo.src]);

  const resetView = () => { setCrop(null); setPendingSel(null); setZoomX(1); setViewScale(1); };

  // make the current framing permanent: the crop becomes the photo itself
  const keepCrop = () => {
    const c = cropRef.current, full = fullDimsRef.current;
    if (!c || !full) return;
    const mapX = (fx) => (fx * full.w - (c.ox || 0)) / c.w;
    const mapY = (fy) => (fy * full.h - (c.oy || 0)) / c.h;
    const inR = (v) => v >= -0.02 && v <= 1.02;
    const cl = (v) => Math.min(1, Math.max(0, v));
    const newMarks = marks
      .map((m) => ({ ...m, x: mapX(m.x), y: mapY(m.y) }))
      .filter((m) => inR(m.x) && inR(m.y))
      .map((m) => ({ ...m, x: cl(m.x), y: cl(m.y) }));
    const newLines = lines
      .map((l) => ({ ...l, x1: mapX(l.x1), y1: mapY(l.y1), x2: mapX(l.x2), y2: mapY(l.y2) }))
      .filter((l) => (inR(l.x1) && inR(l.y1)) || (inR(l.x2) && inR(l.y2)))
      .map((l) => ({ ...l, x1: cl(l.x1), y1: cl(l.y1), x2: cl(l.x2), y2: cl(l.y2) }));
    onKeepCrop?.({ src: c.src, marks: newMarks, lines: newLines });
    // the src change resets the view; the framed image is now the photo
  };

  // current on-screen rect of the image content, plus crop context
  const viewRect = () => {
    const box = boxRef.current, full = fullDimsRef.current;
    const dims = cropRef.current || full;
    if (!box || !full || !dims) return null;
    const b = containRect(box.clientWidth, box.clientHeight, dims.w, dims.h);
    return {
      cr: {
        x: b.x - (b.w * (viewScale - 1)) / 2, y: b.y - (b.h * (viewScale - 1)) / 2,
        w: b.w * viewScale, h: b.h * viewScale,
      },
      full, cropNow: cropRef.current,
    };
  };
  // full-image fractions -> view px (through the crop when zoomed)
  const fullToView = (fx, fy, v) => {
    const c = v.cropNow;
    const gx = c ? (fx * v.full.w - (c.ox || 0)) / c.w : fx;
    const gy = c ? (fy * v.full.h - (c.oy || 0)) / c.h : fy;
    return {
      x: v.cr.x + gx * v.cr.w, y: v.cr.y + gy * v.cr.h,
      vis: gx >= -0.05 && gx <= 1.05 && gy >= -0.05 && gy <= 1.05,
    };
  };
  // a click event -> full-image fractions, or null when outside the image
  const eventToFull = (e) => {
    const v = viewRect();
    if (!v) return null;
    const r = boxRef.current.getBoundingClientRect();
    let xf = (e.clientX - r.left - v.cr.x) / v.cr.w;
    let yf = (e.clientY - r.top - v.cr.y) / v.cr.h;
    if (xf < 0 || xf > 1 || yf < 0 || yf > 1) return null;
    if (v.cropNow) {
      xf = (v.cropNow.ox + xf * v.cropNow.w) / v.full.w;
      yf = (v.cropNow.oy + yf * v.cropNow.h) / v.full.h;
    }
    return { xf, yf };
  };
  const zoomed = !!crop || viewScale > 1;

  const startSelect = (e) => {
    if (utilItem || cableMode || locked || e.button !== 0 || !boxRef.current) return;
    hadPendingRef.current = !!pendingSel;
    draggedRef.current = false;
    setPendingSel(null);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const r = boxRef.current.getBoundingClientRect();
    setSel({ x0: e.clientX - r.left, y0: e.clientY - r.top, x1: e.clientX - r.left, y1: e.clientY - r.top });
  };

  const dragMove = (e) => {
    if (!selRef.current || !boxRef.current) return;
    const r = boxRef.current.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - r.left, 0), r.width);
    const y = Math.min(Math.max(e.clientY - r.top, 0), r.height);
    setSel((s) => (s ? { ...s, x1: x, y1: y } : s));
  };

  const dragEnd = () => {
    const s = selRef.current;
    if (!s) return;
    setSel(null);
    const box = boxRef.current;
    if (!box || !fullDimsRef.current) return;
    const r = box.getBoundingClientRect();
    const x0 = Math.min(s.x0, s.x1), y0 = Math.min(s.y0, s.y1);
    const w = Math.abs(s.x1 - s.x0), h = Math.abs(s.y1 - s.y0);
    if (w < 8 || h < 8) {
      if (!hadPendingRef.current) onLightbox(cropRef.current ? cropRef.current.src : photo.src);
      return;
    }
    draggedRef.current = true;
    const dims = cropRef.current || fullDimsRef.current;
    const src = cropRef.current ? cropRef.current.src : photo.src;
    const baseCr = containRect(r.width, r.height, dims.w, dims.h);
    const cr = {
      x: baseCr.x - (baseCr.w * (viewScale - 1)) / 2,
      y: baseCr.y - (baseCr.h * (viewScale - 1)) / 2,
      w: baseCr.w * viewScale,
      h: baseCr.h * viewScale,
    };
    const sx0 = Math.max(x0, cr.x), sy0 = Math.max(y0, cr.y);
    const sx1 = Math.min(x0 + w, cr.x + cr.w), sy1 = Math.min(y0 + h, cr.y + cr.h);
    const sw = sx1 - sx0, sh = sy1 - sy0;
    if (sw < 4 || sh < 4) return;
    const scale = dims.w / cr.w;
    setPendingSel({
      screen: { x: sx0, y: sy0, w: sw, h: sh },
      rect: { x: (sx0 - cr.x) * scale, y: (sy0 - cr.y) * scale, w: sw * scale, h: sh * scale },
      dims, src,
    });
  };

  const applyZoom = async () => {
    const p = pendingSel;
    if (!p) return;
    setPendingSel(null);
    try {
      const dataUrl = await cropImageToDataUrl(p.src, p.rect);
      setCrop({
        src: dataUrl, w: Math.round(p.rect.w), h: Math.round(p.rect.h),
        // cumulative offset inside the ORIGINAL image, so utility marks keep working
        ox: (cropRef.current?.ox || 0) + p.rect.x,
        oy: (cropRef.current?.oy || 0) + p.rect.y,
      });
      setZoomX((z) => z * (p.dims.w / p.rect.w));
      setViewScale(1);
    } catch { /* keep previous view */ }
  };

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 0, overflow: "hidden", background: "var(--card)" }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "6px 8px", borderBottom: "1px solid var(--border)", gap: 6, flexWrap: "wrap",
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--sub)", display: "inline-flex", alignItems: "center", gap: 6 }}>
          {onRename
            ? <EditableName value={label} onChange={onRename}
                suggestions={["DATA", "POWER", "SYSTEM"]}
                placeholder="Photo name"
                style={{ fontSize: 12, fontWeight: 700, color: "var(--sub)" }} />
            : label}
          {zoomed && (
            <span style={{
              fontSize: 10.5, fontWeight: 700, color: "var(--text)",
              background: "var(--tab-bg)", borderRadius: 0, padding: "2px 6px",
            }}>{(zoomX * viewScale).toFixed(1)}&times;</span>
          )}
        </span>
        <span style={{ display: "inline-flex", gap: 3 }}>
          <button title="Zoom out" disabled={viewScale <= 1}
            onClick={() => setViewScale((v) => Math.max(v / 1.4, 1))} style={pvBtn(viewScale <= 1)}>
            <ZoomOut size={13} />
          </button>
          <button title="Zoom in" disabled={viewScale >= 8}
            onClick={() => setViewScale((v) => Math.min(v * 1.4, 8))} style={pvBtn(viewScale >= 8)}>
            <ZoomIn size={13} />
          </button>
          <button title="Reset to full view" disabled={!zoomed} onClick={resetView} style={pvBtn(!zoomed)}>
            <Maximize2 size={13} />
          </button>
          <button
            title={crop ? "Keep this framing — the photo is cropped for good"
              : "Drag-frame a region first, then keep it"}
            disabled={!crop || locked}
            onClick={keepCrop}
            style={{
              ...pvBtn(!crop || locked),
              ...(crop && !locked ? { background: "var(--cat5-bg)", borderColor: "var(--cat5)", color: "var(--cat5)" } : {}),
            }}>
            <Check size={13} />
          </button>
          <button title={locked ? "Unlock zoom selection" : "Lock the current view"}
            onClick={() => setLocked((l) => !l)}
            style={{ ...pvBtn(false), ...(locked ? { background: "var(--orange)", borderColor: "var(--orange)", color: "#fff" } : {}) }}>
            {locked ? <Lock size={13} /> : <Unlock size={13} />}
          </button>
          {!tall && (
            <button title="Open the full-size editor" onClick={() => onLightbox?.()} style={pvBtn(false)}>
              <ImageIcon size={13} />
            </button>
          )}
          {onPin && !tall && (
            <button
              title={pinned ? "Unpin from Quick Add" : "Pin beside Quick Add for close access"}
              onClick={() => onPin()}
              style={{
                ...pvBtn(false),
                ...(pinned ? { background: "var(--blue-bg)", borderColor: BLUE, color: BLUE } : {}),
              }}>
              <Pin size={13} />
            </button>
          )}
          <button
            title={locked ? "Unlock the photo to place utilities"
              : utilItem ? "Done placing utilities"
              : "Place utilities on the photo"}
            disabled={locked}
            onClick={() => {
              setUtilItem((u) => {
                const next = u ? null : "jump";
                setActiveTool(next ? "util" : (cableMode ? "cable" : null));
                return next;
              });
              setUtilVariant("3ft");
            }}
            style={{
              ...pvBtn(locked),
              ...(utilItem ? { background: "var(--true1)", borderColor: "var(--true1)", color: "#fff" } : {}),
            }}>
            <Tag size={13} />
          </button>
          <button
            title={locked ? "Unlock the photo to draw cables"
              : cableMode ? "Done drawing cables"
              : "Draw cable runs on the photo"}
            disabled={locked}
            onClick={() => {
              setCableMode((m) => {
                const next = !m;
                setActiveTool(next ? "cable" : (utilItem ? "util" : null));
                if (!next) { setLineStart(null); setCursorPx(null); }
                return next;
              });
            }}
            style={{
              ...pvBtn(locked),
              ...(cableMode ? { background: "var(--cat5)", borderColor: "var(--cat5)", color: "#fff" } : {}),
            }}>
            <Cable size={13} />
          </button>
          <button title="Minimize" onClick={onMinimize} style={pvBtn(false)}><Minus size={13} /></button>
          <button title="Remove photo" onClick={onRemove} style={{ ...pvBtn(false), color: "var(--danger)" }}><X size={14} /></button>
        </span>
      </div>
      {utilItem && !locked && (
        <div onClick={() => setActiveTool("util")} style={{
          display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center",
          padding: "6px 8px", borderBottom: "1px solid var(--border)", background: "var(--thead)",
          borderLeft: `3px solid ${(!cableMode || activeTool === "util") ? "var(--true1)" : "transparent"}`,
          opacity: cableMode && activeTool === "cable" ? 0.55 : 1, cursor: "pointer",
        }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: "var(--true1)", letterSpacing: 0.4 }}>PLACE:</span>
          {UTIL_PRESETS.map((p) => {
            const pc = MARK_COLORS[p.id] || "var(--true1)";
            return (
              <button key={p.id}
                onClick={() => { setUtilItem(p.id); setUtilVariant(p.variants[0] || ""); }}
                style={{
                  padding: "3px 8px", borderRadius: 0, fontWeight: 700, fontSize: 10.5, cursor: "pointer",
                  border: `1.5px solid ${utilItem === p.id ? pc : "var(--border)"}`,
                  background: utilItem === p.id ? "var(--thead)" : "var(--card)",
                  color: pc, fontFamily: "inherit",
                  boxShadow: utilItem === p.id ? `0 0 0 1.5px ${pc}` : "none",
                }}>{p.label}</button>
            );
          })}
          {(UTIL_PRESETS.find((p) => p.id === utilItem)?.variants.length > 0) &&
            UTIL_PRESETS.find((p) => p.id === utilItem).variants.map((v) => (
              <button key={v} onClick={() => setUtilVariant(v)} style={{
                padding: "3px 7px", borderRadius: 0, fontWeight: 700, fontSize: 10.5, cursor: "pointer",
                border: `1.5px solid ${utilVariant === v ? BLUE : "var(--blue-b)"}`,
                background: utilVariant === v ? "var(--blue-bg)" : "var(--card)",
                color: BLUE, fontFamily: "inherit",
              }}>{v}</button>
            ))}
          <span style={{ fontSize: 10.5, color: "var(--faint)" }}>
            {cableMode && activeTool === "cable" ? "click this bar to switch to utilities" : "click the photo to drop it"}
          </span>
        </div>
      )}
      {cableMode && !locked && (
        <div onClick={() => setActiveTool("cable")} style={{
          display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center",
          padding: "6px 8px", borderBottom: "1px solid var(--border)", background: "var(--thead)",
          borderLeft: `3px solid ${(!utilItem || activeTool === "cable") ? "var(--cat5)" : "transparent"}`,
          opacity: utilItem && activeTool !== "cable" ? 0.55 : 1, cursor: "pointer",
        }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: "var(--cat5)", letterSpacing: 0.4 }}>CABLE:</span>
          {CABLE_TYPES.map((t) => (
            <button key={t} onClick={() => setCableType(t)} style={{
              padding: "3px 8px", borderRadius: 0, fontWeight: 700, fontSize: 10.5, cursor: "pointer",
              border: `1.5px solid ${cableType === t ? TYPE_COLORS[t].text : TYPE_COLORS[t].border}`,
              background: cableType === t ? TYPE_COLORS[t].bg : "var(--card)",
              color: TYPE_COLORS[t].text, fontFamily: "inherit",
            }}>{t}</button>
          ))}
          <span style={{ width: 6 }} />
          {LENGTHS.map((L) => {
            const sc = lenShade(TYPE_COLORS[cableType]?.text || "var(--cat5)", L);
            return (
              <button key={L} onClick={() => setCableLen(L)} style={{
                padding: "3px 7px", borderRadius: 0, fontWeight: 700, fontSize: 10.5, cursor: "pointer",
                border: `1.5px solid ${sc}`,
                background: cableLen === L ? sc : "var(--card)",
                color: cableLen === L ? "#fff" : sc,
                fontFamily: "inherit",
              }}>{L}&rsquo;</button>
            );
          })}
          <input value={cableLabel} onChange={(e) => setCableLabel(e.target.value)}
            placeholder="label (opt.)"
            style={{ ...inp, width: 84, padding: "3px 8px", fontSize: 10.5 }} />
          <span style={{ fontSize: 10.5, color: "var(--faint)" }}>
            {utilItem && activeTool !== "cable" ? "click this bar to switch to cables"
              : lineStart ? "click the end point" : "click the start point"}
          </span>
          {indLocked && (
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--danger)" }}>
              Cables section is locked — lines draw, but no cable gets added.
            </span>
          )}
        </div>
      )}
      <div ref={boxRef}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onPointerDown={startSelect}
        onPointerMove={(e) => {
          if (cableMode && lineStart && boxRef.current) {
            const r = boxRef.current.getBoundingClientRect();
            setCursorPx({ x: e.clientX - r.left, y: e.clientY - r.top });
          }
          dragMove(e);
        }}
        onPointerUp={dragEnd}
        onPointerCancel={() => setSel(null)}
        onClick={(e) => {
          if (draggedRef.current) { draggedRef.current = false; return; }
          const useUtil = utilItem && !locked && !(cableMode && activeTool === "cable");
          if (useUtil) {
            const pt = eventToFull(e);
            if (pt) onAddMark?.(pt.xf, pt.yf, utilItemName(utilItem, utilVariant), utilItem);
            return;
          }
          if (cableMode && !locked) {
            const pt = eventToFull(e);
            if (!pt) return;
            if (!lineStart) {
              setLineStart(pt);
            } else {
              onAddLine?.({
                x1: lineStart.xf, y1: lineStart.yf, x2: pt.xf, y2: pt.yf,
                type: cableType, len: cableLen, label: cableLabel,
                name: `${cableLabel ? cableLabel + " " : ""}${cableType} ${cableLen}'`,
              });
              setLineStart(null); setCursorPx(null);
            }
            return;
          }
          if (locked && !tall) onLightbox?.();
        }}
        title={locked ? "Locked — click to view full size" : undefined}
        style={{
          position: "relative", width: "100%", overflow: "hidden",
          ...(tall
            ? { height: "min(72vh, 920px)" }
            : ar != null && ar > 2.2
              ? { aspectRatio: String(ar), maxHeight: 340, height: "auto" }
              : { height: 280 }),
          background: "var(--thead)",
          cursor: (utilItem || cableMode) && !locked ? "copy" : locked ? "zoom-in" : "crosshair", userSelect: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
        <img src={crop ? crop.src : photo.src} alt={label} draggable={false}
          style={{
            width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none",
            transform: `scale(${viewScale})`, transition: "transform .2s ease",
          }} />

        {(lines.length > 0 || (cableMode && lineStart)) && (() => {
          const v = viewRect();
          if (!v) return null;
          const start = lineStart ? fullToView(lineStart.xf, lineStart.yf, v) : null;
          return (
            <>
              <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 3 }}>
                {lines.map((ln) => {
                  const a = fullToView(ln.x1, ln.y1, v), b2 = fullToView(ln.x2, ln.y2, v);
                  if (!a.vis && !b2.vis) return null;
                  const col = lenShade(TYPE_COLORS[ln.type]?.text || "var(--cat5)", lineLen(ln));
                  return (
                    <line key={ln.id} x1={a.x} y1={a.y} x2={b2.x} y2={b2.y}
                      stroke={col} strokeWidth={2.5} strokeOpacity={0.95} strokeLinecap="round" />
                  );
                })}
                {start && cursorPx && (
                  <line x1={start.x} y1={start.y} x2={cursorPx.x} y2={cursorPx.y}
                    stroke={lenShade(TYPE_COLORS[cableType]?.text || "var(--cat5)", cableLen)}
                    strokeWidth={2} strokeDasharray="6 5" strokeOpacity={0.85} />
                )}
                {start && <circle cx={start.x} cy={start.y} r={4}
                  fill={lenShade(TYPE_COLORS[cableType]?.text || "var(--cat5)", cableLen)} />}
              </svg>
              {lines.map((ln) => {
                const a = fullToView(ln.x1, ln.y1, v), b2 = fullToView(ln.x2, ln.y2, v);
                if (!a.vis && !b2.vis) return null;
                return (
                  <div key={`lbl-${ln.id}`}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); if (!locked) onRemoveLine?.(ln.id); }}
                    title={locked ? ln.name : `${ln.name} — click to remove`}
                    style={{
                      position: "absolute", left: (a.x + b2.x) / 2, top: (a.y + b2.y) / 2,
                      transform: "translate(-50%, -50%)", zIndex: 4,
                      background: lenShade(TYPE_COLORS[ln.type]?.text || "var(--cat5)", lineLen(ln)),
                      color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.45)",
                      fontSize: 9.5, fontWeight: 800, padding: "2px 7px", borderRadius: 0,
                      whiteSpace: "nowrap", cursor: locked ? "default" : "pointer",
                      boxShadow: "0 1px 5px rgba(0,0,0,0.45)",
                    }}>
                    {ln.name}
                  </div>
                );
              })}
            </>
          );
        })()}

        {marks.length > 0 && (() => {
          const box = boxRef.current, full = fullDimsRef.current;
          const dims = crop || full;
          if (!box || !full || !dims) return null;
          const b = containRect(box.clientWidth, box.clientHeight, dims.w, dims.h);
          const cr = {
            x: b.x - (b.w * (viewScale - 1)) / 2, y: b.y - (b.h * (viewScale - 1)) / 2,
            w: b.w * viewScale, h: b.h * viewScale,
          };
          return marks.map((m) => {
            // full-image fraction -> current-view fraction (through the crop if zoomed)
            const fx = crop ? (m.x * full.w - (crop.ox || 0)) / crop.w : m.x;
            const fy = crop ? (m.y * full.h - (crop.oy || 0)) / crop.h : m.y;
            if (fx < -0.02 || fx > 1.02 || fy < -0.02 || fy > 1.02) return null;
            return { m, fx, fy };
          }).filter(Boolean).map(({ m, fx, fy }) => {
            const mc = MARK_COLORS[m.kind || markKind(m.name)] || "var(--true1)";
            return (
              <div key={m.id}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); if (!locked) onRemoveMark?.(m.id); }}
                title={locked ? m.name : `${m.name} — click to remove`}
                style={{
                  position: "absolute", left: cr.x + fx * cr.w, top: cr.y + fy * cr.h,
                  transform: "translate(-50%, -100%)", zIndex: 4,
                  background: mc, color: "#fff",
                  fontSize: 9.5, fontWeight: 800, padding: "2px 7px", borderRadius: 0,
                  whiteSpace: "nowrap", cursor: locked ? "default" : "pointer",
                  boxShadow: "0 1px 5px rgba(0,0,0,0.45)",
                }}>
                {m.name}
                <div style={{
                  position: "absolute", left: "50%", bottom: -4, transform: "translateX(-50%)",
                  width: 0, height: 0,
                  borderLeft: "4px solid transparent", borderRight: "4px solid transparent",
                  borderTop: `4px solid ${mc}`,
                }} />
              </div>
            );
          });
        })()}

        {sel && (
          <div style={{
            position: "absolute",
            left: Math.min(sel.x0, sel.x1), top: Math.min(sel.y0, sel.y1),
            width: Math.abs(sel.x1 - sel.x0), height: Math.abs(sel.y1 - sel.y0),
            border: "2px solid #3b82f6", background: "rgba(59,130,246,0.18)",
            borderRadius: 0, pointerEvents: "none",
          }} />
        )}

        {pendingSel && (
          <>
            <div style={{
              position: "absolute",
              left: pendingSel.screen.x, top: pendingSel.screen.y,
              width: pendingSel.screen.w, height: pendingSel.screen.h,
              border: "2px solid #3b82f6", background: "rgba(59,130,246,0.12)",
              borderRadius: 0, pointerEvents: "none",
            }} />
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                left: Math.min(pendingSel.screen.x, (boxRef.current?.clientWidth || 9999) - 130),
                top: Math.min(pendingSel.screen.y + pendingSel.screen.h + 8, (boxRef.current?.clientHeight || 9999) - 40),
                display: "flex", gap: 6, background: "var(--card)",
                border: "1px solid var(--border)", borderRadius: 0, padding: 4,
                boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
              }}>
              <button onClick={applyZoom} style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "6px 12px", borderRadius: 0, border: "none", cursor: "pointer",
                background: "#3b82f6", color: "#fff", fontSize: 12.5, fontWeight: 700,
                fontFamily: "inherit",
              }}>Zoom</button>
              <button onClick={() => setPendingSel(null)} style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 30, borderRadius: 0, border: "1px solid var(--border)", cursor: "pointer",
                background: "var(--card)", color: "var(--sub)", fontFamily: "inherit",
              }}><X size={14} /></button>
            </div>
          </>
        )}

      </div>
      {(marks.length > 0 || lines.length > 0) && (
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center",
          padding: "6px 8px", borderTop: "1px solid var(--border)",
        }}>
          <span style={{ fontSize: 9.5, fontWeight: 800, color: "var(--faint)", letterSpacing: 0.4 }}>ON PHOTO:</span>
          {(() => {
            const tally = new Map();
            marks.forEach((m) => {
              const c = MARK_COLORS[m.kind || markKind(m.name)] || "var(--true1)";
              const k = m.name;
              tally.set(k, { n: (tally.get(k)?.n || 0) + 1, c });
            });
            lines.forEach((l) => {
              const c = lenShade(TYPE_COLORS[l.type]?.text || "var(--cat5)", lineLen(l));
              const k = l.name;
              tally.set(k, { n: (tally.get(k)?.n || 0) + 1, c });
            });
            return [...tally.entries()].map(([name, { n, c }]) => (
              <span key={name} style={{
                fontSize: 10, fontWeight: 700, color: c,
                border: `1px solid ${c}`, borderRadius: 0, padding: "1px 7px",
              }}>{name} &times;{n}</span>
            ));
          })()}
        </div>
      )}
    </div>
  );
};

const CableTable = ({
  cables, onDelete, onDuplicate, onEditLabel, onEditNotes, onEditType, onEditLength,
  showNotes, locked, cableDrag, onCableDragStart, onCableDragEnd, onCableDrop,
}) => {
  const [overIdx, setOverIdx] = useState(null);
  const [overTable, setOverTable] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        if (!cableDrag || locked) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setOverTable(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget)) return;
        setOverTable(false);
      }}
      onDrop={(e) => {
        if (!cableDrag || locked) return;
        e.preventDefault();
        setOverTable(false); setOverIdx(null);
        onCableDrop(null); // append at the end of this section
      }}
      style={{
        borderRadius: 0,
        outline: overTable && cableDrag && !locked ? "2px dashed #3b82f6" : "none",
        outlineOffset: 2,
      }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ background: "var(--thead)", color: "var(--sub)", fontSize: 11, letterSpacing: 0.5 }}>
          <th style={{ ...th, width: 24, padding: "7px 4px" }}></th>
          <th style={th}>LABEL</th><th style={th}>TYPE</th><th style={th}>LENGTH</th>
          {showNotes && <th style={th}>NOTES</th>}
          <th style={{ ...th, textAlign: "right" }}></th>
        </tr>
      </thead>
      <tbody>
        {cables.map((c, idx) => (
          <tr key={c.id}
            draggable={!locked}
            onDragStart={(e) => {
              if (locked) return;
              onCableDragStart(c.id);
              try {
                e.dataTransfer.setData("text/plain", c.id);
                e.dataTransfer.effectAllowed = "move";
              } catch { /* some browsers are picky; state is enough */ }
            }}
            onDragEnd={() => { onCableDragEnd(); setOverIdx(null); setOverTable(false); }}
            onDragOver={(e) => {
              if (!cableDrag || locked) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (overIdx !== idx) setOverIdx(idx);
            }}
            onDrop={(e) => {
              if (!cableDrag || locked) return;
              e.preventDefault();
              e.stopPropagation(); // don't double-fire the wrapper's append drop
              onCableDrop(idx);
              setOverIdx(null); setOverTable(false);
            }}
            style={{
              borderBottom: "1px solid var(--border-soft)",
              opacity: cableDrag?.id === c.id ? 0.35 : 1,
              boxShadow: overIdx === idx && cableDrag && cableDrag.id !== c.id
                ? "inset 0 2px 0 0 #3b82f6" : "none",
            }}>
            <td style={{ ...td, width: 24, padding: "8px 4px", cursor: locked ? "default" : "grab", color: "var(--faint)" }}
              title={locked ? "Locked" : "Drag to reorder — or drop on another section to move it there"}>
              {locked ? <Lock size={12} /> : <GripVertical size={14} />}
            </td>
            <td style={td}>
              {(() => {
                const rc = c.type === "SOCA" ? socaLetterColor(c.label) : null;
                const wrap = (child) => rc ? (
                  <span style={{
                    display: "inline-flex", alignItems: "center",
                    padding: "2px 8px", borderRadius: 0,
                    background: rc, color: contrastOn(rc),
                    border: rc === "#f5f5f5" ? "1px solid var(--border)" : "none",
                    fontWeight: 700,
                  }}>{child}</span>
                ) : child;
                return locked ? (
                  wrap(<span style={{ fontSize: 13, fontWeight: rc ? 700 : 600 }}>{c.label}</span>)
                ) : rc ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span title="Resistor color code for SOCA letter" style={{
                      display: "inline-block", width: 12, height: 12, borderRadius: 0,
                      background: rc, border: rc === "#f5f5f5" ? "1px solid var(--border)" : "none",
                    }} />
                    <EditableText value={c.label}
                      onChange={(v) => onEditLabel(c.id, v)}
                      placeholder="Label"
                      style={{ fontSize: 13, fontWeight: 700 }} />
                  </span>
                ) : (
                  <EditableText value={c.label}
                    onChange={(v) => onEditLabel(c.id, v)}
                    placeholder="Label"
                    style={{ fontSize: 13, fontWeight: 600 }} />
                );
              })()}
            </td>
            <td style={{ ...td, padding: "5px 6px" }}>
              {locked ? (
                <span style={{ fontSize: 12.5, fontWeight: 600, color: TYPE_COLORS[c.type]?.text }}>{c.type}</span>
              ) : (
                <select value={c.type} title="Change cable type"
                  onChange={(e) => onEditType(c.id, e.target.value)}
                  style={{ ...cellSelect, color: TYPE_COLORS[c.type]?.text }}>
                  {CABLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
            </td>
            <td style={{ ...td, padding: "5px 6px" }}>
              {locked ? (
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>{c.length}&rsquo;</span>
              ) : (
                <select value={c.length} title="Change length"
                  onChange={(e) => onEditLength(c.id, e.target.value)}
                  style={cellSelect}>
                  {[...new Set([...LENGTHS, c.length])].sort((a, b) => a - b).map((L) => (
                    <option key={L} value={L}>{L}&rsquo;</option>
                  ))}
                </select>
              )}
            </td>
            {showNotes && (
              <td style={{ ...td, color: "var(--sub)" }}>
                {locked ? (
                  <span style={{ fontSize: 13, color: "var(--sub)" }}>{c.notes}</span>
                ) : (
                  <EditableText value={c.notes}
                    onChange={(v) => onEditNotes(c.id, v)}
                    placeholder="Add note"
                    style={{ fontSize: 13, color: "var(--sub)" }} />
                )}
              </td>
            )}
            <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
              {!locked && (
                <>
                  <IconBtn title="Duplicate" onClick={() => onDuplicate(c)}><Copy size={14} /></IconBtn>
                  <IconBtn title="Remove" onClick={() => onDelete(c.id)}><X size={15} color="var(--danger)" /></IconBtn>
                </>
              )}
            </td>
          </tr>
        ))}
        {cables.length === 0 && (
          <tr><td colSpan={showNotes ? 6 : 5} style={{ ...td, color: "var(--faint)", fontStyle: "italic" }}>
            {cableDrag && !locked ? "Drop here to move the cable into this section." : "Nothing here yet."}
          </td></tr>
        )}
      </tbody>
    </table>
    </div>
  );
};

// simple item list for hardware / utility sections: name, qty, notes
const ItemTable = ({ items, locked, onEditName, onEditQty, onEditNotes, onDuplicate, onDelete, onReorder }) => {
  const [dragId, setDragId] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ background: "var(--thead)", color: "var(--sub)", fontSize: 11, letterSpacing: 0.5 }}>
          <th style={{ ...th, width: 24, padding: "7px 4px" }}></th>
          <th style={th}>ITEM</th>
          <th style={{ ...th, width: 110 }}>QTY</th>
          <th style={th}>NOTES</th>
          <th style={{ ...th, textAlign: "right" }}></th>
        </tr>
      </thead>
      <tbody>
        {items.map((it, idx) => (
          <tr key={it.id}
            draggable={!locked}
            onDragStart={(e) => {
              if (locked) return;
              setDragId(it.id);
              try {
                e.dataTransfer.setData("text/plain", it.id);
                e.dataTransfer.effectAllowed = "move";
              } catch { /* state is enough */ }
            }}
            onDragEnd={() => { setDragId(null); setOverIdx(null); }}
            onDragOver={(e) => {
              if (!dragId || locked) return;
              e.preventDefault();
              if (overIdx !== idx) setOverIdx(idx);
            }}
            onDrop={(e) => {
              if (!dragId || locked) return;
              e.preventDefault();
              if (dragId !== it.id) onReorder(dragId, idx);
              setDragId(null); setOverIdx(null);
            }}
            style={{
              borderBottom: "1px solid var(--border-soft)",
              opacity: dragId === it.id ? 0.35 : 1,
              boxShadow: overIdx === idx && dragId && dragId !== it.id
                ? "inset 0 2px 0 0 #3b82f6" : "none",
            }}>
            <td style={{ ...td, width: 24, padding: "8px 4px", cursor: locked ? "default" : "grab", color: "var(--faint)" }}
              title={locked ? "Locked" : "Drag to reorder"}>
              {locked ? <Lock size={12} /> : <GripVertical size={14} />}
            </td>
            <td style={td}>
              {locked ? (
                <span style={{ fontSize: 13, fontWeight: 600 }}>{it.name}</span>
              ) : (
                <EditableText value={it.name}
                  onChange={(v) => onEditName(it.id, v)}
                  placeholder="Item name"
                  style={{ fontSize: 13, fontWeight: 600 }} />
              )}
            </td>
            <td style={{ ...td, padding: "5px 6px" }}>
              {locked ? (
                <span style={{ fontSize: 13, fontWeight: 700 }}>{it.qty}</span>
              ) : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <button title="Less" onClick={() => onEditQty(it.id, it.qty - 1)}
                    style={pvBtn(it.qty <= 0)}><Minus size={12} /></button>
                  <span style={{ minWidth: 24, textAlign: "center", fontWeight: 700, fontSize: 13 }}>{it.qty}</span>
                  <button title="More" onClick={() => onEditQty(it.id, it.qty + 1)}
                    style={pvBtn(false)}><Plus size={12} /></button>
                </span>
              )}
            </td>
            <td style={{ ...td, color: "var(--sub)" }}>
              {locked ? (
                <span style={{ fontSize: 13, color: "var(--sub)" }}>{it.notes}</span>
              ) : (
                <EditableText value={it.notes}
                  onChange={(v) => onEditNotes(it.id, v)}
                  placeholder="Add note"
                  style={{ fontSize: 13, color: "var(--sub)" }} />
              )}
            </td>
            <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
              {!locked && (
                <>
                  <IconBtn title="Duplicate" onClick={() => onDuplicate(it.id)}><Copy size={14} /></IconBtn>
                  <IconBtn title="Remove" onClick={() => onDelete(it.id)}><X size={15} color="var(--danger)" /></IconBtn>
                </>
              )}
            </td>
          </tr>
        ))}
        {items.length === 0 && (
          <tr><td colSpan={5} style={{ ...td, color: "var(--faint)", fontStyle: "italic" }}>
            Nothing here yet.
          </td></tr>
        )}
      </tbody>
    </table>
  );
};

// pure per-wall rollup used by the active wall header and the show summary page
const computeWallSummary = (w) => {
  let power = 0, data = 0;
  const detail = {}; // type -> { count, feet, lengths: { length: qty } }
  const count = (c) => {
    const feet = Number(c.length) || 0;
    const d = detail[c.type] || (detail[c.type] = { count: 0, feet: 0, lengths: {} });
    d.count += 1; d.feet += feet;
    d.lengths[feet] = (d.lengths[feet] || 0) + 1;
  };
  (w.looms || []).forEach((l) => {
    power += l.power.length; data += l.data.length;
    l.power.forEach(count); l.data.forEach(count);
  });
  (w.individual || []).forEach((c) => {
    count(c);
    POWER_TYPES.includes(c.type) ? power++ : data++;
  });
  return { power, data, indiv: (w.individual || []).length, total: power + data, detail };
};

// the four-column cables / looms / hardware / utility breakdown for one wall
const WallSummaryColumns = ({ w, s }) => (
  <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
    <div>
      <div style={{ ...sumHead, color: GREEN }}>
        CABLES <span style={{ color: "var(--faint)" }}>({s.total})</span>
      </div>
      {s.total === 0 ? <div style={sumEmpty}>None.</div> : (
        CABLE_TYPES.filter((t) => s.detail[t]).map((t) => {
          const d = s.detail[t];
          const lens = Object.keys(d.lengths).map(Number).sort((a, b) => b - a);
          return (
            <div key={t} style={sumLine}>
              <span style={{ fontWeight: 700, color: TYPE_COLORS[t].text }}>{t} &times;{d.count}</span>
              <span style={{ color: "var(--sub)", textAlign: "right" }}>
                {lens.map((L) => `${d.lengths[L]}×${L}'`).join("  ")}
              </span>
            </div>
          );
        })
      )}
    </div>
    <div>
      <div style={{ ...sumHead, color: BLUE }}>
        LOOMS <span style={{ color: "var(--faint)" }}>({(w.looms || []).length})</span>
      </div>
      {(w.looms || []).length === 0 ? <div style={sumEmpty}>None.</div> : (
        w.looms.map((l) => (
          <div key={l.id} style={sumLine}>
            <span style={{ fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {l.locked && <Lock size={10} color="var(--orange)" style={{ flexShrink: 0 }} />}
              {l.name}
            </span>
            <span style={{ color: "var(--sub)", flexShrink: 0 }}>{l.power.length + l.data.length} cbl</span>
          </div>
        ))
      )}
    </div>
    <div>
      <div style={{ ...sumHead, color: "var(--cat6)" }}>
        HARDWARE <span style={{ color: "var(--faint)" }}>({(w.hardware || []).reduce((n, it) => n + it.qty, 0)})</span>
      </div>
      {(w.hardware || []).length === 0 ? <div style={sumEmpty}>None.</div> : (
        w.hardware.map((it) => (
          <div key={it.id} style={sumLine}>
            <span style={{ fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</span>
            <span style={{ color: "var(--sub)", flexShrink: 0 }}>&times;{it.qty}</span>
          </div>
        ))
      )}
    </div>
    <div>
      <div style={{ ...sumHead, color: "var(--true1)" }}>
        UTILITY <span style={{ color: "var(--faint)" }}>({(w.utility || []).reduce((n, it) => n + it.qty, 0)})</span>
      </div>
      {(w.utility || []).length === 0 ? <div style={sumEmpty}>None.</div> : (
        w.utility.map((it) => (
          <div key={it.id} style={sumLine}>
            <span style={{ fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</span>
            <span style={{ color: "var(--sub)", flexShrink: 0 }}>&times;{it.qty}</span>
          </div>
        ))
      )}
    </div>
  </div>
);


// ---- Space Cable: verify a loom's cable lengths against the physical wall geometry ----
const FT_PER_MM = 1 / 304.8;
// Brompton Tessera XD Distribution Unit: 2U 19" rackmount
// 482.6mm (19.0") wide x 88.5mm (3.49", 2U) tall x 209.6mm (8.25") deep
const XD_W_MM = 482.6;
const XD_H_MM = 88.5;
const XD_W_FT = XD_W_MM / 304.8;  // 1.583 ft
const XD_H_FT = XD_H_MM / 304.8;  // 0.290 ft

const ftIn = (ft) => {
  const t = Math.round(ft * 12);
  return `${Math.floor(t / 12)}\u2032 ${t % 12}\u2033`;
};

// -----------------------------------------------------------------------------
// LoomBuildDiagram — inline, stateless render of a loom's build sheet from the
// wall's shared spacing + the loom's placements. XD looms draw the assembly-lane
// format (coil, EVEN ENDS, BREAKOUT POINT, DROP/CONN marks, excess-to-length);
// regular looms draw the nested-L format.
// -----------------------------------------------------------------------------
const LoomBuildDiagram = ({ loom, wallSpacing }) => {
  const sp = { ...(wallSpacing || {}), ...((loom && loom.spacing) || {}) };
  const tilesW = Math.max(1, Number(sp.tilesW) || 1);
  const tilesH = Math.max(1, Number(sp.tilesH) || 1);
  const tileMm = Math.max(1, Number(sp.tileMm) || 600);
  const trussIn = sp.trussIn === 12 ? 12 : 16;
  const hangPoint = sp.hangPoint === "center" ? "center" : "bottom";
  const hwIn = Number(sp.hwIn) || 0;
  const connector = sp.connector || "mid";
  const dropSeam = typeof sp.dropSeam === "number" ? sp.dropSeam : Math.floor(tilesW / 2);
  const placements = (loom && loom.spacing && loom.spacing.placements) || {};
  const xdPos = (loom && loom.spacing && loom.spacing.xdPos) || {};
  const isXd = !!(loom && loom.xdBox);

  const FT_PER_MM_ = 1 / 304.8;
  const tileFt = tileMm * FT_PER_MM_;
  const trussH = trussIn;
  const hwClamped = Math.max(0, hwIn);
  const topToHangIn = hangPoint === "center" ? trussH / 2 : trussH;
  const drop = Math.min(Math.max(0, dropSeam), tilesW);
  const connOffFt = connector === "top" ? 0 : connector === "bottom" ? tileFt : tileFt / 2;
  const vertForRow = (r) =>
    (topToHangIn + hwClamped) / 12 + (Math.max(1, r || 1) - 1) * tileFt + connOffFt;

  const xd = isXd ? {
    col: Math.min(Math.max(1, xdPos.col ?? Math.ceil(tilesW / 2)), tilesW),
    row: Math.min(Math.max(1, xdPos.row ?? 1), tilesH),
    mount: (xdPos.mount === "half" ? "tile" : xdPos.mount) || "bottom",
    route: xdPos.route === "panel" ? "panel" : "truss",
  } : null;
  const xdRoute = xd ? xd.route : null;
  const tailFor = (r) => {
    if (!xd) return vertForRow(r);
    if (xdRoute === "panel") {
      const dr = Math.abs((r || 1) - Math.max(1, xd.row || 1));
      const tileHalf = tileFt / 2;
      const cornerReach = Math.hypot(tileHalf, tileHalf) + (4 / 12);
      return dr * tileFt + cornerReach;
    }
    return vertForRow(r);
  };
  const hubUp = !xd ? 0
    : xdRoute === "panel" ? 0
    : xd.mount === "top" ? 0
    : xd.mount === "bottom" ? trussH / 12
    : (topToHangIn + hwClamped) / 12 + (xd.row - 1) * tileFt + tileFt / 2;
  const panelDescentFt = !xd || xdRoute !== "panel" ? 0
    : xd.mount === "tile" ? 0
    : xd.mount === "top" ? (topToHangIn + hwClamped) / 12 + tileFt / 2
    : Math.max(0, (topToHangIn + hwClamped) / 12 - trussH / 12 + tileFt / 2);
  const hubExtra = !xd ? 0
    : xdRoute === "panel" ? 1 + panelDescentFt
    : hubUp + 1;
  const breakoutFt = !xd ? 0
    : xdRoute === "panel" ? hubExtra
    : hubUp + 1 + tailFor(1);

  const cables = [...((loom && loom.data) || []), ...((loom && loom.power) || [])];
  const items = cables
    .filter((c) => placements[c.id])
    .map((c) => {
      const p = placements[c.id];
      return {
        label: c.label, type: c.type, len: Number(c.length) || 0, col: p.c, row: p.r || 1,
        d: xd ? Math.abs(p.c - xd.col) * tileFt : Math.abs((p.c - 0.5) - drop) * tileFt,
        side: (xd ? p.c - xd.col : (p.c - 0.5) - drop) >= 0 ? 1 : -1,
        tail: tailFor(p.r),
      };
    });
  if (xd) {
    Object.entries(placements)
      .filter(([k]) => k.startsWith("xdport-"))
      .forEach(([k, p]) => {
        const d = Math.abs(p.c - xd.col) * tileFt;
        const tail = tailFor(p.r);
        const need = d + tail + hubExtra;
        const stock = LENGTHS.find((L) => L >= need) ?? LENGTHS[LENGTHS.length - 1];
        items.push({
          label: `${loom.xdBox}${k.slice(7)}`, type: "CAT5", len: stock,
          col: p.c, row: p.r || 1,
          d, side: (p.c - xd.col) >= 0 ? 1 : -1, tail,
        });
      });
  }
  if (items.length === 0) return null;
  const halo = { paintOrder: "stroke fill" };

  // ---------------- XD looms: the assembly-lane format ----------------
  if (isXd) {
    const marks = items.map((it) => ({
      ...it,
      at: hubExtra + it.d,
      total: hubExtra + it.d + it.tail,
      slack: (it.len || 0) - (it.d + it.tail + hubExtra),
      toDrop: hubExtra + it.d,
      dropToConn: it.tail,
    }));
    // when every cable's tail is the same, it's shown once as a global chip instead of on each lane
    const tailVals = new Set(marks.map((m) => Math.round(m.dropToConn * 12)));
    const uniformTail = marks.length > 1 && tailVals.size === 1;
    const uniformTailFt = uniformTail ? marks[0].dropToConn : 0;
    const groups = [
      ["STAGE LEFT", marks.filter((m) => m.side < 0).sort((a, b) => b.total - a.total)],
      ["STAGE RIGHT", marks.filter((m) => m.side >= 0).sort((a, b) => a.total - b.total)],
    ].filter((g) => g[1].length > 0);
    const maxEnd = Math.max(...marks.map((m) => Math.max(m.total, m.len || 0)), 1);
    const AW = 900;
    const coilR = 26;
    const coilX = 64, laneL = coilX + coilR + 6, laneR = 56;
    const laneH = 58, topPad = 40, gapH = 46;
    // lanes: cables only; groups separated by an explicit gap where the XD box lives
    const laneList = [];
    let yCursor = topPad;
    const groupSpans = [];
    groups.forEach(([label, ms], gi) => {
      if (gi > 0) yCursor += gapH;
      const yStart = yCursor;
      ms.forEach((m) => { laneList.push({ m, y: yCursor }); yCursor += laneH; });
      groupSpans.push({ label, yStart, yEnd: yCursor - laneH });
    });
    const lanesBottom = yCursor - laneH;
    const aH = lanesBottom + laneH + 18;
    const asc = (AW - laneL - laneR) / maxEnd;
    const ax = (ft) => laneL + ft * asc;
    // XD box sits in the gap between the two groups (or centered when only one)
    const coilCY = groupSpans.length === 2
      ? (groupSpans[0].yEnd + groupSpans[1].yStart) / 2
      : topPad + (lanesBottom - topPad) / 2;
    const guideFt = xdRoute === "panel" ? hubExtra : breakoutFt;
    return (
      <svg viewBox={`0 0 ${AW} ${aH}`} preserveAspectRatio="xMidYMid meet"
        style={{ width: "100%", display: "block", background: "var(--thead)", border: "1px solid var(--border)" }}>
        <rect x={coilX - 30} y={coilCY - 12} width={60} height={24} rx={3}
          fill="var(--purple)" fillOpacity={0.95} stroke="var(--text)" strokeWidth={0.75} />
        <text x={coilX} y={coilCY + 4} fontSize={10.5} fontWeight={800}
          fill="#fff" textAnchor="middle">XD {loom.xdBox}</text>

        {(() => {
          const evenX = laneL;
          const tcX = ax(guideFt);
          const close = guideFt > 0.05 && Math.abs(tcX - evenX) < 110;
          return (
            <>
              <line x1={evenX} y1={topPad - 8} x2={evenX} y2={lanesBottom + 12}
                stroke="var(--purple)" strokeWidth={2} strokeDasharray="4 4" strokeOpacity={0.8} />
              <text x={evenX - 4} y={topPad - 22} fontSize={9.5} fontWeight={800}
                fill="var(--purple)" textAnchor="end">EVEN ENDS</text>
              {guideFt > 0.05 && (
                <>
                  <line x1={tcX} y1={topPad - 8} x2={tcX} y2={lanesBottom + 12}
                    stroke="var(--sub)" strokeWidth={1.5} strokeDasharray="3 5" strokeOpacity={0.8} />
                  <text x={tcX + 4} y={close ? topPad - 8 : topPad - 22} fontSize={9.5} fontWeight={800}
                    fill="var(--sub)" textAnchor="start">BREAKOUT POINT {ftIn(guideFt)}</text>
                </>
              )}
              {uniformTail && (
                <text x={AW - 12} y={16} fontSize={9.5} fontWeight={800}
                  fill="var(--cat6)" textAnchor="end">DROP {"\u2192"} CONN {ftIn(uniformTailFt)} (all cables)</text>
              )}
            </>
          );
        })()}

        {/* the two sides, labeled vertically along their span */}
        {groupSpans.map((g, gi) => {
          const cy = (g.yStart + g.yEnd) / 2;
          return (
            <text key={`gs${gi}`} x={14} y={cy} fontSize={10} fontWeight={800}
              fill="var(--sub)" letterSpacing={2} textAnchor="middle"
              transform={`rotate(-90 14 ${cy})`}>{g.label}</text>
          );
        })}
        {groupSpans.length === 2 && (
          <line x1={laneL} y1={coilCY} x2={AW - 16} y2={coilCY}
            stroke="var(--border)" strokeWidth={1} strokeDasharray="2 6" strokeOpacity={0.9} />
        )}

        {laneList.map((ln, i) => {
          const y = ln.y;
          const m = ln.m;
          const col = (typeof lenShade !== "undefined")
            ? lenShade(TYPE_COLORS[m.type]?.text || "var(--cat6)", m.len)
            : (TYPE_COLORS[m.type]?.text || "var(--cat6)");
          const xd2 = ax(m.at), xc = ax(m.total);
          const xe = ax(Math.max(m.total, m.len || 0));
          return (
            <g key={`al${i}`}>
              <path d={`M ${coilX + 30} ${coilCY} L ${laneL} ${y} L ${xc} ${y}`}
                fill="none" stroke={col} strokeWidth={2} strokeOpacity={0.9} />
              {(xd2 - laneL) > 70 && !uniformTail && (
                <text x={(laneL + xd2) / 2} y={y + 13} fontSize={9.5} fontWeight={700}
                  fill="var(--sub)" textAnchor="middle">RUN {ftIn(m.toDrop)}</text>
              )}
              {(xc - xd2) > 70 && !uniformTail && (
                <text x={(xd2 + xc) / 2} y={y + 13} fontSize={9.5} fontWeight={700}
                  fill="var(--sub)" textAnchor="middle">TAIL {ftIn(m.dropToConn)}</text>
              )}
              {m.slack > 0.05 && (
                <>
                  <line x1={xc} y1={y} x2={xe} y2={y}
                    stroke={col} strokeWidth={2} strokeOpacity={0.45} strokeDasharray="6 4" />
                  <line x1={xe} y1={y - 5} x2={xe} y2={y + 5} stroke={col} strokeWidth={1.5} strokeOpacity={0.6} />
                  <text x={xe + 7} y={y + 3.5} fontSize={10.5} fontWeight={700}
                    fill="var(--faint)" textAnchor="start">+{ftIn(m.slack)}</text>
                </>
              )}
              <text x={laneL - 6} y={y + 3.5} fontSize={10} fontWeight={800} fill={col} textAnchor="end">
                {m.label}
                {m.len ? <tspan fill="var(--sub)" fontWeight={700}> {"\u00b7"} {m.type} {m.len}{"\u2032"}</tspan> : null}
              </text>
              <circle cx={xd2} cy={y} r={5.5} fill="var(--thead)" stroke={col} strokeWidth={2} />
              <line x1={xd2} y1={y - 7} x2={xd2} y2={y - 13} stroke={col} strokeWidth={1} strokeOpacity={0.7} />
              <text x={xd2} y={y - 16} fontSize={11} fontWeight={800} fill={col} textAnchor="middle">
                {"\u25cb"} DROP {ftIn(m.at)}
              </text>
              <circle cx={xc} cy={y} r={5.5} fill={col} stroke={col} strokeWidth={2} />
              <line x1={xc} y1={y + 7} x2={xc} y2={y + 17} stroke={col} strokeWidth={1} strokeOpacity={0.7} />
              <text x={xc} y={y + 28} fontSize={11} fontWeight={800} fill={col} textAnchor="middle">
                {"\u25cf"} CONN {ftIn(m.total)}
              </text>
              {m.slack < 0 && (
                <text x={xc + 12} y={y + 4} fontSize={8.5} fontWeight={800} fill="var(--danger)">
                  SHORT {ftIn(-m.slack)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  }

  // ---------------- regular looms: the nested-L format ----------------
  const far = items.reduce((a, b) => (b.d > a.d ? b : a), items[0]);
  const mainSide = far.side;
  const normals = items.filter((it) => it.side === mainSide || it.d < 0.01).sort((a, b) => b.d - a.d);
  const backs = items.filter((it) => it.side !== mainSide && it.d >= 0.01).sort((a, b) => b.d - a.d);
  const rows = [...normals, ...backs];
  const dMax = normals[0]?.d || 1;
  const dBackMax = backs[0]?.d || 0;
  const VB = 900, padL = 14, padR = 118;
  const sc = (VB - padL - padR) / ((dMax + dBackMax) || 1);
  const x0 = padL + dBackMax * sc + (backs.length ? 62 : 108);
  const scale = (VB - x0 - padR) / (dMax || 1);
  const scaleB = backs.length ? (x0 - padL - 8) / dBackMax : 1;
  const rowH = 26, yTop = 34;
  const yBase = yTop + rows.length * rowH + 12;
  const svgH = yBase + 34;
  const originLabel = "TRUSS MARKER";
  const originCol = "var(--orange)";

  return (
    <svg viewBox={`0 0 ${VB} ${svgH}`} preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", display: "block", background: "var(--thead)", border: "1px solid var(--border)" }}>
      <line x1={x0} y1={16} x2={x0} y2={yBase + 8} stroke={originCol} strokeWidth={3} />
      <text x={x0} y={12} fontSize={9.5} fontWeight={800} fill={originCol} textAnchor="middle">{originLabel}</text>
      <line x1={padL} y1={yBase} x2={VB - padR} y2={yBase} stroke="var(--border)" strokeWidth={1} strokeDasharray="3 4" />
      <text x={VB - padR + 4} y={yBase + 3.5} fontSize={9} fontWeight={700} fill="var(--faint)">connectors</text>
      {rows.map((it, i) => {
        const y = yTop + i * rowH;
        const back = it.side !== mainSide && it.d >= 0.01;
        const xi = back ? x0 - it.d * scaleB : x0 + it.d * scale;
        const col = (typeof lenShade !== "undefined") ? lenShade(TYPE_COLORS[it.type]?.text || "var(--text)", it.len) : (TYPE_COLORS[it.type]?.text || "var(--text)");
        const mid = (x0 + xi) / 2;
        const total = it.d + it.tail + hubExtra;
        return (
          <g key={i}>
            <line x1={x0} y1={y} x2={xi} y2={y} stroke={col} strokeWidth={2.5} strokeOpacity={0.92} />
            <line x1={xi} y1={y} x2={xi} y2={yBase} stroke={col} strokeWidth={2.5} strokeOpacity={0.92} />
            {(yBase - y) > 26 && (
              <text x={xi + (back ? 6 : -6)} y={(y + yBase) / 2 + 3} fontSize={9} fontWeight={700}
                fill={col} textAnchor={back ? "start" : "end"}
                stroke="var(--thead)" strokeWidth={2.5} style={halo}>
                {ftIn(it.tail)}
              </text>
            )}
            <circle cx={xi} cy={yBase} r={3} fill={col} />
            <text x={back ? x0 + 6 : x0 - 6} y={y + 3} fontSize={9.5} fontWeight={800}
              fill={col} textAnchor={back ? "start" : "end"}
              stroke="var(--thead)" strokeWidth={2.5} style={halo}>
              {it.label} {"\u2014"} {ftIn(total)}
            </text>
            <text x={mid} y={y - 4} fontSize={9} fontWeight={700} fill="var(--text)"
              textAnchor="middle" stroke="var(--thead)" strokeWidth={2.5} style={halo}>
              {ftIn(it.d)}
            </text>
            <text x={VB - padR + 4} y={y + 3} fontSize={9} fontWeight={800} fill="var(--faint)" textAnchor="start">
              {"\u03a3"} {ftIn(total)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const SpaceCableWizard = ({ loom, wallName, wallSpacing, otherXd = [], onClose, onSave }) => {
  // wall size, rigging, drop point etc. are shared by every loom on the wall;
  // only the cable-to-tile assignments belong to this loom
  const sp = { ...(loom.spacing || {}), ...(wallSpacing || {}) };
  const spPlacements = (loom.spacing && loom.spacing.placements) || {};
  // For XD looms: compute the auto-picked stock length per placed port using the same
  // routing math the L-diagram uses. Returns { "1": 25, "2": 25, ... }.
  const computeXdLengths = () => {
    try {
      if (!loom.xdBox) return null;
      const cur = (typeof xdPos === "object" && xdPos) || {};
      const route = cur.route || "truss";
      const mount = (cur.mount === "half" ? "tile" : cur.mount) || "bottom";
      const col = Math.min(Math.max(1, cur.col ?? Math.ceil(tilesW / 2)), tilesW || 1);
      const hubRow_ = mount === "top" ? 0 : mount === "bottom" ? 0 : (cur.row || 1);
      const tileHalf = tileFt / 2;
      const cornerReach = Math.hypot(tileHalf, tileHalf) + (4 / 12);
      const hubUp_ = route === "panel" ? 0
        : mount === "top" ? 0
        : mount === "bottom" ? trussH / 12
        : (topToHangIn + hwClamped) / 12 + ((cur.row || 1) - 1) * tileFt + tileFt / 2;
      const panelDescent = route !== "panel" ? 0
        : mount === "tile" ? 0
        : mount === "top" ? (topToHangIn + hwClamped) / 12 + tileFt / 2
        : Math.max(0, (topToHangIn + hwClamped) / 12 - trussH / 12 + tileFt / 2);
      const prefix = route === "panel" ? 1 + panelDescent : hubUp_ + 1;
      const tailOf = (r) => route === "panel"
        ? Math.abs((r || 1) - Math.max(1, hubRow_)) * tileFt + cornerReach
        : vertForRow(r);
      const out = {};
      Object.entries(placements || {})
        .filter(([k]) => k.startsWith("xdport-"))
        .forEach(([k, p]) => {
          const d = Math.abs(p.c - col) * tileFt;
          const need = prefix + d + tailOf(p.r);
          const stock = LENGTHS.find((L) => L >= need) ?? LENGTHS[LENGTHS.length - 1];
          out[k.slice(7)] = stock;
        });
      return out;
    } catch { return null; }
  };
  const isXd = !!loom.xdBox; // XD looms place a box on the wall instead of cables on tiles
  const [tilesW, setTilesW] = useState(sp.tilesW ?? 20);
  const [tilesH, setTilesH] = useState(sp.tilesH ?? 10);
  const [tileMm, setTileMm] = useState(sp.tileMm ?? 600);
  const [trussIn, setTrussIn] = useState(sp.trussIn === 12 ? 12 : 16);
  const [hangPoint, setHangPoint] = useState(sp.hangPoint ?? "center");
  const [hwIn, setHwIn] = useState(sp.hwIn ?? 9);
  const [connector, setConnector] = useState(sp.connector ?? "mid");
  const [rigView, setRigView] = useState(sp.rigView ?? "back");
  const [asmDir, setAsmDir] = useState("h"); // assembly layout: "h" XD left, "v" XD top (cables run down)
  const CALC_CATALOG = [5, 10, 16, 25, 50, 75, 100, 200, 300];
  const [calcLens, setCalcLens] = useState([16, 25, 50, 100]); // what's available on the truck
  const [calcEvenFt, setCalcEvenFt] = useState(5); // where the even ends land (past the marker); null = tightest natural fit
  const [dropSeam, setDropSeam] = useState(sp.dropSeam ?? (sp.tilesW ?? 20)); // stage-right edge
  const [setupLocked, setSetupLocked] = useState(!!sp.locked);
  const [xdPos, setXdPos] = useState((loom.spacing && loom.spacing.xdPos) || { x: null, mount: "bottom" });
  const xdMountW = isXd ? ((xdPos.mount === "half" ? "tile" : xdPos.mount) || "bottom") : null;
  // the hub lives within 1.5 tiles of the top or bottom of the wall
  const xdRowVal = Math.min(Math.max(1, xdPos.row ?? 1), Math.max(1, Number(tilesH) || 1));
  const xdRowUp = () => setXdPos((p) => {
    const H2 = Math.max(1, Number(tilesH) || 1);
    const r = xdRowVal;
    return { ...p, row: r > H2 - 1 ? Math.max(1, H2 - 1) : r > 2 ? 2 : Math.max(1, r - 1) };
  });
  const xdRowDown = () => setXdPos((p) => {
    const H2 = Math.max(1, Number(tilesH) || 1);
    const r = xdRowVal;
    return { ...p, row: r < 2 ? r + 1 : r < H2 - 1 ? Math.max(1, H2 - 1) : Math.min(H2, r + 1) };
  });
  const [placements, setPlacements] = useState(() =>
    Object.fromEntries(Object.entries(spPlacements).filter(([, p]) => p && p.c != null)));
  const cables = [...(loom.data || []), ...(loom.power || [])];
  const [activeCable, setActiveCable] = useState(
    cables.find((c) => !spPlacements[c.id])?.id ?? cables[0]?.id ?? null);

  const W = Math.max(1, Math.min(60, Number(tilesW) || 1));
  const H = Math.max(1, Math.min(30, Number(tilesH) || 1));
  const mm = Math.max(100, Number(tileMm) || 500);
  const tileFt = mm * FT_PER_MM;
  const wallWft = W * tileFt, wallHft = H * tileFt;
  const trussH = Number(trussIn) || 12;
  // every vertical run measures from the hang point itself: 0" of hardware means
  // the connector point sits right at the hang — bottom chord or center of truss,
  // whichever is selected
  const hwClamped = Math.max(0, Number(hwIn) || 0);
  // the loom lives on the TOP chord, so every cable measures from there down to
  // its connector. Hang point + hardware set where the tile sits below the truss.
  const topToHangIn = hangPoint === "center" ? trussH / 2 : trussH;
  const connOffFt = connector === "top" ? 0 : connector === "mid" ? tileFt / 2 : tileFt;
  const vertForRow = (r) =>
    (topToHangIn + hwClamped) / 12 + (Math.max(1, r || 1) - 1) * tileFt + connOffFt;
  // drop lives on a seam or outside edge: seam s sits s tile-widths from the stage-left edge
  const drop = Math.min(Math.max(0, dropSeam), W);

  const calcFor = (col, row) => Math.abs(col - 0.5 - drop) * tileFt + vertForRow(row);
  const reqFor = (p) => calcFor(p.c, p.r);
  // column 1 = STAGE LEFT. The audience (front view) sees stage left on their RIGHT,
  // so front renders mirrored; back view (cable side) has column 1 on the left.
  const colSeq = Array.from({ length: W }, (_, i) => (rigView === "front" ? W - i : i + 1));

  const placeAt = (c, r) => {
    // clicking an occupied cell frees it
    const occupied = Object.entries(placements).find(([, p]) => p.c === c && p.r === r);
    if (occupied) {
      const next = { ...placements };
      delete next[occupied[0]];
      setPlacements(next);
      setActiveCable(occupied[0]);
      return;
    }
    if (!activeCable) return;
    const next = { ...placements, [activeCable]: { c, r } };
    setPlacements(next);
    if (isPortId(activeCable)) {
      const np = Array.from({ length: 10 }, (_, i) => `xdport-${i + 1}`).find((k) => !next[k]);
      setActiveCable(np || null);
    } else {
      const following = cables.find((cb) => !next[cb.id]);
      setActiveCable(following ? following.id : null);
    }
  };

  // the setup auto-saves on every change — everything is restored on reopen
  useEffect(() => {
    onSave(config(), computeXdLengths());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tilesW, tilesH, tileMm, trussIn, hangPoint, hwIn, connector, dropSeam, rigView, placements, setupLocked, xdPos]);

  const close = () => { onSave(config(), computeXdLengths()); onClose(); };

  const config = () => ({
    tilesW: W, tilesH: H, tileMm: mm, trussIn: trussH, hangPoint,
    hwIn: Number(hwIn) || 0, connector, dropSeam: drop, rigView,
    locked: setupLocked,
    placements, xdPos,
  });

  const cell = Math.max(13, Math.min(26, Math.floor(560 / W)));
  const numBtn = {
    width: 28, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)",
    fontWeight: 800, fontSize: 14, fontFamily: "inherit", cursor: "pointer", padding: 0, borderRadius: 0,
    lineHeight: 1,
  };
  const num = (v, set, w = 34) => (
    <span style={{ display: "inline-flex", alignItems: "stretch" }}>
      <button onClick={() => set(String(Math.max(0, (parseFloat(v) || 0) - 1)))} style={numBtn}>&minus;</button>
      <input type="text" inputMode="numeric" value={v} onChange={(e) => set(e.target.value)}
        onFocus={(e) => { e.target.style.boxShadow = "inset 0 0 0 1.5px var(--blue)"; }}
        onBlur={(e) => { e.target.style.boxShadow = "none"; }}
        style={{ ...inp, width: w, padding: "6px 4px", textAlign: "center", borderLeft: "none", borderRight: "none", outline: "none" }} />
      <button onClick={() => set(String((parseFloat(v) || 0) + 1))} style={numBtn}>+</button>
    </span>
  );
  const isPortId = (id) => typeof id === "string" && id.startsWith("xdport-");
  const lblOf = (id) => isPortId(id) ? id.slice(7) : (cables.find((c) => c.id === id)?.label || "?");
  const cellFor = (c, r) => Object.entries(placements).find(([, p]) => p.c === c && p.r === r)?.[0] || null;

  return (
    <div onClick={close} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1300,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 18,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--bg)", border: "2px solid var(--text)", borderRadius: 0,
        width: "100%", maxWidth: 1140, maxHeight: "92vh", overflowY: "auto",
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)", color: "var(--text)",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 20px", borderBottom: "1px solid var(--border)",
          position: "sticky", top: 0, background: "var(--card)", zIndex: 2,
        }}>
          <div style={{ fontWeight: 800, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
            <Ruler size={16} /> Space Cable — {loom.name}{" "}
            {isXd && (
              <span style={{
                fontSize: 10.5, fontWeight: 800, letterSpacing: 0.5, padding: "3px 9px",
                background: "var(--cat6)", color: "#fff",
              }}>
                XD HUB LOOM {"\u00b7"} BOX {loom.xdBox} {"\u00b7"} 10 PORTS
              </span>
            )}
            <span style={{ color: "var(--faint)", fontWeight: 600, fontSize: 12 }}>({wallName})</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Btn onClick={() => setSetupLocked((v) => !v)}
              title={setupLocked ? "Unlock the setup" : "Lock the whole setup against changes"}
              style={{
                padding: "4px 10px", fontSize: 11.5,
                ...(setupLocked ? { background: ORANGE, borderColor: ORANGE, color: "#fff" } : {}),
              }}>
              {setupLocked ? <Lock size={11} /> : <Unlock size={11} />}
              {setupLocked ? "Locked" : "Lock"}
            </Btn>
            <IconBtn title="Close" onClick={close}><X size={18} /></IconBtn>
          </div>
        </div>

        <div style={{ padding: "16px 20px", display: "grid", gap: 18 }}>
          {setupLocked && (
            <div style={{
              fontSize: 12, fontWeight: 700, color: ORANGE,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <Lock size={12} /> Setup is locked — unlock in the header to make changes.
            </div>
          )}
          <div style={{
            display: "grid", gap: 18,
            ...(setupLocked ? { pointerEvents: "none", opacity: 0.72 } : {}),
          }}>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 400px) minmax(0, 1fr)", gap: 24, alignItems: "start" }}>
          <div style={{ display: "grid", gap: 18 }}>
          {/* 1. wall */}
          <div style={scPanel}>
            <div style={scHead2}><span style={scTape}>1 &middot; WALL</span></div>
            <div style={{ marginBottom: 12 }}>
              <div style={qaLbl}>TILE SIZE</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                {[500, 600, 1000].map((m) => (
                  <button key={m} onClick={() => setTileMm(m)} style={{
                    padding: "7px 11px", borderRadius: 0, fontWeight: 700, fontSize: 12, cursor: "pointer",
                    border: `1.5px solid ${Number(tileMm) === m ? BLUE : "var(--blue-b)"}`,
                    background: Number(tileMm) === m ? "var(--blue-bg)" : "var(--card)",
                    color: BLUE, fontFamily: "inherit",
                  }}>{m}mm</button>
                ))}
                {num(tileMm, setTileMm, 44)}<span style={{ fontSize: 11.5, color: "var(--sub)" }}>mm</span>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-end" }}>
              <div><div style={qaLbl}>TILES WIDE</div>{num(tilesW, setTilesW)}</div>
              <div><div style={qaLbl}>TILES HIGH</div>{num(tilesH, setTilesH)}</div>
            </div>
          </div>

          {/* 2. rigging */}
          <div style={scPanel}>
            <div style={scHead2}><span style={scTape}>2 &middot; RIGGING</span></div>
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <div style={qaLbl}>TRUSS SIZE</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[12, 16].map((t) => (
                      <button key={t} onClick={() => setTrussIn(t)} style={{
                        padding: "7px 13px", borderRadius: 0, fontWeight: 700, fontSize: 12, cursor: "pointer",
                        border: `1.5px solid ${trussH === t ? BLUE : "var(--blue-b)"}`,
                        background: trussH === t ? "var(--blue-bg)" : "var(--card)",
                        color: BLUE, fontFamily: "inherit",
                      }}>{t}&rdquo;</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={qaLbl}>HARDWARE HANGS FROM</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[["bottom", "Bottom of Truss"], ["center", "Center of Truss"]].map(([v, l]) => (
                      <button key={v} onClick={() => setHangPoint(v)} style={{
                        padding: "7px 11px", borderRadius: 0, fontWeight: 700, fontSize: 12, cursor: "pointer",
                        border: `1.5px solid ${hangPoint === v ? ORANGE : "var(--orange-b)"}`,
                        background: hangPoint === v ? "var(--soca-bg)" : "var(--card)",
                        color: ORANGE, fontFamily: "inherit",
                      }}>{l}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={qaLbl}>HANGING HARDWARE (IN)</div>
                  {num(hwIn, setHwIn)}
                </div>
                <div>
                  <div style={qaLbl}>CONNECTOR</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[["top", "Top of Tile"], ["mid", "Mid Tile"], ["bottom", "Bottom of Tile"]].map(([v, l]) => (
                      <button key={v} onClick={() => setConnector(v)} style={{
                        padding: "7px 11px", borderRadius: 0, fontWeight: 700, fontSize: 12, cursor: "pointer",
                        border: `1.5px solid ${connector === v ? BLUE : "var(--blue-b)"}`,
                        background: connector === v ? "var(--blue-bg)" : "var(--card)",
                        color: BLUE, fontFamily: "inherit",
                      }}>{l}</button>
                    ))}
                  </div>
                </div>
                {isXd && (
                  <div>
                    <div style={qaLbl}>XD ROUTING</div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                      {[["truss", "Over Truss"], ["panel", "At Panel"]].map(([v, l]) => (
                        <button key={v} onClick={() => setXdPos((p) => ({ ...p, route: v }))} style={{
                          padding: "7px 11px", borderRadius: 0, fontWeight: 700, fontSize: 12, cursor: "pointer",
                          border: `1.5px solid ${(xdPos.route || "truss") === v ? "var(--purple)" : "var(--border)"}`,
                          background: (xdPos.route || "truss") === v ? "color-mix(in srgb, var(--purple) 14%, var(--card))" : "var(--card)",
                          color: "var(--purple)", fontFamily: "inherit",
                        }}>{l}</button>
                      ))}
                    </div>
                    <div style={qaLbl}>XD MOUNT</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {[["top", "Top Chord"], ["bottom", "Bottom Chord"], ["tile", "Behind Tile"]].map(([v, l]) => (
                        <button key={v} onClick={() => setXdPos((p) => ({ ...p, mount: v }))} style={{
                          padding: "7px 11px", borderRadius: 0, fontWeight: 700, fontSize: 12, cursor: "pointer",
                          border: `1.5px solid ${xdMountW === v ? "var(--purple)" : "var(--purple-b, var(--border))"}`,
                          background: xdMountW === v ? "color-mix(in srgb, var(--purple) 14%, var(--card))" : "var(--card)",
                          color: "var(--purple)", fontFamily: "inherit",
                        }}>{l}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
          </div>
          </div>

          <div style={scPanel}>
                {(() => {
                  const s = 6;
                  const tp = trussH * s;
                  const hwv = Math.max(0, Number(hwIn) || 0);
                  const hp = Math.min(hwv * s, 170);
                  const hangY = hangPoint === "center" ? 34 + tp / 2 : 34 + tp;
                  const tileY = hangY + hp; // the tile hangs from the hang point itself
                  const tilePx = Math.max(60, Math.min(150, Math.round((mm / 25.4) * s)));
                  const cx = 200; // true center of the drawing
                  const tileL = cx - tilePx / 2, tileR = cx + tilePx / 2;
                  const connY = connector === "top" ? tileY + 7
                    : connector === "mid" ? tileY + tilePx / 2
                    : tileY + tilePx - 7;
                  // cable rides tight against the rigging line
                  const cableX = cx - 6;
                  const connLen = vertForRow(1);
                  // Brompton XD drawn to scale against the tile: 482.6mm x 88.5mm (2U)
                  const bw = Math.round(tilePx * (XD_W_MM / mm));
                  const bh = Math.max(10, Math.round(tilePx * (XD_H_MM / mm)));
                  const xdMount = isXd ? ((xdPos.mount === "half" ? "tile" : xdPos.mount) || "bottom") : null;
                  const xdRouteW = isXd ? (xdPos.route || "truss") : null;
                  const headroom = isXd ? bh + 10 : 0;
                  const footroom = isXd ? bh + 24 : 0;
                  const totalH = Math.max(tileY + tilePx + 24 + footroom, 34 + tp + 20);
                  return (
                    <svg viewBox={`0 ${-headroom} 400 ${totalH + headroom}`} style={{
                      width: "100%", display: "block",
                      background: "var(--thead)", borderRadius: 0, border: "1px solid var(--border)",
                    }}>
                      <text x={12} y={20} fontSize={11} fontWeight={800} fill="var(--sub)">
                        {"BACK VIEW"}
                      </text>
                      {/* truss */}
                      <line x1={30} y1={34} x2={330} y2={34} stroke="var(--sub)" strokeWidth={3} />
                      <line x1={30} y1={34 + tp} x2={330} y2={34 + tp} stroke="var(--sub)" strokeWidth={3} />
                      {Array.from({ length: 8 }, (_, i) => (
                        <line key={i} x1={30 + i * 38} y1={34 + tp} x2={68 + i * 38} y2={34}
                          stroke="var(--faint)" strokeWidth={1.5} />
                      ))}
                      <line x1={344} y1={34} x2={344} y2={34 + tp} stroke="var(--sub)" strokeWidth={1} />
                      <line x1={339} y1={34} x2={349} y2={34} stroke="var(--sub)" strokeWidth={1} />
                      <line x1={339} y1={34 + tp} x2={349} y2={34 + tp} stroke="var(--sub)" strokeWidth={1} />
                      <text x={354} y={34 + tp / 2 + 4} fontSize={11} fontWeight={800} fill="var(--text)">
                        {trussH}{'\u2033'}
                      </text>

                      {/* tile — centered, label centered */}
                      <rect x={tileL} y={tileY} width={tilePx} height={tilePx}
                        fill="var(--blue-bg)" fillOpacity={0.85} stroke="var(--blue)" strokeWidth={2} />
                      <text x={cx} y={tileY + tilePx / 2 + (connector === "mid" ? 22 : 4)}
                        fontSize={12} fontWeight={800}
                        fill="var(--blue)" textAnchor="middle" opacity={0.9}>{mm}mm</text>

                      {/* XD hub: pick one of its three homes right on the drawing */}
                      {isXd && (() => {
                        const spots = [
                          { m: "top", x: cx - bw / 2, y: 34 - bh - 2, label: "TOP CHORD" },
                          { m: "bottom", x: cx - bw / 2, y: 34 + tp + 2, label: "BOTTOM CHORD" },
                          // behind the tile: box centered on the tile's 2/3 line
                          { m: "tile", x: cx - bw / 2, y: tileY + tilePx * (2 / 3) - bh / 2, label: "BEHIND TILE" },
                        ];
                        const order = ["top", "bottom", "tile"];
                        const sp = spots.find((x) => x.m === xdMount) || spots[1];
                        const next = order[(order.indexOf(sp.m) + 1) % order.length];
                        return (
                          <g onClick={() => setXdPos((p) => ({ ...p, mount: next }))}
                            style={{ cursor: "pointer" }}>
                            <rect x={sp.x} y={sp.y} width={bw} height={bh} rx={3}
                              fill="var(--purple)" fillOpacity={0.9}
                              stroke="var(--text)" strokeWidth={0.75} />
                            <text x={sp.x + 5} y={sp.y + Math.min(bh - 4, 11)} fontSize={Math.min(9.5, Math.max(6.5, bh * 0.6))}
                              fontWeight={800} textAnchor="start" fill="#fff"
                              style={{ pointerEvents: "none", userSelect: "none" }}>
                              {`XD ${loom.xdBox}`}
                            </text>
                            <title>{`XD ${loom.xdBox} on the ${sp.label.toLowerCase()} \u2014 click to move it to the ${spots.find((x) => x.m === next).label.toLowerCase()}`}</title>
                          </g>
                        );
                      })()}

                      {/* the measured riser: XD box up to the TOP CHORD (over-truss only) */}
                      {isXd && xdRouteW !== "panel" && (() => {
                        const spotY = xdMount === "top" ? 34 - bh - 2
                          : xdMount === "bottom" ? 34 + tp + 2
                          : tileY + tilePx * (2 / 3) - bh / 2;
                        if (xdMount === "top") return null;
                        const rowClamped = Math.min(Math.max(1, xdPos.row ?? 1), Math.max(1, tilesH || 1));
                        const riserFt = xdMount === "bottom" ? trussH / 12
                          : (topToHangIn + hwClamped) / 12 + (rowClamped - 1) * tileFt + tileFt / 2;
                        const rx = cx + 6; // mirrors the green cable's offset on the other side
                        const midY = (34 + spotY) / 2;
                        return (
                          <>
                            <line x1={rx} y1={34} x2={rx} y2={spotY}
                              stroke="var(--purple)" strokeWidth={2.5} strokeOpacity={0.9} />
                            <circle cx={rx} cy={34} r={4} fill="var(--purple)" />
                            <circle cx={rx} cy={spotY} r={4} fill="var(--purple)" />
                            <line x1={rx + 4} y1={midY} x2={rx + 26} y2={midY}
                              stroke="var(--purple)" strokeWidth={1} strokeOpacity={0.6} />
                            <rect x={rx + 28} y={midY - 11} width={64} height={22} rx={6}
                              fill="var(--thead)" stroke="var(--purple)" strokeOpacity={0.7} strokeWidth={1.5} />
                            <text x={rx + 60} y={midY + 4.5} fontSize={12} fontWeight={800}
                              fill="var(--purple)" textAnchor="middle">{ftIn(riserFt)}</text>
                          </>
                        );
                      })()}

                      {/* hang point + hardware, dead center */}
                      <circle cx={cx} cy={hangY} r={6} fill="var(--orange)" />
                      {hwv > 0 && (
                        <line x1={cx} y1={hangY} x2={cx} y2={tileY} stroke="var(--orange)"
                          strokeWidth={3} strokeDasharray="6 5" strokeOpacity={0.95} />
                      )}
                      {hwv > 0 && (() => {
                        const cyO = Math.max(34 + tp - 28, hangY + 8);
                        return (
                          <>
                            <line x1={cx + 5} y1={cyO} x2={281} y2={cyO}
                              stroke="var(--orange)" strokeWidth={1} strokeOpacity={0.6} />
                            <rect x={286} y={cyO - 11} width={54} height={22} rx={6}
                              fill="var(--thead)" stroke="var(--orange)" strokeOpacity={0.6} strokeWidth={1.5} />
                            <text x={313} y={cyO + 4.5} fontSize={12.5} fontWeight={800}
                              fill="var(--orange)" textAnchor="middle">{hwv}{'\u2033'}</text>
                          </>
                        );
                      })()}

                      {/* cable: on top, transparent, so hardware and XD show through it */}
                      {(() => {
                        if (xdRouteW === "panel") {
                          // AT PANEL: leaves the box, drops behind the tiles to the connector
                          const xY = xdMount === "top" ? 34 - bh - 2
                            : xdMount === "bottom" ? 34 + tp + 2
                            : tileY + tilePx * (2 / 3) - bh / 2;
                          const boxBottom = xY + bh;
                          const exitX = cx + 3;
                          return (
                            <>
                              <polyline points={`${exitX},${boxBottom} ${exitX},${connY} ${cx},${connY}`}
                                fill="none" stroke="var(--cat5)" strokeWidth={3.5} strokeOpacity={0.75} />
                              <circle cx={cx} cy={connY} r={5.5} fill="var(--cat5)" fillOpacity={0.9} />
                              <circle cx={exitX} cy={boxBottom} r={4} fill="var(--cat5)" fillOpacity={0.9} />
                            </>
                          );
                        }
                        return (
                          <>
                            <polyline points={`${cx},${connY} ${cableX},${connY} ${cableX},34`}
                              fill="none" stroke="var(--cat5)" strokeWidth={3.5} strokeOpacity={0.6} />
                            <circle cx={cx} cy={connY} r={5.5} fill="var(--cat5)" fillOpacity={0.9} />
                            <circle cx={cableX} cy={34} r={4} fill="var(--cat5)" fillOpacity={0.9} />
                          </>
                        );
                      })()}
                      {(() => {
                        // when routing At Panel, the measured cable is the drop from the
                        // XD box straight down to the connector, so the pill anchors to that run
                        const panel = xdRouteW === "panel";
                        const xY = xdMount === "top" ? 34 - bh - 2
                          : xdMount === "bottom" ? 34 + tp + 2
                          : tileY + tilePx * (2 / 3) - bh / 2;
                        const boxBottom = xY + bh;
                        const anchorX = panel ? cx + 3 : cableX;
                        const cyG = panel
                          ? (boxBottom + connY) / 2
                          : 34 + tp * 0.35;
                        const lenFt = panel
                          ? Math.max(0, (connY - boxBottom) * (tileFt / tilePx))
                          : connLen;
                        return (
                          <>
                            <line x1={anchorX - 28} y1={cyG} x2={anchorX - 5} y2={cyG}
                              stroke="var(--cat5)" strokeWidth={1} strokeOpacity={0.6} />
                            <rect x={anchorX - 112} y={cyG - 11} width={82} height={22} rx={6}
                              fill="var(--thead)" stroke="var(--cat5)" strokeOpacity={0.6} strokeWidth={1.5} />
                            <text x={anchorX - 71} y={cyG + 4.5} fontSize={12.5} fontWeight={800}
                              fill="var(--cat5)" textAnchor="middle">
                              {(() => {
                                const totalIn = Math.round(lenFt * 12);
                                return `${Math.floor(totalIn / 12)}\u2032 ${totalIn % 12}\u2033`;
                              })()}
                            </text>
                          </>
                        );
                      })()}
                    </svg>
                  );
                })()}
                
              </div>
          </div>

          {/* 3. drop point */}
          {!isXd && <div style={scPanel}>
            <div style={scHead2}><span style={{ ...scTape, background: "var(--orange)" }}>3 &middot; TRUSS MARKER POINT</span></div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
              {[["Stage Left Edge", 0], ["Center", Math.round(W / 2)], ["Stage Right Edge", W]].map(([l, s]) => (
                <button key={l} onClick={() => setDropSeam(s)} style={{
                  padding: "6px 11px", borderRadius: 0, fontWeight: 700, fontSize: 12, cursor: "pointer",
                  border: `1.5px solid ${drop === s ? ORANGE : "var(--orange-b)"}`,
                  background: drop === s ? "var(--soca-bg)" : "var(--card)",
                  color: ORANGE, fontFamily: "inherit",
                }}>{l}</button>
              ))}
            </div>
            <div style={{ overflowX: "auto", paddingBottom: 4 }}>
              <div style={{ position: "relative", height: 32, width: W * (cell + 2) + 10, marginLeft: 5 }}>
                {colSeq.map((c, i) => (
                  <div key={`t${c}`} style={{
                    position: "absolute", left: i * (cell + 2), top: 9, width: cell, height: 14,
                    borderRadius: 0, background: "var(--tab-bg)",
                  }} />
                ))}
                {Array.from({ length: W + 1 }, (_, di) => {
                  const s = rigView === "front" ? W - di : di;
                  const on = s === drop;
                  return (
                    <div key={`s${di}`} onClick={() => setDropSeam(s)}
                      title={s === 0 ? "Stage-left outside edge"
                        : s === W ? "Stage-right outside edge"
                        : `Seam ${s} — between columns ${s} and ${s + 1}`}
                      style={{
                        position: "absolute", left: di * (cell + 2) - 7, top: 0,
                        width: 12, height: 32, cursor: "pointer", zIndex: 2,
                        display: "flex", justifyContent: "center",
                      }}>
                      {/* the drop point is a single thick line on its seam */}
                      <div style={{
                        width: on ? 5 : 1.5, height: 32,
                        background: on ? ORANGE : "var(--faint)",
                        opacity: on ? 1 : 0.3,
                      }} />
                    </div>
                  );
                })}
              </div>
            </div>

          </div>}

          {/* 4. assign cables to tiles */}
          <div style={scPanel}>
            <div style={{ ...scHead2, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={isXd ? { ...scTape, background: "var(--cat6)" } : scTape}>
                {isXd ? "3 \u00b7 XD POSITION + ASSIGN CABLES" : "4 \u00b7 ASSIGN CABLES TO TILES"}
              </span>
              {isXd && (() => {
                const used = cables.filter((c) => placements[c.id]).length
                  + Object.keys(placements).filter((k) => k.startsWith("xdport-")).length;
                const over = used > 10;
                return (
                  <span style={{
                    fontSize: 11, fontWeight: 800, padding: "2px 9px", borderRadius: 6,
                    border: `1.5px solid ${over ? "var(--danger)" : "var(--cat6)"}`,
                    color: over ? "var(--danger)" : "var(--cat6)",
                    background: over ? "transparent" : "var(--cat6-bg)",
                  }}>
                    XD {loom.xdBox} {"\u00b7"} {used}/10 PORTS{over ? " \u2014 OVER!" : ""}
                  </span>
                );
              })()}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 4, background: "var(--tab-bg)", borderRadius: 0, padding: 3 }}>
                {[["front", "FRONT VIEW"], ["back", "BACK VIEW"]].map(([v, l]) => (
                  <button key={v} onClick={() => setRigView(v)} style={{
                    padding: "5px 14px", borderRadius: 0, fontSize: 11.5, fontWeight: 800, cursor: "pointer",
                    border: "none", fontFamily: "inherit",
                    background: rigView === v ? (v === "front" ? "var(--primary)" : "var(--purple)") : "transparent",
                    color: rigView === v ? "#fff" : "var(--sub)",
                  }}>{l}</button>
                ))}
              </div>
            </div>
            {isXd && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ ...qaLbl, marginBottom: 4 }}>XD {loom.xdBox}</div>
                <div style={{ overflowX: "auto", paddingBottom: 4 }}>
                  <div style={{ position: "relative", height: 12 + cell, width: W * (cell + 2) - 2, marginLeft: 22 }}>
                    {colSeq.map((c, i) => {
                      const on = (xdPos.col ?? Math.ceil(W / 2)) === c;
                      return (
                        <div key={`xc${c}`} onClick={() => setXdPos((p) => ({ ...p, col: c }))}
                          title={`Column ${W - c + 1}`}
                          style={{
                            position: "absolute", left: i * (cell + 2), top: 12, width: cell, height: cell,
                            cursor: "pointer", borderRadius: 0,
                            background: on ? "var(--cat6)" : "var(--tab-bg)",
                            opacity: on ? 1 : 0.85,
                            border: on ? "none" : "1px solid var(--border)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: Math.min(11, cell * 0.42), fontWeight: 800,
                            color: on ? "#fff" : "var(--faint)", userSelect: "none",
                          }}>{W - c + 1}</div>
                      );
                    })}
                    <div style={{
                      position: "absolute", top: 0, bottom: 0, width: 2,
                      left: (W / 2) * (cell + 2) - 1,
                      background: "var(--text)", opacity: 0.7, pointerEvents: "none", zIndex: 2,
                    }} />
                    <div style={{
                      position: "absolute", top: 0, left: (W / 2) * (cell + 2) - 5,
                      width: 0, height: 0, pointerEvents: "none", zIndex: 2,
                      borderLeft: "5px solid transparent", borderRight: "5px solid transparent",
                      borderTop: "7px solid var(--text)",
                    }} />
                  </div>
                </div>
              </div>
            )}
            {(<>
            {isXd && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8, alignItems: "center" }}>
                <span style={{ ...qaLbl, marginBottom: 0 }}>XD {loom.xdBox} PORTS</span>
                {Array.from({ length: 10 }, (_, i) => `xdport-${i + 1}`).map((pid) => {
                  const placed = !!placements[pid];
                  const on = activeCable === pid;
                  return (
                    <button key={pid} onClick={() => setActiveCable(on ? null : pid)} style={{
                      padding: "5px 10px", borderRadius: 0, fontWeight: 800, fontSize: 12, cursor: "pointer",
                      fontFamily: "inherit", minWidth: 34,
                      border: `1.5px solid ${on ? "var(--cat6)" : placed ? "var(--cat6-b)" : "var(--border)"}`,
                      background: on || placed ? "var(--cat6-bg)" : "var(--card)",
                      color: on || placed ? "var(--cat6)" : "var(--text)",
                    }}>
                      {loom.xdBox}{pid.slice(7)}{placed ? " \u2713" : ""}
                    </button>
                  );
                })}
              </div>
            )}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {cables.length === 0 && <span style={sumEmpty}>This loom has no cables yet.</span>}
              {cables.map((c) => {
                const p = placements[c.id];
                const placed = !!p;
                const on = activeCable === c.id;
                return (
                  <button key={c.id} onClick={() => setActiveCable(c.id)} style={{
                    padding: "5px 10px", borderRadius: 0, fontWeight: 700, fontSize: 12, cursor: "pointer",
                    fontFamily: "inherit",
                    border: `1.5px solid ${on ? BLUE : placed ? "var(--cat5-b)" : "var(--border)"}`,
                    background: on ? "var(--blue-bg)" : placed ? "var(--cat5-bg)" : "var(--card)",
                    color: on ? BLUE : placed ? "var(--cat5)" : "var(--text)",
                  }}>
                    {c.label}{placed ? " \u2713" : ""}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--sub)", marginBottom: 6 }}>
              {activeCable
                ? <>Click a tile to place <b style={{ color: BLUE }}>{lblOf(activeCable)}</b>. Click a placed tile to clear it.</>
                : "All cables placed. Click a placed tile to clear it."}
            </div>
            <div style={{ overflowX: "auto", paddingBottom: 4 }}>
            <div style={{ position: "relative", width: W * (cell + 2) - 2, marginLeft: 22 }}>
            {/* light 0-based coordinates from stage left / top — they follow the view */}
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${W}, ${cell}px)`, gap: 2, marginBottom: 3 }}>
              {colSeq.map((c) => (
                <div key={`h${c}`} style={{ fontSize: 8.5, fontWeight: 600, color: "var(--faint)", textAlign: "center" }}>
                  {W - c + 1}
                </div>
              ))}
            </div>
            {Array.from({ length: H }, (_, ri) => (
              <div key={`rl${ri}`} style={{
                position: "absolute", left: -22, width: 17, textAlign: "right",
                top: 14 + ri * (cell + 2) + cell / 2 - 5,
                fontSize: 8.5, fontWeight: 600, color: "var(--faint)",
              }}>{ri + 1}</div>
            ))}
            {/* the drop point: one thick line on its seam, spanning the wall */}
            <div style={{
              position: "absolute", top: 12, bottom: -3, width: 5, borderRadius: 0,
              left: (rigView === "front" ? W - drop : drop) * (cell + 2) - 3.5,
              background: ORANGE, pointerEvents: "none", zIndex: 2,
            }} />
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${W}, ${cell}px)`, gap: 2 }}>
              {Array.from({ length: H }, (_, ri) => ri + 1).map((r) =>
                colSeq.map((c) => {
                  const owner = cellFor(c, r);
                  return (
                    <div key={`${c}-${r}`} onClick={() => placeAt(c, r)}
                      title={owner ? `${lblOf(owner)} — click to clear` : `Tile ${W - c + 1},${r}`}
                      style={{
                        height: cell, borderRadius: 0, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: Math.max(8, cell - 14), fontWeight: 800,
                        background: owner ? (isPortId(owner) ? "var(--cat6-bg)" : "var(--cat5-bg)") : "var(--thead)",
                        border: `1px solid ${owner ? (isPortId(owner) ? "var(--cat6)" : "var(--cat5)") : "var(--border-soft)"}`,
                        color: owner && isPortId(owner) ? "var(--cat6)" : "var(--cat5)", overflow: "hidden",
                      }}>
                      {owner ? lblOf(owner) : (
                        <span style={{ fontSize: Math.max(6.5, cell / 3.2), fontWeight: 600, color: "var(--faint)", opacity: 0.75 }}>
                          {W - c + 1},{r}
                        </span>
                      )}
                    </div>
                  );
                }))}
            </div>
            </div>
            </div>
            </>)}

          </div>

          {/* loom build — nested L shapes; XD looms measure to their hub */}
          {(() => {
            const xd = isXd ? {
              col: Math.min(Math.max(1, xdPos.col ?? Math.ceil(W / 2)), W),
              row: Math.min(Math.max(1, xdPos.row ?? 1), H),
              mount: (xdPos.mount === "half" ? "tile" : xdPos.mount) || "bottom",
            } : null;
            const originLabel = isXd ? `XD ${loom.xdBox}` : "TRUSS MARKER";
            const originCol = isXd ? "var(--cat6)" : ORANGE;
            // XD ROUTING:
            //  • "truss": cable rides up to the TOP CHORD, along the chord, back down.
            //  • "panel": cable runs straight along the back of the tiles from the hub's
            //    tile row to the target tile — no truss climb.
            const xdRoute = xd ? (xdPos.route || "truss") : null;
            const hubRow = !xd ? 0
              : xd.mount === "top" ? 0
              : xd.mount === "bottom" ? 0
              : xd.row; // behind-tile: the tile row it sits in
            const tailFor = (r) => {
              if (!xd) return vertForRow(r);
              if (xdRoute === "panel") {
                // tile-center to tile-center on the panel plane + reach to the far corner + 4"
                const dr = Math.abs((r || 1) - Math.max(1, hubRow || 1));
                const tileHalf = tileFt / 2;
                const cornerReach = Math.hypot(tileHalf, tileHalf) + (4 / 12);
                return dr * tileFt + cornerReach;
              }
              // over-truss: from the top chord straight down to the connector
              return vertForRow(r);
            };
            // AT PANEL slack: reach the far corner of the target tile from its center + 4\" buffer.
            // A 600 mm tile: center -> corner = sqrt((tile/2)^2 * 2) diagonal in feet.
            const tileHalfFt = tileFt / 2;
            const panelCornerFt = Math.hypot(tileHalfFt, tileHalfFt) + (4 / 12);
            // A run across columns still needs its horizontal leg counted; the loom build already
            // takes it.d for that. The row-to-row tail above covers the vertical.
            const hubUp = !xd ? 0
              : xdRoute === "panel" ? 0
              : xd.mount === "top" ? 0
              : xd.mount === "bottom" ? trussH / 12
              : (topToHangIn + hwClamped) / 12 + (xd.row - 1) * tileFt + tileFt / 2;
            // panel: how far the box sits from the hub tile's center (the breakout)
            const panelDescentFt = !xd || xdRoute !== "panel" ? 0
              : xd.mount === "tile" ? 0 // already on the panel plane
              : xd.mount === "top"
                ? (topToHangIn + hwClamped) / 12 + tileFt / 2
                : Math.max(0, (topToHangIn + hwClamped) / 12 - trussH / 12 + tileFt / 2);
            const hubExtra = !xd ? 0
              : xdRoute === "panel"
                ? 1 + panelDescentFt   // panel: 1 ft buffer + drop to the mid-tile breakout (shared)
                : hubUp + 1;           // over-truss: riser + 1 ft buffer at the XD end
            // BREAKOUT POINT: distance from the XD end to where the loom hits its FIRST tile center.
            // At panel: buffer only. Over truss: down the riser + 1' buffer + up to top chord + down
            // to the first tile row's center.
            const firstTileCenterFt = xd && xdRoute !== "panel" ? tailFor(1) : 0;
            const breakoutFt = xd
              ? (xdRoute === "panel"
                  ? 1 + panelDescentFt           // buffer + descent to the mid-tile breakout
                  : hubUp + 1 + firstTileCenterFt)
              : 0;
            const items = cables
              .filter((c) => placements[c.id])
              .map((c) => {
                const p = placements[c.id];
                return {
                  label: c.label, type: c.type, len: Number(c.length) || 0, col: p.c, row: p.r || 1,
                  d: xd
                    ? Math.abs(p.c - xd.col) * tileFt
                    : Math.abs((p.c - 0.5) - drop) * tileFt,
                  side: (xd ? p.c - xd.col : (p.c - 0.5) - drop) >= 0 ? 1 : -1,
                  tail: tailFor(p.r),
                };
              });
            // XD port patches are runs too: each gets the stock length that covers it,
            // then rides through the math exactly like any other cable
            if (xd) {
              Object.entries(placements)
                .filter(([k]) => k.startsWith("xdport-"))
                .forEach(([k, p]) => {
                  const d = Math.abs(p.c - xd.col) * tileFt;
                  const tail = tailFor(p.r);
                  const need = d + tail + hubExtra;
                  const stock = LENGTHS.find((L) => L >= need) ?? LENGTHS[LENGTHS.length - 1];
                  items.push({
                    label: `${loom.xdBox}${k.slice(7)}`, type: "CAT5", len: stock,
                    col: p.c, row: p.r || 1,
                    d, side: (p.c - xd.col) >= 0 ? 1 : -1, tail,
                  });
                });
            }
            if (items.length === 0) return null;
            const far = items.reduce((a, b) => (b.d > a.d ? b : a), items[0]);
            const mainSide = far.side;
            const normals = items.filter((it) => it.side === mainSide || it.d < 0.01).sort((a, b) => b.d - a.d);
            const backs = items.filter((it) => it.side !== mainSide && it.d >= 0.01).sort((a, b) => b.d - a.d);
            const rows = [...normals, ...backs];
            const dMax = normals[0]?.d || 1;
            const dBackMax = backs[0]?.d || 0;
            // "use" length for each cable: what the stock calculator would grab
            const socaCalcGate = !isXd && rows.filter((r) => r.type === "SOCA").length >= 3;
            const stockPool = socaCalcGate ? [...calcLens].sort((a, b) => a - b) : LENGTHS;
            const stockTargetExc = (() => {
              if (!socaCalcGate) return 0;
              const excs = rows.map((r) => {
                const need = r.d + r.tail + hubExtra;
                const u = stockPool.find((L) => L >= need);
                return u != null ? u - need : null;
              }).filter((e) => e != null);
              const am = excs.length ? Math.min(...excs) : 0;
              return calcEvenFt != null ? Math.max(0, calcEvenFt) : am;
            })();
            const stockFor = (it) =>
              stockPool.find((L) => L >= it.d + it.tail + hubExtra + stockTargetExc) ?? null;
            const VB = 880, padL = 12, padR = 118; // room for the totals column
            // name-column reserve depends on whether there is a "use" length appended
            const hasUse = rows.some((it) => stockFor(it) != null);
            const nameCol = hasUse ? 150 : 108;
            const sc = (VB - padL - padR - nameCol) / ((dMax + dBackMax) || 1);
            const x0 = padL + nameCol + dBackMax * sc; // the DROP line, right of the name column
            const scale = (VB - x0 - padR) / (dMax || 1);
            const scaleB = backs.length ? (x0 - padL - 8) / dBackMax : 1;
            const rowH = 30, yTop = 40;
            const yBase = yTop + rows.length * rowH + 16; // the connector line
            const svgH = yBase + 44;
            const dists = [...new Set(normals.map((n) => n.d.toFixed(2)))];
            const tapeOf = (d) => dists.indexOf(d.toFixed(2)) + 1;
            // processor end: every cable's remainder past the drop is its length minus
            // its Σ; pulling the longer ones back to the shortest evens the connectors
            const excOf = (it) => it.len - (it.d + it.tail + hubExtra);
            const nonShort = rows.map(excOf).filter((e) => e >= 0);
            const minExcess = nonShort.length ? Math.min(...nonShort) : 0;
            const maxTotal = Math.max(...rows.map((it) => it.d + it.tail + hubExtra));
            const fullLen = maxTotal + minExcess; // furthest connector -> evened end
            const shorts = rows.filter((it) => excOf(it) < 0);
            const halo = { paintOrder: "stroke" };
            return (
              <div>
                <div style={scHead}><span style={scTape}>{"5 · LOOM BUILD — MEASUREMENTS"}</span></div>

                {/* lay it out for assembly: hub coil, SL/SR groups, excess drawn to length */}
                {isXd && (() => {
                  const decorate = (it) => ({
                    ...it,
                    at: hubExtra + it.d,               // XD end -> drop point
                    total: hubExtra + it.d + it.tail,  // XD end -> tile connector
                    slack: excOf(it),                  // spare past the connector
                    toDrop: hubExtra + it.d,           // XD -> drop (same as at, alias)
                    dropToConn: it.tail,               // drop -> connector (per-cable tail)
                    prefix: hubExtra,                  // shared descent/prefix at panel start
                  });
                  const marks = rows.map(decorate);
                  const groups = [
                    ["STAGE LEFT", marks.filter((m) => m.side < 0).sort((a, b) => b.total - a.total)],
                    ["STAGE RIGHT", marks.filter((m) => m.side >= 0).sort((a, b) => a.total - b.total)],
                  ].filter((g) => g[1].length > 0);
                  const lanes = groups.flatMap(([label, ms]) => [{ head: label }, ...ms.map((m) => ({ m }))]);
                  const maxEnd = Math.max(...marks.map((m) => Math.max(m.total, m.len || 0)), 1);
                  const AW = 900;
                  const coilR = 26;                    // the bundle coil: same size on every loom
                  const coilX = 64, laneL = coilX + coilR + 6, laneR = 56;
                  const laneH = 44, topPad = 40;
                  const aH = topPad + lanes.length * laneH + 18;
                  const asc = (AW - laneL - laneR) / maxEnd;
                  const ax = (ft) => laneL + ft * asc;
                  const coilCY = topPad + (lanes.length * laneH) / 2 - laneH / 2 + 10;
                  return (
                    <>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap", margin: "10px 0 6px" }}>
                        <div style={{ fontSize: 11.5, color: "var(--sub)", fontWeight: 700, flex: "1 1 380px", minWidth: 0 }}>
                          LAY OUT FOR ASSEMBLY {"\u2014"} even ends at the XD side; {xdRoute === "panel"
                            ? `+1\u2032 buffer past the XD box, ${ftIn(panelDescentFt)} down to the shared BREAKOUT at the hub tile center; each cable then runs to its tile center + ${ftIn(Math.hypot(tileFt/2, tileFt/2) + 4/12)} corner-reach.`
                            : `up the riser, over the top chord, shared BREAKOUT at the first tile center (${ftIn(breakoutFt)} from XD), then each cable DROPS to its own tile.`} Marks are DROP and CONNECTOR; the line past CONN is the excess.
                        </div>
                        <div style={{ display: "flex", gap: 4, background: "var(--tab-bg)", borderRadius: 0, padding: 3, flex: "0 0 auto" }}>
                          {[["h", "XD LEFT \u2192"], ["v", "XD TOP \u2193"]].map(([v, l]) => (
                            <button key={v} onClick={() => setAsmDir(v)} style={{
                              padding: "5px 12px", borderRadius: 0, fontSize: 11, fontWeight: 800, cursor: "pointer",
                              border: "none", fontFamily: "inherit",
                              background: asmDir === v ? "var(--purple)" : "transparent",
                              color: asmDir === v ? "#fff" : "var(--sub)",
                            }}>{l}</button>
                          ))}
                        </div>
                      </div>
                      {asmDir === "v" && (() => {
                        // XD at the TOP, every cable running straight DOWN
                        const laneW = 118, leftPad = 96, topPad2 = 86;
                        const depthPx = 560;
                        const maxEnd2 = Math.max(...marks.map((m) => Math.max(m.total, m.len || 0)), 1);
                        const asc2 = depthPx / maxEnd2;
                        const ay = (ft) => topPad2 + ft * asc2;
                        const lanesOnly = lanes.filter((ln) => !ln.head);
                        const laneX = new Map();
                        let li = 0;
                        const headXs = [];
                        lanes.forEach((ln) => {
                          if (ln.head) { headXs.push({ label: ln.head, x: leftPad + li * laneW }); return; }
                          laneX.set(ln.m, leftPad + li * laneW + laneW / 2);
                          li += 1;
                        });
                        const VW = leftPad + lanesOnly.length * laneW + 40;
                        const VH = topPad2 + depthPx + 46;
                        const coilX2 = leftPad + (lanesOnly.length * laneW) / 2;
                        const headY = topPad2 - 10;
                        const guideFt = xdRoute === "panel" ? hubExtra : breakoutFt;
                        return (
                          <svg viewBox={`0 0 ${VW} ${VH}`} style={{
                            width: "100%", display: "block", marginBottom: 8,
                            background: "var(--thead)", borderRadius: 0, border: "1px solid var(--border)",
                          }}>
                            {/* the hub at the top */}
                            <circle cx={coilX2} cy={38} r={26} fill="none"
                              stroke="var(--purple)" strokeWidth={2.5} strokeOpacity={0.9} />
                            <rect x={coilX2 + 32} y={30} width={44} height={15} rx={2}
                              fill="var(--purple)" stroke="var(--text)" strokeWidth={0.6} />
                            <text x={coilX2 + 54} y={41} fontSize={9} fontWeight={800}
                              fill="#fff" textAnchor="middle">XD {loom.xdBox}</text>

                            {/* even ends: heads flush along the top */}
                            <line x1={leftPad - 26} y1={headY} x2={VW - 24} y2={headY}
                              stroke="var(--purple)" strokeWidth={2} strokeDasharray="4 4" strokeOpacity={0.8} />
                            <text x={leftPad - 30} y={headY + 3.5} fontSize={9.5} fontWeight={800}
                              fill="var(--purple)" textAnchor="end">EVEN ENDS</text>

                            {/* shared breakout / at-panel line */}
                            {guideFt > 0.05 && (
                              <>
                                <line x1={leftPad - 26} y1={ay(guideFt)} x2={VW - 24} y2={ay(guideFt)}
                                  stroke="var(--sub)" strokeWidth={1.5} strokeDasharray="3 5" strokeOpacity={0.8} />
                                <text x={leftPad - 30} y={ay(guideFt) + 3.5} fontSize={9.5} fontWeight={800}
                                  fill="var(--sub)" textAnchor="end">
                                  BREAKOUT POINT {ftIn(guideFt)}
                                </text>
                              </>
                            )}

                            {/* group headers */}
                            {headXs.map((h, hi) => (
                              <text key={`vh${hi}`} x={h.x + 4} y={topPad2 - 26} fontSize={10} fontWeight={800}
                                fill="var(--sub)" letterSpacing={1.2}>{h.label}</text>
                            ))}

                            {lanesOnly.map((ln, i) => {
                              const m = ln.m;
                              const x = laneX.get(m);
                              const col = lenShade(TYPE_COLORS[m.type]?.text || "var(--cat6)", m.len);
                              const yd = ay(m.at), yc = ay(m.total);
                              const ye = ay(Math.max(m.total, m.len || 0));
                              const leftSide = i % 2 === 0;
                              const lx = leftSide ? x - 9 : x + 9;
                              const anchor = leftSide ? "end" : "start";
                              return (
                                <g key={`vl${i}`}>
                                  <path d={`M ${coilX2} ${38 + 26 - 4} L ${x} ${headY} L ${x} ${yc}`}
                                    fill="none" stroke={col} strokeWidth={2} strokeOpacity={0.9} />
                                  {(yd - headY) > 40 && (
                                    <text x={x + (leftSide ? -12 : 12)} y={(headY + yd) / 2 + 3} fontSize={9.5} fontWeight={700}
                                      fill="var(--sub)" textAnchor={leftSide ? "end" : "start"}>{ftIn(m.toDrop)}</text>
                                  )}
                                  {(yc - yd) > 26 && (
                                    <text x={x + (leftSide ? -12 : 12)} y={(yd + yc) / 2 + 3} fontSize={9.5} fontWeight={700}
                                      fill="var(--sub)" textAnchor={leftSide ? "end" : "start"}>{ftIn(m.dropToConn)}</text>
                                  )}
                                  {m.slack > 0.05 && (
                                    <>
                                      <line x1={x} y1={yc} x2={x} y2={ye}
                                        stroke={col} strokeWidth={2} strokeOpacity={0.45} strokeDasharray="6 4" />
                                      <line x1={x - 5} y1={ye} x2={x + 5} y2={ye} stroke={col} strokeWidth={1.5} strokeOpacity={0.6} />
                                      <text x={x} y={ye + 13} fontSize={10} fontWeight={700}
                                        fill="var(--faint)" textAnchor="middle">+{ftIn(m.slack)}</text>
                                    </>
                                  )}
                                  <text x={x} y={topPad2 - 14} fontSize={10} fontWeight={800} fill={col} textAnchor="middle">{m.label}</text>
                                  {/* DROP */}
                                  <circle cx={x} cy={yd} r={5.5} fill="var(--thead)" stroke={col} strokeWidth={2} />
                                  <line x1={leftSide ? x - 7 : x + 7} y1={yd} x2={lx} y2={yd} stroke={col} strokeWidth={1} strokeOpacity={0.7} />
                                  <text x={leftSide ? lx - 2 : lx + 2} y={yd + 3.5} fontSize={10.5} fontWeight={800}
                                    fill={col} textAnchor={anchor}>{"\u25cb"} {ftIn(m.at)}</text>
                                  {/* CONN */}
                                  <circle cx={x} cy={yc} r={5.5} fill={col} stroke={col} strokeWidth={2} />
                                  <line x1={leftSide ? x - 7 : x + 7} y1={yc} x2={lx} y2={yc} stroke={col} strokeWidth={1} strokeOpacity={0.7} />
                                  <text x={leftSide ? lx - 2 : lx + 2} y={yc + 3.5} fontSize={10.5} fontWeight={800}
                                    fill={col} textAnchor={anchor}>{"\u25cf"} {ftIn(m.total)}</text>
                                  {m.slack < 0 && (
                                    <text x={x} y={yc + 18} fontSize={9} fontWeight={800} fill="var(--danger)" textAnchor="middle">
                                      SHORT {ftIn(-m.slack)}
                                    </text>
                                  )}
                                </g>
                              );
                            })}
                          </svg>
                        );
                      })()}
                      {asmDir === "h" && <svg viewBox={`0 0 ${AW} ${aH}`} style={{
                        width: "100%", display: "block", marginBottom: 8,
                        background: "var(--thead)", borderRadius: 0, border: "1px solid var(--border)",
                      }}>
                        {/* the hub bundle: one coil, always the same size */}
                        <circle cx={coilX} cy={coilCY} r={coilR} fill="none"
                          stroke="var(--purple)" strokeWidth={2.5} strokeOpacity={0.9} />
                        <rect x={coilX - 22} y={coilCY + coilR + 4} width={44} height={15} rx={2}
                          fill="var(--purple)" stroke="var(--text)" strokeWidth={0.6} />
                        <text x={coilX} y={coilCY + coilR + 15} fontSize={9} fontWeight={800}
                          fill="#fff" textAnchor="middle">XD {loom.xdBox}</text>

                        {(() => {
                          // stack labels if the two guide lines are close together
                          const evenX = laneL;
                          const tcX = ax(hubExtra);
                          const close = hubExtra > 0.05 && Math.abs(tcX - evenX) < 90;
                          return (
                            <>
                              <line x1={evenX} y1={topPad - 8} x2={evenX} y2={topPad + (lanes.length - 1) * laneH + 12}
                                stroke="var(--purple)" strokeWidth={2} strokeDasharray="4 4" strokeOpacity={0.8} />
                              <text x={evenX - 4} y={topPad - 22} fontSize={9.5} fontWeight={800}
                                fill="var(--purple)" textAnchor="end">EVEN ENDS</text>
                              {hubExtra > 0.05 && (
                                <>
                                  <line x1={tcX} y1={topPad - 8} x2={tcX} y2={topPad + (lanes.length - 1) * laneH + 12}
                                    stroke="var(--sub)" strokeWidth={1.5} strokeDasharray="3 5" strokeOpacity={0.8} />
                                  <text x={tcX + 4} y={close ? topPad - 8 : topPad - 22} fontSize={9.5} fontWeight={800}
                                    fill="var(--sub)" textAnchor="start">
                                    BREAKOUT POINT {ftIn(xdRoute === "panel" ? hubExtra : breakoutFt)}
                                  </text>
                                </>
                              )}
                            </>
                          );
                        })()}

                        {lanes.map((ln, i) => {
                          const y = topPad + i * laneH;
                          if (ln.head) {
                            return (
                              <text key={`gh${i}`} x={laneL + 4} y={y + 4} fontSize={10} fontWeight={800}
                                fill="var(--sub)" letterSpacing={1.2}>{ln.head}</text>
                            );
                          }
                          const m = ln.m;
                          const col = lenShade(TYPE_COLORS[m.type]?.text || "var(--cat6)", m.len);
                          const xd2 = ax(m.at), xc = ax(m.total);
                          const xe = ax(Math.max(m.total, m.len || 0));
                          return (
                            <g key={`al${i}`}>
                              <path d={`M ${coilX + coilR - 4} ${coilCY} L ${laneL} ${y} L ${xc} ${y}`}
                                fill="none" stroke={col} strokeWidth={2} strokeOpacity={0.9} />
                              {/* segment lengths inline with each run */}
                              {(xd2 - laneL) > 44 && (
                                <text x={(laneL + xd2) / 2} y={y + 15} fontSize={9.5} fontWeight={700}
                                  fill="var(--sub)" textAnchor="middle">{ftIn(m.toDrop)}</text>
                              )}
                              {(xc - xd2) > 44 && (
                                <text x={(xd2 + xc) / 2} y={y + 15} fontSize={9.5} fontWeight={700}
                                  fill="var(--sub)" textAnchor="middle">{ftIn(m.dropToConn)}</text>
                              )}
                              {/* the excess: same cable, drawn on past the connector */}
                              {m.slack > 0.05 && (
                                <>
                                  <line x1={xc} y1={y} x2={xe} y2={y}
                                    stroke={col} strokeWidth={2} strokeOpacity={0.45} strokeDasharray="6 4" />
                                  <line x1={xe} y1={y - 5} x2={xe} y2={y + 5} stroke={col} strokeWidth={1.5} strokeOpacity={0.6} />
                                  <text x={xe + 7} y={y + 3.5} fontSize={10.5} fontWeight={700}
                                    fill="var(--faint)" textAnchor="start">+{ftIn(m.slack)}</text>
                                </>
                              )}
                              <text x={laneL - 6} y={y + 3.5} fontSize={10} fontWeight={800} fill={col} textAnchor="end">
                {m.label}
                {m.len ? <tspan fill="var(--sub)" fontWeight={700}> {"\u00b7"} {m.type} {m.len}{"\u2032"}</tspan> : null}
              </text>
                              {/* DROP mark */}
                              <circle cx={xd2} cy={y} r={5.5} fill="var(--thead)" stroke={col} strokeWidth={2} />
                              <line x1={xd2} y1={y - 7} x2={xd2} y2={y - 13} stroke={col} strokeWidth={1} strokeOpacity={0.7} />
                              <text x={xd2} y={y - 16} fontSize={11} fontWeight={800} fill={col} textAnchor="middle">
                                {"\u25cb"} DROP {ftIn(m.at)}
                              </text>
                              {/* CONNECTOR mark, furthest from the hub */}
                              <circle cx={xc} cy={y} r={5.5} fill={col} stroke={col} strokeWidth={2} />
                              <line x1={xc} y1={y + 7} x2={xc} y2={y + 13} stroke={col} strokeWidth={1} strokeOpacity={0.7} />
                              <text x={xc} y={y + 24} fontSize={11} fontWeight={800} fill={col} textAnchor="middle">
                                {"\u25cf"} CONN {ftIn(m.total)}
                              </text>
                              {m.slack < 0 && (
                                <text x={xc + 12} y={y + 4} fontSize={8.5} fontWeight={800} fill="var(--danger)">
                                  SHORT {ftIn(-m.slack)}
                                </text>
                              )}
                            </g>
                          );
                        })}
                      </svg>}
                      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
                        <thead><tr>
                          {["CABLE", "SIDE", "STOCK", "XD → DROP", "DROP → CONN", "DROP (FROM XD END)", "CONNECTOR (FROM XD END)", "EXCESS AT CONNECTOR"].map((h, hi) => (
                            <th key={h} style={{
                              textAlign: hi === 0 ? "left" : "right", fontSize: 10, letterSpacing: 0.6,
                              color: "var(--sub)", fontWeight: 800, padding: "5px 8px",
                              borderBottom: "1.5px solid var(--border)",
                            }}>{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {groups.flatMap(([side, ms]) => ms.map((m, i) => (
                            <tr key={`${side}${i}`} style={{ borderBottom: "1px solid var(--border-soft, var(--border))" }}>
                              <td style={{ padding: "5px 8px", fontWeight: 800, fontSize: 12.5,
                                color: lenShade(TYPE_COLORS[m.type]?.text || "var(--cat6)", m.len) }}>{m.label}</td>
                              <td style={{ padding: "5px 8px", textAlign: "right", fontSize: 11.5, fontWeight: 700, color: "var(--sub)" }}>
                                {side === "STAGE LEFT" ? "SL" : "SR"}
                              </td>
                              <td style={{ padding: "5px 8px", textAlign: "right", fontSize: 12, fontWeight: 700 }}>
                                {m.type} {m.len}{"\u2032"}
                              </td>
                              <td style={{ padding: "5px 8px", textAlign: "right", fontSize: 12, color: "var(--sub)" }}>{ftIn(m.toDrop)}</td>
                              <td style={{ padding: "5px 8px", textAlign: "right", fontSize: 12, color: "var(--sub)" }}>{ftIn(m.dropToConn)}</td>
                              <td style={{ padding: "5px 8px", textAlign: "right", fontSize: 12.5, fontWeight: 800 }}>{ftIn(m.at)}</td>
                              <td style={{ padding: "5px 8px", textAlign: "right", fontSize: 12.5, fontWeight: 800 }}>{ftIn(m.total)}</td>
                              <td style={{ padding: "5px 8px", textAlign: "right", fontSize: 12,
                                fontWeight: 700, color: m.slack < 0 ? "var(--danger)" : "var(--sub)" }}>
                                {m.slack < 0 ? `SHORT ${ftIn(-m.slack)}` : `+${ftIn(m.slack)}`}
                              </td>
                            </tr>
                          )))}
                        </tbody>
                      </table>
                    </>
                  );
                })()}
                {!isXd && (<>
                <div style={{ fontSize: 11.5, color: "var(--sub)", marginBottom: 8 }}>
                  One L per cable, nested. Along the top: the pull{" "}
                  <b style={{ color: originCol }}>from the {originLabel}</b> to that cable's tape mark.
                  Down the side: the tail to the connector
                  {isXd ? ` (hub on the ${xd.mount === "top" ? "top chord" : xd.mount === "bottom" ? "bottom chord" : "tile"})` : " from the top chord (centered)"}.
                  On the right, <b>{"Σ"}</b> is the full {isXd ? "hub" : "truss marker"} {"→"} connector distance
                  (pull + tail). Tape the longest first; each shorter one lands inside it.
                </div>
                <svg viewBox={`0 0 ${VB} ${svgH}`} style={{
                  width: "100%", display: "block",
                  background: "var(--thead)", borderRadius: 0, border: "1px solid var(--border)",
                }}>
                  {/* the drop line: pull everything from here */}
                  <line x1={x0} y1={18} x2={x0} y2={yBase + 10} stroke={originCol} strokeWidth={4} />
                  <text x={x0} y={13} fontSize={11} fontWeight={800} fill={originCol} textAnchor="middle">{originLabel}</text>
                  {isXd && (
                    <text x={x0} y={yBase + 24} fontSize={8.5} fontWeight={700} fill={originCol} textAnchor="middle">
                      {xdRoute === "panel"
                        ? `BREAKOUT POINT \u00b7 +1\u2032 buffer + ${ftIn(panelDescentFt)} down to the mid-tile breakout; each cable adds row-hops + corner-reach ${ftIn(Math.hypot(tileFt/2, tileFt/2) + 4/12)}`
                        : `riser ${ftIn(hubUp)} \u00b7 +1\u2032 buffer \u00b7 BREAKOUT at first tile center (${ftIn(breakoutFt)} from XD) \u2014 in every \u03a3`}
                    </text>
                  )}
                  {/* the connector line */}
                  <line x1={padL} y1={yBase} x2={VB - 8} y2={yBase} stroke="var(--border)" strokeWidth={1} strokeDasharray="5 5" />
                  <text x={VB - 10} y={yBase + 13} fontSize={8.5} fontWeight={700} fill="var(--faint)" textAnchor="end">
                    connectors
                  </text>
                  <text x={VB - 10} y={yTop - 14} fontSize={8.5} fontWeight={800} fill="var(--faint)" textAnchor="end">
                    {isXd ? "Σ HUB → CONNECTOR" : "Σ TRUSS MARKER → CONNECTOR"}
                  </text>
                  {rows.map((it, i) => {
                    const back = it.side !== mainSide && it.d >= 0.01;
                    const y = yTop + i * rowH;
                    const xi = back ? x0 - it.d * scaleB : x0 + it.d * scale;
                    const col = TYPE_COLORS[it.type]?.text || "var(--cat5)";
                    const mid = (x0 + xi) / 2;
                    return (
                      <g key={i}>
                        {/* the L: along the truss, then down to the connector */}
                        <line x1={x0} y1={y} x2={xi} y2={y} stroke={col} strokeWidth={2.5} strokeOpacity={0.92} />
                        <line x1={xi} y1={y} x2={xi} y2={yBase} stroke={col} strokeWidth={2.5} strokeOpacity={0.92} />
                        <circle cx={xi} cy={yBase} r={4} fill={col} />
                        {/* cable name at the drop end */}
                        {(() => {
                          const rc = it.type === "SOCA" ? socaLetterColor(it.label) : null;
                          const useLen = stockFor(it);
                          const swatchW = 10, swatchH = 10;
                          // clean columns: swatch pinned at a fixed x, labels share the origin's edge
                          const swatchX = back ? x0 + 8 : padL + 2;
                          const xTxt = back ? x0 + 8 + swatchW + 6 : x0 - 6;
                          return (
                            <>
                              {rc && (
                                <rect x={swatchX} y={y - swatchH / 2} width={swatchW} height={swatchH}
                                  fill={rc}
                                  stroke={rc === "#f5f5f5" ? "var(--text)" : "none"}
                                  strokeWidth={rc === "#f5f5f5" ? 0.5 : 0} />
                              )}
                              <text x={back && !rc ? x0 + 7 : xTxt} y={y + 3.5} fontSize={10.5} fontWeight={800}
                                fill={col} textAnchor={back ? "start" : "end"}
                                stroke="var(--thead)" strokeWidth={3} style={halo}>
                                {it.label}{" \u2014 "}{ftIn(it.d + it.tail + hubExtra)}
                                {useLen != null && (
                                  <tspan fill="var(--sub)" fontWeight={700}>{" \u00b7 "}{useLen}{"\u2032"}</tspan>
                                )}
                              </text>
                            </>
                          );
                        })()}
                        {/* pull measurement on the horizontal */}
                        <text x={mid} y={y - 5} fontSize={10.5} fontWeight={800} fill="var(--text)"
                          textAnchor="middle" stroke="var(--thead)" strokeWidth={3.5} style={halo}>
                          {ftIn(it.d)}{back && !isXd ? "  (double back)" : ""}
                        </text>
                        {/* tape number at the corner */}
                        {!back && (
                          <text x={xi + 7} y={y + 3.5} fontSize={8.5} fontWeight={800} fill={BLUE} textAnchor="start">
                            T{tapeOf(it.d)}
                          </text>
                        )}
                        {/* full drop -> connector distance, and the processor-end pull-back */}
                        <text x={VB - 10} y={y + 3.5} fontSize={10.5} fontWeight={800} fill="var(--text)"
                          textAnchor="end" stroke="var(--thead)" strokeWidth={3} style={halo}>
                          {"Σ "}{ftIn(it.d + it.tail + hubExtra)}
                        </text>
                        {(() => {
                          const exc = excOf(it);
                          const pb = exc - minExcess;
                          if (isXd) {
                            return exc < 0 ? (
                              <text x={VB - 10} y={y + 15} fontSize={8.5} fontWeight={700}
                                fill="var(--danger)" textAnchor="end">
                                SHORT {ftIn(-exc)}
                              </text>
                            ) : null;
                          }
                          return (
                            <text x={VB - 10} y={y + 15} fontSize={8.5} fontWeight={700}
                              fill={exc < 0 ? "var(--danger)" : "var(--faint)"} textAnchor="end">
                              {exc < 0 ? `SHORT ${ftIn(-exc)}`
                                : pb < 0.05 ? "shortest — sets the end"
                                : `pull back ${ftIn(pb)}`}
                            </text>
                          );
                        })()}
                        {/* tail measurement at the connector */}
                        <text x={xi} y={yBase + 15 + (i % 2) * 12} fontSize={10} fontWeight={800}
                          fill={col} textAnchor="middle"
                          stroke="var(--thead)" strokeWidth={3} style={halo}>
                          {ftIn(it.tail)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
                </>)}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, alignItems: "center" }}>
                  {!isXd && <span style={{
                    fontSize: 12.5, fontWeight: 800, padding: "6px 12px", borderRadius: 0,
                    border: "1.5px solid var(--cat5)", color: "var(--cat5)", background: "var(--cat5-bg)",
                  }}>
                    FULL LOOM {"—"} staggered &amp; evened: {ftIn(fullLen)}
                  </span>}
                  {!isXd && <span style={{
                    fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 0,
                    border: "1px solid var(--border)", color: "var(--sub)", background: "var(--card)",
                  }}>
                    evened processor end: {ftIn(minExcess)} past the TRUSS MARKER
                  </span>}
                  {shorts.length > 0 && (
                    <span style={{
                      fontSize: 11, fontWeight: 800, padding: "5px 10px", borderRadius: 0,
                      border: "1.5px solid var(--danger)", color: "var(--danger)", background: "var(--card)",
                    }}>
                      TOO SHORT: {shorts.map((it) => it.label).join(", ")}
                    </span>
                  )}
                </div>

                {/* stock calculator: SOCA looms with 3+ SOCA runs only */}
                {!isXd && rows.filter((r) => r.type === "SOCA").length >= 3 && (() => {
                  const enabled = [...calcLens].sort((a, b) => a - b);
                  // default even point = tightest natural excess with these stocks
                  const autoRows = rows.map((it) => {
                    const need = it.d + it.tail + hubExtra;
                    const use = enabled.find((L) => L >= need) ?? null;
                    return { need, use, exc: use != null ? use - need : null };
                  });
                  const autoFits = autoRows.filter((r) => r.use != null);
                  const autoMin = autoFits.length ? Math.min(...autoFits.map((r) => r.exc)) : 0;
                  const targetExc = calcEvenFt != null ? Math.max(0, calcEvenFt) : autoMin;
                  const calcRows = rows.map((it) => {
                    const need = it.d + it.tail + hubExtra;
                    // enough stock to land ≥ target past the marker (every cable coils to the even line)
                    const use = enabled.find((L) => L >= need + targetExc) ?? null;
                    return { ...it, need, use, exc: use != null ? use - need : null };
                  });
                  const fits = calcRows.filter((r) => r.use != null);
                  const minExc = fits.length ? Math.min(...fits.map((r) => r.exc)) : 0;
                  const totalStock = fits.reduce((n, r) => n + r.use, 0);
                  const totalExcess = fits.reduce((n, r) => n + r.exc, 0);
                  return (
                    <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: "var(--sub)", marginBottom: 8 }}>
                        STOCK CALCULATOR {"\u2014"} tap the lengths you have; the build updates to the least-waste combo
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                        {CALC_CATALOG.map((L) => {
                          const on = calcLens.includes(L);
                          return (
                            <button key={L} onClick={() => setCalcLens((cur) =>
                              cur.includes(L) ? cur.filter((x) => x !== L) : [...cur, L])}
                              style={{
                                padding: "6px 12px", borderRadius: 0, fontWeight: 800, fontSize: 12.5,
                                cursor: "pointer", fontFamily: "inherit",
                                border: `1.5px solid ${on ? "var(--green, var(--cat5))" : "var(--border)"}`,
                                background: on ? "var(--cat5-bg)" : "var(--card)",
                                color: on ? "var(--cat5)" : "var(--faint)",
                              }}>
                              {L}{"\u2032"}
                            </button>
                          );
                        })}
                      </div>
                      {enabled.length === 0 ? (
                        <div style={{ fontSize: 12, color: "var(--faint)" }}>Pick at least one length.</div>
                      ) : (
                        <>
                          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8 }}>
                            <thead><tr>
                              {["CABLE", "\u03a3 NEED", "USE", "EXCESS", "COIL AT EVEN END"].map((h, hi) => (
                                <th key={h} style={{
                                  textAlign: hi === 0 ? "left" : "right", fontSize: 10, letterSpacing: 0.6,
                                  color: "var(--sub)", fontWeight: 800, padding: "4px 8px",
                                  borderBottom: "1.5px solid var(--border)",
                                }}>{h}</th>
                              ))}
                            </tr></thead>
                            <tbody>
                              {calcRows.map((r, i) => (
                                <tr key={i} style={{ borderBottom: "1px solid var(--border-soft, var(--border))" }}>
                                  <td style={{ padding: "4px 8px", fontWeight: 800, fontSize: 12.5,
                                    color: lenShade(TYPE_COLORS[r.type]?.text || "var(--text)", r.use || r.len) }}>{r.label}</td>
                                  <td style={{ padding: "4px 8px", textAlign: "right", fontSize: 12, fontWeight: 700 }}>{ftIn(r.need)}</td>
                                  <td style={{ padding: "4px 8px", textAlign: "right", fontSize: 12.5, fontWeight: 800,
                                    color: r.use == null ? "var(--danger)" : "var(--text)" }}>
                                    {r.use == null ? "NONE FITS" : `${r.use}\u2032`}
                                  </td>
                                  <td style={{ padding: "4px 8px", textAlign: "right", fontSize: 12, color: "var(--sub)" }}>
                                    {r.use == null ? "\u2014" : `+${ftIn(r.exc)}`}
                                  </td>
                                  <td style={{ padding: "4px 8px", textAlign: "right", fontSize: 12, fontWeight: 700,
                                    color: r.use == null ? "var(--faint)" : "var(--sub)" }}>
                                    {r.use == null ? "\u2014" : ftIn(r.exc - minExc)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <span style={{
                              fontSize: 11.5, fontWeight: 800, padding: "5px 11px",
                              border: "1.5px solid var(--cat5)", color: "var(--cat5)", background: "var(--cat5-bg)",
                            }}>
                              STOCK {fits.map((r) => r.use).sort((a, b) => b - a).join("\u2032 + ")}{"\u2032"} = {totalStock}{"\u2032"}
                            </span>
                            <span style={{
                              fontSize: 11.5, fontWeight: 700, padding: "5px 11px",
                              border: "1px solid var(--border)", color: "var(--sub)", background: "var(--card)",
                            }}>
                              total excess {ftIn(totalExcess)}
                            </span>
                            <span style={{
                              fontSize: 11.5, fontWeight: 700, padding: "5px 11px",
                              border: "1px solid var(--border)", color: "var(--sub)", background: "var(--card)",
                            }}>
                              even point +{ftIn(minExc)} past the {isXd ? "XD end" : "TRUSS MARKER"}
                            </span>
                            {calcRows.some((r) => r.use == null) && (
                              <span style={{
                                fontSize: 11.5, fontWeight: 800, padding: "5px 11px",
                                border: "1.5px solid var(--danger)", color: "var(--danger)", background: "var(--card)",
                              }}>
                                some runs don't fit {"\u2014"} enable a longer length
                              </span>
                            )}
                          </div>

                          {/* where on the truss the even ends land */}
                          {fits.length > 0 && (() => {
                            const wallFt = tilesW * tileFt;
                            const markerFt = drop * tileFt;
                            // the head extends past the marker away from the main pull side
                            const headDir = -mainSide;
                            // 5 ft of extra truss drawn past the wall edge on the head side
                            const extL = headDir === -1 ? 5 : 0;
                            const extR = headDir === 1 ? 5 : 0;
                            const evenFtRaw = markerFt + headDir * minExc;
                            const evenFt = Math.min(Math.max(-extL, evenFtRaw), wallFt + extR);
                            const offWall = evenFtRaw < -extL || evenFtRaw > wallFt + extR;
                            const TVW = 900, tPadL = 30, tPadR = 30, ty = 46;
                            const tsc = (TVW - tPadL - tPadR) / ((wallFt + extL + extR) || 1);
                            const tx = (ft) => tPadL + (ft + extL) * tsc;
                            const svgRef = React.useRef(null);
                            const dragTo = (clientX) => {
                              const el = svgRef.current;
                              if (!el) return;
                              const rect = el.getBoundingClientRect();
                              const px = ((clientX - rect.left) / rect.width) * TVW;
                              const ft = Math.min(Math.max(-extL, (px - tPadL) / tsc - extL), wallFt + extR);
                              const asHeadExc = headDir === 1 ? ft - markerFt : markerFt - ft;
                              setCalcEvenFt(Math.max(0, asHeadExc));
                            };
                            const onDown = (e) => {
                              e.preventDefault();
                              dragTo(e.clientX);
                              const move = (ev) => dragTo(ev.clientX);
                              const up = () => {
                                window.removeEventListener("pointermove", move);
                                window.removeEventListener("pointerup", up);
                              };
                              window.addEventListener("pointermove", move);
                              window.addEventListener("pointerup", up);
                            };
                            const cell = Math.min((TVW - tPadL - tPadR) / tilesW, 12);
                            const wallTop = ty + 10;
                            const wallH = tilesH * cell;
                            const TVH = wallTop + wallH + 40;
                            return (<>
                              <svg ref={svgRef} viewBox={`0 0 ${TVW} ${TVH}`} style={{
                                width: "100%", display: "block", marginTop: 10,
                                background: "var(--thead)", border: "1px solid var(--border)",
                                touchAction: "none",
                              }}>
                                {/* the wall's tiles, in place under the truss */}
                                {Array.from({ length: tilesH }, (_, ri) => Array.from({ length: tilesW }, (_, ci) => (
                                  <rect key={`wt${ci}-${ri}`}
                                    x={tPadL + ci * ((TVW - tPadL - tPadR) / tilesW)} y={wallTop + ri * cell}
                                    width={(TVW - tPadL - tPadR) / tilesW - 0.5} height={cell - 0.5}
                                    fill="var(--tab-bg, var(--card))" stroke="var(--border)" strokeWidth={0.4} />
                                )))}
                                {/* the truss along the top of the wall, running 5 ft past the edge on the head side */}
                                <line x1={tx(-extL)} y1={ty} x2={tx(wallFt + extR)} y2={ty} stroke="var(--sub)" strokeWidth={4} strokeOpacity={0.55} />
                                {Array.from({ length: tilesW + 1 }, (_, i) => (
                                  <line key={i} x1={tx(i * tileFt)} y1={ty - 4} x2={tx(i * tileFt)} y2={ty + 4}
                                    stroke="var(--sub)" strokeWidth={1} strokeOpacity={0.4} />
                                ))}
                                <text x={tx(0)} y={wallTop + wallH + 14} fontSize={9} fontWeight={700} fill="var(--faint)" textAnchor="start">SR</text>
                                <text x={tx(wallFt)} y={wallTop + wallH + 14} fontSize={9} fontWeight={700} fill="var(--faint)" textAnchor="end">SL</text>
                                {/* the truss marker */}
                                <line x1={tx(markerFt)} y1={ty - 18} x2={tx(markerFt)} y2={ty + 12}
                                  stroke="var(--orange)" strokeWidth={3} />
                                <text x={tx(markerFt)} y={ty - 24} fontSize={9.5} fontWeight={800}
                                  fill="var(--orange)" textAnchor="middle">TRUSS MARKER</text>
                                {/* head run from the marker to the even point */}
                                <line x1={tx(markerFt)} y1={ty} x2={tx(evenFt)} y2={ty}
                                  stroke="var(--cat5)" strokeWidth={3} strokeOpacity={0.85} />
                                {/* drop line from the even point down over the tiles */}
                                <line x1={tx(evenFt)} y1={ty} x2={tx(evenFt)} y2={wallTop + wallH}
                                  stroke="var(--cat5)" strokeWidth={1.5} strokeDasharray="4 4" strokeOpacity={0.7} />
                                <circle cx={tx(evenFt)} cy={ty} r={9} fill="var(--cat5)"
                                  onPointerDown={onDown}
                                  style={{ cursor: "ew-resize" }} />
                                <text x={tx(evenFt)} y={ty - 10} fontSize={10} fontWeight={800}
                                  fill="var(--cat5)" textAnchor="middle"
                                  stroke="var(--thead)" strokeWidth={3} style={{ paintOrder: "stroke fill" }}>
                                  EVEN ENDS {"\u00b7"} {ftIn(minExc)} past marker{offWall ? " (past the wall edge)" : ""}
                                </text>
                                <text x={TVW / 2} y={wallTop + wallH + 30} fontSize={9.5} fontWeight={700}
                                  fill="var(--faint)" textAnchor="middle">
                                  drag the dot to move the even point {"\u2014"} lengths reshuffle to fit
                                </text>
                              </svg>
                              {calcEvenFt != null && (
                                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                                  <button onClick={() => setCalcEvenFt(null)} style={{
                                    padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer",
                                    border: "1px solid var(--border)", background: "var(--card)",
                                    color: "var(--sub)", fontFamily: "inherit", borderRadius: 0,
                                  }}>reset to tightest natural fit</button>
                                </div>
                              )}
                            </>);
                          })()}
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })()}

          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <span style={{ fontSize: 11.5, color: "var(--faint)", alignSelf: "center" }}>
              Setup auto-saves as you work. Wall &amp; rigging are shared by every loom on this wall; only the tile assignments are this loom's.
            </span>
            <Btn variant="primary" onClick={close}>Close</Btn>
          </div>

        </div>
      </div>
    </div>
  );
};

const scHead = {
  fontSize: 11.5, fontWeight: 800, letterSpacing: 0.6, color: "var(--blue)", marginBottom: 8,
};
const scPanel = { background: "var(--card)", border: "2px solid var(--text)", padding: 14, minWidth: 0 };
const scHead2 = {
  fontSize: 11.5, fontWeight: 800, letterSpacing: 0.8,
  margin: "-14px -14px 14px", padding: "10px 12px",
  borderBottom: "2px solid var(--border-soft)",
};
const scTape = {
  background: "var(--blue)", color: "var(--card)", padding: "4px 10px",
  display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
};
const tapeRow = {
  display: "flex", gap: 10, alignItems: "baseline",
  fontSize: 12, padding: "7px 10px", borderRadius: 0,
  border: "1px solid var(--border)", background: "var(--card)",
  color: "var(--text)", flexWrap: "wrap",
};

// ---------------- main ----------------
export default function LoomBuilder() {
  const [show, setShow] = useState(emptyShow);
  const [activeWallId, setActiveWallId] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState("idle");

  // quick add
  const [qaMode, setQaMode] = useState("cable"); // "cable" | "hardware"
  const [qaHw, setQaHw] = useState("bumper");
  const [qaHwVariant, setQaHwVariant] = useState("Single");
  const [qaUtil, setQaUtil] = useState("jump");
  const [qaUtilVariant, setQaUtilVariant] = useState("3ft");
  const [qaQty, setQaQty] = useState(1);
  const [qaTarget, setQaTarget] = useState("individual");
  const [qaLabel, setQaLabel] = useState("A1");
  const [qaType, setQaType] = useState("CAT5");
  const [qaLength, setQaLength] = useState(50);
  const [qaNotes, setQaNotes] = useState("");

  // ---- load on mount ----
  useEffect(() => {
    (async () => {
      try {
        const result = await window.storage.get(STORAGE_KEY);
        if (result?.value) {
          const data = JSON.parse(result.value);
          setShow(data);
          setActiveWallId(data.walls[0]?.id ?? null);
        }
      } catch {
        // no saved show yet — start fresh
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!activeWallId && show.walls.length) setActiveWallId(show.walls[0].id);
  }, [show, activeWallId]);

  // ---- autosave (debounced) ----
  useEffect(() => {
    if (!loaded) return;
    setSaveState("saving");
    const t = setTimeout(async () => {
      try {
        await window.storage.set(STORAGE_KEY, JSON.stringify(show));
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 800);
    return () => clearTimeout(t);
  }, [show, loaded]);

  // System Cables is a special wall: full photos, looms, quick add — everything
  useEffect(() => {
    if (!show || show.walls.some((x) => x.system)) return;
    setShow((s) => (s.walls.some((x) => x.system) ? s : {
      ...s,
      walls: [...s.walls, {
        id: uid(), system: true, name: "System Cables",
        looms: [], individual: [...(s.system || [])],
      }],
      system: undefined,
    }));
  }, [show]);

  const summaryView = activeWallId === "__summary__";
  const systemWall = show?.walls.find((x) => x.system);
  const systemView = !!(systemWall && activeWallId === systemWall.id);
  const wall = show.walls.find((w) => w.id === activeWallId) || show.walls.find((w) => !w.system) || show.walls[0];
  // XD hub looms carry data only
  const qaXdOnly = !!wall?.looms?.find((l) => l.id === qaTarget)?.xdBox;
  const dark = !!show.dark;

  const showTotals = useMemo(() => {
    const detail = {};
    let power = 0, data = 0, total = 0, loomCount = 0;
    const hw = new Map(), util = new Map();
    let wallCount = 0;
    show.walls.forEach((w) => {
      const m = w.system ? 1 : Math.max(1, w.mult || 1); // repeat walls multiply their counts
      wallCount += w.system ? 0 : m;
      const s = computeWallSummary(w);
      power += s.power * m; data += s.data * m; total += s.total * m;
      loomCount += (w.looms || []).length * m;
      Object.entries(s.detail).forEach(([t, d]) => {
        const g = detail[t] || (detail[t] = { count: 0, feet: 0, lengths: {} });
        g.count += d.count * m; g.feet += d.feet * m;
        Object.entries(d.lengths).forEach(([L, q]) => { g.lengths[L] = (g.lengths[L] || 0) + q * m; });
      });
      (w.hardware || []).forEach((it) => hw.set(it.name, (hw.get(it.name) || 0) + it.qty * m));
      (w.utility || []).forEach((it) => util.set(it.name, (util.get(it.name) || 0) + it.qty * m));
    });
    return {
      detail, power, data, total, loomCount, wallCount,
      hw: [...hw.entries()].sort((a, b) => a[0].localeCompare(b[0])),
      util: [...util.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    };
  }, [show]);

  // ---- project-wide undo/redo: snapshots of the whole show ----
  const historyRef = useRef([]);        // stack of previous show states
  const redoRef = useRef([]);           // stack of undone states available to redo
  const prevShowRef = useRef(null);     // show as of the last change
  const skipHistoryRef = useRef(false); // true while restoring via undo/redo
  const lastPushRef = useRef(0);        // for coalescing rapid edits (typing)
  const [undoCount, setUndoCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);

  useEffect(() => {
    if (!loaded) { prevShowRef.current = show; return; }
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      prevShowRef.current = show;
      return;
    }
    // a fresh edit invalidates the redo trail
    if (redoRef.current.length) { redoRef.current = []; setRedoCount(0); }
    const now = Date.now();
    // bursts of edits within 700ms (e.g. typing a name) collapse into one undo step
    if (prevShowRef.current && now - lastPushRef.current > 700) {
      historyRef.current.push(prevShowRef.current);
      if (historyRef.current.length > 50) historyRef.current.shift();
      setUndoCount(historyRef.current.length);
    }
    lastPushRef.current = now;
    prevShowRef.current = show;
  }, [show, loaded]);

  const undoProject = useCallback(() => {
    const h = historyRef.current;
    if (!h.length) return;
    const prev = h.pop();
    setUndoCount(h.length);
    redoRef.current.push(prevShowRef.current);
    setRedoCount(redoRef.current.length);
    skipHistoryRef.current = true;
    lastPushRef.current = 0; // the next real edit should start a fresh undo step
    setShow(prev);
    setActiveWallId((id) =>
      prev.walls.find((w) => w.id === id) ? id : (prev.walls[0]?.id ?? null));
  }, []);

  const redoProject = useCallback(() => {
    const r = redoRef.current;
    if (!r.length) return;
    const next = r.pop();
    setRedoCount(r.length);
    historyRef.current.push(prevShowRef.current);
    if (historyRef.current.length > 50) historyRef.current.shift();
    setUndoCount(historyRef.current.length);
    skipHistoryRef.current = true;
    lastPushRef.current = 0;
    setShow(next);
    setActiveWallId((id) =>
      next.walls.find((w) => w.id === id) ? id : (next.walls[0]?.id ?? null));
  }, []);

  // Ctrl+Z / Cmd+Z to undo, Ctrl+Shift+Z or Ctrl+Y to redo
  // (except inside a text field, where native undo applies)
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const k = e.key.toLowerCase();
      if (k === "z" && e.shiftKey) { e.preventDefault(); redoProject(); }
      else if (k === "z") { e.preventDefault(); undoProject(); }
      else if (k === "y") { e.preventDefault(); redoProject(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undoProject, redoProject]);

  const setShowField = (field) => (v) => setShow((s) => ({ ...s, [field]: v }));

  const updateWall = useCallback((fn) => {
    setShow((s) => ({
      ...s,
      walls: s.walls.map((w) => (w.id === wall?.id ? fn(structuredClone(w)) : w)),
    }));
  }, [wall?.id]);

  // repeat walls: one built wall counted N times in the show totals
  const setWallMult = (wallId, n) => setShow((s) => ({
    ...s,
    walls: s.walls.map((w) => (w.id === wallId ? { ...w, mult: Math.min(50, Math.max(1, n)) } : w)),
  }));

  // ---- section reordering by drag grip ----
  const [sectionDrag, setSectionDrag] = useState(null);
  const [sectionOver, setSectionOver] = useState(null);
  const reorderSections = (dragK, targetK) => updateWall((w) => {
    const order = normalizeSectionOrder(w.sectionOrder).filter((x) => x !== dragK);
    const idx = order.indexOf(targetK);
    order.splice(idx < 0 ? order.length : idx, 0, dragK);
    w.sectionOrder = order;
    return w;
  });

  // ---- wall tab reordering (drag the tabs to shuffle) ----
  const [wallDrag, setWallDrag] = useState(null);   // wall id being dragged
  const [wallOver, setWallOver] = useState(null);   // wall id currently hovered

  const reorderWalls = (dragId, targetId) => setShow((s) => {
    const walls = [...s.walls];
    const from = walls.findIndex((w) => w.id === dragId);
    const to = walls.findIndex((w) => w.id === targetId);
    if (from < 0 || to < 0 || from === to) return s;
    const [w] = walls.splice(from, 1);
    walls.splice(to, 0, w);
    return { ...s, walls };
  });

  // ---- actions ----
  const addWall = () => {
    const w = { id: uid(), name: `Wall ${show.walls.length + 1}`, looms: [], individual: [] };
    setShow((s) => ({ ...s, walls: [...s.walls, w] }));
    setActiveWallId(w.id);
  };

  const deleteWall = (id) => {
    setShow((s) => {
      const walls = s.walls.filter((w) => w.id !== id);
      return walls.length ? { ...s, walls } : s;
    });
    if (id === activeWallId) setActiveWallId(null);
  };

  const duplicateWall = (id) => {
    const src = show.walls.find((w) => w.id === id);
    if (!src) return;
    const copy = structuredClone(src);
    copy.id = uid();
    copy.name = `${src.name} (copy)`;
    copy.looms = (copy.looms || []).map((l) => ({
      ...l, id: uid(),
      power: l.power.map((c) => ({ ...c, id: uid() })),
      data: l.data.map((c) => ({ ...c, id: uid() })),
    }));
    copy.individual = (copy.individual || []).map((c) => ({ ...c, id: uid() }));
    copy.hardware = (copy.hardware || []).map((it) => ({ ...it, id: uid() }));
    copy.utility = (copy.utility || []).map((it) => ({ ...it, id: uid() }));
    if (copy.photos) copy.photos = copy.photos.map((p) => ({ ...p, id: uid() }));
    setShow((s) => {
      const idx = s.walls.findIndex((w) => w.id === id);
      const walls = [...s.walls];
      walls.splice(idx === -1 ? walls.length : idx + 1, 0, copy);
      return { ...s, walls };
    });
    setActiveWallId(copy.id);
  };

  const addLoom = () => updateWall((w) => {
    // new looms land at the top of the list, ready to work on
    w.looms.unshift({ id: uid(), name: `Loom ${w.looms.length + 1}`, power: [], data: [] });
    return w;
  });

  const duplicateLoom = (loomId) => updateWall((w) => {
    const src = w.looms.find((l) => l.id === loomId);
    const copy = structuredClone(src);
    copy.id = uid(); copy.name = `${src.name} (copy)`;
    copy.power = copy.power.map((c) => ({ ...c, id: uid() }));
    copy.data = copy.data.map((c) => ({ ...c, id: uid() }));
    w.looms.splice(w.looms.findIndex((l) => l.id === loomId) + 1, 0, copy);
    return w;
  });

  const deleteLoom = (loomId) => updateWall((w) => {
    w.looms = w.looms.filter((l) => l.id !== loomId); return w;
  });

  // XD boxes A-D: turning one on creates a dedicated loom for it, named after the wall.
  // Turning it off deletes that loom only if it's still empty — cables are never lost.
  const toggleXdBox = (L) => updateWall((w) => {
    const on = new Set(w.xdBoxes || []);
    if (on.has(L)) {
      on.delete(L);
      const lm = w.looms.find((x) => x.xdBox === L);
      if (lm && lm.power.length === 0 && lm.data.length === 0) {
        w.looms = w.looms.filter((x) => x !== lm);
      }
    } else {
      on.add(L);
      if (!w.looms.some((x) => x.xdBox === L)) {
        w.looms.unshift({ id: uid(), name: `${w.name} XD ${L}`, power: [], data: [], xdBox: L, showPower: false });
      }
    }
    w.xdBoxes = ["A", "B", "C", "D"].filter((x) => on.has(x));
    return w;
  });

  // ---- Space Cable wizard ----
  const [spaceLoomId, setSpaceLoomId] = useState(null);
  const spaceLoom = wall?.looms.find((l) => l.id === spaceLoomId) || null;

  const saveLoomSpacing = (loomId, spacing, xdLengths = null) => updateWall((w) => {
    const { placements, xdPos, ...shared } = spacing;
    w.spacing = shared; // wall size, rigging, drop, lock: shared by all looms here
    const l = w.looms.find((l) => l.id === loomId);
    if (!l) return w;
    l.spacing = { placements, xdPos }; // per-loom: tile assignments / XD box position
    // XD hub looms: keep the data list in sync with the placed ports 1-10.
    // Add missing port cables (CAT5 with the computed stock length), remove ones no longer placed,
    // and refresh the length on existing port cables to whatever the current math picks.
    if (l.xdBox) {
      const placedPorts = new Set(
        Object.keys(placements || {}).filter((k) => k.startsWith("xdport-")).map((k) => k.slice(7))
      );
      const isPortCable = (c) => c && c.portId != null;
      l.data = (l.data || [])
        .filter((c) => !isPortCable(c) || placedPorts.has(String(c.portId)))
        .map((c) => {
          if (!isPortCable(c)) return c;
          const wantLabel = `${l.xdBox}${c.portId}`;
          const newLen = xdLengths ? xdLengths[String(c.portId)] : undefined;
          const out = { ...c };
          if (out.label !== wantLabel) out.label = wantLabel; // migrate old P# labels
          if (newLen != null) out.length = newLen;
          return out;
        });
      const covered = new Set(l.data.filter(isPortCable).map((c) => String(c.portId)));
      placedPorts.forEach((pid) => {
        if (!covered.has(pid)) {
          l.data.push({
            id: uid(), label: `${l.xdBox}${pid}`, type: "CAT5",
            length: xdLengths ? (xdLengths[pid] ?? null) : null,
            notes: "", portId: pid,
          });
        }
      });
    }
    return w;
  });



  const quickAdd = (typeArg, lenArg) => {
    const qType = typeof typeArg === "string" ? typeArg : qaType;
    const qLen = lenArg != null ? lenArg : qaLength;
    const isPower = POWER_TYPES.includes(qType);
    // hub looms are data only: a power type can't land in an XD loom
    const tLoom = wall?.looms?.find((l) => l.id === qaTarget);
    if (tLoom?.xdBox && isPower) return;
    const c = cable(qaLabel.trim() || qType, qType, qLen, qaNotes.trim());
    updateWall((w) => {
      if (qaTarget === "individual") {
        if (!w.indLocked) { w.individual.push(c); bumpSectionTop(w, "individual"); }
      } else {
        const l = w.looms.find((l) => l.id === qaTarget);
        if (l && !l.locked) {
          (isPower ? l.power : l.data).push(c);
          bumpSectionTop(w, "looms");
          // and float the loom itself to the top of the looms list
          const i = w.looms.indexOf(l);
          if (i > 0) { w.looms.splice(i, 1); w.looms.unshift(l); }
        } else if (!l && !w.indLocked) { w.individual.push(c); bumpSectionTop(w, "individual"); }
      }
      return w;
    });
    setQaLabel(nextLabel(qaLabel));
    setQaNotes("");
  };

  const quickAddHardware = (idArg, varArg) => {
    const name = hwItemName(typeof idArg === "string" ? idArg : qaHw, typeof varArg === "string" ? varArg : qaHwVariant);
    updateWall((w) => {
      if (w.hwLocked) return w;
      if (!w.hardware) w.hardware = [];
      const existing = w.hardware.find((it) => it.name === name);
      if (existing) existing.qty += qaQty; // same item again -> just bump the quantity
      else w.hardware.push({ id: uid(), name, qty: qaQty, notes: "" });
      bumpSectionTop(w, "hardware");
      return w;
    });
  };

  const quickAddUtility = (idArg, varArg) => {
    const name = utilItemName(typeof idArg === "string" ? idArg : qaUtil, typeof varArg === "string" ? varArg : qaUtilVariant);
    updateWall((w) => {
      if (w.utilLocked) return w;
      if (!w.utility) w.utility = [];
      const existing = w.utility.find((it) => it.name === name);
      if (existing) existing.qty += qaQty;
      else w.utility.push({ id: uid(), name, qty: qaQty, notes: "" });
      bumpSectionTop(w, "utility");
      return w;
    });
  };

  const removeCable = (loomId, section, cableId) => updateWall((w) => {
    if (loomId === null) w.individual = w.individual.filter((c) => c.id !== cableId);
    else {
      const l = w.looms.find((l) => l.id === loomId);
      l[section] = l[section].filter((c) => c.id !== cableId);
    }
    return w;
  });

  const duplicateCable = (loomId, section, src) => updateWall((w) => {
    const copy = { ...src, id: uid() };
    if (loomId === null) w.individual.push(copy);
    else w.looms.find((l) => l.id === loomId)[section].push(copy);
    return w;
  });

  const editCableLabel = (loomId, section, cableId, label) => updateWall((w) => {
    const list = loomId === null
      ? w.individual
      : w.looms.find((l) => l.id === loomId)[section];
    const c = list.find((c) => c.id === cableId);
    if (c) c.label = label;
    return w;
  });

  const ALL_SECTIONS = ["looms", "individual", "hardware", "utility"];
  const normalizeSectionOrder = (arr) => {
    const cur = (arr || []).filter((k) => ALL_SECTIONS.includes(k));
    ALL_SECTIONS.forEach((k) => { if (!cur.includes(k)) cur.push(k); });
    return cur;
  };

  // pull a section to the top of the wall's layout (used after quick-adds)
  const bumpSectionTop = (w, key) => {
    const rest = normalizeSectionOrder(w.sectionOrder).filter((k) => k !== key);
    w.sectionOrder = [key, ...rest];
  };

  const moveSection = (key, dir) => updateWall((w) => {
    const cur = normalizeSectionOrder(w.sectionOrder);
    const i = cur.indexOf(key), j = i + dir;
    if (i < 0 || j < 0 || j >= cur.length) return w;
    [cur[i], cur[j]] = [cur[j], cur[i]];
    w.sectionOrder = cur;
    return w;
  });

  // ---- hardware / utility item lists ----
  const addWallItem = (listKey) => updateWall((w) => {
    if (!w[listKey]) w[listKey] = [];
    w[listKey].push({ id: uid(), name: "New Item", qty: 1, notes: "" });
    return w;
  });

  const editWallItem = (listKey, id, field, val) => updateWall((w) => {
    const it = (w[listKey] || []).find((x) => x.id === id);
    if (it) it[field] = field === "qty" ? Math.max(0, Number(val) || 0) : val;
    return w;
  });

  const removeWallItem = (listKey, id) => updateWall((w) => {
    w[listKey] = (w[listKey] || []).filter((x) => x.id !== id);
    return w;
  });

  const duplicateWallItem = (listKey, id) => updateWall((w) => {
    const list = w[listKey] || [];
    const i = list.findIndex((x) => x.id === id);
    if (i < 0) return w;
    list.splice(i + 1, 0, { ...list[i], id: uid() });
    return w;
  });

  const reorderWallItem = (listKey, id, targetIdx) => updateWall((w) => {
    const list = w[listKey] || [];
    const i = list.findIndex((x) => x.id === id);
    if (i < 0 || targetIdx < 0 || targetIdx >= list.length) return w;
    const [item] = list.splice(i, 1);
    list.splice(targetIdx, 0, item);
    return w;
  });

  const toggleListLock = (lockKey) => updateWall((w) => { w[lockKey] = !w[lockKey]; return w; });

  const moveLoom = (loomId, dir) => updateWall((w) => {
    const i = w.looms.findIndex((l) => l.id === loomId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= w.looms.length) return w;
    [w.looms[i], w.looms[j]] = [w.looms[j], w.looms[i]];
    return w;
  });

  // shared cable drag state: lets a drag that starts in one section drop in another
  const [cableDrag, setCableDrag] = useState(null); // { id, loomId, section }

  // summary card collapse state (per group / per loom)
  const [sumCol, setSumCol] = useState({ looms: {} });
  const sumToggle = (k) => setSumCol((s) => ({ ...s, [k]: !s[k] }));
  const sumLoomToggle = (id) => setSumCol((s) => ({ ...s, looms: { ...s.looms, [id]: !s.looms[id] } }));

  // per-loom minimize + minimize/expand all
  const [loomMin, setLoomMin] = useState({});
  const toggleLoomMin = (id) => setLoomMin((m) => ({ ...m, [id]: !m[id] }));
  const setAllLoomsMin = (min) => setLoomMin(() => {
    if (!min) return {};
    const next = {};
    (wall?.looms || []).forEach((l) => { next[l.id] = true; });
    return next;
  });

  // individual cables tally into one row per type+length; groups expand on demand
  const [indOpen, setIndOpen] = useState({});
  const toggleIndGroup = (k) => setIndOpen((o) => ({ ...o, [k]: !o[k] }));

  const handleCableDrop = (target, targetIdx) => {
    const d = cableDrag;
    setCableDrag(null);
    if (!d) return;
    if (d.loomId === target.loomId && d.section === target.section) {
      if (targetIdx !== null) reorderCable(d.loomId, d.section, d.id, targetIdx);
      return;
    }
    updateWall((w) => {
      const srcList = d.loomId === null
        ? w.individual
        : w.looms.find((l) => l.id === d.loomId)?.[d.section];
      if (!srcList) return w;
      const i = srcList.findIndex((c) => c.id === d.id);
      if (i < 0) return w;
      const destLoom = target.loomId === null ? null : w.looms.find((l) => l.id === target.loomId);
      const destList = target.loomId === null ? w.individual : destLoom?.[target.section];
      if (!destList) return w;
      // respect locks on the destination
      if ((target.loomId === null && w.indLocked) || (destLoom && destLoom.locked)) return w;
      // hub looms are data only
      const dragged = srcList[i];
      if (destLoom?.xdBox && POWER_TYPES.includes(dragged?.type)) return w;
      const [cable] = srcList.splice(i, 1);
      if (targetIdx === null || targetIdx > destList.length) destList.push(cable);
      else destList.splice(targetIdx, 0, cable);
      return w;
    });
  };

  const reorderCable = (loomId, section, cableId, targetIdx) => updateWall((w) => {
    const list = loomId === null ? w.individual : w.looms.find((l) => l.id === loomId)[section];
    const i = list.findIndex((c) => c.id === cableId);
    if (i < 0 || targetIdx < 0 || targetIdx >= list.length) return w;
    const [item] = list.splice(i, 1);
    list.splice(targetIdx, 0, item);
    return w;
  });

  const toggleLoomLock = (loomId) => {
    updateWall((w) => {
      const l = w.looms.find((l) => l.id === loomId);
      if (l) l.locked = !l.locked;
      return w;
    });
    if (qaTarget === loomId) setQaTarget("individual");
  };

  const toggleIndLock = () => updateWall((w) => { w.indLocked = !w.indLocked; return w; });

  const editCableType = (loomId, section, cableId, type) => updateWall((w) => {
    if (loomId === null) {
      const c = w.individual.find((c) => c.id === cableId);
      if (c) c.type = type;
      return w;
    }
    const l = w.looms.find((l) => l.id === loomId);
    const list = l[section];
    const i = list.findIndex((c) => c.id === cableId);
    if (i < 0) return w;
    const c = list[i];
    c.type = type;
    // SOCA/TRUE1 belong in POWER, CAT5/CAT6 in DATA -- hop sections if the category changed
    const target = POWER_TYPES.includes(type) ? "power" : "data";
    if (target !== section) {
      list.splice(i, 1);
      l[target].push(c);
    }
    return w;
  });

  const editCableLength = (loomId, section, cableId, length) => updateWall((w) => {
    const list = loomId === null ? w.individual : w.looms.find((l) => l.id === loomId)[section];
    const c = list.find((c) => c.id === cableId);
    if (c) c.length = Number(length) || c.length;
    return w;
  });

  const editCableNotes = (cableId, notes) => updateWall((w) => {
    const c = w.individual.find((c) => c.id === cableId);
    if (c) c.notes = notes;
    return w;
  });

  // ---- reference photos (multiple per wall) ----
  const photoInputRef = useRef(null);
  const [lightbox, setLightbox] = useState(null); // photo id opened in the full-size editor

  // aspect ratios: very wide photos stack full-width instead of side by side
  const [photoAR, setPhotoAR] = useState({});
  useEffect(() => {
    (wall?.photos || []).forEach((p) => {
      const key = `${p.id}:${(p.src || "").length}`;
      if (photoAR[key] != null) return;
      const im = new Image();
      im.onload = () => setPhotoAR((m) => (m[key] != null ? m : { ...m, [key]: im.width / im.height }));
      im.src = p.src;
    });
  }, [wall?.photos]); // eslint-disable-line react-hooks/exhaustive-deps
  const arOf = (p) => photoAR[`${p.id}:${(p.src || "").length}`] || null;

  // one prop set for a photo, used by the grid tile and the full-size editor alike
  const photoViewerProps = (p) => ({
    photo: p,
    onRename: (v) => updateWall((w) => {
      w.photos = (w.photos || []).map((x) => (x.id === p.id ? { ...x, name: v } : x));
      return w;
    }),
    pinned: wall?.pinnedPhoto === p.id,
    onPin: () => updateWall((w) => {
      w.pinnedPhoto = w.pinnedPhoto === p.id ? null : p.id;
      return w;
    }),
    onRemove: () => { removePhotoById(p.id); setLightbox(null); },
    onMinimize: () => { togglePhotoMin(p.id); setLightbox(null); },
    onLightbox: () => setLightbox(p.id),
    marks: p.marks || [],
    onAddMark: (xf, yf, name, kind) => addPhotoMark(p.id, xf, yf, name, kind),
    onRemoveMark: (mid) => removePhotoMark(p.id, mid),
    lines: p.lines || [],
    onAddLine: (line) => addPhotoLine(p.id, line),
    onRemoveLine: (lid) => removePhotoLine(p.id, lid),
    onKeepCrop: (payload) => keepPhotoCrop(p.id, payload),
    indLocked: !!wall?.indLocked,
  });
  const [photoError, setPhotoError] = useState(false);

  const getWallPhotos = (w) => w?.photos || (w?.photo ? [{ id: "legacy", src: w.photo }] : []);
  const wallPhotos = getWallPhotos(wall);

  const addPhoto = (dataUrl) => {
    if (summaryView) return; // no target wall while viewing the summary
    updateWall((w) => {
    const list = getWallPhotos(w);
    delete w.photo; // migrate the old single-photo format
    const stock = ["DATA", "POWER", "SYSTEM"];
    const used = new Set(list.map((x) => x.name));
    const nextName = stock.find((n) => !used.has(n)) || `Photo ${list.length + 1}`;
    w.photos = [...list, { id: uid(), src: dataUrl, name: nextName }];
    return w;
    });
  };

  const handlePhoto = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    if (!files.length) return;
    setPhotoError(false);
    for (const file of files) {
      try {
        const dataUrl = await compressImage(file);
        addPhoto(dataUrl);
      } catch {
        setPhotoError("read");
      }
    }
  };

  const removePhotoById = (id) => updateWall((w) => {
    w.photos = getWallPhotos(w).filter((p) => p.id !== id);
    delete w.photo;
    return w;
  });

  const clearPhotos = () => updateWall((w) => { w.photos = []; delete w.photo; return w; });

  // utility markers on photos: placing one also adds it to the wall's Utility list,
  // removing one takes it back out
  const addPhotoMark = (photoId, xf, yf, name, kind) => updateWall((w) => {
    const p = getWallPhotos(w).find((x) => x.id === photoId);
    if (!p) return w;
    w.photos = getWallPhotos(w).map((x) => x.id === photoId
      ? { ...x, marks: [...(x.marks || []), { id: uid(), x: xf, y: yf, name, kind }] } : x);
    delete w.photo;
    if (!w.utility) w.utility = [];
    const ex = w.utility.find((it) => it.name === name);
    if (ex) ex.qty += 1;
    else w.utility.push({ id: uid(), name, qty: 1, notes: "" });
    return w;
  });

  const removePhotoMark = (photoId, markId) => updateWall((w) => {
    const p = getWallPhotos(w).find((x) => x.id === photoId);
    const m = p && (p.marks || []).find((x) => x.id === markId);
    if (!m) return w;
    w.photos = getWallPhotos(w).map((x) => x.id === photoId
      ? { ...x, marks: (x.marks || []).filter((k) => k.id !== markId) } : x);
    delete w.photo;
    const ex = (w.utility || []).find((it) => it.name === m.name);
    if (ex) {
      ex.qty -= 1;
      if (ex.qty <= 0) w.utility = w.utility.filter((it) => it !== ex);
    }
    return w;
  });

  // permanently replace a photo with its framed crop (annotations come remapped)
  const keepPhotoCrop = (photoId, payload) => updateWall((w) => {
    w.photos = getWallPhotos(w).map((x) => x.id === photoId
      ? { ...x, src: payload.src, marks: payload.marks, lines: payload.lines } : x);
    delete w.photo;
    return w;
  });

  // drawing a cable on a photo also adds it to Individual Cables;
  // removing the line takes that cable back out
  const addPhotoLine = (photoId, line) => updateWall((w) => {
    const lineObj = { id: uid(), ...line };
    if (!w.indLocked && line.type && line.len) {
      const cid = uid();
      if (!w.individual) w.individual = [];
      w.individual.push({
        id: cid, label: line.label || line.type, type: line.type,
        length: line.len, notes: "Photo overlay",
      });
      lineObj.cableId = cid;
      // surface where it landed
      const rest = normalizeSectionOrder(w.sectionOrder).filter((k) => k !== "individual");
      w.sectionOrder = ["individual", ...rest];
    }
    w.photos = getWallPhotos(w).map((x) => x.id === photoId
      ? { ...x, lines: [...(x.lines || []), lineObj] } : x);
    delete w.photo;
    return w;
  });

  const removePhotoLine = (photoId, lineId) => updateWall((w) => {
    const p = getWallPhotos(w).find((x) => x.id === photoId);
    const ln = p && (p.lines || []).find((k) => k.id === lineId);
    w.photos = getWallPhotos(w).map((x) => x.id === photoId
      ? { ...x, lines: (x.lines || []).filter((k) => k.id !== lineId) } : x);
    delete w.photo;
    if (ln?.cableId && !w.indLocked) {
      w.individual = w.individual.filter((c) => c.id !== ln.cableId);
    }
    return w;
  });

  const togglePhotoMin = (id) => updateWall((w) => {
    w.photos = getWallPhotos(w).map((p) => (p.id === id ? { ...p, min: !p.min } : p));
    delete w.photo;
    return w;
  });

  // right-click paste: read image straight from the clipboard
  const [ctxMenu, setCtxMenu] = useState(null); // {x, y} | null
  const [pasteCatcher, setPasteCatcher] = useState(false);

  const pasteFromClipboard = async () => {
    setCtxMenu(null);
    setPhotoError(false);
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith("image/"));
        if (type) {
          const blob = await item.getType(type);
          const dataUrl = await compressImage(blob);
          addPhoto(dataUrl);
          return;
        }
      }
      setPhotoError("no-image");
    } catch {
      // clipboard permission blocked — catch the paste keystroke instead
      setPasteCatcher(true);
    }
  };

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [ctxMenu]);

  // paste an image anywhere (Ctrl+V / Cmd+V) to set it as this wall's photo
  useEffect(() => {
    const onPaste = async (e) => {
      const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"));
      if (!item) return; // plain text paste — leave it alone
      e.preventDefault();
      setPasteCatcher(false);
      const file = item.getAsFile();
      if (!file) return;
      setPhotoError(false);
      try {
        const dataUrl = await compressImage(file);
        addPhoto(dataUrl);
      } catch {
        setPhotoError("read");
      }
    };
    const onKey = (e) => { if (e.key === "Escape") setPasteCatcher(false); };
    window.addEventListener("paste", onPaste);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("keydown", onKey);
    };
  }, [updateWall]);

  const resetShow = async () => {
    const fresh = emptyShow();
    fresh.dark = dark; // keep theme preference across shows
    setShow(fresh);
    setActiveWallId(fresh.walls[0].id);
    try { await window.storage.delete(STORAGE_KEY); } catch { /* nothing saved */ }
  };

  // ---- saved projects: named saves you can come back to ----
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [projBusy, setProjBusy] = useState(false);
  const [projMsg, setProjMsg] = useState(null); // {kind: 'ok'|'err', text}
  const importInputRef = useRef(null);

  const countCables = (s) => s.walls.reduce(
    (n, w) => n + w.individual.length + w.looms.reduce((m, l) => m + l.power.length + l.data.length, 0), 0);

  const refreshProjects = async () => {
    setProjBusy(true);
    try {
      const res = await window.storage.list("project:");
      const keys = (res?.keys || []).map((k) => (typeof k === "string" ? k : k.key)).filter(Boolean);
      const items = [];
      for (const key of keys) {
        try {
          const r = await window.storage.get(key);
          if (!r?.value) continue;
          const data = JSON.parse(r.value);
          items.push({
            key,
            name: data.name || "Untitled",
            savedAt: data.savedAt || 0,
            walls: data.show?.walls?.length || 0,
            cables: data.show ? countCables(data.show) : 0,
          });
        } catch { /* skip unreadable entry */ }
      }
      items.sort((a, b) => b.savedAt - a.savedAt);
      setProjects(items);
    } catch {
      setProjects([]);
    } finally {
      setProjBusy(false);
    }
  };

  const openProjects = () => { setProjMsg(null); setProjectsOpen(true); refreshProjects(); };

  const saveProject = async () => {
    setProjMsg(null);
    try {
      const existing = projects.find((p) => p.name === show.name);
      const key = existing ? existing.key : "project:" + uid();
      const result = await window.storage.set(key, JSON.stringify({
        name: show.name, savedAt: Date.now(), show,
      }));
      if (!result) throw new Error("save failed");
      setProjMsg({ kind: "ok", text: existing ? `Updated "${show.name}".` : `Saved "${show.name}".` });
      await refreshProjects();
    } catch {
      setProjMsg({ kind: "err", text: "Couldn't save — the project may be too large. Try removing a photo or two." });
    }
  };

  const loadProject = async (key) => {
    setProjMsg(null);
    try {
      const r = await window.storage.get(key);
      if (!r?.value) throw new Error("empty");
      const data = JSON.parse(r.value);
      if (!data.show?.walls) throw new Error("bad format");
      setShow(data.show); // goes through normal flow, so it's undoable
      setActiveWallId(data.show.walls[0]?.id ?? null);
      setProjectsOpen(false);
    } catch {
      setProjMsg({ kind: "err", text: "Couldn't load that project." });
    }
  };

  const deleteProject = async (key) => {
    setProjMsg(null);
    try {
      await window.storage.delete(key);
      await refreshProjects();
    } catch {
      setProjMsg({ kind: "err", text: "Couldn't delete that project." });
    }
  };

  const [exportText, setExportText] = useState(null);
  const exportProject = async () => {
    const json = JSON.stringify({ name: show.name, savedAt: Date.now(), show }, null, 2);
    const fname = `${(show.name || "show").replace(/[^\w-]+/g, "_")}.loomproject.json`;
    try {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = fname;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      let copied = false;
      try { await navigator.clipboard.writeText(json); copied = true; } catch (e2) {}
      setExportText({ json, copied });
    }
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setProjMsg(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const s = data.show?.walls ? data.show : (data.walls ? data : null);
        if (!s) throw new Error("bad format");
        setShow(s);
        setActiveWallId(s.walls[0]?.id ?? null);
        setProjectsOpen(false);
      } catch {
        setProjMsg({ kind: "err", text: "That file doesn't look like a Loom Builder project." });
      }
    };
    reader.onerror = () => setProjMsg({ kind: "err", text: "Couldn't read that file." });
    reader.readAsText(file);
  };

  // ---- summary ----
  const loomNameSuggestions = useMemo(() => {
    const names = new Set();
    show.walls.forEach((w) => w.looms.forEach((l) => { if (l.name?.trim()) names.add(l.name.trim()); }));
    return [...names].sort();
  }, [show]);

  const summary = useMemo(() => {
    if (!wall) return { power: 0, data: 0, indiv: 0, total: 0, byType: {}, detail: {}, totalFeet: 0, powerFeet: 0, dataFeet: 0 };
    let power = 0, data = 0, totalFeet = 0, powerFeet = 0, dataFeet = 0;
    const byType = {};
    const detail = {}; // type -> { count, feet, lengths: { length: qty } }
    const count = (c) => {
      byType[c.type] = (byType[c.type] || 0) + 1;
      const feet = Number(c.length) || 0;
      const d = detail[c.type] || (detail[c.type] = { count: 0, feet: 0, lengths: {} });
      d.count += 1;
      d.feet += feet;
      d.lengths[feet] = (d.lengths[feet] || 0) + 1;
      totalFeet += feet;
      if (POWER_TYPES.includes(c.type)) powerFeet += feet; else dataFeet += feet;
    };
    wall.looms.forEach((l) => {
      power += l.power.length; data += l.data.length;
      l.power.forEach(count); l.data.forEach(count);
    });
    wall.individual.forEach((c) => {
      count(c);
      POWER_TYPES.includes(c.type) ? power++ : data++;
    });
    return { power, data, indiv: wall.individual.length, total: power + data, byType, detail, totalFeet, powerFeet, dataFeet };
  }, [wall]);

  const card = {
    background: "var(--card)", border: "2px solid var(--text)", borderRadius: 0,
    boxShadow: "none",
  };

  const vars = THEME_VARS[dark ? "dark" : "light"];

  if (!loaded) return (
    <div style={{
      ...vars, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'IBM Plex Sans',system-ui,sans-serif", color: "var(--sub)", background: "var(--bg)",
    }}>
      Loading your show…
    </div>
  );

  return (
    <div style={{
      ...vars, minHeight: "100vh", background: "var(--bg)", color: "var(--text)",
      fontFamily: "'IBM Plex Sans','Segoe UI',system-ui,sans-serif",
      transition: "background .2s ease, color .2s ease",
    }}>
      {/* ---- header ---- */}
      <div style={{
        background: "var(--header-bg)", color: "#fff", padding: "16px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, flexWrap: "nowrap", flex: "1 1 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Cable size={24} color="#3b82f6" />
            <span style={{ fontFamily: "'Archivo','IBM Plex Sans',sans-serif", fontSize: 18, fontWeight: 800, letterSpacing: 2 }}>LED BUILD</span>
          </div>
          <div style={{ width: 1, height: 34, background: "#3A3A36" }} />
          <div style={{ display: "grid", gap: 1 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "#A3A29B", letterSpacing: 1.2 }}>Show</span>
            <EditableText value={show.name} onChange={setShowField("name")}
              placeholder="Show name"
              style={{ fontSize: 14.5, fontWeight: 700, color: "#fff", whiteSpace: "nowrap" }} />
          </div>
          <div style={{ width: 1, height: 34, background: "#3A3A36" }} />
          <div style={{ display: "grid", gap: 1 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "#A3A29B", letterSpacing: 1.2 }}>Date</span>
            <EditableText value={show.dates} onChange={setShowField("dates")}
              placeholder="Add dates"
              trailing={<Calendar size={13} color="#A3A29B" />}
              style={{ fontSize: 14.5, fontWeight: 600, color: "#e5e7eb", whiteSpace: "nowrap" }} />
          </div>
          <div style={{ width: 1, height: 34, background: "#3A3A36" }} />
          <div style={{ display: "grid", gap: 1 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "#A3A29B", letterSpacing: 1.2 }}>Venue</span>
            <EditableText value={show.venue} onChange={setShowField("venue")}
              placeholder="Add venue"
              trailing={<MapPin size={13} color="#A3A29B" />}
              style={{ fontSize: 14.5, fontWeight: 600, color: "#e5e7eb", whiteSpace: "nowrap" }} />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "nowrap", flex: "1 1 auto" }}>
          <span style={{
            fontSize: 12, color: saveState === "error" ? "#f87171" : "#9ca3af",
            display: "inline-flex", alignItems: "center", gap: 5,
            minWidth: 54, justifyContent: "flex-end",
            visibility: saveState === "saved" ? "hidden" : "visible",
          }}>
            {saveState === "error" ? "Couldn't save \u2014 changes are in memory only" : "Saving\u2026"}
          </span>
          <Btn onClick={resetShow} style={{ background: "transparent", color: "#d1d5db", borderColor: "#55554F", fontSize: 12, padding: "6px 10px", whiteSpace: "nowrap" }}>
            <RotateCcw size={13} /> New Show
          </Btn>
          <button onClick={openProjects}
            title="Save, load, and manage projects"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px",
              borderRadius: 0, cursor: "pointer",
              background: "transparent", border: "1px solid #55554F",
              color: "#d1d5db", fontSize: 12, fontWeight: 600, fontFamily: "inherit", whiteSpace: "nowrap",
            }}>
            <FolderOpen size={14} /> Projects
          </button>
          <button onClick={undoCount ? undoProject : undefined}
            title={undoCount ? `Undo last change (Ctrl+Z) — ${undoCount} step${undoCount > 1 ? "s" : ""} available` : "Nothing to undo"}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px",
              borderRadius: 0, cursor: undoCount ? "pointer" : "default",
              background: "transparent", border: "1px solid #55554F",
              color: "#d1d5db", fontSize: 12, fontWeight: 600, fontFamily: "inherit", whiteSpace: "nowrap",
              opacity: undoCount ? 1 : 0.45,
            }}>
            <Undo2 size={14} /> Undo
          </button>
          <button onClick={redoCount ? redoProject : undefined}
            title={redoCount ? `Redo (Ctrl+Shift+Z) — ${redoCount} step${redoCount > 1 ? "s" : ""} available` : "Nothing to redo"}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px",
              borderRadius: 0, cursor: redoCount ? "pointer" : "default",
              background: "transparent", border: "1px solid #55554F",
              color: "#d1d5db", fontSize: 12, fontWeight: 600, fontFamily: "inherit", whiteSpace: "nowrap",
              opacity: redoCount ? 1 : 0.45,
            }}>
            <Redo2 size={14} /> Redo
          </button>
          <button onClick={() => setShow((s) => ({ ...s, dark: !s.dark }))}
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 34, height: 34, borderRadius: 0, cursor: "pointer",
              background: "transparent", border: "1px solid #55554F", color: "#d1d5db",
            }}>
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "nowrap", flex: "1 1 auto" }}>
          <div onClick={() => systemWall && setActiveWallId(systemWall.id)} style={{
            display: "flex", alignItems: "center", gap: 7, padding: "8px 14px",
            borderRadius: 0, fontSize: 13, fontWeight: 700, cursor: "pointer",
            background: systemView ? "var(--green)" : "transparent",
            color: systemView ? "#fff" : "#4ade80",
            border: `1.5px solid ${systemView ? "var(--green)" : "#166534"}`,
          }}>
            <Cable size={15} /> System Cables
          </div>
          <div onClick={() => setActiveWallId("__summary__")} style={{
            display: "flex", alignItems: "center", gap: 7, padding: "8px 14px",
            borderRadius: 0, fontSize: 13, fontWeight: 700, cursor: "pointer",
            background: summaryView ? "#F2F1ED" : "transparent",
            color: summaryView ? "#131311" : "#8FA8E8",
            border: `2px solid ${summaryView ? "#F2F1ED" : "#3D4A6B"}`,
          }}>
            <BarChart3 size={15} /> Show Summary
          </div>
        </div>
      </div>

      {/* ---- wall tabs ---- */}
      <div style={{
        background: "var(--card)", borderBottom: "1px solid var(--border)", padding: "10px 24px 14px",
      }}>
        <div style={{
          fontWeight: 800, fontSize: 12, letterSpacing: 1.5, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 6, background: "var(--text)", color: "var(--card)", padding: "5px 12px", marginBottom: 12,
        }}>LED WALLS</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {show.walls.filter((x) => !x.system).map((w) => (
          <div key={w.id} onClick={() => setActiveWallId(w.id)}
            draggable
            onDragStart={(e) => {
              setWallDrag(w.id);
              try {
                e.dataTransfer.setData("text/plain", w.id);
                e.dataTransfer.effectAllowed = "move";
              } catch { /* state is enough */ }
            }}
            onDragEnd={() => { setWallDrag(null); setWallOver(null); }}
            onDragOver={(e) => {
              if (!wallDrag || wallDrag === w.id) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (wallOver !== w.id) setWallOver(w.id);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (wallDrag && wallDrag !== w.id) reorderWalls(wallDrag, w.id);
              setWallDrag(null); setWallOver(null);
            }}
            title="Drag to reorder walls"
            style={{
            display: "flex", alignItems: "center", gap: 8, padding: "12px 26px",
            borderRadius: 0, fontSize: 13.5, fontWeight: 700, cursor: "pointer",
            textTransform: "uppercase", letterSpacing: 0.4,
            background: w.id === activeWallId ? "var(--text)" : "var(--card)",
            color: w.id === activeWallId ? "var(--card)" : "var(--tab-text)",
            border: `2px solid ${w.id === activeWallId ? "var(--text)" : "var(--border)"}`,
            opacity: wallDrag === w.id ? 0.4 : 1,
            boxShadow: wallOver === w.id && wallDrag && wallDrag !== w.id
              ? "inset 3px 0 0 0 #3b82f6" : "none",
          }}>
            {w.name}
          </div>
        ))}
        <div onClick={addWall} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "12px 22px",
          borderRadius: 0, fontSize: 13.5, fontWeight: 600, cursor: "pointer",
          background: "transparent", color: "var(--text)",
          border: "1.5px dashed var(--border)",
        }}>
          <Plus size={15} /> Add Wall
        </div>
        {!summaryView && !systemView && wall && !wall.system && (
          <div style={{
            marginLeft: "auto", display: "flex", alignItems: "center", gap: 12,
            border: "1.5px solid var(--purple)", borderRadius: 0, padding: "8px 12px",
          }}>
            <div style={{ display: "grid", gap: 0 }}>
              <span style={{
                fontWeight: 800, fontSize: 13.5, maxWidth: 160,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{wall.name}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--faint)" }}>Actions</span>
            </div>
            <Btn onClick={() => duplicateWall(wall.id)} style={{ padding: "6px 12px", fontSize: 12 }}>
              <Copy size={12} /> Duplicate
            </Btn>
            <Btn variant="danger"
              onClick={show.walls.filter((x) => !x.system).length > 1 ? () => deleteWall(wall.id) : undefined}
              title={show.walls.filter((x) => !x.system).length > 1 ? "Delete this wall" : "The last wall can't be deleted"}
              style={{
                padding: "6px 12px", fontSize: 12,
                opacity: show.walls.filter((x) => !x.system).length > 1 ? 1 : 0.4,
              }}>
              <Trash2 size={12} /> Delete
            </Btn>
          </div>
        )}
        </div>
      </div>

      {summaryView && (
        <div style={{ padding: 24, display: "grid", gap: 24, maxWidth: 1050, margin: "0 auto" }}>
          <div>
            <h1 style={{ fontFamily: "'Archivo','IBM Plex Sans',sans-serif", fontSize: 30, fontWeight: 800, margin: 0, letterSpacing: 0.6 }}>SHOW SUMMARY</h1>
            <div style={{ fontSize: 13, color: "var(--sub)", marginTop: 4 }}>
              {show.name}{show.venue ? ` · ${show.venue}` : ""} &mdash;{" "}
              {showTotals.wallCount} wall{showTotals.wallCount !== 1 ? "s" : ""} ·{" "}
              {showTotals.loomCount} loom{showTotals.loomCount !== 1 ? "s" : ""}
            </div>
          </div>

          {/* grand totals */}
          <div style={{ ...card, padding: 18, borderTop: "5px solid var(--blue)", overflow: "hidden" }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8,
              margin: "-18px -18px 14px", padding: "13px 18px",
              background: "var(--thead)", borderBottom: "1px solid var(--border)",
            }}>
              <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: 1.5, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 6, background: "var(--blue)", color: "#fff", padding: "5px 12px" }}>
                SHOW TOTALS <span style={{ fontWeight: 600, fontSize: 10.5, color: "rgba(255,255,255,0.8)" }}>(ALL WALLS)</span>
              </div>
            </div>
            {showTotals.total === 0 && showTotals.hw.length === 0 && showTotals.util.length === 0 ? (
              <div style={sumEmpty}>Nothing in this show yet.</div>
            ) : (
              <>
                {showTotals.total > 0 && (
                  <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", marginBottom: 14 }}>
                    {CABLE_TYPES.filter((t) => showTotals.detail[t]).map((t) => {
                      const d = showTotals.detail[t];
                      const lens = Object.keys(d.lengths).map(Number).sort((a, b) => b - a);
                      return (
                        <div key={t} style={{
                          border: `1px solid ${TYPE_COLORS[t].border}`, borderRadius: 0,
                          padding: "12px 14px", background: "var(--card)",
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: TYPE_COLORS[t].text }}>{t}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--sub)" }}>
                              {d.count} cable{d.count !== 1 ? "s" : ""}
                            </span>
                          </div>
                          {lens.map((L) => (
                            <div key={L} style={{
                              display: "flex", justifyContent: "space-between",
                              fontSize: 12.5, padding: "3px 0", borderBottom: "1px solid var(--border-soft)",
                            }}>
                              <span style={{ fontWeight: 600 }}>{L}&rsquo;</span>
                              <span style={{ color: "var(--sub)", fontWeight: 700 }}>&times; {d.lengths[L]}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                  <div>
                    <div style={{ ...sumHead, color: "var(--cat6)" }}>
                      HARDWARE <span style={{ color: "var(--faint)" }}>({showTotals.hw.reduce((n, [, q]) => n + q, 0)})</span>
                    </div>
                    {showTotals.hw.length === 0 ? <div style={sumEmpty}>None.</div> : (
                      showTotals.hw.map(([name, qty]) => (
                        <div key={name} style={sumLine}>
                          <span style={{ fontWeight: 600 }}>{name}</span>
                          <span style={{ color: "var(--sub)" }}>&times;{qty}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div>
                    <div style={{ ...sumHead, color: "var(--true1)" }}>
                      UTILITY <span style={{ color: "var(--faint)" }}>({showTotals.util.reduce((n, [, q]) => n + q, 0)})</span>
                    </div>
                    {showTotals.util.length === 0 ? <div style={sumEmpty}>None.</div> : (
                      showTotals.util.map(([name, qty]) => (
                        <div key={name} style={sumLine}>
                          <span style={{ fontWeight: 600 }}>{name}</span>
                          <span style={{ color: "var(--sub)" }}>&times;{qty}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* one card per wall */}
          {show.walls.map((w) => {
            const s = computeWallSummary(w);
            return (
              <div key={w.id} style={{ ...card, padding: 18, overflow: "hidden" }}>
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8,
                  margin: "-18px -18px 14px", padding: "12px 18px",
                  background: "var(--thead)", borderBottom: "1px solid var(--border)",
                }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: w.system ? "var(--green)" : "var(--text)" }}>
                    {w.name}
                    {w.system && <span style={{ fontWeight: 600, fontSize: 10.5, color: "var(--faint)" }}> (SHOW-LEVEL)</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    {!w.system && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
                      title="Repeat walls: the show totals count this wall this many times">
                      <span style={{ fontSize: 10.5, fontWeight: 800, color: "var(--blue)", letterSpacing: 0.4 }}>REPEAT</span>
                      <button title="Fewer" onClick={() => setWallMult(w.id, (w.mult || 1) - 1)}
                        style={pvBtn((w.mult || 1) <= 1)}><Minus size={12} /></button>
                      <span style={{
                        minWidth: 30, textAlign: "center", fontWeight: 800, fontSize: 13,
                        color: (w.mult || 1) > 1 ? "var(--blue)" : "var(--text)",
                      }}>×{w.mult || 1}</span>
                      <button title="More" onClick={() => setWallMult(w.id, (w.mult || 1) + 1)}
                        style={pvBtn(false)}><Plus size={12} /></button>
                    </span>}
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--sub)" }}>
                      {s.total} cable{s.total !== 1 ? "s" : ""} · {(w.looms || []).length} loom{(w.looms || []).length !== 1 ? "s" : ""}
                      {(w.mult || 1) > 1 && (
                        <b style={{ color: "var(--blue)" }}> {"→ "}{s.total * (w.mult || 1)} in totals</b>
                      )}
                    </span>
                    <Btn onClick={() => setActiveWallId(w.id)} style={{ padding: "4px 10px", fontSize: 11.5 }}>
                      Open Wall
                    </Btn>
                  </div>
                </div>
                <WallSummaryColumns w={w} s={s} />
                {(() => {
                  const looms = w.looms || [];
                  if (looms.length === 0) return null;
                  // build a per-loom breakdown: name, tags, and the cable tally like "CAT5 25′ ×4"
                  const tallyOf = (cables) => {
                    const m = new Map();
                    (cables || []).forEach((c) => {
                      const L = Number(c.length) || 0;
                      const key = `${c.type}|${L}`;
                      const cur = m.get(key) || { type: c.type, len: L, n: 0 };
                      cur.n += 1;
                      m.set(key, cur);
                    });
                    return [...m.values()].sort((a, b) =>
                      a.type === b.type ? b.len - a.len : a.type.localeCompare(b.type));
                  };
                  return (
                    <div style={{ marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
                        fontSize: 10.5, fontWeight: 800, letterSpacing: 1.2, color: "var(--sub)",
                      }}>
                        LOOMS <span style={{ color: "var(--faint)", fontWeight: 700 }}>{"\u00b7"} {looms.length}</span>
                      </div>
                      <div style={{ display: "grid", gap: 8 }}>
                        {looms.map((lm) => {
                          const cables = [...(lm.data || []), ...(lm.power || [])];
                          const rows = tallyOf(cables);
                          const isXd = !!lm.xdBox;
                          return (
                            <div key={lm.id} style={{
                              border: "1px solid var(--border)",
                              borderLeft: `4px solid ${isXd ? "var(--cat6)" : "var(--blue)"}`,
                              padding: "8px 10px", background: "var(--card)",
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: rows.length ? 6 : 0 }}>
                                <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--text)" }}>{lm.name}</span>
                                {isXd && (
                                  <span style={{
                                    fontSize: 9.5, fontWeight: 800, padding: "1px 6px",
                                    background: "var(--cat6)", color: "#fff", letterSpacing: 0.4,
                                  }}>
                                    XD {lm.xdBox} {"\u00b7"} {cables.length}/10
                                  </span>
                                )}
                                <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "var(--sub)" }}>
                                  {cables.length} cable{cables.length !== 1 ? "s" : ""}
                                </span>
                                <Btn onClick={() => { setActiveWallId(w.id); setSummaryView(false); setSpaceLoomId(lm.id); }}
                                  style={{ padding: "3px 8px", fontSize: 10.5 }}
                                  title="Open the Space Cable diagram for this loom">
                                  Open Diagram
                                </Btn>
                              </div>
                              {rows.length > 0 && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                                  {rows.map((r, i) => {
                                    const tc = (typeof TYPE_COLORS !== "undefined" && TYPE_COLORS[r.type])
                                      ? TYPE_COLORS[r.type].text : "var(--text)";
                                    return (
                                      <span key={i} style={{
                                        fontSize: 11, fontWeight: 700, padding: "3px 8px",
                                        border: `1px solid ${tc}`, color: tc, background: "var(--thead)",
                                      }}>
                                        {r.type} {r.len ? `${r.len}\u2032` : ""}{" "}<b style={{ fontWeight: 800 }}>{"\u00d7"}{r.n}</b>
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                              <LoomBuildDiagram loom={lm} wallSpacing={w.spacing} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
                {(() => {
                  const photos = w.photos || [];
                  if (photos.length === 0) return null;
                  // put the pinned photo first if there is one
                  const order = [...photos].sort((a, b) => {
                    if (a.id === w.pinnedPhoto) return -1;
                    if (b.id === w.pinnedPhoto) return 1;
                    return 0;
                  });
                  return (
                    <div style={{ marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
                        fontSize: 10.5, fontWeight: 800, letterSpacing: 1.2, color: "var(--sub)",
                      }}>
                        REFERENCE
                        <span style={{ color: "var(--faint)", fontWeight: 700 }}>{"\u00b7"} {photos.length} photo{photos.length !== 1 ? "s" : ""}</span>
                      </div>
                      <div style={{
                        display: "grid", gap: 8,
                        gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))",
                      }}>
                        {order.map((p) => (
                          <div key={p.id} style={{ display: "grid", gap: 4 }}>
                            {p.name && (
                              <div style={{ fontSize: 10, fontWeight: 800, color: "var(--sub)", letterSpacing: 0.6 }}>
                                {p.name}
                              </div>
                            )}
                            <div style={{
                              width: "100%", maxHeight: 200, borderRadius: 4, overflow: "hidden",
                              border: "1px solid var(--border)", background: "var(--card)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              <img src={p.src} alt={p.name || "Reference"} draggable={false}
                                style={{ width: "100%", maxHeight: 200, objectFit: "contain", display: "block" }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      {!summaryView && wall && (() => {
        const secOrder = normalizeSectionOrder(wall.sectionOrder);
        const secPos = Object.fromEntries(secOrder.map((k, i) => [k, i]));
        const SecArrows = ({ k }) => (
          <span draggable
            title="Drag to reorder sections"
            onDragStart={(e) => {
              setSectionDrag(k);
              try {
                e.dataTransfer.setData("text/plain", k);
                e.dataTransfer.effectAllowed = "move";
              } catch { /* state is enough */ }
            }}
            onDragEnd={() => { setSectionDrag(null); setSectionOver(null); }}
            style={{
              display: "inline-flex", alignItems: "center", padding: "6px 6px",
              cursor: "grab", color: "var(--sub)", border: "1px solid var(--border)",
              borderRadius: 8, background: "var(--card)",
            }}>
            <GripVertical size={14} />
          </span>
        );
        const secDrop = (k) => ({
          onDragOver: (e) => {
            if (!sectionDrag || sectionDrag === k) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            if (sectionOver !== k) setSectionOver(k);
          },
          onDragLeave: () => { if (sectionOver === k) setSectionOver(null); },
          onDrop: (e) => {
            if (!sectionDrag || sectionDrag === k) return;
            e.preventDefault();
            reorderSections(sectionDrag, k);
            setSectionDrag(null); setSectionOver(null);
          },
        });
        const secGlow = (k) => (sectionDrag && sectionOver === k && sectionDrag !== k
          ? { outline: "2px solid #3b82f6", outlineOffset: 2 } : {});
        const itemSections = [
          { key: "hardware", title: "HARDWARE", color: "var(--cat6)", lockKey: "hwLocked", hint: "Processors, headers, rigging, spares." },
          { key: "utility", title: "UTILITY", color: "var(--amber)", lockKey: "utilLocked", hint: "Tape, ties, adapters, consumables." },
        ];
        return (
        <div style={{ padding: 24, display: "grid", gap: 28, maxWidth: 1050, margin: "0 auto" }}>
          {/* wall title + summary — mockup layout */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <EditableText value={wall.name}
                  onChange={(v) => updateWall((w) => { w.name = v; return w; })}
                  placeholder="Wall name"
                  style={{ fontFamily: "'Archivo','IBM Plex Sans',sans-serif", fontSize: 30, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase" }} />
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.6, color: "var(--cat6)" }}>XD BOX</span>
                  {["A", "B", "C", "D"].map((L) => {
                    const on = (wall.xdBoxes || []).includes(L);
                    return (
                      <button key={L} onClick={() => toggleXdBox(L)}
                        title={on
                          ? `Turn off XD ${L} (its loom is removed only if empty)`
                          : `Turn on XD ${L} — creates loom "${wall.name} XD ${L}"`}
                        style={{
                          width: 30, height: 30, borderRadius: 0, fontWeight: 800, fontSize: 13,
                          cursor: "pointer", fontFamily: "inherit",
                          border: `1.5px solid ${on ? BLUE : "var(--border)"}`,
                          background: on ? "var(--blue-bg)" : "var(--card)",
                          color: on ? BLUE : "var(--faint)",
                        }}>{L}</button>
                    );
                  })}
                </span>
              </div>
              {(() => {
                const sp = wall.spacing || {};
                const tw = sp.tilesW, th = sp.tilesH, mm = sp.tileMm;
                const meta = { display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13.5, fontWeight: 600, color: "var(--text)" };
                const div = <div style={{ width: 1, height: 20, background: "var(--border)" }} />;
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                    <span style={meta}>
                      <LayoutGrid size={15} color="var(--sub)" />
                      {tw && th ? `${tw} x ${th} Tiles` : <span style={{ color: "var(--faint)" }}>Tiles — set in Space Cable</span>}
                    </span>
                    {div}
                    <span style={meta}>
                      <Monitor size={15} color="var(--sub)" />
                      <EditableText value={wall.panel || ""}
                        onChange={(v) => updateWall((w) => { w.panel = v; return w; })}
                        placeholder="Panel model"
                        style={{ fontSize: 13.5, fontWeight: 600 }} />
                    </span>
                    {div}
                    <span style={meta}>
                      <Move size={15} color="var(--sub)" />
                      {tw && th && mm
                        ? `${((tw * mm) / 1000).toFixed(1).replace(/\.0$/, "")}m x ${((th * mm) / 1000).toFixed(1).replace(/\.0$/, "")}m`
                        : <span style={{ color: "var(--faint)" }}>—</span>}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* stats strip */}
          {(() => {
            const typeCount = Object.values(summary.byType || {}).filter((n) => n > 0).length;
            const hwQty = (wall.hardware || []).reduce((n, it) => n + it.qty, 0);
            const utQty = (wall.utility || []).reduce((n, it) => n + it.qty, 0);
            const utTypes = (wall.utility || []).filter((it) => it.qty > 0).length;
            const go = (id) => () => {
              const el = document.getElementById(id);
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            };
            const cells = [
              { icon: <Plug size={26} color={GREEN} />, label: "CABLES", color: GREEN,
                n: summary.total, sub: summary.total ? `${typeCount} Type${typeCount !== 1 ? "s" : ""}` : "None yet",
                target: "sec-individual" },
              { icon: <Cable size={26} color={BLUE} />, label: "LOOMS", color: BLUE,
                n: wall.looms.length, sub: wall.looms.length ? `${wall.looms.length} built` : "None yet",
                target: "sec-looms" },
              { icon: <Wrench size={26} color={"var(--cat6)"} />, label: "HARDWARE", color: "var(--cat6)",
                n: hwQty, sub: hwQty ? `${(wall.hardware || []).length} items` : "None yet",
                target: "sec-hardware" },
              { icon: <Package size={26} color={"var(--amber)"} />, label: "UTILITY", color: "var(--amber)",
                n: utQty, sub: utQty ? `${utTypes} Type${utTypes !== 1 ? "s" : ""}` : "None yet",
                target: "sec-utility" },
            ];
            return (
              <div style={{ ...card, padding: "16px 18px", order: 1 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 0 }}>
                  {cells.map((c, i) => (
                    <div key={c.label} style={{
                      display: "flex", alignItems: "center", gap: 14, padding: "4px 16px",
                      borderLeft: i > 0 ? "1px solid var(--border)" : "none",
                    }}>
                      {c.icon}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.5, color: c.color }}>{c.label}</div>
                        <div style={{ fontFamily: "'Archivo','IBM Plex Sans',sans-serif", fontSize: 30, fontWeight: 800, lineHeight: 1.15 }}>{c.n}</div>
                        <div style={{ fontSize: 11.5, color: "var(--faint)", fontWeight: 600 }}>{c.sub}</div>
                      </div>
                      <Btn onClick={go(c.target)} style={{ padding: "6px 14px", fontSize: 12 }}>View</Btn>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* detailed wall summary — four cards */}
          {(() => {
            const tape = {
              fontWeight: 800, fontSize: 12, letterSpacing: 1.5, whiteSpace: "nowrap",
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "var(--text)", color: "var(--card)", padding: "5px 12px",
            };
            const th = { fontSize: 9.5, fontWeight: 800, letterSpacing: 0.6, color: "var(--faint)", textAlign: "left", padding: "4px 6px" };
            const td = { fontSize: 12, fontWeight: 600, padding: "4px 6px" };
            const groupHead = (open, onClick, icon, label, count, color) => (
              <div onClick={onClick} style={{
                display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
                padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)",
                background: "var(--thead)", userSelect: "none",
              }}>
                {icon}
                <span style={{ fontWeight: 800, fontSize: 12.5, letterSpacing: 0.5, color }}>{label}</span>
                <span style={{ fontSize: 11.5, color: "var(--faint)", fontWeight: 700 }}>({count})</span>
                <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "var(--sub)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {open ? "Collapse" : "Expand"}
                  <ChevronDown size={13} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
                </span>
              </div>
            );
            // aggregate type -> length -> { qty, looms:Set }
            const buildAgg = (source) => {
              const m = new Map();
              source.forEach(({ c, loomId }) => {
                if (!m.has(c.type)) m.set(c.type, new Map());
                const lm = m.get(c.type);
                const L = Number(c.length) || 0;
                if (!lm.has(L)) lm.set(L, { qty: 0, looms: new Set() });
                const e = lm.get(L);
                e.qty += 1;
                if (loomId) e.looms.add(loomId);
              });
              return m;
            };
            // every cable in the wall counts as POWER or DATA — pool cables included
            const poolCables = (wall.individual || []).map((c) => ({ c, loomId: null }));
            const powerSrc = [
              ...wall.looms.flatMap((l) => l.power.map((c) => ({ c, loomId: l.id }))),
              ...poolCables.filter(({ c }) => POWER_TYPES.includes(c.type)),
            ];
            const dataSrc = [
              ...wall.looms.flatMap((l) => l.data.map((c) => ({ c, loomId: l.id }))),
              ...poolCables.filter(({ c }) => !POWER_TYPES.includes(c.type)),
            ];
            const groups = [
              { key: "power", label: "POWER", color: ORANGE, icon: <Zap size={15} color={ORANGE} />, agg: buildAgg(powerSrc), n: powerSrc.length },
              { key: "data", label: "DATA", color: GREEN, icon: <LayoutGrid size={15} color={GREEN} />, agg: buildAgg(dataSrc), n: dataSrc.length },
            ];
            const totalCables = groups.reduce((n, g) => n + g.n, 0);
            // table like the mock: one row per length, type named once per block
            const aggTable = (agg) => (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={th}>TYPE (NAME)</th>
                  <th style={{ ...th, textAlign: "center" }}>BREAKDOWN</th>
                  <th style={{ ...th, textAlign: "right" }}>TOTAL QTY</th>
                </tr></thead>
                <tbody>
                  {[...agg.entries()].flatMap(([type, lens]) => {
                    const rows = [...lens.entries()].sort((a, b) => b[0] - a[0]);
                    const tc = TYPE_COLORS[type]?.text || "var(--text)";
                    return rows.map(([L, e], i) => (
                      <tr key={`${type}-${L}`}
                        style={{ borderTop: i === 0 ? "1px solid var(--border)" : "none" }}>
                        <td style={{ ...td, fontWeight: 800, color: tc }}>{i === 0 ? type : ""}</td>
                        <td style={{ ...td, textAlign: "center", whiteSpace: "nowrap" }}>{L}FT x {e.qty}</td>
                        <td style={{ ...td, textAlign: "right", fontWeight: 800, color: tc }}>{e.qty}</td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            );
            const footer = (label, n, color) => (
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                borderTop: "1px solid var(--border)", marginTop: "auto", paddingTop: 10,
              }}>
                <span style={{ fontWeight: 800, fontSize: 12.5, letterSpacing: 0.5, color }}>{label}</span>
                <span style={{ fontWeight: 800, fontSize: 16, color }}>{n}</span>
              </div>
            );
            const hwQty = (wall.hardware || []).reduce((n, it) => n + it.qty, 0);
            const utQty = (wall.utility || []).reduce((n, it) => n + it.qty, 0);
            const utilType = (name) =>
              /soca/i.test(name) ? "SOCAPEX"
              : /true1|2-fer/i.test(name) ? "TRUE1"
              : /cat6/i.test(name) ? "CAT6"
              : /cat/i.test(name) ? "CAT5" : "MISC";
            // empty sections stay visible but take almost no height
            const emptyState = (icon, title, hint) => (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 6px", flexWrap: "wrap" }}>
                <span style={{ display: "inline-flex", opacity: 0.8 }}>{icon}</span>
                <span style={{ fontWeight: 700, fontSize: 12 }}>{title}</span>
                <span style={{ fontSize: 11.5, color: "var(--faint)" }}>{hint}</span>
              </div>
            );
            return (
              <div style={{ border: "2px solid var(--text)", background: "var(--thead)", padding: 16, display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gap: 14, gridTemplateColumns: "1fr", alignItems: "start" }}>

                {/* cable pool: POWER · DATA · LOOMS side by side */}
                <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))", alignItems: "stretch" }}>
                  {groups.map((g) => {
                    const open = !sumCol[g.key];
                    return (
                      <div key={g.key} style={{ ...card, padding: 14, display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={tape}>
                            {g.icon} {g.label}{" "}
                            <span style={{ fontWeight: 600, fontSize: 10.5, color: "var(--card)", opacity: 0.75 }}>({g.n})</span>
                          </span>
                          {g.n > 0 && (
                            <Btn onClick={() => sumToggle(g.key)} style={{ padding: "5px 10px", fontSize: 11.5 }}>
                              {open ? "Collapse" : "Expand"}
                            </Btn>
                          )}
                        </div>
                        {g.n === 0 && (
                          <div style={{ display: "grid", justifyItems: "center", gap: 8, padding: "26px 8px", textAlign: "center" }}>
                            <span style={{ opacity: 0.85 }}>{g.icon}</span>
                            <div style={{ fontWeight: 700, fontSize: 12.5 }}>No {g.label.toLowerCase()} cables yet.</div>
                          </div>
                        )}
                        {open && g.n > 0 && (
                          <div style={{ padding: "0 2px" }}>{aggTable(g.agg)}</div>
                        )}
                        
                      </div>
                    );
                  })}

                {/* UTILITY */}
                <div style={{ ...card, padding: 14, display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={tape}><Package size={13} /> UTILITY <span style={{ fontWeight: 600, fontSize: 10.5, color: "var(--card)", opacity: 0.75 }}>({utQty})</span></span>
                    {utQty === 0 && <span style={{ fontSize: 11.5, color: "var(--faint)", fontWeight: 600 }}>None yet</span>}
                    {utQty > 0 && (
                      <Btn onClick={() => sumToggle("utility")} style={{ padding: "5px 10px", fontSize: 11.5 }}>
                        {!sumCol.utility ? "Collapse" : "Expand"}
                      </Btn>
                    )}
                  </div>
                  {utQty > 0 && !sumCol.utility && (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead><tr>
                        <th style={th}>ITEM</th>
                        <th style={{ ...th, textAlign: "right" }}>QTY</th>
                      </tr></thead>
                      <tbody>
                        {(wall.utility || []).map((it) => (
                          <tr key={it.id} style={{ borderTop: "1px solid var(--border)" }}>
                            <td style={td}>
                              <span style={{ fontWeight: 800, color: "var(--true1)" }}>{utilType(it.name)}</span>
                              <span style={{ fontWeight: 600, marginLeft: 8 }}>{it.name}</span>
                              {it.notes ? <span style={{ color: "var(--faint)", marginLeft: 8, fontWeight: 500 }}>{it.notes}</span> : null}
                            </td>
                            <td style={{ ...td, textAlign: "right", fontWeight: 800 }}>&times;{it.qty}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                </div>

                {/* HARDWARE */}
                <div style={{ ...card, padding: 14, display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={tape}><Wrench size={13} /> HARDWARE <span style={{ fontWeight: 600, fontSize: 10.5, color: "var(--card)", opacity: 0.75 }}>({hwQty})</span></span>
                    {hwQty === 0 && <span style={{ fontSize: 11.5, color: "var(--faint)", fontWeight: 600 }}>None yet</span>}
                    {hwQty > 0 && (
                      <Btn onClick={() => sumToggle("hardware")} style={{ padding: "5px 10px", fontSize: 11.5 }}>
                        {!sumCol.hardware ? "Collapse" : "Expand"}
                      </Btn>
                    )}
                  </div>
                  {hwQty > 0 && !sumCol.hardware && (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead><tr>
                        <th style={th}>TITLE (ITEM)</th>
                        <th style={{ ...th, textAlign: "right" }}>QTY</th>
                      </tr></thead>
                      <tbody>
                        {(wall.hardware || []).map((it) => (
                          <tr key={it.id} style={{ borderTop: "1px solid var(--border)" }}>
                            <td style={td}>{it.name}</td>
                            <td style={{ ...td, textAlign: "right", fontWeight: 800, color: "var(--cat6)" }}>&times;{it.qty}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {hwQty > 0 && footer("TOTAL HARDWARE", hwQty, "var(--cat6)")}
                </div>

              </div>
              </div>
            );
          })()}

          {/* reference photos */}
          <div style={{ ...card, padding: 18 }}
            onContextMenu={(e) => {
              e.preventDefault();
              setCtxMenu({ x: e.clientX, y: e.clientY });
            }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: 1.5, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 6, background: "var(--text)", color: "var(--card)", padding: "5px 12px" }}>
                REFERENCE PHOTOS{" "}
                <span style={{ fontWeight: 600, fontSize: 10.5, color: "var(--card)", opacity: 0.75 }}>
                  (THIS WALL{wallPhotos.length ? ` · ${wallPhotos.length}` : ""})
                </span>
              </div>
              {(() => {
                const tally = new Map();
                wallPhotos.forEach((p) => {
                  (p.marks || []).forEach((m) => {
                    const c = MARK_COLORS[m.kind || markKind(m.name)] || "var(--true1)";
                    tally.set(m.name, { n: (tally.get(m.name)?.n || 0) + 1, c });
                  });
                  (p.lines || []).forEach((l) => {
                    const c = lenShade(TYPE_COLORS[l.type]?.text || "var(--cat5)", lineLen(l));
                    tally.set(l.name, { n: (tally.get(l.name)?.n || 0) + 1, c });
                  });
                });
                if (tally.size === 0) return null;
                return (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center", width: "100%", order: 5 }}>
                    <span style={{ fontSize: 9.5, fontWeight: 800, color: "var(--faint)", letterSpacing: 0.4 }}>
                      OVERLAY TALLY:
                    </span>
                    {[...tally.entries()].map(([name, { n, c }]) => (
                      <span key={name} style={{
                        fontSize: 10, fontWeight: 700, color: c,
                        border: `1px solid ${c}`, borderRadius: 0, padding: "1px 7px",
                      }}>{name} &times;{n}</span>
                    ))}
                  </div>
                );
              })()}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Btn onClick={pasteFromClipboard} style={{ padding: "5px 10px", fontSize: 12 }}>
                  <ClipboardPaste size={13} /> Paste
                </Btn>
                <Btn onClick={() => photoInputRef.current?.click()} style={{ padding: "5px 10px", fontSize: 12 }}>
                  <ImagePlus size={13} /> Add Photo
                </Btn>
              </div>
            </div>
            <input ref={photoInputRef} type="file" accept="image/*" multiple
              onChange={handlePhoto} style={{ display: "none" }} />
            {photoError === "read" && (
              <div style={{ color: "var(--danger)", fontSize: 12.5, marginBottom: 10 }}>
                That file couldn't be read as an image. Try a JPG, PNG, or a photo from your camera roll.
              </div>
            )}
            {photoError === "no-image" && (
              <div style={{ color: "var(--danger)", fontSize: 12.5, marginBottom: 10 }}>
                No image found on the clipboard. Copy an image first, then paste.
              </div>
            )}
            {wallPhotos.length ? (
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
                {wallPhotos.map((p, i) => {
                  const ar = arOf(p);
                  const wide = ar != null && ar > 2.2;
                  return (
                    <div key={p.id} style={{ gridColumn: wide ? "1 / -1" : "auto", minWidth: 0 }}>
                      {p.min ? (
                  <div key={p.id} style={{
                    gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 0,
                  }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 700, color: "var(--sub)" }}>
                      <ImageIcon size={14} /> {p.name || `Photo ${i + 1}`}
                      <span style={{ fontWeight: 600, color: "var(--faint)" }}>(minimized)</span>
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Btn onClick={() => togglePhotoMin(p.id)} style={{ padding: "3px 10px", fontSize: 11.5 }}>Restore</Btn>
                      <IconBtn title="Remove photo" onClick={() => removePhotoById(p.id)}>
                        <X size={15} color="var(--danger)" />
                      </IconBtn>
                    </span>
                  </div>
                ) : (
                  <PhotoViewer label={p.name || `Photo ${i + 1}`} ar={ar} {...photoViewerProps(p)} />
                )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div onClick={() => photoInputRef.current?.click()} style={{
                border: "2px dashed var(--border)", borderRadius: 0, padding: "34px 16px",
                textAlign: "center", color: "var(--faint)", fontSize: 13, cursor: "pointer",
              }}>
                Click to add reference photos — or paste with <b>Ctrl+V</b> / <b>Cmd+V</b>.
                <div style={{ marginTop: 4, fontSize: 12 }}>LED maps, signal plots, or shots of the wall on site. Add as many as you need.</div>
              </div>
            )}
          </div>

          {/* quick add */}
          {(() => {
            const pinnedP = (wall.photos || []).find((x) => x.id === wall.pinnedPhoto);
            return (
          <div style={{ ...card, padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: 1.5, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 6, background: "var(--text)", color: "var(--card)", padding: "5px 12px" }}>QUICK ADD</div>
              <div style={{ display: "flex", gap: 4, background: "var(--tab-bg)", borderRadius: 0, padding: 3 }}>
                {[["cable", "CABLE"], ["hardware", "HARDWARE"], ["utility", "UTILITY"]].map(([m, lbl]) => (
                  <button key={m} onClick={() => setQaMode(m)} style={{
                    padding: "5px 12px", borderRadius: 0, fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                    border: "none", fontFamily: "inherit",
                    background: qaMode === m ? "var(--card)" : "transparent",
                    color: qaMode === m ? "var(--text)" : "var(--sub)",
                    boxShadow: qaMode === m ? "0 1px 3px rgba(0,0,0,0.15)" : "none",
                  }}>{lbl}</button>
                ))}
              </div>
            </div>
            {qaMode === "cable" && (
            <div style={{ display: "grid", gap: 12, minHeight: 168, alignContent: "start" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
              <div>
                <div style={qaLbl}>ADD TO</div>
                <div style={{ position: "relative" }}>
                  <select value={qaTarget} onChange={(e) => setQaTarget(e.target.value)}
                    style={{ ...inp, paddingRight: 26, appearance: "none", minWidth: 110 }}>
                    {wall.looms.filter((l) => !l.locked).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    <option value="individual" disabled={!!wall.indLocked}>
                      Cables{wall.indLocked ? " (locked)" : ""}
                    </option>
                  </select>
                  <ChevronDown size={14} style={{ position: "absolute", right: 7, top: 9, pointerEvents: "none", color: "var(--sub)" }} />
                </div>
              </div>
              <div>
                <div style={qaLbl}>LABEL</div>
                <input value={qaLabel} onChange={(e) => setQaLabel(e.target.value)}
                  style={{ ...inp, width: 90, textAlign: "center" }} />
              </div>
              {qaTarget === "individual" && (
                <div>
                  <div style={qaLbl}>NOTES</div>
                  <input value={qaNotes} onChange={(e) => setQaNotes(e.target.value)}
                    placeholder="e.g. To Processor Rack" style={{ ...inp, width: 140 }} />
                </div>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
              {CABLE_TYPES.map((t) => {
                const c = TYPE_COLORS[t];
                const isP = POWER_TYPES.includes(t);
                return (
                  <div key={t} style={{ border: `2px solid ${c.text}`, display: "flex", flexDirection: "column" }}>
                    <span style={{ background: c.text, color: "var(--card)", fontWeight: 800, fontSize: 12.5, letterSpacing: 0.8, padding: "6px 10px", whiteSpace: "nowrap" }}>
                      {t} <span style={{ opacity: 0.8, fontWeight: 600, fontSize: 10.5 }}>{isP ? "POWER" : "DATA"}</span>
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, padding: 8 }}>
                      {LENGTHS.map((Ln) => {
                        const blocked = qaXdOnly && isP;
                        return (
                          <button key={Ln} disabled={blocked}
                            title={blocked ? "XD hub looms are data only" : undefined}
                            onClick={() => { setQaType(t); setQaLength(Ln); quickAdd(t, Ln); }} style={{
                            border: `1.5px solid ${c.text}`, background: "var(--card)", color: c.text, borderRadius: 0,
                            fontFamily: "inherit", fontWeight: 700, fontSize: 12, padding: "5px 9px",
                            cursor: blocked ? "not-allowed" : "pointer", opacity: blocked ? 0.3 : 1,
                          }}>+{Ln}&rsquo;</button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
            )}
            {qaMode === "hardware" && (
            <div style={{ display: "grid", gap: 12, minHeight: 168, alignContent: "start" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
              <div>
                <div style={qaLbl}>QTY PER CLICK</div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <button title="Less" onClick={() => setQaQty((q) => Math.max(1, q - 1))}
                    style={pvBtn(qaQty <= 1)}><Minus size={12} /></button>
                  <span style={{ minWidth: 26, textAlign: "center", fontWeight: 800, fontSize: 14 }}>{qaQty}</span>
                  <button title="More" onClick={() => setQaQty((q) => q + 1)}
                    style={pvBtn(false)}><Plus size={12} /></button>
                </span>
              </div>
              {wall.hwLocked && (
                <div style={{ fontSize: 12.5, color: "var(--danger)", fontWeight: 600 }}>
                  Hardware section is locked — unlock it to add items.
                </div>
              )}
              <div style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--faint)", fontWeight: 600 }}>Click a size to add &times;{qaQty} instantly.</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10, opacity: wall.hwLocked ? 0.5 : 1 }}>
              {HW_PRESETS.map((p) => (
                <div key={p.id} style={{ border: "2px solid var(--cat6)", display: "flex", flexDirection: "column" }}>
                  <span style={{ background: "var(--cat6)", color: "var(--card)", fontWeight: 800, fontSize: 12, letterSpacing: 0.6, padding: "6px 10px", whiteSpace: "nowrap" }}>{p.label}</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, padding: 8 }}>
                    {(p.variants.length ? p.variants : [""]).map((v) => (
                      <button key={v || "add"} disabled={!!wall.hwLocked}
                        onClick={() => { setQaHw(p.id); setQaHwVariant(v); quickAddHardware(p.id, v); }} style={{
                        border: "1.5px solid var(--cat6)", background: "var(--card)", color: "var(--cat6)", borderRadius: 0,
                        fontFamily: "inherit", fontWeight: 700, fontSize: 12, padding: "5px 10px",
                        cursor: wall.hwLocked ? "default" : "pointer",
                      }}>{v ? `+${v}` : "+ ADD"}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            </div>
            )}
            {qaMode === "utility" && (
            <div style={{ display: "grid", gap: 12, minHeight: 168, alignContent: "start" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
              <div>
                <div style={qaLbl}>QTY PER CLICK</div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <button title="Less" onClick={() => setQaQty((q) => Math.max(1, q - 1))}
                    style={pvBtn(qaQty <= 1)}><Minus size={12} /></button>
                  <span style={{ minWidth: 26, textAlign: "center", fontWeight: 800, fontSize: 14 }}>{qaQty}</span>
                  <button title="More" onClick={() => setQaQty((q) => q + 1)}
                    style={pvBtn(false)}><Plus size={12} /></button>
                </span>
              </div>
              {wall.utilLocked && (
                <div style={{ fontSize: 12.5, color: "var(--danger)", fontWeight: 600 }}>
                  Utility section is locked — unlock it to add items.
                </div>
              )}
              <div style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--faint)", fontWeight: 600 }}>Click a size to add &times;{qaQty} instantly.</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, opacity: wall.utilLocked ? 0.5 : 1 }}>
              {UTIL_PRESETS.map((p) => {
                const pc = MARK_COLORS[p.id] || "var(--true1)";
                return (
                <div key={p.id} style={{ border: `2px solid ${pc}`, display: "flex", flexDirection: "column" }}>
                  <span style={{ background: pc, color: "var(--card)", fontWeight: 800, fontSize: 12, letterSpacing: 0.6, padding: "6px 10px", whiteSpace: "nowrap" }}>{p.label}</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, padding: 8 }}>
                    {(p.variants.length ? p.variants : [""]).map((v) => (
                      <button key={v || "add"} disabled={!!wall.utilLocked}
                        onClick={() => { setQaUtil(p.id); setQaUtilVariant(v); quickAddUtility(p.id, v); }} style={{
                        border: `1.5px solid ${pc}`, background: "var(--card)", color: pc, borderRadius: 0,
                        fontFamily: "inherit", fontWeight: 700, fontSize: 12, padding: "5px 10px",
                        cursor: wall.utilLocked ? "default" : "pointer",
                      }}>{v ? `+${v}` : "+ ADD"}</button>
                    ))}
                  </div>
                </div>
                );
              })}
            </div>
            </div>
            )}
                {pinnedP && (
                  <div style={{ marginTop: 16 }}>
                    <PhotoViewer label={pinnedP.name || "Pinned photo"} ar={arOf(pinnedP)} {...photoViewerProps(pinnedP)} />
                  </div>
                )}
          </div>
            );
          })()}

          {/* build sections — grouped panel */}
          <div style={{
            border: "2px solid var(--text)", background: "var(--thead)",
            padding: 16, display: "grid", gap: 14, order: 2,
          }}>
          {/* looms */}
          <div id="sec-looms" {...secDrop("looms")} style={{
            ...card, padding: 18, display: "grid", gap: 24, order: secPos.looms + 2,
            borderTop: "5px solid var(--blue)", overflow: "hidden",
            ...secGlow("looms"),
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8,
              margin: "-18px -18px 0", padding: "13px 18px",
              background: "var(--thead)", borderBottom: "1px solid var(--border)",
            }}>
              <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: 1.5, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 6, background: "var(--blue)", color: "#fff", padding: "5px 12px" }}>LOOMS</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Btn onClick={() => setAllLoomsMin(true)} title="Collapse every loom to its header"
                  style={{ padding: "5px 10px", fontSize: 11.5, color: "var(--sub)" }}>
                  <Minus size={11} /> Minimize All
                </Btn>
                <Btn onClick={() => setAllLoomsMin(false)} title="Expand every loom"
                  style={{ padding: "5px 10px", fontSize: 11.5, color: "var(--sub)" }}>
                  <Maximize2 size={11} /> Expand All
                </Btn>
                <SecArrows k="looms" />
                <Btn variant="primary" onClick={addLoom} style={{ padding: "6px 12px", fontSize: 12.5 }}>
                  <Plus size={13} /> Add Loom
                </Btn>
              </div>
            </div>
            {wall.looms.length === 0 && (
              <div style={{ color: "var(--faint)", fontSize: 13, fontStyle: "italic" }}>
                No looms yet. Add one to group power and data runs together.
              </div>
            )}
            {wall.looms.map((loom, loomIdx) => {
              const kind = loomKind(loom);
              const isLocked = !!loom.locked;
              const powerOpen = loom.xdBox ? false : loom.showPower !== false;
              const dataOpen = loom.showData !== false;
              const order = loom.order || ["power", "data"];
              const toggleSection = (key) => updateWall((w) => {
                const l = w.looms.find((l) => l.id === loom.id);
                l[key] = l[key] === false ? true : false;
                return w;
              });
              const swapOrder = () => updateWall((w) => {
                const l = w.looms.find((l) => l.id === loom.id);
                const cur = l.order || ["power", "data"];
                l.order = [cur[1], cur[0]];
                return w;
              });
              const sections = {
                power: {
                  label: "POWER", color: ORANGE, border: ORANGE_B,
                  cables: loom.power, addType: "SOCA", key: "power",
                },
                data: {
                  label: "DATA", color: GREEN, border: GREEN_B,
                  cables: loom.data, addType: "CAT5", key: "data",
                },
              };
              const visible = order.filter((k) => (k === "power" ? powerOpen : dataOpen));
              return (
                <div key={loom.id} style={{
                  border: `2px solid ${loom.xdBox ? "var(--cat6)" : "var(--text)"}`,
                  borderLeft: `5px solid ${isLocked ? "var(--orange)" : loom.xdBox ? "var(--cat6)" : "var(--blue)"}`,
                  borderRadius: 0, overflow: "hidden",
                  boxShadow: "none",
                }}>
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "11px 14px", borderBottom: "1px solid var(--border)", flexWrap: "wrap", gap: 10,
                    background: "var(--thead)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      {isLocked ? (
                        <span style={{ fontWeight: 800, fontSize: 14.5, display: "inline-flex", alignItems: "center", gap: 6 }}>
                          {loom.name} <Lock size={13} color="var(--orange)" />
                        </span>
                      ) : (
                        <EditableName value={loom.name}
                          suggestions={loomNameSuggestions}
                          onChange={(v) => updateWall((w) => {
                            w.looms.find((l) => l.id === loom.id).name = v; return w;
                          })}
                          style={{ fontWeight: 800, fontSize: 14.5 }} />
                      )}
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: 0.5, padding: "3px 8px",
                        borderRadius: 0, border: `1px solid ${kind.color}`, color: kind.color,
                      }}>{kind.label}</span>
                      {loom.xdBox && (
                        <span style={{
                          fontSize: 10, fontWeight: 800, letterSpacing: 0.5, padding: "3px 8px",
                          borderRadius: 0, border: "1px solid var(--cat6)", color: "var(--cat6)",
                          background: "var(--cat6-bg)",
                        }}>XD {loom.xdBox} {"\u00b7"} {loom.power.length + loom.data.length}/10</span>
                      )}
                      {!loom.xdBox && <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <Toggle on={powerOpen} color={ORANGE}
                          title={isLocked ? "Loom is locked" : (powerOpen ? "Turn off power section" : "Turn on power section")}
                          onChange={() => !isLocked && toggleSection("showPower")} />
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: powerOpen ? ORANGE : "var(--faint)" }}>
                          POWER ({loom.power.length})
                        </span>
                      </span>}
                      {loom.xdBox && (
                        <span style={{ fontSize: 10.5, fontWeight: 800, color: "var(--cat6)", letterSpacing: 0.4 }}>
                          DATA ONLY
                        </span>
                      )}
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <Toggle on={dataOpen} color={GREEN}
                          title={isLocked ? "Loom is locked" : (dataOpen ? "Turn off data section" : "Turn on data section")}
                          onChange={() => !isLocked && toggleSection("showData")} />
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: dataOpen ? GREEN : "var(--faint)" }}>
                          DATA ({loom.data.length})
                        </span>
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Btn onClick={() => toggleLoomMin(loom.id)}
                        title={loomMin[loom.id] ? "Expand this loom" : "Minimize this loom"}
                        style={{ padding: "5px 9px", fontSize: 12, color: "var(--sub)" }}>
                        <ChevronDown size={13} style={{
                          transform: loomMin[loom.id] ? "rotate(-90deg)" : "none",
                          transition: "transform .15s ease",
                        }} />
                      </Btn>
                      <Btn onClick={() => setSpaceLoomId(loom.id)}
                        title="Verify cable lengths against the wall geometry"
                        style={{ padding: "5px 10px", fontSize: 12, color: BLUE, borderColor: "var(--blue-b)" }}>
                        <Ruler size={12} /> Space Cable
                      </Btn>
                      <Btn onClick={() => toggleLoomLock(loom.id)}
                        title={isLocked ? "Unlock this loom" : "Lock this loom against changes"}
                        style={{
                          padding: "5px 10px", fontSize: 12,
                          ...(isLocked ? { background: ORANGE, borderColor: ORANGE, color: "#fff" } : {}),
                        }}>
                        {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                        {isLocked ? "Locked" : "Lock"}
                      </Btn>
                      <Btn onClick={!isLocked && loomIdx > 0 ? () => moveLoom(loom.id, -1) : undefined}
                        title={isLocked ? "Loom is locked" : (loomIdx > 0 ? "Move loom up" : "")}
                        style={{ padding: "5px 8px", fontSize: 12, opacity: !isLocked && loomIdx > 0 ? 1 : 0.35, cursor: !isLocked && loomIdx > 0 ? "pointer" : "default" }}>
                        <ArrowUp size={12} />
                      </Btn>
                      <Btn onClick={!isLocked && loomIdx < wall.looms.length - 1 ? () => moveLoom(loom.id, 1) : undefined}
                        title={isLocked ? "Loom is locked" : (loomIdx < wall.looms.length - 1 ? "Move loom down" : "")}
                        style={{ padding: "5px 8px", fontSize: 12, opacity: !isLocked && loomIdx < wall.looms.length - 1 ? 1 : 0.35, cursor: !isLocked && loomIdx < wall.looms.length - 1 ? "pointer" : "default" }}>
                        <ArrowDown size={12} />
                      </Btn>
                      <Btn onClick={() => duplicateLoom(loom.id)} style={{ padding: "5px 10px", fontSize: 12 }}>
                        <Copy size={12} /> Duplicate
                      </Btn>
                      <Btn variant="danger" onClick={!isLocked ? () => deleteLoom(loom.id) : undefined}
                        title={isLocked ? "Unlock first to delete" : "Delete loom"}
                        style={{ padding: "5px 10px", fontSize: 12, opacity: isLocked ? 0.4 : 1, cursor: isLocked ? "default" : "pointer" }}>
                        <Trash2 size={12} /> Delete
                      </Btn>
                    </div>
                  </div>
                  {loomMin[loom.id] && (
                    <div style={{ padding: "9px 14px", color: "var(--faint)", fontSize: 12, fontWeight: 600 }}>
                      {loom.power.length + loom.data.length} cable{loom.power.length + loom.data.length !== 1 ? "s" : ""}
                      {" — "}P {loom.power.length} · D {loom.data.length}
                    </div>
                  )}
                  {!loomMin[loom.id] && visible.length === 0 && (
                    <div style={{ padding: 14, color: "var(--faint)", fontSize: 12.5, fontStyle: "italic" }}>
                      Both sections are turned off — flip a switch above to bring one back.
                    </div>
                  )}
                  {!loomMin[loom.id] && visible.map((k, i) => {
                    const s = sections[k];
                    return (
                      <div key={k} style={{
                        padding: "12px 14px",
                        borderBottom: i < visible.length - 1 ? "1px solid var(--border-soft)" : "none",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: s.color, display: "inline-flex", alignItems: "center", gap: 6 }}>
                            {s.label}
                            <span style={{ fontWeight: 600, color: "var(--faint)" }}>({s.cables.length})</span>
                          </span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            {!isLocked && visible.length > 1 && (
                              <Btn onClick={swapOrder}
                                style={{ padding: "3px 8px", fontSize: 11, color: "var(--sub)" }}>
                                {i === 0 ? <ArrowDown size={11} /> : <ArrowUp size={11} />}
                                {i === 0 ? "Move below" : "Move above"}
                              </Btn>
                            )}
                            {!isLocked && (
                              <Btn onClick={() => { setQaTarget(loom.id); setQaType(s.addType); }}
                                style={{ padding: "3px 8px", fontSize: 11, color: s.color, borderColor: s.border }}>
                                <Plus size={11} /> Add
                              </Btn>
                            )}
                          </span>
                        </div>
                        <CableTable cables={s.cables}
                          onDelete={(id) => removeCable(loom.id, s.key, id)}
                          onDuplicate={(c) => duplicateCable(loom.id, s.key, c)}
                          onEditLabel={(id, v) => editCableLabel(loom.id, s.key, id, v)}
                          onEditType={(id, v) => editCableType(loom.id, s.key, id, v)}
                          onEditLength={(id, v) => editCableLength(loom.id, s.key, id, v)}
                          locked={isLocked}
                          cableDrag={cableDrag}
                          onCableDragStart={(id) => setCableDrag({ id, loomId: loom.id, section: s.key })}
                          onCableDragEnd={() => setCableDrag(null)}
                          onCableDrop={(tIdx) => handleCableDrop({ loomId: loom.id, section: s.key }, tIdx)} />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* individual cables */}
          <div id="sec-individual" {...secDrop("individual")} style={{
            ...card, padding: 18, order: secPos.individual + 2,
            borderTop: "5px solid var(--purple)", overflow: "hidden",
            ...secGlow("individual"),
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8,
              margin: "-18px -18px 14px", padding: "13px 18px",
              background: "var(--thead)", borderBottom: "1px solid var(--border)",
            }}>
              <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: 1.5, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 6, background: PURPLE, color: "#fff", padding: "5px 12px" }}>
                CABLES <span style={{ fontWeight: 600, fontSize: 10.5, color: "rgba(255,255,255,0.8)" }}>(WALL PACK {"\u2014"} PULL INTO LOOMS)</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={toggleIndLock}
                  title={wall.indLocked ? "Unlock individual cables" : "Lock individual cables against changes"}
                  style={{
                    padding: "4px 10px", fontSize: 11.5,
                    ...(wall.indLocked ? { background: ORANGE, borderColor: ORANGE, color: "#fff" } : {}),
                  }}>
                  {wall.indLocked ? <Lock size={11} /> : <Unlock size={11} />}
                  {wall.indLocked ? "Locked" : "Lock"}
                </Btn>
                <SecArrows k="individual" />
                {!wall.indLocked && (
                  <Btn onClick={() => setQaTarget("individual")}
                    style={{ padding: "4px 10px", fontSize: 12, color: PURPLE, borderColor: PURPLE_B }}>
                    <Plus size={12} /> Add
                  </Btn>
                )}
              </div>
            </div>
            {(() => {
              const groups = [];
              const gmap = new Map();
              (wall.individual || []).forEach((c) => {
                const k = `${c.type}|${c.length}`;
                if (!gmap.has(k)) {
                  const g = { key: `${wall.id}:${k}`, type: c.type, length: c.length, cables: [] };
                  gmap.set(k, g); groups.push(g);
                }
                gmap.get(k).cables.push(c);
              });
              const tableProps = {
                showNotes: true,
                onDelete: (id) => removeCable(null, null, id),
                onDuplicate: (c) => duplicateCable(null, null, c),
                onEditLabel: (id, v) => editCableLabel(null, null, id, v),
                onEditNotes: (id, v) => editCableNotes(id, v),
                onEditType: (id, v) => editCableType(null, null, id, v),
                onEditLength: (id, v) => editCableLength(null, null, id, v),
                locked: !!wall.indLocked,
                cableDrag,
                onCableDragStart: (id) => setCableDrag({ id, loomId: null, section: null }),
                onCableDragEnd: () => setCableDrag(null),
              };
              return (
                <>
                  {groups.map((g) => {
                    const open = !!indOpen[g.key];
                    const tc = TYPE_COLORS[g.type] || TYPE_COLORS.CAT5;
                    return (
                      <div key={g.key} style={{
                        border: "1px solid var(--border)", borderRadius: 0,
                        marginBottom: 8, overflow: "hidden",
                      }}>
                        <div onClick={() => toggleIndGroup(g.key)} style={{
                          display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                          padding: "8px 10px", cursor: "pointer", background: "var(--thead)",
                          userSelect: "none",
                        }}>
                          <ChevronDown size={14} style={{
                            transform: open ? "none" : "rotate(-90deg)",
                            transition: "transform .15s ease", color: "var(--sub)", flexShrink: 0,
                          }} />
                          <span style={{ fontWeight: 800, fontSize: 12.5, color: tc.text }}>{g.type}</span>
                          <span style={{ fontWeight: 800, fontSize: 12.5 }}>{g.length}&rsquo;</span>
                          <span style={{
                            fontSize: 11, fontWeight: 800, color: tc.text,
                            border: `1px solid ${tc.border}`, background: tc.bg,
                            borderRadius: 0, padding: "1px 7px",
                          }}>&times;{g.cables.length}</span>
                          {!open && (
                            <span style={{
                              fontSize: 11, color: "var(--faint)", fontWeight: 600,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              maxWidth: 380,
                            }}>
                              {g.cables.map((c) => c.label).join(", ")}
                            </span>
                          )}
                        </div>
                        {open && (
                          <CableTable cables={g.cables} {...tableProps}
                            onCableDrop={(tIdx) => {
                              const fullIdx = tIdx == null ? null
                                : wall.individual.findIndex((c) => c.id === g.cables[tIdx]?.id);
                              handleCableDrop({ loomId: null, section: null },
                                fullIdx == null || fullIdx < 0 ? null : fullIdx);
                            }} />
                        )}
                      </div>
                    );
                  })}
                  {(groups.length === 0 || cableDrag) && (
                    <CableTable cables={[]} {...tableProps}
                      onCableDrop={(tIdx) => handleCableDrop({ loomId: null, section: null }, tIdx)} />
                  )}
                </>
              );
            })()}
          </div>

          {/* hardware + utility */}
          {itemSections.map((sec) => {
            const items = wall[sec.key] || [];
            const isLockedList = !!wall[sec.lockKey];
            return (
              <div key={sec.key} id={`sec-${sec.key}`} {...secDrop(sec.key)} style={{
                ...card, padding: 18, order: secPos[sec.key] + 2,
                borderTop: `5px solid ${sec.color}`, overflow: "hidden",
                ...secGlow(sec.key),
              }}>
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8,
                  margin: "-18px -18px 14px", padding: "13px 18px",
                  background: "var(--thead)", borderBottom: "1px solid var(--border)",
                }}>
                  <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: 1.5, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 6, background: sec.color, color: "#fff", padding: "5px 12px" }}>
                    {sec.title}{" "}
                    <span style={{ fontWeight: 600, fontSize: 10.5, color: "rgba(255,255,255,0.8)" }}>
                      ({items.length} ITEM{items.length !== 1 ? "S" : ""})
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn onClick={() => toggleListLock(sec.lockKey)}
                      title={isLockedList ? `Unlock ${sec.title.toLowerCase()}` : `Lock ${sec.title.toLowerCase()} against changes`}
                      style={{
                        padding: "4px 10px", fontSize: 11.5,
                        ...(isLockedList ? { background: ORANGE, borderColor: ORANGE, color: "#fff" } : {}),
                      }}>
                      {isLockedList ? <Lock size={11} /> : <Unlock size={11} />}
                      {isLockedList ? "Locked" : "Lock"}
                    </Btn>
                    <SecArrows k={sec.key} />
                    {!isLockedList && (
                      <Btn onClick={() => addWallItem(sec.key)}
                        style={{ padding: "4px 10px", fontSize: 12, color: sec.color }}>
                        <Plus size={12} /> Add
                      </Btn>
                    )}
                  </div>
                </div>
                {items.length === 0 && (
                  <div style={{ color: "var(--faint)", fontSize: 12, marginBottom: 8 }}>{sec.hint}</div>
                )}
                <ItemTable items={items} locked={isLockedList}
                  onEditName={(id, v) => editWallItem(sec.key, id, "name", v)}
                  onEditQty={(id, v) => editWallItem(sec.key, id, "qty", v)}
                  onEditNotes={(id, v) => editWallItem(sec.key, id, "notes", v)}
                  onDuplicate={(id) => duplicateWallItem(sec.key, id)}
                  onDelete={(id) => removeWallItem(sec.key, id)}
                  onReorder={(id, tIdx) => reorderWallItem(sec.key, id, tIdx)} />
              </div>
            );
          })}
          </div>


        </div>
        );
      })()}

      {spaceLoom && (
        <SpaceCableWizard
          loom={spaceLoom}
          wallName={wall?.name || ""}
          wallSpacing={wall?.spacing}
          otherXd={(wall?.looms || [])
            .filter((l) => l.xdBox && l.id !== spaceLoom.id && l.spacing?.xdPos && l.spacing.xdPos.x != null)
            .map((l) => ({ letter: l.xdBox, ...l.spacing.xdPos }))}
          onClose={() => setSpaceLoomId(null)}
          onSave={(spacing, xdLengths) => saveLoomSpacing(spaceLoom.id, spacing, xdLengths)} />
      )}

      {projectsOpen && (
        <div onClick={() => setProjectsOpen(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1300,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "var(--card)", border: "1px solid var(--border)", borderRadius: 0,
            width: "100%", maxWidth: 520, maxHeight: "82vh", display: "flex", flexDirection: "column",
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)", color: "var(--text)",
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "16px 20px", borderBottom: "1px solid var(--border)",
            }}>
              <div style={{ fontWeight: 800, fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <FolderOpen size={17} /> Projects
              </div>
              <IconBtn title="Close" onClick={() => setProjectsOpen(false)}><X size={18} /></IconBtn>
            </div>

            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
              <Btn variant="primary" onClick={saveProject} style={{ width: "100%", justifyContent: "center", padding: "10px 14px" }}>
                <Save size={15} /> Save current show as "{show.name}"
              </Btn>
              {projMsg && (
                <div style={{
                  marginTop: 10, fontSize: 12.5, fontWeight: 600,
                  color: projMsg.kind === "ok" ? "var(--green)" : "var(--danger)",
                }}>{projMsg.text}</div>
              )}
            </div>

            <div style={{ overflowY: "auto", padding: "10px 20px", flex: 1 }}>
              {projBusy && <div style={{ color: "var(--faint)", fontSize: 13, padding: "10px 0" }}>Loading projects…</div>}
              {!projBusy && projects.length === 0 && (
                <div style={{ color: "var(--faint)", fontSize: 13, fontStyle: "italic", padding: "10px 0" }}>
                  No saved projects yet. Save the current show above to start your library.
                </div>
              )}
              {projects.map((p) => (
                <div key={p.key} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border-soft)",
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--faint)" }}>
                      {p.walls} wall{p.walls !== 1 ? "s" : ""} · {p.cables} cable{p.cables !== 1 ? "s" : ""}
                      {p.savedAt ? ` · saved ${new Date(p.savedAt).toLocaleDateString()} ${new Date(p.savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <Btn onClick={() => loadProject(p.key)} style={{ padding: "5px 12px", fontSize: 12 }}>
                      Load
                    </Btn>
                    <Btn variant="danger" onClick={() => deleteProject(p.key)} style={{ padding: "5px 9px", fontSize: 12 }}>
                      <Trash2 size={12} />
                    </Btn>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              display: "flex", gap: 8, padding: "12px 20px",
              borderTop: "1px solid var(--border)",
            }}>
              <Btn onClick={exportProject} style={{ flex: 1, justifyContent: "center", padding: "8px 10px", fontSize: 12.5 }}>
                <Download size={14} /> Export to file
              </Btn>
              <Btn onClick={() => importInputRef.current?.click()} style={{ flex: 1, justifyContent: "center", padding: "8px 10px", fontSize: 12.5 }}>
                <Upload size={14} /> Import from file
              </Btn>
              <input ref={importInputRef} type="file" accept=".json,application/json"
                onChange={handleImportFile} style={{ display: "none" }} />
            </div>
          </div>
        </div>
      )}

      {exportText && (
        <div onClick={() => setExportText(null)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1400,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "var(--card)", border: "1px solid var(--border)", padding: 18,
            width: "min(680px, 92vw)", maxHeight: "82vh", display: "flex", flexDirection: "column", gap: 12,
          }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>
              {exportText.copied ? "Copied to clipboard \u2014 paste into a .json file to keep it" : "Copy this and save it as a .json file"}
            </div>
            <div style={{ fontSize: 12, color: "var(--sub)", lineHeight: 1.5 }}>
              To reopen later without a file, use <b>Projects \u2192 Save this project</b> instead \u2014 saved projects
              persist right in the app and reload with one click.
            </div>
            <textarea readOnly value={exportText.json}
              onFocus={(e) => e.target.select()}
              style={{
                width: "100%", flex: 1, minHeight: 320, fontFamily: "monospace", fontSize: 11.5,
                background: "var(--thead)", color: "var(--text)", border: "1px solid var(--border)",
                padding: 10, resize: "none",
              }} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn onClick={async () => {
                try { await navigator.clipboard.writeText(exportText.json); setExportText({ ...exportText, copied: true }); }
                catch (e) { /* user can select manually */ }
              }}>Copy again</Btn>
              <Btn variant="primary" onClick={() => setExportText(null)}>Done</Btn>
            </div>
          </div>
        </div>
      )}

      {pasteCatcher && (
        <div onClick={() => setPasteCatcher(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1200,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "var(--card)", border: "1px solid var(--border)", borderRadius: 0,
            padding: "30px 36px", textAlign: "center", maxWidth: 380,
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          }}>
            <ClipboardPaste size={30} style={{ color: "var(--sub)", marginBottom: 12 }} />
            <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text)", marginBottom: 8 }}>
              Press <span style={{ color: BLUE }}>Ctrl+V</span> / <span style={{ color: BLUE }}>Cmd+V</span> now
            </div>
            <div style={{ fontSize: 13, color: "var(--sub)", marginBottom: 18 }}>
              Your photo will drop straight onto {wall?.name || "this wall"}.
            </div>
            <Btn onClick={() => setPasteCatcher(false)} style={{ padding: "7px 18px" }}>Cancel</Btn>
          </div>
        </div>
      )}

      {ctxMenu && (
        <div style={{
          position: "fixed", top: ctxMenu.y, left: ctxMenu.x, zIndex: 1100,
          background: "var(--card)", border: "1px solid var(--border)", borderRadius: 0,
          boxShadow: "0 6px 20px rgba(0,0,0,0.25)", padding: 6, minWidth: 170,
          display: "grid", gap: 2,
        }}>
          <div onClick={pasteFromClipboard} style={ctxItem}>
            <ClipboardPaste size={14} /> Paste photo
          </div>
          <div onClick={() => { setCtxMenu(null); photoInputRef.current?.click(); }} style={ctxItem}>
            <ImagePlus size={14} /> Upload photo
          </div>
          {wallPhotos.length > 0 && (
            <div onClick={() => { setCtxMenu(null); clearPhotos(); }} style={{ ...ctxItem, color: "var(--danger)" }}>
              <Trash2 size={14} /> Remove all photos
            </div>
          )}
        </div>
      )}

      {lightbox && (() => {
        const p = (wall?.photos || []).find((x) => x.id === lightbox);
        if (!p) return null;
        return (
          <div onClick={() => setLightbox(null)} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 18,
          }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: "min(1240px, 96vw)" }}>
              <PhotoViewer label={p.name || "Full-size editor"} tall {...photoViewerProps(p)} />
            </div>
            <button onClick={() => setLightbox(null)} title="Close" style={{
              position: "absolute", top: 16, right: 16, width: 38, height: 38,
              borderRadius: 0, border: "none", cursor: "pointer",
              background: "rgba(255,255,255,0.15)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}><X size={19} /></button>
          </div>
        );
      })()}
    </div>
  );
}

const qaLbl = { fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5, color: "var(--sub)", marginBottom: 6 };
const inp = {
  padding: "6px 8px", border: "1px solid var(--border)", borderRadius: 0,
  fontSize: 13, fontWeight: 600, fontFamily: "inherit",
  background: "var(--input-bg)", color: "var(--text)",
};
const chip = {
  border: "1px solid var(--border)", borderRadius: 0, padding: "8px 16px",
  textAlign: "center", minWidth: 78, background: "var(--card)",
};
const ctxItem = {
  display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
  borderRadius: 0, fontSize: 13, fontWeight: 600, cursor: "pointer",
  color: "var(--text)",
};
const sumHead = {
  fontSize: 11, fontWeight: 800, letterSpacing: 0.6, marginBottom: 6,
};
const sumLine = {
  display: "flex", justifyContent: "space-between", gap: 8,
  fontSize: 12, padding: "2.5px 0", borderBottom: "1px solid var(--border-soft)",
};
const sumEmpty = { fontSize: 12, color: "var(--faint)", fontStyle: "italic" };
const cellSelect = {
  border: "1px solid var(--border-soft)", borderRadius: 0, padding: "3px 4px",
  background: "var(--card)", color: "var(--text)", fontSize: 12.5, fontWeight: 600,
  fontFamily: "inherit", cursor: "pointer",
};
const zoomStepBtn = {
  display: "flex", alignItems: "center", justifyContent: "center",
  width: 32, padding: "6px 0", border: "none", background: "var(--card)",
  color: "var(--text)", fontFamily: "inherit",
};
