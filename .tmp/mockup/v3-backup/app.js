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
function queryText() {
  return state.query.trim();
}

function activeWordQuery() {
  const query = queryText();
  if (!query) return "";
  return parseReferenceQuery(query) ? "" : query;
}

function filteredSongs() {
  const query = queryText().toLowerCase();
  if (!query) return state.songs;
  return state.songs.filter((song) => (song.title + " " + song.artist).toLowerCase().includes(query));
}

function filteredNotices() {
  const query = queryText().toLowerCase();
  if (!query) return state.notices;
  return state.notices.filter((notice) => (notice.title + " " + notice.copy + " " + notice.kicker).toLowerCase().includes(query));
}

function filteredMedia() {
  const query = queryText().toLowerCase();
  if (!query) return state.media;
  return state.media.filter((item) => (item.title + " " + item.kind + " " + item.description).toLowerCase().includes(query));
}

function filteredPads() {
  const query = queryText().toLowerCase();
  if (!query) return state.pads;
  return state.pads.filter((pad) => (pad.name + " " + pad.kind + " " + pad.detail).toLowerCase().includes(query));
}

function isSongActive(songId) {
  return (state.preview && state.preview.songId === songId) || (state.program && state.program.songId === songId);
}

function isNoticeActive(noticeId) {
  return (state.preview && state.preview.noticeId === noticeId) || (state.program && state.program.noticeId === noticeId);
}

function isMediaActive(mediaId) {
  return (state.preview && state.preview.mediaId === mediaId) || (state.program && state.program.mediaId === mediaId);
}

function isPadActive(padId) {
  return (state.preview && state.preview.padId === padId) || (state.program && state.program.padId === padId);
}

function libraryTitle() {
  const found = WORKSPACES.find((item) => item.id === state.workspace);
  return found ? found.label : "Library";
}

function libraryPlaceholder() {
  switch (state.workspace) {
    case "songs": return "Search songs";
    case "announcements": return "Search announcements";
    case "media": return "Search media";
    case "overlays": return "Search overlays";
    default: return "Search or jump to a reference";
  }
}

function totalSongDuration() {
  const total = state.songs.reduce((sum, song) => {
    const parts = song.duration.split(":").map(Number);
    return sum + parts[0] * 60 + (parts[1] || 0);
  }, 0);
  return Math.floor(total / 60) + "m " + String(total % 60).padStart(2, "0") + "s";
}

function searchHintHTML(mode) {
  const query = queryText();
  if (!query) return "";
  const parsed = parseReferenceQuery(query);
  if (parsed) {
    const ref = parsed.book.name + (parsed.chapter ? " " + parsed.chapter + (parsed.verse ? ":" + parsed.verse : "") : "");
    return '<div class="lib-hint">Press <kbd>Enter</kbd> to open <strong>' + escapeHTML(ref) + "</strong>.</div>";
  }
  if (mode === "books") {
    const count = BOOKS.filter((book) => book.name.toLowerCase().includes(query.toLowerCase())).length;
    return '<div class="lib-hint">' + count + " book" + (count === 1 ? "" : "s") + ' matching <strong>“' + escapeHTML(query) + "”</strong>.</div>";
  }
  return "";
}

function emptyLibraryState(iconName, title, copy, actionLabel, action) {
  return '<div class="verse-empty">' +
    icon(iconName, 20) +
    "<p><strong>" + escapeHTML(title) + "</strong><br>" + escapeHTML(copy) + "</p>" +
    (actionLabel ? '<button type="button" class="link" data-action="' + action + '">' + escapeHTML(actionLabel) + "</button>" : "") +
    "</div>";
}

function quickJumpHTML() {
  const ref = state.libraryBook + " " + state.libraryChapter + ":" + state.libraryVerse;
  return '<button type="button" class="quick-jump" data-action="quick-jump">' +
    '<span class="qj-icon">' + icon("bookmark", 13) + "</span>" +
    '<span class="qj-body"><span class="qj-label">Continue reading</span><span class="qj-ref">' + escapeHTML(ref) + " · KJV</span></span>" +
    '<span class="qj-enter">↵</span>' +
    "</button>";
}

function booksBodyHTML() {
  const query = queryText();
  const parsed = query ? parseReferenceQuery(query) : null;
  const filtering = query && !parsed;
  const matches = filtering
    ? BOOKS.filter((book) => book.name.toLowerCase().includes(query.toLowerCase()))
    : BOOKS;
  const oldTestament = matches.filter((book) => bookIndex(book.name) < 39);
  const newTestament = matches.filter((book) => bookIndex(book.name) >= 39);

  let html = searchHintHTML("books");
  if (!filtering) html += quickJumpHTML();

  if (!matches.length) {
    return html + emptyLibraryState("search", "No books found", "Nothing matches “" + query + "”. Try a book name, or enter a reference like John 3:16.", "Clear search", "clear-search");
  }

  if (oldTestament.length) {
    html += '<div class="book-section"><div class="section-label">Old Testament <span class="label-count">' + oldTestament.length + "</span></div><div class=\"book-grid\">";
    html += oldTestament.map((book) => '<button type="button" class="book' + (state.libraryBook === book.name ? " is-current" : "") + '" data-action="library-book" data-book="' + escapeHTML(book.name) + '" title="' + escapeHTML(book.name) + ' · ' + book.chapters + ' chapters">' + escapeHTML(book.name) + "</button>").join("");
    html += "</div></div>";
  }

  if (newTestament.length) {
    html += '<div class="book-section"><div class="section-label">New Testament <span class="label-count">' + newTestament.length + "</span></div><div class=\"book-grid\">";
    html += newTestament.map((book) => '<button type="button" class="book' + (state.libraryBook === book.name ? " is-current" : "") + '" data-action="library-book" data-book="' + escapeHTML(book.name) + '" title="' + escapeHTML(book.name) + ' · ' + book.chapters + ' chapters">' + escapeHTML(book.name) + "</button>").join("");
    html += "</div></div>";
  }

  return html;
}

function chaptersBodyHTML() {
  const book = BOOK_BY_KEY.get(state.libraryBook.toLowerCase()) || BOOKS[42];
  const sampleChapters = Array.from({ length: book.chapters }, (_, index) => index + 1)
    .filter((chapter) => !!chapterText(book.name, chapter));

  let html = '<div class="crumbs">' +
    '<button type="button" class="crumb-back" data-action="library-books" title="All books">' + icon("arrowLeft", 13) + "</button>" +
    '<button type="button" class="crumb" data-action="library-books">' + escapeHTML(book.name) + "</button>" +
    '<span class="crumb-sep">/</span>' +
    '<span class="crumb is-current">Chapters</span>' +
    "</div>";

  html += searchHintHTML("chapters");

  html += '<div class="chapter-head"><div><div class="chapter-title">' + escapeHTML(book.name) + '</div><div class="chapter-sub">' + book.chapters + ' chapters · KJV</div></div></div>';
  html += '<div class="chapter-grid">';
  html += Array.from({ length: book.chapters }, (_, index) => {
    const number = index + 1;
    const sample = !!chapterText(book.name, number);
    const current = state.libraryChapter === number;
    return '<button type="button" class="chapter' + (sample ? " has-sample" : "") + (current ? " is-current" : "") + '" data-action="library-chapter" data-chapter="' + number + '" title="' + escapeHTML(book.name) + " " + number + (sample ? " · sample text" : "") + '">' + number + "</button>";
  }).join("");
  html += "</div>";

  if (sampleChapters.length) {
    html += '<div class="lib-note">Dots mark chapters with sample text in this preview.</div>';
  } else {
    html += '<div class="lib-note">Sample text is not bundled for ' + escapeHTML(book.name) + " in this preview.</div>";
  }

  return html;
}

function versesBodyHTML() {
  const book = BOOK_BY_KEY.get(state.libraryBook.toLowerCase()) || BOOKS[42];
  const chapter = Math.min(Math.max(1, state.libraryChapter), book.chapters);
  const rows = chapterText(book.name, chapter);
  const previousDisabled = chapter <= 1;
  const nextDisabled = chapter >= book.chapters;

  let html = '<div class="crumbs">' +
    '<button type="button" class="crumb-back" data-action="library-chapters" title="Chapters">' + icon("arrowLeft", 13) + "</button>" +
    '<button type="button" class="crumb" data-action="library-books">' + escapeHTML(book.name) + "</button>" +
    '<span class="crumb-sep">/</span>' +
    '<button type="button" class="crumb is-current" data-action="library-chapters">Chapter ' + chapter + "</button>" +
    "</div>";

  html += searchHintHTML("verses");

  html += '<div class="chapter-head"><div><div class="chapter-title">' + escapeHTML(book.name + " " + chapter) + '</div><div class="chapter-sub">' + (rows ? "KJV · " + rows.length + " verses" : "KJV · sample text unavailable") + '</div></div>';
  html += '<div class="verse-nav">' +
    '<button type="button" class="icon-btn" data-action="chapter-prev" title="Previous chapter"' + (previousDisabled ? " disabled" : "") + ">" + icon("chevronLeft", 12) + "</button>" +
    '<button type="button" class="icon-btn" data-action="chapter-next" title="Next chapter"' + (nextDisabled ? " disabled" : "") + ">" + icon("chevronRight", 12) + "</button>" +
    "</div></div>";

  if (!rows) {
    html += emptyLibraryState("book", "Sample text not included", "This preview bundles selected KJV chapters. John 3, Psalm 23, Romans 8, and Isaiah 40 are good places to look around.", "Open John 3", "open-john");
    return html;
  }

  const wordQuery = activeWordQuery();
  const visible = wordQuery ? rows.filter((row) => row.t.toLowerCase().includes(wordQuery.toLowerCase())) : rows;

  if (wordQuery) {
    html += '<div class="lib-hint">' + visible.length + " verse" + (visible.length === 1 ? "" : "s") + ' matching <strong>“' + escapeHTML(wordQuery) + "”</strong>.</div>";
  }

  if (!visible.length) {
    return html + emptyLibraryState("search", "No verses found", "Nothing in " + book.name + " " + chapter + " matches “" + wordQuery + "”.", "Clear search", "clear-search");
  }

  html += '<div class="verse-list">';
  html += visible.map((row) => {
    const current = state.libraryVerse === row.v;
    return '<button type="button" class="verse-row' + (current ? " is-current" : "") + '" data-action="stage-verse" data-book="' + escapeHTML(book.name) + '" data-chapter="' + chapter + '" data-verse="' + row.v + '" aria-label="Stage ' + escapeHTML(book.name + " " + chapter + ":" + row.v) + '">' +
      '<span class="verse-num">' + row.v + "</span>" +
      '<span class="verse-copy">' + escapeHTML(row.t) + "</span>" +
      "</button>";
  }).join("");
  html += "</div>";
  return html;
}

function songsBodyHTML() {
  const songs = filteredSongs();
  if (!songs.length) {
    return emptyLibraryState("music", "No songs found", "No song matches “" + queryText() + "”.", "Clear search", "clear-search");
  }
  return '<div class="lib-list">' + songs.map((song) => {
    const active = isSongActive(song.id);
    return '<button type="button" class="lib-row' + (active ? " is-active" : "") + '" data-action="stage-song" data-song-id="' + escapeHTML(song.id) + '">' +
      '<span class="lib-row-icon">' + icon("music", 13) + "</span>" +
      '<span class="lib-row-main"><span class="lib-row-title">' + escapeHTML(song.title) + '</span><span class="lib-row-sub">' + escapeHTML(song.artist + " · Key " + song.key + " · " + song.slides.length + " slides") + "</span></span>" +
      '<span class="lib-row-side">' + escapeHTML(song.duration) + "</span>" +
      "</button>";
  }).join("") + "</div>";
}

function noticesBodyHTML() {
  const notices = filteredNotices();
  if (!notices.length) {
    return emptyLibraryState("megaphone", "No announcements found", "No notice matches “" + queryText() + "”.", "Clear search", "clear-search");
  }
  return '<div class="lib-list">' + notices.map((notice) => {
    const live = !!state.program && state.program.id === "notice:" + notice.id;
    const staged = !!state.preview && state.preview.id === "notice:" + notice.id;
    const active = live || staged;
    return '<button type="button" class="lib-row' + (active ? " is-active" : "") + '" data-action="stage-notice" data-notice-id="' + escapeHTML(notice.id) + '">' +
      '<span class="lib-row-icon">' + icon("megaphone", 13) + "</span>" +
      '<span class="lib-row-main"><span class="lib-row-title">' + escapeHTML(notice.title) + '</span><span class="lib-row-sub">' + escapeHTML(notice.kicker + " · " + notice.when) + "</span></span>" +
      '<span class="lib-row-side">' + (live ? "Live" : staged ? "Staged" : "Stage") + "</span>" +
      "</button>";
  }).join("") + "</div>";
}

function mediaBodyHTML() {
  const media = filteredMedia();
  if (!media.length) {
    return emptyLibraryState("film", "No media found", "No slide matches “" + queryText() + "”.", "Clear search", "clear-search");
  }
  return '<div class="lib-thumbs">' + media.map((item) => {
    const active = isMediaActive(item.id);
    return '<button type="button" class="lib-thumb' + (active ? " is-active" : "") + '" data-action="stage-media" data-media-id="' + escapeHTML(item.id) + '">' +
      '<span class="lib-thumb-art ' + item.art + '">' + icon("film", 16) + "</span>" +
      '<span class="lib-thumb-label">' + escapeHTML(item.title) + "</span>" +
      "</button>";
  }).join("") + "</div>";
}

function padsBodyHTML() {
  const pads = filteredPads();
  if (!pads.length) {
    return emptyLibraryState("layers", "No overlays found", "No overlay matches “" + queryText() + "”.", "Clear search", "clear-search");
  }
  return '<div class="lib-list">' + pads.map((pad) => {
    const live = !!state.program && state.program.id === "pad:" + pad.id;
    const staged = !!state.preview && state.preview.id === "pad:" + pad.id;
    const active = live || staged;
    return '<button type="button" class="lib-row' + (active ? " is-active" : "") + '" data-action="stage-pad" data-pad-id="' + escapeHTML(pad.id) + '">' +
      '<span class="lib-row-icon">' + icon("layers", 13) + "</span>" +
      '<span class="lib-row-main"><span class="lib-row-title">' + escapeHTML(pad.name) + '</span><span class="lib-row-sub">' + escapeHTML(pad.kind + " · " + pad.detail) + "</span></span>" +
      '<span class="lib-row-side">' + (live ? "Live" : staged ? "Staged" : "Stage") + "</span>" +
      "</button>";
  }).join("") + "</div>";
}

function libraryBodyHTML() {
  switch (state.workspace) {
    case "songs": return songsBodyHTML();
    case "announcements": return noticesBodyHTML();
    case "media": return mediaBodyHTML();
    case "overlays": return padsBodyHTML();
    default:
      if (state.libraryView === "chapters") return chaptersBodyHTML();
      if (state.libraryView === "verses") return versesBodyHTML();
      return booksBodyHTML();
  }
}

function libraryFootHTML() {
  let left = "";
  let right = "";
  if (state.workspace === "bible") {
    if (state.libraryView === "chapters") {
      const book = BOOK_BY_KEY.get(state.libraryBook.toLowerCase()) || BOOKS[42];
      left = book.name + " · " + book.chapters + " chapters";
      right = "KJV";
    } else if (state.libraryView === "verses") {
      const rows = chapterText(state.libraryBook, state.libraryChapter);
      left = (rows ? rows.length : "—") + " verses";
      right = "KJV";
    } else {
      left = "66 books · 1,189 chapters";
      right = "KJV sample";
    }
  } else if (state.workspace === "songs") {
    left = state.songs.length + " songs · Sunday set";
    right = totalSongDuration();
  } else if (state.workspace === "announcements") {
    left = state.notices.length + " notices";
    right = "This Sunday";
  } else if (state.workspace === "media") {
    left = state.media.length + " media slides";
    right = "1080p";
  } else {
    left = state.pads.length + " overlays";
    right = "Lower thirds";
  }
  return '<div class="lib-foot"><span>' + escapeHTML(left) + '</span><span class="foot-right">' + escapeHTML(right) + "</span></div>";
}

function libraryHTML() {
  const headAction = state.workspace === "bible"
    ? '<button type="button" class="translation" data-action="translation" title="Bible translation">KJV ' + icon("chevronDown", 11) + "</button>"
    : '<span class="lib-count">' + {
      songs: state.songs.length + " songs",
      announcements: state.notices.length + " notices",
      media: state.media.length + " slides",
      overlays: state.pads.length + " overlays"
    }[state.workspace] + "</span>";

  return '<aside class="panel library">' +
    '<div class="lib-head"><div class="lib-title">' + escapeHTML(libraryTitle()) + '</div><div class="lib-head-actions">' + headAction + "</div></div>" +
    '<div class="lib-search-wrap"><div class="lib-search">' + icon("search", 13) +
      '<input id="lib-search" type="text" value="' + escapeHTML(state.query) + '" placeholder="' + escapeHTML(libraryPlaceholder()) + '" autocomplete="off" spellcheck="false" aria-label="' + escapeHTML(libraryPlaceholder()) + '" />' +
      "<kbd>/</kbd></div></div>" +
    '<div class="lib-body">' + libraryBodyHTML() + "</div>" +
    libraryFootHTML() +
    "</aside>";
}
function tabCount(tabId) {
  switch (tabId) {
    case "detected": return state.detected.length;
    case "related": return state.related.length;
    case "setlist": return state.songs.length;
    case "slides": {
      const song = state.songs.find((item) => item.id === state.activeSongId) || state.songs[0];
      return song ? song.slides.length : 0;
    }
    case "notices": return state.notices.length;
    case "media": return state.media.length;
    case "pads": return state.pads.length;
    default: return null;
  }
}

function workbenchActionsHTML() {
  let html = '<span class="wb-saved" data-saved>' + icon("check", 11) + "<span>" + escapeHTML(state.notesSaveLabel) + "</span></span>";
  if (state.workspace === "bible" && state.activeTab !== "notes") {
    html += '<button type="button" class="mini-toggle" data-action="auto-stage" title="Stage detected references automatically">' +
      '<span class="switch" aria-checked="' + String(state.autoStage) + '" aria-hidden="true"></span><span>Auto-stage</span>' +
      "</button>";
  }
  if (state.workspace === "bible") {
    html += '<button type="button" class="wb-add" data-action="add-reference" title="Jump to a Bible reference">' + icon("plus", 11) + "Add</button>";
  }
  return html;
}

function cueListHTML(items, mode) {
  if (!items.length) {
    const title = mode === "detected" ? "No references detected" : "No related passages";
    const copy = mode === "detected"
      ? "When the transcript hears a reference, it will appear here. You can also stage a verse from the Bible library."
      : "Related passages will appear as the sermon moves. Browse the Bible to stage something yourself.";
    return '<div class="cue-empty"><div class="cue-empty-icon">' + icon(mode === "detected" ? "mic" : "layers", 16) + "</div>" +
      '<div class="cue-empty-title">' + title + "</div>" +
      '<div class="cue-empty-copy">' + copy + "</div>" +
      '<button type="button" data-action="add-reference">Search the Bible</button>' +
      "</div>";
  }

  return '<div class="cue-list">' + items.map((cue) => {
    const live = state.program && state.program.id === cue.id;
    const staged = state.preview && state.preview.id === cue.id;
    const status = live
      ? '<span class="badge badge-live"><span class="badge-dot"></span>On program</span>'
      : staged
        ? '<span class="badge badge-next">In preview</span>'
        : "";
    const relation = mode === "related" ? '<span class="badge badge-semantic">' + escapeHTML(cue.relation) + "</span>" : "";
    const confidence = mode === "detected"
      ? '<span class="cue-conf"><span class="conf-dot' + (cue.confidence < 92 ? " mid" : "") + '"></span>' + cue.confidence + "%</span>"
      : "";
    const time = cue.time ? '<span class="cue-time">' + escapeHTML(cue.time) + "</span>" : "";
    const heard = mode === "detected"
      ? '<div class="cue-heard"><span>Heard</span>' + escapeHTML(cue.heard) + "</div>"
      : '<div class="cue-heard"><span>Why</span>' + escapeHTML(cue.note) + "</div>";

    return '<div class="cue' + (staged ? " is-staged" : "") + (live ? " is-live" : "") + '" role="button" tabindex="0" data-action="stage-cue" data-cue-id="' + escapeHTML(cue.id) + '" aria-label="Preview ' + escapeHTML(cue.ref) + '">' +
      '<div class="cue-top"><span class="cue-ref">' + escapeHTML(cue.ref) + "</span>" + status + relation + confidence + time + "</div>" +
      '<div class="cue-text">' + escapeHTML(cue.text) + "</div>" +
      heard +
      '<span class="cue-preview-hint">' + (live ? "On program" : staged ? "In preview" : "Preview") + " " + icon("arrowRight", 10) + "</span>" +
      "</div>";
  }).join("") + "</div>";
}

function notesHTML() {
  const tools = [
    ['bold', "B", "Bold", ' class="notes-tool is-bold"'],
    ['italic', "I", "Italic", ' class="notes-tool is-italic"'],
    ['underline', "U", "Underline", ' class="notes-tool is-underline"'],
    ['formatBlock', "H", "Heading", ' class="notes-tool" data-value="h4"'],
    ['formatBlock', "“", "Quote", ' class="notes-tool" data-value="blockquote"'],
    ['insertUnorderedList', "•", "Bulleted list", ' class="notes-tool"']
  ];
  const toolbar = tools.map((tool) => {
    const valueAttr = tool[0] === "formatBlock" ? ' data-value="' + tool[4] + '"' : "";
    return '<button type="button"' + tool[3] + valueAttr + ' data-notes-cmd="' + tool[0] + '" title="' + tool[2] + '" aria-label="' + tool[2] + '">' + tool[1] + "</button>";
  }).join("");

  return '<div class="notes-wrap">' +
    '<div class="notes-top"><div><div class="notes-title">Sermon notes</div><div class="notes-sub">John 3:16 · Sunday AM</div></div>' +
    '<button type="button" class="notes-ai" data-action="ai-draft">' + icon("sparkle", 11) + "Draft summary</button></div>" +
    '<div class="notes-toolbar">' + toolbar +
    '<span class="toolbar-rule"></span>' +
    '<button type="button" class="notes-tool" data-action="insert-scripture" title="Insert the previewed verse" aria-label="Insert the previewed verse">' + icon("bookmark", 12) + "</button>" +
    "</div>" +
    '<div class="notes-editor" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Sermon notes" spellcheck="true" data-notes-editor>' + state.notesHtml + "</div>" +
    "</div>";
}

function setlistHTML() {
  return '<div class="setlist">' + state.songs.map((song, index) => {
    const live = state.program && state.program.songId === song.id;
    const staged = state.preview && state.preview.songId === song.id;
    const badge = live
      ? '<span class="setlist-badge">Live</span>'
      : staged
        ? '<span class="badge badge-next" style="margin-left:5px;vertical-align:1px">Preview</span>'
        : "";
    return '<button type="button" class="setlist-row' + (state.activeSongId === song.id ? " is-active" : "") + '" data-action="stage-song" data-song-id="' + escapeHTML(song.id) + '">' +
      '<span class="setlist-num">' + String(index + 1).padStart(2, "0") + "</span>" +
      '<span class="setlist-main"><span class="setlist-title">' + escapeHTML(song.title) + badge + '</span><span class="setlist-sub">' + escapeHTML(song.artist + " · Key " + song.key) + "</span></span>" +
      '<span class="setlist-time">' + escapeHTML(song.duration) + "</span>" +
      "</button>";
  }).join("") + "</div>";
}

function slidesHTML() {
  const song = state.songs.find((item) => item.id === state.activeSongId) || state.songs[0];
  if (!song) return cueListHTML([], "related");
  return '<div class="slides-head"><div><div class="slides-title">' + escapeHTML(song.title) + '</div><div class="slides-sub">' + escapeHTML(song.artist + " · " + song.slides.length + " slides · Key " + song.key) + "</div></div></div>" +
    '<div class="slides-grid">' + song.slides.map((line, index) => {
      const active = (state.preview && state.preview.id === "song:" + song.id + ":" + index) || (state.program && state.program.id === "song:" + song.id + ":" + index);
      return '<button type="button" class="slide-thumb' + (active ? " is-active" : "") + '" data-action="stage-slide" data-song-id="' + escapeHTML(song.id) + '" data-slide-index="' + index + '">' +
        '<span class="slide-art art-' + ((index % 6) + 1) + '">' +
        '<span class="slide-art-num">' + String(index + 1).padStart(2, "0") + "</span>" +
        '<span class="slide-art-label">' + escapeHTML(line) + "</span></span>" +
        '<span class="slide-caption">Slide ' + (index + 1) + "</span>" +
        "</button>";
    }).join("") + "</div>";
}

function noticesHTML() {
  return '<div class="notices">' + state.notices.map((notice) => {
    const active = isNoticeActive(notice.id);
    return '<button type="button" class="notice-card' + (active ? " is-active" : "") + '" data-action="stage-notice" data-notice-id="' + escapeHTML(notice.id) + '">' +
      '<span class="notice-kicker">' + escapeHTML(notice.kicker) + "</span>" +
      '<span class="notice-title">' + escapeHTML(notice.title) + "</span>" +
      '<span class="notice-copy">' + escapeHTML(notice.copy) + "</span>" +
      '<span class="notice-foot"><span>' + escapeHTML(notice.when) + '</span><span class="notice-stage">' + (active ? "In preview" : "Stage") + "</span></span>" +
      "</button>";
  }).join("") + "</div>";
}

function mediaGridHTML() {
  return '<div class="slides-head"><div><div class="slides-title">Media library</div><div class="slides-sub">Click a slide to stage it in Preview</div></div><span class="slides-sub">' + state.media.length + " slides</span></div>" +
    '<div class="slides-grid">' + state.media.map((item, index) => {
      const active = isMediaActive(item.id);
      return '<button type="button" class="slide-thumb' + (active ? " is-active" : "") + '" data-action="stage-media" data-media-id="' + escapeHTML(item.id) + '">' +
        '<span class="slide-art ' + item.art + '"><span class="slide-art-num">' + String(index + 1).padStart(2, "0") + "</span><span class=\"slide-art-label\">" + escapeHTML(item.title) + "</span></span>" +
        '<span class="slide-caption">' + escapeHTML(item.caption) + "</span>" +
        "</button>";
    }).join("") + "</div>";
}

function padsHTML() {
  return '<div class="pads">' + state.pads.map((pad) => {
    const active = isPadActive(pad.id);
    return '<button type="button" class="pad' + (active ? " is-on" : "") + '" data-action="stage-pad" data-pad-id="' + escapeHTML(pad.id) + '">' +
      '<span class="pad-top"><span class="pad-kind">' + escapeHTML(pad.kind) + '</span><span class="pad-dot"></span></span>' +
      '<span class="pad-name">' + escapeHTML(pad.name) + "</span>" +
      '<span class="pad-thumb"><span></span><span></span></span>' +
      '<span class="pad-detail">' + escapeHTML(active ? "In preview" : pad.detail) + "</span>" +
      "</button>";
  }).join("") + "</div>";
}

function workbenchBodyHTML() {
  switch (state.activeTab) {
    case "related": return cueListHTML(state.related, "related");
    case "notes": return notesHTML();
    case "setlist": return setlistHTML();
    case "slides": return slidesHTML();
    case "notices": return noticesHTML();
    case "media": return mediaGridHTML();
    case "pads": return padsHTML();
    default: return cueListHTML(state.detected, "detected");
  }
}

function workbenchFooterHTML() {
  let left = "";
  let right = "";
  switch (state.activeTab) {
    case "detected":
      left = '<span class="foot-hint"><kbd>↵</kbd> Take preview <span class="foot-sep">·</span> <kbd>Esc</kbd> cancel</span>';
      right = state.detected.length + " detected";
      break;
    case "related":
      left = "Passages related to John 3:16";
      right = state.related.length + " suggestions";
      break;
    case "notes":
      left = "Autosaved in this mockup";
      right = '<span data-notes-words>' + wordCount(state.notesHtml) + " words</span>";
      break;
    case "setlist":
      left = "Click a song to stage its first slide";
      right = state.songs.length + " songs";
      break;
    case "slides": {
      const song = state.songs.find((item) => item.id === state.activeSongId) || state.songs[0];
      left = "Click a slide to stage it";
      right = (song ? song.slides.length : 0) + " slides";
      break;
    }
    case "notices":
      left = "Click a notice to stage it";
      right = state.notices.length + " notices";
      break;
    case "media":
      left = "Click a slide to stage it";
      right = state.media.length + " slides";
      break;
    case "pads":
      left = "Click an overlay to stage it";
      right = state.pads.length + " graphics";
      break;
    default:
      left = "";
      right = "";
  }
  return '<div class="wb-foot"><span>' + left + '</span><span class="foot-side">' + right + "</span></div>";
}

function workbenchHTML() {
  const tabs = WORKSPACE_TABS[state.workspace] || WORKSPACE_TABS.bible;
  const tabButtons = tabs.map((tab) => {
    const count = tabCount(tab.id);
    return '<button type="button" class="wb-tab' + (state.activeTab === tab.id ? " is-active" : "") + '" role="tab" aria-selected="' + String(state.activeTab === tab.id) + '" data-action="tab" data-tab="' + tab.id + '">' +
      escapeHTML(tab.label) +
      (count == null ? "" : '<span class="tab-count">' + count + "</span>") +
      "</button>";
  }).join("");

  return '<section class="panel workbench">' +
    '<div class="wb-head"><div class="wb-tabs" role="tablist" aria-label="' + escapeHTML(libraryTitle()) + ' workspace">' + tabButtons + "</div>" +
    '<div class="wb-actions">' + workbenchActionsHTML() + "</div></div>" +
    '<div class="wb-body">' + workbenchBodyHTML() + "</div>" +
    workbenchFooterHTML() +
    "</section>";
}

function transcriptHTML() {
  const mode = state.transcript;
  const isLive = mode === "live";
  const isPaused = mode === "paused";
  const isStopped = mode === "stopped";
  const stateLabel = isLive ? "Listening" : isPaused ? "Paused" : "Stopped";

  let body = "";
  if (isStopped) {
    body = '<div class="cue-empty"><div class="cue-empty-icon">' + icon("micOff", 16) + "</div>" +
      '<div class="cue-empty-title">Transcription stopped</div>' +
      '<div class="cue-empty-copy">The captured transcript stays here. Start listening again when you are ready to pick up the next point.</div>' +
      "</div>";
  } else {
    body = TRANSCRIPT_LINES.map((line, index) => {
      const recent = index === TRANSCRIPT_LINES.length - 1 ? " is-recent" : "";
      return '<div class="t-line' + recent + '"><span class="t-time">' + line.time + '</span><span class="t-copy">' + line.html + "</span></div>";
    }).join("");
    body += '<div class="t-partial"><span class="t-time">10:54</span><span class="t-copy">' + escapeHTML(TRANSCRIPT_PARTIAL) + (isLive ? '<span class="caret"></span>' : "") + "</span></div>";
  }

  const headerButton = '<button type="button" class="icon-btn" data-action="transcript-toggle" title="' + (isLive ? "Pause transcription" : "Start transcription") + '">' + icon(isLive ? "pause" : "play", 13) + "</button>";

  let footLeft = "";
  if (isLive) footLeft = icon("headphones", 11) + '<span class="t-follow"><span class="dot"></span>Following live</span>';
  else if (isPaused) footLeft = icon("headphones", 11) + "<span>Paused at 10:54</span>";
  else footLeft = icon("micOff", 11) + "<span>Transcription stopped</span>";

  let footRight = "";
  if (isLive) footRight = '<button type="button" class="t-stop" data-action="transcript-stop">Stop transcript</button>';
  else footRight = '<button type="button" class="t-start" data-action="transcript-toggle">' + icon("play", 10) + "Start listening</button>";

  return '<section class="panel transcript' + (isPaused ? " is-paused" : "") + '">' +
    '<div class="t-head"><div class="t-title"><span class="live-dot' + (isLive ? "" : " is-paused") + '"></span>Transcript <span class="t-meta">Deepgram · KJV</span></div>' +
    '<div class="t-right"><span class="t-state">' + stateLabel + "</span>" +
    (isLive ? '<span class="meter"><i></i><i></i><i></i><i></i><i></i><i></i></span>' : "") +
    headerButton + "</div></div>" +
    '<div class="t-body">' + body + "</div>" +
    '<div class="t-foot"><div class="t-foot-left">' + footLeft + "</div>" + footRight + "</div>" +
    "</section>";
}

function statusPill(text, kind) {
  return '<span class="status-pill' + (kind ? " is-" + kind : "") + '"><span class="dot"></span>' + text + "</span>";
}

function emptyScreenHTML(mode) {
  const title = mode === "program" ? "Program is clear" : "Nothing in preview";
  const copy = mode === "program" ? "Stage something, then take it." : "Choose a verse, cue, or slide.";
  return '<div class="screen' + (mode === "preview" ? " is-preview" : "") + '"><div class="screen-empty">' +
    icon(mode === "program" ? "monitor" : "eye", 19) +
    '<div class="screen-empty-title">' + title + "</div>" +
    '<div class="screen-empty-copy">' + copy + "</div>" +
    "</div></div>";
}

function slideScreenHTML(item, mode) {
  if (!item) return emptyScreenHTML(mode);
  const kindClass = item.kind === "song"
    ? " is-song"
    : (item.kind === "notice" || item.kind === "overlay")
      ? " is-notice"
      : item.kind === "media"
        ? " is-media"
        : "";
  return '<div class="screen' + (mode === "program" ? " is-live" : " is-preview") + '"><div class="slide' + kindClass + '">' +
    (mode === "program" ? '<span class="slide-live"><span class="dot"></span>ON AIR</span>' : "") +
    '<div class="slide-ref">' + escapeHTML(item.slideLabel || item.ref) + "</div>" +
    '<div class="slide-text">' + escapeHTML(item.text || "") + "</div>" +
    "</div></div>";
}

function takeDockHTML() {
  const hasPreview = !!state.preview;
  const hasProgram = !!state.program;
  return '<div class="take-dock">' +
    '<button type="button" class="take" data-action="take"' + (hasPreview ? "" : " disabled") + ' title="' + (hasPreview ? "Take the preview to Program" : "Stage something in Preview first") + ' aria-disabled="' + String(!hasPreview) + '">' +
    icon("arrowUp", 14) + "<span>Take to program</span><kbd>↵</kbd>" +
    "</button>" +
    '<button type="button" class="clear' + (state.clearArmed ? " is-armed" : "") + '" data-action="clear-program"' + (hasProgram ? "" : " disabled") + ' title="' + (hasProgram ? (state.clearArmed ? "Click again to clear Program" : "Clear Program") : "Program is already clear") + '" aria-label="Clear Program">' +
    icon("monitorOff", 13) +
    "</button></div>";
}

function displaysHTML() {
  const onCount = state.displays.filter((display) => display.on).length;
  const anyOn = onCount > 0;
  return '<div class="displays">' +
    '<div class="displays-head"><span class="eyebrow">Displays <span class="count">' + onCount + " of " + state.displays.length + ' on</span></span>' +
    '<button type="button" class="manage" data-action="toggle-all-displays">' + (anyOn ? "All off" : "All on") + "</button></div>" +
    state.displays.map((display) => {
      const on = display.on;
      const detail = on ? (state.program ? "Program · 1080p" : "Standby · 1080p") : "Off · 1080p";
      return '<button type="button" class="display-row' + (on ? " is-on" : "") + '" data-action="display-toggle" data-display-id="' + escapeHTML(display.id) + '" aria-pressed="' + String(on) + '">' +
        '<span class="display-dot"></span>' +
        '<span class="display-main"><span class="display-name">' + escapeHTML(display.name) + '</span><span class="display-sub">' + detail + "</span></span>" +
        '<span class="switch" aria-checked="' + String(on) + '" aria-hidden="true"></span>' +
        "</button>";
    }).join("") +
    "</div>";
}

function outputsHTML() {
  const onCount = state.displays.filter((display) => display.on).length;
  const hasProgram = !!state.program;
  const hasPreview = !!state.preview;

  const programMeta = hasProgram
    ? '<span>' + escapeHTML(state.program.ref) + '</span><span class="meta-route' + (onCount ? "" : " is-muted") + '"><span class="dot"></span>' + (onCount ? onCount + " display" + (onCount === 1 ? "" : "s") : "No displays") + "</span>"
    : '<span>Program clear</span><span class="meta-route is-muted"><span class="dot"></span>0 displays</span>';
  const previewMeta = hasPreview
    ? '<span>' + escapeHTML(state.preview.ref) + '</span><span class="meta-route"><span class="dot"></span>Ready to take</span>'
    : '<span>Preview clear</span><span class="meta-route is-muted"><span class="dot"></span>Nothing staged</span>';

  return '<aside class="panel outputs">' +
    '<div class="out-head"><div class="out-title">Output <span class="out-count">NDI · 1080p60</span></div></div>' +
    '<div class="out-body">' +
    '<div class="monitor-block"><div class="monitor-label"><span class="eyebrow">Program</span>' + statusPill(hasProgram ? "Live" : "Off air", hasProgram ? "live" : "") + "</div>" +
    slideScreenHTML(state.program, "program") +
    '<div class="monitor-meta">' + programMeta + "</div></div>" +
    takeDockHTML() +
    '<div class="monitor-block"><div class="monitor-label"><span class="eyebrow">Preview</span>' + statusPill(hasPreview ? "Staged" : "Empty", hasPreview ? "next" : "") + "</div>" +
    slideScreenHTML(state.preview, "preview") +
    '<div class="monitor-meta">' + previewMeta + "</div></div>" +
    displaysHTML() +
    "</div>" +
    '<div class="out-foot"><span class="hint"><kbd>Esc</kbd> cancels preview</span><span class="foot-side">' + (hasProgram ? "Clear needs 2 clicks" : "Program clear") + "</span></div>" +
    "</aside>";
}

function topbarHTML() {
  const onCount = state.displays.filter((display) => display.on).length;
  const airClass = state.program ? (onCount ? " is-live" : " is-warn") : "";
  const airText = state.program ? (onCount ? "Live" : "No displays") : "Off air";

  const workspaces = WORKSPACES.map((workspace) =>
    '<button type="button" class="ws' + (state.workspace === workspace.id ? " is-active" : "") + '" data-action="workspace" data-workspace="' + workspace.id + '" aria-current="' + (state.workspace === workspace.id ? "page" : "false") + '">' +
    icon(workspace.icon, 13) + "<span>" + escapeHTML(workspace.label) + "</span></button>"
  ).join("");

  const session = state.timerRunning
    ? '<button type="button" class="session" data-action="session-toggle" title="Stop the sermon timer">' +
      '<span class="session-dot"></span><span class="session-label">Sermon</span><span class="session-time">' + formatTimer(state.timerSeconds) + '</span><span class="session-stop">' + icon("square", 9) + "</span></button>"
    : '<button type="button" class="session is-idle" data-action="session-toggle" title="Start the sermon timer">' +
      '<span class="session-dot"></span><span class="session-label">Start sermon</span><span class="session-stop">' + icon("play", 11) + "</span></button>";

  return '<header class="topbar">' +
    '<div class="brand"><span class="brand-mark" aria-hidden="true">F</span><span class="brand-name">FellowShow</span><span class="brand-rule"></span><span class="brand-session">Sunday AM</span></div>' +
    '<nav class="workspaces" aria-label="Workspaces">' + workspaces + "</nav>" +
    '<div class="top-actions">' + session +
    '<span class="air-chip' + airClass + '"><span class="dot"></span>' + airText + "</span>" +
    '<span class="top-rule"></span>' +
    '<button type="button" class="icon-btn" data-action="help" title="Keyboard shortcuts" aria-label="Keyboard shortcuts">' + icon("help", 15) + "</button>" +
    '<button type="button" class="icon-btn" data-action="fullscreen" title="Fullscreen" aria-label="Fullscreen">' + icon("expand", 15) + "</button>" +
    "</div></header>";
}

function attachSplitter() {
  const splitter = document.getElementById("splitter");
  const center = document.querySelector(".center");
  if (!splitter || !center) return;

  splitter.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const rect = center.getBoundingClientRect();
    const startY = event.clientY;
    const startValue = state.splitPct;
    splitter.classList.add("is-dragging");
    center.classList.add("is-resizing");
    if (splitter.setPointerCapture) splitter.setPointerCapture(event.pointerId);

    const move = (moveEvent) => {
      const next = Math.max(26, Math.min(68, startValue + ((moveEvent.clientY - startY) / rect.height) * 100));
      state.splitPct = next;
      center.style.setProperty("--tr", next + "%");
    };
    const end = () => {
      splitter.classList.remove("is-dragging");
      center.classList.remove("is-resizing");
      splitter.removeEventListener("pointermove", move);
      splitter.removeEventListener("pointerup", end);
      splitter.removeEventListener("pointercancel", end);
      if (splitter.releasePointerCapture) {
        try { splitter.releasePointerCapture(event.pointerId); } catch (error) { /* pointer already released */ }
      }
    };

    splitter.addEventListener("pointermove", move);
    splitter.addEventListener("pointerup", end);
    splitter.addEventListener("pointercancel", end);
  });

  splitter.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const direction = event.key === "ArrowDown" ? 1 : -1;
    state.splitPct = Math.max(26, Math.min(68, state.splitPct + direction * 3));
    center.style.setProperty("--tr", state.splitPct + "%");
  });
}

function afterRender() {
  const transcriptBody = document.querySelector(".t-body");
  if (transcriptBody) transcriptBody.scrollTop = transcriptBody.scrollHeight;
  attachSplitter();

  const libraryBody = document.querySelector(".lib-body");
  if (libraryBody) libraryBody.scrollTop = libraryScroll;

  if (state.focusSearch) {
    state.focusSearch = false;
    const input = document.getElementById("lib-search");
    if (input) input.focus();
  }

  if (state.scrollVerse) {
    state.scrollVerse = false;
    requestAnimationFrame(() => {
      const selected = document.querySelector(".verse-row.is-current");
      if (selected) selected.scrollIntoView({ block: "center" });
    });
  }
}

let libraryScroll = 0;
let libraryScrollKey = "";

function render() {
  closePopover();
  const previousLibrary = document.querySelector(".lib-body");
  const libraryKey = state.workspace + "|" + state.libraryView + "|" + state.libraryBook + "|" + state.libraryChapter;
  libraryScroll = previousLibrary && libraryKey === libraryScrollKey ? previousLibrary.scrollTop : 0;
  libraryScrollKey = libraryKey;

  const app = document.getElementById("app");
  app.innerHTML = topbarHTML() +
    '<main class="shell">' +
    libraryHTML() +
    '<div class="center" style="--tr:' + state.splitPct + '%">' +
    transcriptHTML() +
    '<div class="split" id="splitter" role="separator" aria-orientation="horizontal" aria-label="Resize transcript" tabindex="0"></div>' +
    workbenchHTML() +
    "</div>" +
    outputsHTML() +
    "</main>";
  afterRender();
}

function renderLibraryBody() {
  const body = document.querySelector(".lib-body");
  if (body) body.innerHTML = libraryBodyHTML();
}
let clearArmTimer = null;

function showToast(message, type) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  const text = document.getElementById("toast-text");
  if (text) text.textContent = message;
  toast.className = "toast is-visible" + (type ? " is-" + type : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 3200);
}

function closePopover() {
  const popover = document.getElementById("popover");
  if (!popover) return;
  popover.hidden = true;
  popover.innerHTML = "";
  popover.style.left = "";
  popover.style.top = "";
  popover.style.visibility = "";
  state.popoverType = null;
}

function openPopover(type, anchor) {
  const popover = document.getElementById("popover");
  if (!popover || !anchor) return;
  if (state.popoverType === type && !popover.hidden) {
    closePopover();
    return;
  }

  if (type === "translation") {
    popover.style.width = "232px";
    popover.innerHTML = '<div class="popover-label">Bible translation</div>' +
      '<button type="button" class="popover-item is-active" data-action="set-translation"><span>King James Version</span><span>KJV ✓</span></button>' +
      '<button type="button" class="popover-item" disabled><span>English Standard Version</span><span>ESV</span></button>' +
      '<button type="button" class="popover-item" disabled><span>New International Version</span><span>NIV</span></button>' +
      '<div class="popover-note">Only KJV sample text is bundled in this mockup.</div>';
  } else {
    popover.style.width = "238px";
    popover.innerHTML = '<div class="popover-label">Keyboard</div>' +
      '<div class="popover-item"><span>Search Bible</span><kbd>/</kbd></div>' +
      '<button type="button" class="popover-item" data-action="take"' + (state.preview ? "" : " disabled") + '><span>Take preview</span><kbd>↵</kbd></button>' +
      '<div class="popover-item"><span>Cancel preview</span><kbd>Esc</kbd></div>' +
      '<div class="popover-note">Esc only cancels Preview. Clearing Program always needs a second click.</div>';
  }

  popover.hidden = false;
  state.popoverType = type;
  popover.style.visibility = "hidden";
  const rect = anchor.getBoundingClientRect();
  const width = popover.offsetWidth;
  const height = popover.offsetHeight;
  const left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.right - width));
  let top = rect.bottom + 6;
  if (top + height > window.innerHeight - 12) top = Math.max(12, rect.top - height - 6);
  popover.style.left = left + "px";
  popover.style.top = top + "px";
  popover.style.visibility = "";
}

function setWorkspace(workspace) {
  if (!WORKSPACES.some((item) => item.id === workspace)) return;
  state.workspace = workspace;
  state.query = "";
  const tabs = WORKSPACE_TABS[workspace] || [];
  if (!tabs.some((tab) => tab.id === state.activeTab)) {
    state.activeTab = tabs[0] ? tabs[0].id : "detected";
  }
  render();
}

function setTab(tab) {
  const tabs = WORKSPACE_TABS[state.workspace] || [];
  if (!tabs.some((item) => item.id === tab)) return;
  state.activeTab = tab;
  render();
}

function openBooks() {
  state.libraryView = "books";
  state.query = "";
  render();
}

function openChapters() {
  state.libraryView = "chapters";
  state.query = "";
  render();
}

function openBook(name) {
  const book = BOOK_BY_KEY.get(String(name).toLowerCase());
  if (!book) return;
  state.libraryBook = book.name;
  state.libraryChapter = 1;
  state.libraryVerse = 1;
  state.libraryView = "chapters";
  state.query = "";
  state.scrollVerse = false;
  render();
}

function openChapter(number) {
  const book = BOOK_BY_KEY.get(state.libraryBook.toLowerCase()) || BOOKS[42];
  const chapter = Math.min(Math.max(1, Number(number) || 1), book.chapters);
  state.libraryChapter = chapter;
  state.libraryVerse = 1;
  state.libraryView = "verses";
  state.query = "";
  state.scrollVerse = true;
  render();
}

function stepChapter(direction) {
  const book = BOOK_BY_KEY.get(state.libraryBook.toLowerCase()) || BOOKS[42];
  const next = Math.min(Math.max(1, state.libraryChapter + direction), book.chapters);
  if (next === state.libraryChapter) return;
  state.libraryChapter = next;
  state.libraryVerse = 1;
  state.scrollVerse = state.libraryView === "verses";
  render();
}

function openJohn3() {
  state.workspace = "bible";
  state.libraryBook = "John";
  state.libraryChapter = 3;
  state.libraryVerse = 1;
  state.libraryView = "verses";
  state.query = "";
  state.scrollVerse = false;
  render();
}

function quickJump() {
  state.libraryView = "verses";
  state.query = "";
  state.scrollVerse = true;
  render();
}

function stageItem(item, message) {
  if (!item) return;
  state.preview = item;
  render();
  showToast(message || item.ref + " staged in Preview.");
}

function stageVerse(book, chapter, verse, options) {
  const opts = options || {};
  const text = verseText(book, chapter, verse);
  const ref = sourceVerseRef(book, chapter, verse);

  state.libraryBook = book;
  state.libraryChapter = chapter;
  state.libraryVerse = verse;

  if (!text) {
    state.workspace = "bible";
    state.libraryView = "verses";
    state.query = "";
    state.scrollVerse = true;
    render();
    showToast("Sample text is not bundled for " + ref + ".", "warn");
    return;
  }

  state.preview = verseItem(ref, text);
  if (opts.navigate) {
    state.workspace = "bible";
    state.libraryView = "verses";
    state.activeTab = "detected";
    state.query = "";
    state.scrollVerse = true;
  }
  render();
  if (!opts.silent) showToast(ref + " staged in Preview.");
}

function stageCue(cueId) {
  const cue = state.detected.concat(state.related).find((item) => item.id === cueId);
  if (!cue) return;
  stageItem(cueToItem(cue), cue.ref + " staged in Preview.");
}

function stageReference(ref) {
  const parsed = parseReference(ref);
  if (!parsed) return;
  const book = BOOK_BY_KEY.get(parsed.book.toLowerCase());
  if (!book) return;
  stageVerse(book.name, parsed.chapter, parsed.verse, { navigate: true });
}

function stageSong(songId, slideIndex) {
  const song = state.songs.find((item) => item.id === songId);
  if (!song) return;
  const index = Math.min(Math.max(0, Number(slideIndex) || 0), song.slides.length - 1);
  const item = {
    id: "song:" + song.id + ":" + index,
    kind: "song",
    songId: song.id,
    ref: song.title,
    slideLabel: song.title + " · Slide " + (index + 1),
    text: song.slides[index]
  };
  state.activeSongId = song.id;
  state.preview = item;
  if (state.workspace === "songs") state.activeTab = "slides";
  render();
  showToast(song.title + " · Slide " + (index + 1) + " staged in Preview.");
}

function stageNotice(noticeId) {
  const notice = state.notices.find((item) => item.id === noticeId);
  if (!notice) return;
  stageItem({
    id: "notice:" + notice.id,
    kind: "notice",
    noticeId: notice.id,
    ref: notice.title,
    slideLabel: notice.kicker + " · " + notice.when,
    text: notice.title + " — " + notice.copy
  });
}

function stageMedia(mediaId) {
  const item = state.media.find((entry) => entry.id === mediaId);
  if (!item) return;
  stageItem({
    id: "media:" + item.id,
    kind: "media",
    mediaId: item.id,
    ref: item.title,
    slideLabel: item.kind + " · " + item.duration,
    text: item.description
  });
}

function stagePad(padId) {
  const pad = state.pads.find((item) => item.id === padId);
  if (!pad) return;
  stageItem({
    id: "pad:" + pad.id,
    kind: "overlay",
    padId: pad.id,
    ref: pad.name,
    slideLabel: pad.kind + " · Overlay",
    text: pad.text
  });
}

function stageFirstSearchResult() {
  const query = queryText();
  if (state.workspace === "songs") {
    const song = filteredSongs()[0];
    if (!song) return showToast("No songs match “" + query + "”.", "warn");
    stageSong(song.id, 0);
    return;
  }
  if (state.workspace === "announcements") {
    const notice = filteredNotices()[0];
    if (!notice) return showToast("No announcements match “" + query + "”.", "warn");
    stageNotice(notice.id);
    return;
  }
  if (state.workspace === "media") {
    const media = filteredMedia()[0];
    if (!media) return showToast("No media matches “" + query + "”.", "warn");
    stageMedia(media.id);
    return;
  }
  if (state.workspace === "overlays") {
    const pad = filteredPads()[0];
    if (!pad) return showToast("No overlays match “" + query + "”.", "warn");
    stagePad(pad.id);
  }
}

function handleSearchEnter() {
  const query = queryText();
  if (!query) return;
  if (state.workspace !== "bible") {
    stageFirstSearchResult();
    return;
  }

  const parsed = parseReferenceQuery(query);
  if (!parsed) {
    if (state.libraryView === "chapters") {
      state.libraryView = "books";
      state.focusSearch = true;
      render();
    }
    return;
  }

  const book = parsed.book;
  if (parsed.chapter == null) {
    state.libraryBook = book.name;
    state.libraryChapter = 1;
    state.libraryView = "chapters";
    state.query = "";
    state.scrollVerse = false;
    render();
    return;
  }

  if (parsed.chapter < 1 || parsed.chapter > book.chapters) {
    showToast(book.name + " has " + book.chapters + " chapters.", "warn");
    return;
  }

  if (!chapterText(book.name, parsed.chapter)) {
    state.libraryBook = book.name;
    state.libraryChapter = parsed.chapter;
    state.libraryVerse = 1;
    state.libraryView = "verses";
    state.query = "";
    state.scrollVerse = true;
    render();
    showToast("Sample text is not bundled for " + book.name + " " + parsed.chapter + ".", "warn");
    return;
  }

  if (parsed.verse == null) {
    state.libraryBook = book.name;
    state.libraryChapter = parsed.chapter;
    state.libraryVerse = 1;
    state.libraryView = "verses";
    state.query = "";
    state.scrollVerse = true;
    render();
    return;
  }

  if (parsed.verse < 1) {
    showToast("That verse number is not valid.", "warn");
    return;
  }

  stageVerse(book.name, parsed.chapter, parsed.verse, { navigate: true });
}

function toggleAutoStage() {
  state.autoStage = !state.autoStage;
  let message = state.autoStage
    ? "Auto-stage on. New detections move to Preview."
    : "Auto-stage off. Detected references wait for you.";
  if (state.autoStage && !state.preview && !state.program && state.detected[0]) {
    state.preview = cueToItem(state.detected[0]);
    message = "Auto-stage on. " + state.detected[0].ref + " moved to Preview.";
  }
  render();
  showToast(message);
}

function takePreview() {
  if (!state.preview) {
    showToast("Nothing in Preview to take.", "warn");
    return;
  }
  closePopover();
  state.program = { ...state.preview };
  state.preview = null;
  state.clearArmed = false;
  clearTimeout(clearArmTimer);
  render();
  const onCount = state.displays.filter((display) => display.on).length;
  if (onCount) {
    showToast("“" + state.program.ref + "” is live on " + onCount + " display" + (onCount === 1 ? "" : "s") + ".", "live");
  } else {
    showToast("“" + state.program.ref + "” is on Program, but every display is off.", "warn");
  }
}

function clearProgram() {
  if (!state.program) {
    showToast("Program is already clear.", "warn");
    return;
  }
  if (!state.clearArmed) {
    state.clearArmed = true;
    render();
    showToast("Press clear again to remove Program.", "warn");
    clearTimeout(clearArmTimer);
    clearArmTimer = setTimeout(() => {
      if (!state.clearArmed) return;
      state.clearArmed = false;
      const button = document.querySelector(".clear");
      if (button) {
        button.classList.remove("is-armed");
        button.title = "Clear Program";
      }
    }, 3000);
    return;
  }
  state.program = null;
  state.clearArmed = false;
  clearTimeout(clearArmTimer);
  render();
  showToast("Program cleared. Preview was left untouched.", "warn");
}

function cancelPreview() {
  if (!state.preview) return;
  state.preview = null;
  render();
  showToast("Preview cleared. Program is untouched.", "warn");
}

function toggleDisplay(displayId) {
  const display = state.displays.find((item) => item.id === displayId);
  if (!display) return;
  display.on = !display.on;
  render();
  const onCount = state.displays.filter((item) => item.on).length;
  if (state.program && onCount === 0 && !display.on) {
    showToast(display.name + " off. Program is still live, but no displays are on.", "warn");
  } else {
    showToast(display.name + (display.on ? " on." : " off."));
  }
}

function toggleAllDisplays() {
  const anyOn = state.displays.some((display) => display.on);
  state.displays.forEach((display) => {
    display.on = !anyOn;
  });
  render();
  if (state.program && anyOn) {
    showToast("All displays off. Program is still live.", "warn");
  } else {
    showToast(anyOn ? "All displays off." : "All displays on.");
  }
}

function toggleSession() {
  if (state.timerRunning) {
    state.timerRunning = false;
    render();
    showToast("Sermon timer stopped at " + formatTimer(state.timerSeconds) + ".");
  } else {
    state.timerRunning = true;
    state.timerSeconds = 0;
    render();
    showToast("Sermon timer started.");
  }
}

function toggleTranscript() {
  if (state.transcript === "live") {
    state.transcript = "paused";
    render();
    showToast("Transcript paused.");
  } else {
    state.transcript = "live";
    render();
    showToast("Transcript listening.");
  }
}

function stopTranscript() {
  state.transcript = "stopped";
  render();
  showToast("Transcript stopped. You can start listening again from the transcript panel.", "warn");
}

function focusBibleSearch() {
  closePopover();
  if (state.workspace !== "bible") {
    state.workspace = "bible";
    state.activeTab = "detected";
    state.query = "";
    state.focusSearch = true;
    render();
    requestAnimationFrame(() => {
      const input = document.getElementById("lib-search");
      if (input) input.select();
    });
    return;
  }
  const input = document.getElementById("lib-search");
  if (input) {
    input.focus();
    input.select();
  }
}

function addReference() {
  state.workspace = "bible";
  state.activeTab = "detected";
  state.focusSearch = true;
  render();
}

function handleNotesInput(editor) {
  state.notesHtml = editor.innerHTML;
  markNotesChanged();
}

function markNotesChanged() {
  const words = wordCount(state.notesHtml);
  document.querySelectorAll("[data-notes-words]").forEach((element) => {
    element.textContent = words + " words";
  });
  state.notesSaveLabel = "Saving…";
  updateSavedLabels();
  clearTimeout(notesSaveTimer);
  notesSaveTimer = setTimeout(() => {
    state.notesSaveLabel = "Saved just now";
    updateSavedLabels();
  }, 650);
}

function updateSavedLabels() {
  document.querySelectorAll("[data-saved] > span").forEach((element) => {
    element.textContent = state.notesSaveLabel;
  });
}

function syncNotes(editor) {
  state.notesHtml = editor.innerHTML;
  markNotesChanged();
}

function applyNotesCommand(button) {
  const editor = document.querySelector("[data-notes-editor]");
  if (!editor) return;
  const command = button.getAttribute("data-notes-cmd");
  const value = button.getAttribute("data-value") || null;
  if (!command) return;
  editor.focus();
  try {
    document.execCommand(command, false, value);
  } catch (error) {
    showToast("That formatting command is unavailable in this preview.", "warn");
  }
  syncNotes(editor);
}

function activeVerseItem() {
  if (state.preview && state.preview.kind === "verse") return state.preview;
  const text = verseText(state.libraryBook, state.libraryChapter, state.libraryVerse);
  if (text) return verseItem(sourceVerseRef(state.libraryBook, state.libraryChapter, state.libraryVerse), text);
  const cue = state.detected[0];
  return cue ? cueToItem(cue) : null;
}

function placeCaretAtEnd(element) {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  const selection = window.getSelection();
  if (!selection) return;
  selection.removeAllRanges();
  selection.addRange(range);
}

function insertScripture() {
  const editor = document.querySelector("[data-notes-editor]");
  if (!editor) return;
  const item = activeVerseItem();
  if (!item) {
    showToast("Stage a verse first, then add it to your notes.", "warn");
    return;
  }
  const html = "<blockquote>“" + escapeHTML(item.text) + "” <span class=\"muted\">— " + escapeHTML(item.ref) + ", KJV</span></blockquote>";
  editor.focus();
  const before = editor.innerHTML;
  try {
    document.execCommand("insertHTML", false, html);
  } catch (error) {
    /* fall through to append */
  }
  if (editor.innerHTML === before) {
    editor.insertAdjacentHTML("beforeend", html);
    placeCaretAtEnd(editor);
  }
  syncNotes(editor);
  showToast(item.ref + " added to notes.");
}

function aiDraft() {
  const editor = document.querySelector("[data-notes-editor]");
  if (!editor) return;
  const refs = state.detected.slice(0, 3).map((cue) => cue.ref);
  const refList = refs.length ? refs.join(" · ") : "John 3:16 · Romans 8:28";
  const html = "<h4>Summary draft</h4>" +
    "<p><strong>Big idea:</strong> God's love moves toward us before we have anything to offer. The gift of the Son is the measure of that love.</p>" +
    "<ul>" +
    "<li>The measure of love — “so loved” (John 3:16)</li>" +
    "<li>The movement of grace — God gives first (Romans 8:32)</li>" +
    "<li>The response of faith — whoever believes (John 1:12)</li>" +
    "</ul>" +
    "<p class=\"muted\">Transcript references: " + escapeHTML(refList) + ".</p>";
  editor.focus();
  editor.insertAdjacentHTML("beforeend", html);
  placeCaretAtEnd(editor);
  syncNotes(editor);
  showToast("Draft summary added from the transcript.");
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
    return;
  }
  const request = document.documentElement.requestFullscreen();
  if (request && request.catch) {
    request.catch(() => showToast("Fullscreen is unavailable in this preview.", "warn"));
  }
}

function handleAction(element) {
  const action = element.getAttribute("data-action");
  if (!action) return;

  switch (action) {
    case "workspace":
      setWorkspace(element.getAttribute("data-workspace"));
      break;
    case "tab":
      setTab(element.getAttribute("data-tab"));
      break;
    case "translation":
      openPopover("translation", element);
      break;
    case "help":
      openPopover("help", element);
      break;
    case "set-translation":
      closePopover();
      showToast("KJV selected. This preview bundles KJV sample text.");
      break;
    case "fullscreen":
      toggleFullscreen();
      break;
    case "auto-stage":
      toggleAutoStage();
      break;
    case "add-reference":
      addReference();
      break;
    case "quick-jump":
      quickJump();
      break;
    case "library-books":
      openBooks();
      break;
    case "library-chapters":
      openChapters();
      break;
    case "library-book":
      openBook(element.getAttribute("data-book"));
      break;
    case "library-chapter":
      openChapter(element.getAttribute("data-chapter"));
      break;
    case "chapter-prev":
      stepChapter(-1);
      break;
    case "chapter-next":
      stepChapter(1);
      break;
    case "stage-verse":
      stageVerse(
        element.getAttribute("data-book"),
        Number(element.getAttribute("data-chapter")),
        Number(element.getAttribute("data-verse")),
        {}
      );
      break;
    case "stage-cue":
      stageCue(element.getAttribute("data-cue-id"));
      break;
    case "stage-ref":
      stageReference(element.getAttribute("data-ref"));
      break;
    case "stage-song":
      stageSong(element.getAttribute("data-song-id"), 0);
      break;
    case "stage-slide":
      stageSong(element.getAttribute("data-song-id"), Number(element.getAttribute("data-slide-index")));
      break;
    case "stage-notice":
      stageNotice(element.getAttribute("data-notice-id"));
      break;
    case "stage-media":
      stageMedia(element.getAttribute("data-media-id"));
      break;
    case "stage-pad":
      stagePad(element.getAttribute("data-pad-id"));
      break;
    case "clear-search":
      state.query = "";
      state.focusSearch = true;
      render();
      break;
    case "open-john":
      openJohn3();
      break;
    case "take":
      takePreview();
      break;
    case "clear-program":
      clearProgram();
      break;
    case "display-toggle":
      toggleDisplay(element.getAttribute("data-display-id"));
      break;
    case "toggle-all-displays":
      toggleAllDisplays();
      break;
    case "session-toggle":
      toggleSession();
      break;
    case "transcript-toggle":
      toggleTranscript();
      break;
    case "transcript-stop":
      stopTranscript();
      break;
    case "insert-scripture":
      insertScripture();
      break;
    case "ai-draft":
      aiDraft();
      break;
    default:
      break;
  }
}

function handleKeydown(event) {
  const target = event.target instanceof Element ? event.target : document.body;
  const typing = target.matches("input, textarea, select") || target.isContentEditable;

  if (event.key === "Escape") {
    if (state.popoverType) {
      closePopover();
      event.preventDefault();
      return;
    }
    if (state.clearArmed) {
      state.clearArmed = false;
      const button = document.querySelector(".clear");
      if (button) {
        button.classList.remove("is-armed");
        button.title = "Clear Program";
      }
      event.preventDefault();
      return;
    }
    if (state.preview) {
      event.preventDefault();
      cancelPreview();
      return;
    }
    if (typing && target.blur) target.blur();
    return;
  }

  if (typing) {
    if (target.id === "lib-search" && event.key === "Enter") {
      event.preventDefault();
      handleSearchEnter();
    }
    return;
  }

  if (event.key === "/") {
    event.preventDefault();
    focusBibleSearch();
    return;
  }

  if (event.key === "Enter") {
    if (target.closest(".cue")) {
      event.preventDefault();
      target.closest(".cue").click();
      return;
    }
    if (target.closest("button, a, [role=button]")) return;
    event.preventDefault();
    takePreview();
    return;
  }
}

function handleInput(event) {
  const target = event.target;
  if (target.id === "lib-search") {
    state.query = target.value;
    if (state.workspace === "bible" && state.libraryView === "chapters" && state.query.trim() && !parseReferenceQuery(state.query)) {
      state.libraryView = "books";
      state.focusSearch = true;
      render();
      return;
    }
    renderLibraryBody();
    return;
  }
  if (target.matches("[data-notes-editor]")) {
    handleNotesInput(target);
  }
}

function init() {
  document.addEventListener("click", (event) => {
    const notesCommand = event.target.closest("[data-notes-cmd]");
    if (notesCommand) {
      applyNotesCommand(notesCommand);
      return;
    }

    const actionElement = event.target.closest("[data-action]");
    if (actionElement) handleAction(actionElement);

    if (event.target.closest("#popover")) {
      closePopover();
    } else if (!event.target.closest('[data-action="translation"]') && !event.target.closest('[data-action="help"]')) {
      closePopover();
    }
  });

  document.addEventListener("mousedown", (event) => {
    if (event.target.closest("[data-notes-cmd], [data-action='insert-scripture'], [data-action='ai-draft']")) {
      event.preventDefault();
    }
  });

  document.addEventListener("input", handleInput);
  document.addEventListener("keydown", handleKeydown);
  window.addEventListener("resize", closePopover);

  setInterval(() => {
    if (!state.timerRunning) return;
    state.timerSeconds += 1;
    const time = document.querySelector(".session-time");
    if (time) time.textContent = formatTimer(state.timerSeconds);
  }, 1000);

  render();
}

init();
