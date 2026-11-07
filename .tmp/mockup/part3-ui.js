function tabCount(tabId) {
  switch (tabId) {
    case "detected": return state.detected.length;
    case "related": return state.related.length;
    case "setlist": return state.songs.length;
    case "slides": {
      const song = state.songs.find((item) => item.id === state.activeSongId) || state.songs[0];
      return song ? song.slides.length : 0;
    }
    case "outline": return NOTES_SECTIONS.length;
    case "announcements": return state.notices.length;
    case "notices": return state.notices.length;
    case "media": return state.media.length;
    case "pads": return state.pads.length;
    default: return null;
  }
}

function workbenchActionsHTML() {
  let html = "";
  if (state.workspace === "bible") {
    html += '<button type="button" class="mini-toggle" data-action="auto-stage" title="Stage detected references automatically">' +
      '<span class="switch" aria-checked="' + String(state.autoStage) + '" aria-hidden="true"></span><span>Auto-stage</span>' +
      "</button>";
    html += '<button type="button" class="wb-add" data-action="add-reference" title="Jump to a Bible reference">' + icon("plus", 11) + "Add</button>";
  }
  if (state.workspace === "overlays") {
    html += '<button type="button" class="wb-add" data-action="toggle-overlays" title="Show or hide all DSK overlays">' +
      icon(state.overlayEnabled ? "eye" : "eyeOff", 11) + (state.overlayEnabled ? "Hide DSK" : "Show DSK") + "</button>";
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

function notesToolbarHTML() {
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

  return '<div class="notes-toolbar">' + toolbar +
    '<span class="toolbar-rule"></span>' +
    '<button type="button" class="notes-tool" data-action="insert-scripture" title="Insert the previewed verse" aria-label="Insert the previewed verse">' + icon("bookmark", 12) + "</button>" +
    "</div>";
}

function notesPanelHTML() {
  return '<section class="panel notes-panel">' +
    '<div class="np-head"><div class="np-title">Sermon notes <span class="np-sub">John 3:16 · Sunday AM</span></div>' +
    '<div class="np-actions"><span class="wb-saved" data-saved>' + icon("check", 11) + "<span>" + escapeHTML(state.notesSaveLabel) + "</span></span>" +
    '<button type="button" class="notes-ai" data-action="ai-draft">' + icon("sparkle", 11) + "Draft summary</button></div></div>" +
    notesToolbarHTML() +
    '<div class="notes-editor np-editor" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Sermon notes" spellcheck="true" data-notes-editor>' + state.notesHtml + "</div>" +
    '<div class="np-foot"><span>Autosaved in this mockup</span><span data-notes-words>' + wordCount(state.notesHtml) + " words</span></div>" +
    "</section>";
}

function notesOverviewHTML() {
  const sections = NOTES_SECTIONS.map((section, index) => {
    const active = state.noteSection === section.id;
    return '<button type="button" class="outline-row' + (active ? " is-active" : "") + '" data-action="note-section" data-section="' + escapeHTML(section.id) + '">' +
      '<span class="outline-num">' + String(index + 1).padStart(2, "0") + "</span>" +
      '<span class="outline-main"><span class="outline-title">' + escapeHTML(section.title) + '</span><span class="outline-sub">' + escapeHTML(section.sub) + "</span></span>" +
      "</button>";
  }).join("");

  return '<div class="note-overview">' +
    '<div class="note-kicker">Current note</div>' +
    '<div class="note-title">The Love That Moves Toward Us</div>' +
    '<div class="note-sub">Sunday AM · John 3:16 · KJV</div>' +
    '<div class="note-stats"><span>' + wordCount(state.notesHtml) + ' words</span><span>' + NOTES_SECTIONS.length + ' sections</span><span class="note-saved">Autosaved</span></div>' +
    '<div class="note-tags"><span>Grace</span><span>John 3</span><span>Communion</span></div>' +
    '<div class="note-actions"><button type="button" data-action="ai-draft">' + icon("sparkle", 11) + 'Draft summary</button><button type="button" data-action="copy-notes">' + icon("list", 11) + "Copy notes</button></div>" +
    '<div class="outline-head"><span class="eyebrow">Note outline</span><span class="outline-hint">Jump to section</span></div>' +
    '<div class="outline-list">' + sections + "</div>" +
    "</div>";
}

function padArtHTML(pad) {
  if (pad.kind === "Logo") return '<span class="pad-art-logo">F</span>';
  if (pad.kind === "Countdown") return '<span class="pad-art-time">5:00</span>';
  if (pad.kind === "Ticker") return '<span class="pad-art-ticker">GIVE · CONNECT · SERVE</span>';
  if (pad.kind === "Banner") return '<span class="pad-art-banner">WELCOME</span>';
  if (pad.kind === "Scripture ref") return '<span class="pad-art-ref">John 3:16</span>';
  return '<span class="pad-art-bar"></span><span class="pad-art-copy"><i></i><i></i></span>';
}

function dockPadHTML(pad) {
  const live = state.overlayProgram === pad.id;
  const staged = state.overlayPreview === pad.id;
  return '<button type="button" class="dock-pad' + (staged ? " is-staged" : "") + (live ? " is-live" : "") + '" data-action="preview-pad" data-pad-id="' + escapeHTML(pad.id) + '" aria-pressed="' + String(staged || live) + '">' +
    '<span class="dock-pad-art">' + padArtHTML(pad) + "</span>" +
    '<span class="dock-pad-main"><span class="dock-pad-kind">' + escapeHTML(pad.kind) + '</span><span class="dock-pad-name">' + escapeHTML(pad.name) + '</span><span class="dock-pad-detail">' + escapeHTML(pad.detail) + "</span></span>" +
    (live ? '<span class="dock-pad-badge is-live">Live</span>' : staged ? '<span class="dock-pad-badge">Preview</span>' : "") +
    "</button>";
}

function overlayDockHTML() {
  const liveCount = state.overlayProgram ? 1 : 0;
  const selected = padById(state.overlayProgram) || padById(state.overlayPreview);
  return '<section class="panel overlay-dock">' +
    '<div class="dock-head"><div class="dock-title">Overlay pads <span class="dock-sub">DSK graphics</span></div>' +
    '<div class="dock-actions"><span class="dock-count">' + liveCount + " live</span>" +
    '<button type="button" class="icon-btn" data-action="toggle-overlays" title="' + (state.overlayEnabled ? "Hide overlays" : "Show overlays") + '" aria-label="' + (state.overlayEnabled ? "Hide overlays" : "Show overlays") + '">' + icon(state.overlayEnabled ? "eye" : "eyeOff", 13) + "</button>" +
    '<button type="button" class="dock-manage" data-action="manage-overlays">Manage</button></div></div>' +
    '<div class="dock-body"><div class="dock-grid">' + state.pads.map(dockPadHTML).join("") + "</div></div>" +
    '<div class="dock-foot"><span>' + (selected ? escapeHTML(selected.kind) + " selected" : "Select an overlay to preview") + "</span>" +
    '<button type="button" class="dock-show' + (state.overlayProgram ? " is-live" : "") + '" data-action="show-overlay"' + (state.overlayPreview || state.overlayProgram ? "" : " disabled") + ">" +
    (state.overlayProgram ? "Hide overlay" : "Show on live") + "</button></div>" +
    "</section>";
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
    const live = state.overlayProgram === pad.id;
    const staged = state.overlayPreview === pad.id;
    const active = live || staged;
    const status = live ? "On program" : staged ? "In preview" : pad.detail;
    return '<button type="button" class="pad' + (active ? " is-on" : "") + '" data-action="preview-pad" data-pad-id="' + escapeHTML(pad.id) + '">' +
      '<span class="pad-top"><span class="pad-kind">' + escapeHTML(pad.kind) + '</span><span class="pad-dot"></span></span>' +
      '<span class="pad-name">' + escapeHTML(pad.name) + "</span>" +
      '<span class="pad-thumb"><span></span><span></span></span>' +
      '<span class="pad-detail">' + escapeHTML(status) + "</span>" +
      "</button>";
  }).join("") + "</div>";
}

function workbenchBodyHTML() {
  switch (state.activeTab) {
    case "related": return cueListHTML(state.related, "related");
    case "outline": return notesOverviewHTML();
    case "announcements": return noticesHTML();
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
    case "outline":
      left = "Click a section to jump to it below";
      right = NOTES_SECTIONS.length + " sections";
      break;
    case "announcements":
      left = "Click an announcement to stage it";
      right = state.notices.length + " notices";
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
      left = "Select an overlay to preview it";
      right = state.overlayProgram ? "1 live" : state.overlayPreview ? "1 in preview" : state.pads.length + " graphics";
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

  return '<section class="panel workbench context">' +
    '<div class="wb-head"><div class="wb-tabs" role="tablist" aria-label="' + escapeHTML(libraryTitle()) + ' panel">' + tabButtons + "</div>" +
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

function overlayLayerHTML(pad) {
  const kind = pad.kind.toLowerCase();
  const text = escapeHTML(pad.text || "");
  if (kind === "logo") {
    return '<div class="dsk-layer dsk-logo"><span class="dsk-logo-mark">F</span><span class="dsk-logo-word">' + text + "</span></div>";
  }
  if (kind === "countdown") {
    const time = escapeHTML(String(pad.text || "").replace(/^Service begins in\s*/i, ""));
    return '<div class="dsk-layer dsk-countdown"><span class="dsk-kicker">Service begins in</span><span class="dsk-count">' + time + "</span></div>";
  }
  if (kind === "ticker") {
    return '<div class="dsk-layer dsk-ticker"><span>' + text + '</span><span>' + text + "</span></div>";
  }
  if (kind === "banner") {
    return '<div class="dsk-layer dsk-banner"><span class="dsk-banner-dot"></span><span>' + text + "</span></div>";
  }
  if (kind === "scripture ref") {
    return '<div class="dsk-layer dsk-scripture"><span class="dsk-ref">' + text + '</span><span class="dsk-version">KJV</span></div>';
  }
  return '<div class="dsk-layer dsk-lower"><span class="dsk-bar"></span><span class="dsk-copy"><span class="dsk-kicker">' + escapeHTML(pad.kind) + '</span><span class="dsk-title">' + text + "</span></span></div>";
}

function blankScreenHTML(mode) {
  return '<div class="screen' + (mode === "program" ? " is-live" : " is-preview") + ' is-blank-screen"><div class="slide is-blank"></div></div>';
}

function slideScreenHTML(item, mode, overlayId) {
  const overlayPad = overlayId ? padById(overlayId) : null;
  const activeOverlay = state.overlayEnabled ? overlayPad : null;
  const bottomOverlay = !!activeOverlay && (activeOverlay.kind === "Lower third" || activeOverlay.kind === "Ticker");
  if (!item && !activeOverlay) return emptyScreenHTML(mode);
  const kindClass = item && item.kind === "song"
    ? " is-song"
    : item && (item.kind === "notice" || item.kind === "overlay")
      ? " is-notice"
      : item && item.kind === "media"
        ? " is-media"
        : "";
  const base = item
    ? '<div class="slide' + kindClass + '">' +
      (mode === "program" ? '<span class="slide-live"><span class="dot"></span>ON AIR</span>' : "") +
      '<div class="slide-ref">' + escapeHTML(item.slideLabel || item.ref) + "</div>" +
      '<div class="slide-text">' + escapeHTML(item.text || "") + "</div>" +
      "</div>"
    : '<div class="slide is-blank"></div>';
  return '<div class="screen' + (mode === "program" ? " is-live" : " is-preview") + (activeOverlay ? " has-dsk" : "") + (bottomOverlay ? " has-bottom-dsk" : "") + '">' + base +
    (activeOverlay ? overlayLayerHTML(activeOverlay) : "") + "</div>";
}

function takeDockHTML() {
  const hasPreview = !!state.preview || !!state.overlayPreview;
  const hasProgram = !!state.program || !!state.overlayProgram;
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
      const detail = on ? (state.program || state.overlayProgram ? "Program · 1080p" : "Standby · 1080p") : "Off · 1080p";
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
  const livePad = padById(state.overlayProgram);
  const stagedPad = padById(state.overlayPreview);
  const hasProgram = !!state.program || !!livePad;
  const hasPreview = !!state.preview || !!stagedPad;

  const programBase = state.program ? state.program.ref : "";
  const previewBase = state.preview ? state.preview.ref : "";
  const programLabel = programBase && livePad
    ? programBase + " + DSK"
    : programBase || (livePad ? "Overlay · " + livePad.name : "Program clear");
  const previewLabel = previewBase && stagedPad
    ? previewBase + " + overlay"
    : previewBase || (stagedPad ? "Overlay · " + stagedPad.name : "Preview clear");

  const programMeta = '<span class="meta-ref">' + escapeHTML(programLabel) + '</span><span class="meta-route' + (onCount && hasProgram ? "" : " is-muted") + '"><span class="dot"></span>' + (hasProgram ? onCount + " display" + (onCount === 1 ? "" : "s") : "0 displays") + "</span>";
  const previewMeta = '<span class="meta-ref">' + escapeHTML(previewLabel) + '</span><span class="meta-route' + (hasPreview ? "" : " is-muted") + '"><span class="dot"></span>' + (hasPreview ? "Ready to take" : "Nothing staged") + "</span>";

  return '<aside class="panel outputs">' +
    '<div class="out-head"><div class="out-title">Output <span class="out-count">NDI · 1080p60</span></div></div>' +
    '<div class="out-body">' +
    '<div class="monitor-block"><div class="monitor-label"><span class="eyebrow">Program</span>' +
    '<span class="monitor-tags">' + (livePad ? '<span class="dsk-chip' + (state.overlayEnabled ? " is-on" : "") + '">DSK</span>' : "") + statusPill(hasProgram ? "Live" : "Off air", hasProgram ? "live" : "") + "</span></div>" +
    slideScreenHTML(state.program, "program", state.overlayProgram) +
    '<div class="monitor-meta">' + programMeta + "</div></div>" +
    takeDockHTML() +
    '<div class="monitor-block"><div class="monitor-label"><span class="eyebrow">Preview</span>' +
    '<span class="monitor-tags">' + (stagedPad ? '<span class="dsk-chip">Overlay</span>' : "") + statusPill(hasPreview ? "Staged" : "Empty", hasPreview ? "next" : "") + "</span></div>" +
    slideScreenHTML(state.preview, "preview", state.overlayPreview) +
    '<div class="monitor-meta">' + previewMeta + "</div></div>" +
    displaysHTML() +
    "</div>" +
    '<div class="out-foot"><span class="hint"><kbd>Esc</kbd> cancels preview</span><span class="foot-side">' + (hasProgram ? "Clear needs 2 clicks" : "Program clear") + "</span></div>" +
    "</aside>";
}

function topbarHTML() {
  const onCount = state.displays.filter((display) => display.on).length;
  const onAir = !!(state.program || state.overlayProgram);
  const airClass = onAir ? (onCount ? " is-live" : " is-warn") : "";
  const airText = onAir ? (onCount ? "Live" : "No displays") : "Off air";

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

function attachSplitter(splitterId, targetSelector, cssVar, stateKey, min, max) {
  const splitter = document.getElementById(splitterId);
  const target = document.querySelector(targetSelector);
  if (!splitter || !target) return;

  splitter.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const rect = target.getBoundingClientRect();
    const startY = event.clientY;
    const startValue = state[stateKey];
    splitter.classList.add("is-dragging");
    target.classList.add("is-resizing");
    if (splitter.setPointerCapture) splitter.setPointerCapture(event.pointerId);

    const move = (moveEvent) => {
      const next = Math.max(min, Math.min(max, startValue + ((moveEvent.clientY - startY) / rect.height) * 100));
      state[stateKey] = next;
      target.style.setProperty(cssVar, next + "%");
    };
    const end = () => {
      splitter.classList.remove("is-dragging");
      target.classList.remove("is-resizing");
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
    state[stateKey] = Math.max(min, Math.min(max, state[stateKey] + direction * 3));
    target.style.setProperty(cssVar, state[stateKey] + "%");
  });
}

function afterRender() {
  const transcriptBody = document.querySelector(".t-body");
  if (transcriptBody) transcriptBody.scrollTop = transcriptBody.scrollHeight;
  attachSplitter("splitter", ".center", "--tr", "splitPct", 30, 66);
  attachSplitter("rail-splitter", ".rail", "--ctx", "railSplitPct", 32, 64);

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
    overlayDockHTML() +
    "</div>" +
    '<div class="rail" style="--ctx:' + state.railSplitPct + '%">' +
    workbenchHTML() +
    '<div class="split" id="rail-splitter" role="separator" aria-orientation="horizontal" aria-label="Resize notes" tabindex="0"></div>' +
    notesPanelHTML() +
    "</div>" +
    outputsHTML() +
    "</main>";
  afterRender();
}

function renderLibraryBody() {
  const body = document.querySelector(".lib-body");
  if (body) body.innerHTML = libraryBodyHTML();
}
