const BIBLE_TEXT = window.BIBLE_TEXT || {};

const BOOK_NAMES = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth",
  "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra",
  "Nehemiah", "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon",
  "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
  "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah",
  "Malachi", "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians",
  "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians",
  "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James",
  "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"
];

const CHAPTER_COUNTS = [
  50, 40, 27, 36, 34, 24, 21, 4, 31, 24, 22, 25, 29, 36, 10, 13, 10, 42, 150, 31, 12,
  8, 66, 52, 5, 48, 12, 14, 3, 9, 1, 4, 7, 3, 3, 3, 2, 14, 4, 28, 16, 24, 21, 28, 16,
  16, 13, 6, 6, 4, 4, 5, 3, 6, 4, 3, 1, 13, 5, 5, 3, 5, 1, 1, 1, 22
];

const BOOKS = BOOK_NAMES.map((name, index) => ({ name, chapters: CHAPTER_COUNTS[index] }));
const BOOK_BY_KEY = new Map(BOOKS.map((book) => [book.name.toLowerCase(), book]));

const ALIASES = {
  psalm: "Psalms",
  psalms: "Psalms",
  ps: "Psalms",
  psa: "Psalms",
  "song of songs": "Song of Solomon",
  canticles: "Song of Solomon",
  revelations: "Revelation",
  rev: "Revelation"
};

const ICONS = {
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  film: '<rect x="2" y="3" width="20" height="18" rx="2"/><path d="M7 3v18M17 3v18M2 9h5M2 15h5M17 9h5M17 15h5"/>',
  layers: '<path d="m12 2 9 5-9 5-9-5 9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  arrowLeft: '<path d="M19 12H5m6 6-6-6 6-6"/>',
  arrowRight: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  arrowUp: '<path d="M12 19V5m-6 6 6-6 6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12 4.5 4.5L19 7"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
  square: '<rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" stroke="none"/>',
  mic: '<rect x="9" y="2.5" width="6" height="11.5" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5V21"/>',
  micOff: '<path d="M9 9v1.5a3 3 0 0 0 4.6 2.6"/><path d="M15 10.5V5.5a3 3 0 0 0-5.9-.7"/><path d="M5.5 11a6.5 6.5 0 0 0 10.6 5"/><path d="M19 11a7 7 0 0 1-.4 2.3"/><path d="M12 17.5V21"/><path d="m3 3 18 18"/>',
  headphones: '<path d="M3 14v-2a9 9 0 0 1 18 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 4.8 1c0 1.7-2.3 2-2.3 3.5"/><path d="M12 17h.01"/>',
  expand: '<path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5"/>',
  sparkle: '<path d="M12 3l1.9 5.2L19 10l-5.1 1.8L12 17l-1.9-5.2L5 10l5.1-1.8z" fill="currentColor" stroke="none"/>',
  quote: '<path d="M7 7H4v6h5V7a3 3 0 0 0-3-3M17 7h-3v6h5V7a3 3 0 0 0-3-3"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/>',
  heading: '<path d="M5 5v14M19 5v14M5 12h14"/>',
  monitor: '<rect x="2.5" y="4.5" width="19" height="12.5" rx="2"/><path d="M8 21h8M12 17v4"/>',
  monitorOff: '<rect x="2.5" y="4.5" width="19" height="12.5" rx="2"/><path d="M8 21h8M12 17v4"/><path d="m4 4 16 16"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="17" rx="2"/><path d="M8 2.5v4M16 2.5v4M3 10h18"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  warning: '<path d="M12 3 2.5 20h19L12 3z"/><path d="M12 9v5M12 17h.01"/>'
};

function icon(name, size) {
  const body = ICONS[name] || "";
  return '<svg width="' + (size || 14) + '" height="' + (size || 14) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + "</svg>";
}

function escapeHTML(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

function chapterText(book, chapter) {
  return BIBLE_TEXT[book + "|" + chapter] || null;
}

function verseText(book, chapter, verse) {
  const rows = chapterText(book, chapter);
  if (!rows) return null;
  const found = rows.find((row) => row.v === verse);
  return found ? found.t : null;
}

function formatTimer(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? h + ":" + mm + ":" + ss : mm + ":" + ss;
}

function parseReference(ref) {
  const match = String(ref).match(/^(.+?)\s+(\d+):(\d+)$/);
  if (!match) return null;
  return { book: match[1], chapter: Number(match[2]), verse: Number(match[3]) };
}

function verseItem(ref, text) {
  return {
    id: "verse:" + ref,
    kind: "verse",
    ref,
    text,
    translation: "KJV",
    slideLabel: ref + " · KJV"
  };
}

function cueToItem(cue) {
  return verseItem(cue.ref, cue.text);
}

function parseReferenceQuery(query) {
  const clean = String(query).replace(/[.,]/g, " ").replace(/\s+/g, " ").trim();
  if (!clean) return null;

  const bookOnly = BOOK_BY_KEY.get(clean.toLowerCase()) || BOOK_BY_KEY.get((ALIASES[clean.toLowerCase()] || "").toLowerCase());
  if (bookOnly) return { book: bookOnly, chapter: null, verse: null };

  const match = clean.match(/^((?:[1-3]\s+)?[A-Za-z][A-Za-z ]*?)\s+(\d+)(?:\s*:\s*(\d+))?$/);
  if (!match) return null;

  const rawName = match[1].trim().toLowerCase();
  const name = ALIASES[rawName] || match[1].trim();
  let book = BOOK_BY_KEY.get(name.toLowerCase());
  if (!book) {
    book = BOOKS.find((candidate) => candidate.name.toLowerCase().startsWith(name.toLowerCase()));
  }
  if (!book) return null;
  return {
    book,
    chapter: Number(match[2]),
    verse: match[3] ? Number(match[3]) : null
  };
}

function bookIndex(name) {
  return BOOKS.findIndex((book) => book.name === name);
}

function sourceVerseRef(book, chapter, verse) {
  return book + " " + chapter + ":" + verse;
}

function wordCount(html) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  const text = (wrapper.textContent || "").trim();
  if (!text) return 0;
  return text.split(/\s+/).length;
}

const NOTES_HTML = [
  "<h4>The love that moves toward us</h4>",
  "<p><strong>Big idea:</strong> The gospel begins with God's love, not our performance. John 3:16 is the measure of the gift.</p>",
  "<blockquote>“For God so loved the world, that he gave his only begotten Son…” <span class=\"muted\">— John 3:16, KJV</span></blockquote>",
  "<h4>Outline</h4>",
  "<ul>",
  "<li><strong>The measure</strong> — “so loved” (John 3:16)</li>",
  "<li><strong>The movement</strong> — God gives before we respond (Romans 8:32)</li>",
  "<li><strong>The invitation</strong> — whoever believes (John 1:12)</li>",
  "</ul>",
  "<p class=\"muted\">Application: Name one place this week where you can move toward someone before they deserve it.</p>"
].join("");

const DETECTED_SEED = [
  { ref: "John 3:16", time: "10:48", confidence: 98, heard: "“For God so loved the world…”" },
  { ref: "Romans 8:28", time: "10:50", confidence: 94, heard: "“all things work together for good…”" },
  { ref: "Jeremiah 29:11", time: "10:51", confidence: 87, heard: "“thoughts of peace, and not of evil…”" }
].map((cue) => {
  const parsed = parseReference(cue.ref);
  const text = verseText(parsed.book, parsed.chapter, parsed.verse) || "";
  return { ...verseItem(cue.ref, text), time: cue.time, confidence: cue.confidence, heard: cue.heard };
});

const RELATED_SEED = [
  { ref: "Psalms 23:1", relation: "Theme", note: "God as shepherd · connects to “loved”" },
  { ref: "Isaiah 40:31", relation: "Theme", note: "Waiting and renewal · the same hope" },
  { ref: "Philippians 4:13", relation: "Cross-ref", note: "Strength in Christ · application" },
  { ref: "Romans 8:31", relation: "Cross-ref", note: "If God is for us · responds to 8:28" }
].map((cue) => {
  const parsed = parseReference(cue.ref);
  const text = verseText(parsed.book, parsed.chapter, parsed.verse) || "";
  return { ...verseItem(cue.ref, text), relation: cue.relation, note: cue.note, confidence: 0, time: "" };
});

const SONGS = [
  {
    id: "blessed-assurance",
    title: "Blessed Assurance",
    artist: "Fanny Crosby",
    key: "D",
    duration: "4:12",
    slides: [
      "Blessed assurance, Jesus is mine!",
      "Oh, what a foretaste of glory divine!",
      "Heir of salvation, purchase of God,",
      "Born of His Spirit, washed in His blood.",
      "This is my story, this is my song,",
      "Praising my Savior all the day long."
    ]
  },
  {
    id: "amazing-grace",
    title: "Amazing Grace",
    artist: "John Newton",
    key: "G",
    duration: "4:40",
    slides: [
      "Amazing grace! how sweet the sound,",
      "That saved a wretch like me!",
      "I once was lost, but now am found,",
      "Was blind, but now I see."
    ]
  },
  {
    id: "come-thou-fount",
    title: "Come Thou Fount",
    artist: "Robert Robinson",
    key: "A",
    duration: "5:05",
    slides: [
      "Come Thou Fount of every blessing,",
      "Tune my heart to sing Thy grace;",
      "Streams of mercy, never ceasing,",
      "Call for songs of loudest praise."
    ]
  },
  {
    id: "doxology",
    title: "Doxology",
    artist: "Thomas Ken",
    key: "G",
    duration: "1:25",
    slides: [
      "Praise God, from whom all blessings flow;",
      "Praise Him, all creatures here below;",
      "Praise Him above, ye heavenly host;",
      "Praise Father, Son, and Holy Ghost."
    ]
  }
];

const NOTICES = [
  { id: "welcome", kicker: "Welcome", title: "Welcome Home", when: "This Sunday", copy: "New here? Stop by the Welcome Desk in the lobby. We would love to meet you and help you find your next step." },
  { id: "youth", kicker: "Students", title: "Youth Night · Friday", when: "Fri · 7:00 PM", copy: "Grades 6–12, join us for worship, a short message, and time around the tables. Bring a friend." },
  { id: "food-drive", kicker: "Serve", title: "Food Drive", when: "Through Nov 16", copy: "Bring non-perishable items to the bins in the lobby. All donations go to the neighborhood pantry." },
  { id: "baptism", kicker: "Next Step", title: "Baptism Sunday", when: "Nov 23", copy: "Ready to take the next step? Sign up at the Welcome Desk and we will follow up with you this week." }
];

const MEDIA = [
  { id: "countdown", title: "Countdown · 5:00", kind: "Countdown", duration: "5:00", art: "art-2", description: "Service begins in 5:00", caption: "Pre-service" },
  { id: "welcome-loop", title: "Welcome Loop", kind: "Loop", duration: "Loop", art: "art-1", description: "Welcome to Fellowship Church", caption: "Looping" },
  { id: "retreat", title: "Fall Retreat", kind: "Promo", duration: "0:30", art: "art-4", description: "Fall Retreat · Register today", caption: "Announcement" },
  { id: "communion", title: "Communion", kind: "Still", duration: "Still", art: "art-3", description: "Communion · The body and the blood", caption: "Still" },
  { id: "kids", title: "Kids Check-in", kind: "Promo", duration: "0:20", art: "art-5", description: "Kids check-in is open in the lobby", caption: "Announcement" },
  { id: "sermon-title", title: "Sermon Title", kind: "Slide", duration: "Still", art: "art-6", description: "The Love That Moves Toward Us", caption: "Title slide" }
];

const PADS = [
  { id: "lower-third", kind: "Lower third", name: "Pastor Mark · Teaching", detail: "10s auto-out", text: "Pastor Mark · Teaching" },
  { id: "scripture-ref", kind: "Scripture ref", name: "John 3:16 · KJV", detail: "Stays on screen", text: "John 3:16 · KJV" },
  { id: "welcome-banner", kind: "Banner", name: "Welcome to Fellowship", detail: "10s auto-out", text: "Welcome to Fellowship" },
  { id: "service-countdown", kind: "Countdown", name: "Service begins in 5:00", detail: "Full screen", text: "Service begins in 5:00" },
  { id: "ticker", kind: "Ticker", name: "Give · Connect · Serve", detail: "Looping", text: "Give · Connect · Serve" },
  { id: "announcement-bar", kind: "Lower third", name: "Youth Night · Friday", detail: "15s auto-out", text: "Youth Night · Friday, 7:00 PM" }
];

const WORKSPACES = [
  { id: "bible", label: "Bible", icon: "book" },
  { id: "songs", label: "Songs", icon: "music" },
  { id: "announcements", label: "Announcements", icon: "megaphone" },
  { id: "media", label: "Media", icon: "film" },
  { id: "overlays", label: "Overlays", icon: "layers" }
];

const WORKSPACE_TABS = {
  bible: [
    { id: "detected", label: "Detected" },
    { id: "related", label: "Related" },
    { id: "notes", label: "Notes" }
  ],
  songs: [
    { id: "setlist", label: "Setlist" },
    { id: "slides", label: "Slides" },
    { id: "notes", label: "Notes" }
  ],
  announcements: [
    { id: "notices", label: "Notices" },
    { id: "notes", label: "Notes" }
  ],
  media: [
    { id: "media", label: "Media" },
    { id: "notes", label: "Notes" }
  ],
  overlays: [
    { id: "pads", label: "Pads" },
    { id: "notes", label: "Notes" }
  ]
};

const TRANSCRIPT_LINES = [
  { time: "10:31", html: "Last week we said that grace always arrives before we are ready for it." },
  { time: "10:33", html: "This morning I want to show you where that grace begins." },
  { time: "10:34", html: "If you have your Bible, turn with me to the third chapter of John." },
  { time: "10:36", html: "Nicodemus comes at night with a question, and Jesus answers with a gift." },
  { time: "10:38", html: "He does not start with a command. He starts with love." },
  { time: "10:40", html: "That is the shape of the whole gospel, church." },
  { time: "10:42", html: "…and that is the heart of the gospel, church. It is not first about what we do for God." },
  { time: "10:44", html: "It is about what God has already done for us in Christ." },
  { time: "10:46", html: "Look with me at <button type=\"button\" class=\"t-ref\" data-action=\"stage-ref\" data-ref=\"John 3:16\">John 3:16</button>. “For God so loved the world…”" },
  { time: "10:48", html: "That word “so” is not just intensity. It is the measure of the gift." },
  { time: "10:50", html: "And Paul says it this way in <button type=\"button\" class=\"t-ref\" data-action=\"stage-ref\" data-ref=\"Romans 8:28\">Romans 8:28</button>…" },
  { time: "10:51", html: "…that God works all things together for the good of those who love Him." },
  { time: "10:53", html: "So the invitation is not to clean yourself up first. It is to come as you are and believe." }
];

const TRANSCRIPT_PARTIAL = "So when Jeremiah writes about a future and a hope, he is not promising a life without trouble — he is promising a God who will be found.";

const state = {
  workspace: "bible",
  activeTab: "detected",
  libraryView: "verses",
  libraryBook: "John",
  libraryChapter: 3,
  libraryVerse: 16,
  query: "",
  scrollVerse: true,
  preview: verseItem("John 3:16", verseText("John", 3, 16) || ""),
  program: null,
  autoStage: true,
  detected: DETECTED_SEED,
  related: RELATED_SEED,
  notesHtml: NOTES_HTML,
  notesSaveLabel: "Saved just now",
  songs: SONGS,
  activeSongId: "blessed-assurance",
  notices: NOTICES,
  media: MEDIA,
  pads: PADS,
  transcript: "live",
  timerSeconds: 754,
  timerRunning: true,
  displays: [
    { id: "main", name: "Main Screen", on: true, detail: "Program · 1080p" },
    { id: "lobby", name: "Lobby", on: true, detail: "Program · 1080p" },
    { id: "stream", name: "Livestream", on: false, detail: "Standby · 1080p" }
  ],
  clearArmed: false,
  splitPct: 43,
  popoverType: null
};

let toastTimer = null;
let notesSaveTimer = null;
