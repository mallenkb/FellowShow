# FellowShow computer test report

Tested on 2 November 2026, approximately 20:45 to 20:58 in the Africa/Accra time zone. The native QA app was built from the checkout at 20:45 with bundle identifier `com.openbezal.fellowshow.computer-qa` and a separate settings profile. Some source files changed after that build, so these results describe the tested build, not necessarily every later change in the checkout.

The test used Computer for app interaction. The app's debug build still reads the repository's Bible database, so the test did not install or delete translations. It did not unlock or change saved credentials. Test songs, notes, overlays and settings were kept in the separate QA profile.

## Findings

### Clearing sermon scriptures had no tested way back

**Observed:** Add John 3:16 and John 3:17 to the scripture queue, then choose **Clear sermon scriptures**. Both disappear immediately without a confirmation. Command-Z did not restore them, and no visible undo control was offered.

The verses could be added again individually, but the tested flow offered no single action to restore the cleared list. The clear action removes queued scripture and dismisses detected references in [sermon-scriptures-panel.tsx](../../src/components/panels/sermon-scriptures-panel.tsx).

### The Bible empty state misidentifies an installed translation

**Observed:** In the fresh QA profile, the Bible workspace said **No Scripture downloaded**. Settings showed KJV as **Shown**, which the interface uses for an installed translation. Selecting its unselected default radio button immediately opened the KJV book grid. John 3:16 could then be previewed and queued.

At the time of the first pass, the prompt also appeared when no default translation was selected. Its download instruction did not describe that situation. See [scripture-download-prompt.tsx](../../src/components/panels/scripture-download-prompt.tsx) and [use-scripture-search.ts](../../src/components/panels/search/use-scripture-search.ts).

### Correction: PDF import worked on retest

The first pass reported that Open remained disabled for `e2e-two-pages.pdf`. That observation was misleading. On retest, the native picker was in the background; after bringing it forward and actually selecting the PDF, Open became enabled.

The PDF then imported successfully, reported two pages, and both pages rendered. The picker is configured in [use-presentation-import.ts](../../src/components/panels/search/use-presentation-import.ts).

### Going live can start Program output automatically

**Observed:** After the laptop screen had been assigned, sending a note to Live automatically turned Program on without a separate click on the output switch. Program was turned off immediately. The code intentionally starts a suitable Program output when content goes live, as described in [program-output-autostart.ts](../../src/lib/program-output-autostart.ts).

This is current behavior rather than a confirmed defect. Operators should know that Show on Live can start a configured display.

## Coverage

| Area | Result |
| --- | --- |
| Songs | Search and selection worked. A song was prepared, a new draft was canceled, and a disposable song was saved and reopened for editing. Internal Live was turned on and off. |
| Bible | After selecting the installed KJV as default, the John book grid, chapter 3, verse 16, Preview and the scripture queue worked. Clearing the queue is covered in the findings. |
| Notes | A disposable set and note were created. Text entry, Preview and internal Live were exercised. |
| Overlays | DSK and CMK controls were switched. A lower third was saved to Preview; an edit was canceled and the saved name remained unchanged. |
| Media | The native picker opened and canceled. A PNG imported and its four colored quadrants rendered in the editor. On retest, a PDF imported and both pages rendered. |
| Settings | Audio, Speech Recognition, AI Model Provider, Scriptures, Display Mode, Workspace, Appearance, Remote Control, Updates and Help were opened. Appearance was changed from Dark to Light and back. Timer was enabled in Workspace. Credentials were not unlocked. |
| Timer | A 30-second timer started, paused at 27 seconds and reset to 30 seconds. |
| Displays | Screen assignment, disconnect and removal cancellation were exercised. Program reported ON and OFF. The internal feed was OFF AIR at the end. |

## Fix retest

A later fresh-profile native build showed **Choose a Bible version** when KJV was installed but no default was selected. Selecting KJV opened the Bible grid. Clearing John 3:16 and 3:17 then using the new Undo button restored both; a second clear followed by Command-Z also restored both.

The two-page PDF imported and both pages rendered in that build. The original PDF-picker finding was a test error, as explained above. The JavaScript suite passed 753 tests after the changes, and type checking and lint passed.

Projection was retested in the actual General broadcast window. With the test app's loopback-only HTTP control, Hide produced a black window, Show displayed the orange PDF page 2 with its expected text and marker, and a second Hide returned the window to black. Computer captured the General window itself, rather than the operator thumbnail. The QA process and its loopback listener were closed afterward. An external display was not tested.

## Projection and performance limits

In the first pass, Program reported ON and the operator's output thumbnail showed the selected song, but Computer could not capture the separate fullscreen projector window. The later General-window retest above verified one PDF page and the black hidden state. It did not verify changing directly between live pages or the signal on an external screen.

As a separate non-UI test, two native NDI tests passed with an isolated loopback-only configuration. They checked 720p frames at 24, 30 and 60 fps with three alpha modes, and confirmed that stopping one output did not stop a second output. This does not verify a physical display or an external NDI receiver.

Native performance was not benchmarked. In the earlier headless browser pass, 30 warm workspace changes took a median of 33.4 ms and a p95 of 49.9 ms through two animation frames. Those are browser observations, not native-app timings.

One immediate Computer type-and-save sequence saved a shortened lyric once. A subsequent complete entry saved correctly. The test did not establish whether the app or input delivery caused the first result, so it remains inconclusive.

## Not covered

Real microphone capture, transcription, paid AI providers, external displays and external NDI destinations were not verified. Computer intermittently reported ScreenCaptureKit or window-targeting errors. Those tool errors are not themselves evidence of an app defect.

The QA process was terminated after its outputs were last observed off. The final screen assignment was not independently checked, and the ordinary app-close flow was not verified. A separate development process was left untouched.
