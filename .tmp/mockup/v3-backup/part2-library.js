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
