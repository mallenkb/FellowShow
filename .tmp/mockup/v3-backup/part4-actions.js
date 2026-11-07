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
