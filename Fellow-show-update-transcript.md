# FellowShow Update Discussion

**Recording:** `Fellow show update.m4a`
**Duration:** 5 minutes 41 seconds
**Transcription model:** Whisper Large V3, run locally with MLX

> The transcript has been lightly cleaned for punctuation, repeated filler, and obvious recognition errors. Speaker labels are inferred. A few unclear passages are identified rather than guessed.

## Summary

- **Add a dedicated Announcements tab.**
  - It should work as a basic rich-text editor in which an operator can enter one or more announcements.
  - Multiple announcements could be entered as a numbered list and formatted automatically.
  - The tab should have its own announcement theme, including an “Announcements” heading.
  - Entered text should automatically appear in the correct announcement layout.

- **Add an On Display tab for managing overlays.**
  - This tab would centralize graphics that appear above the live video or other primary content.
  - Its initial overlay types should include a logo, scrolling or marquee text, and lower thirds.
  - Each overlay should work independently and be controllable without interrupting the content underneath it.

- **Support scrolling or marquee text.**
  - An operator should be able to select the scrolling-text tool, enter a message, and create the overlay.
  - Selecting, checking, or double-clicking the resulting item should load it onto the live video.
  - One practical example discussed was displaying a notice during preaching when someone’s car needs to be moved.
  - Scrolling text should stay active until the operator turns it off manually.
  - The overlay should remain separate from the underlying content and potentially be usable on another display.

- **Provide a persistent logo overlay.**
  - The On Display tab should contain a switch for showing or hiding the logo.
  - Turning the switch on should immediately place the logo over the output.
  - The logo should stay visible until manually turned off.

- **Create themed lower thirds.**
  - The lower-third section should offer themes suited to different types of information.
  - A preacher theme could request fields such as the preacher’s name, sermon title, assembly, or district.
  - After the operator fills in the fields, FellowShow should generate the graphic using the selected theme.
  - Different overlay sections could each have their own theme and input fields.

- **Give lower thirds an automatic display duration.**
  - Unlike logos and scrolling text, lower thirds should automatically disappear so operators do not have to remember to turn them off.
  - A suggested animation was a two-second fade-in, ten seconds fully visible, and a two-second fade-out.
  - The overall visible duration could potentially be configurable between roughly 10 and 30 seconds.

- **Treat overlays as a master layer.**
  - Active overlays should remain above any video, scripture, song, presentation, or other content shown underneath them.
  - Operators should be able to edit or change the underlying content while an enabled overlay remains visible.
  - The existing preview feature could show the final combined result before or during broadcast.

- **Decide whether the overlay tools should remain inside FellowShow.**
  - A concern was raised that FellowShow already contains many capabilities and could become overcrowded.
  - The alternative would be to build the overlay tools as a separate application.
  - The preview and master-layer design were discussed as reasons the overlays could still be incorporated successfully into FellowShow.

- **Rename the Scriptures tab to Sermon.**
  - The existing Scriptures area should become the Sermon section.
  - The Songs section is already organized by title and does not require the same change.

- **Add a Related tab.**
  - It should surface related songs and related scriptures.
  - This would help operators find supporting material connected to the current sermon or service content.

- **Add document and presentation support.**
  - The Presentation section should support Word documents, PowerPoint files, and potentially other document types.
  - Documents should be displayed as pages or slides with clickable page navigation.
  - Operators should be able to scroll vertically, zoom in and out, and click-drag to pan around a document.
  - Left and right arrow keys should navigate between pages or slides.

- **Refine the proposed interface layout.**
  - The editing controls should be positioned at the top of the middle section.
  - The On Display section would be the last main tab in the proposed layout for the current development phase.

## Transcript

- **[00:00] Speaker 1:** At the top, we’ll have the On Display tab.
- **[00:04] Speaker 1:** First of all, we’ll have one tab for announcements.
- **[00:07] Speaker 2:** Yes, one tab for announcements.
- **[00:08] Speaker 1:** Announcements will just be an editor—just announcements. You put whatever you want there.
- **[00:12] Speaker 2:** Yes. You type and press Enter. [A short phrase about how the item appears is unclear.] You can format it however you want.
- **[00:18] Speaker 1:** If you have two announcements, type them as one and two, and then it automatically formats them.
- **[00:23] Speaker 2:** So, a basic rich-text editor.
- **[00:25] Speaker 1:** Yes, and it is automatically formatted as an announcement.
- **[00:29] Speaker 1:** It has its own theme. The announcement tab will have a theme with an “Announcements” title.
- **[00:34] Speaker 2:** Yes. When we type, it automatically appears there.
- **[00:37] Speaker 1:** Fine. Another tab is On Display.
- **[00:39] Speaker 1:** On Display will be for scrolling text—a marquee scroll. We’ll have a tool for scrolling text.
- **[00:47] Speaker 2:** What would you use it for?
- **[00:48] Speaker 1:** It would work during preaching. For example, sometimes someone has a car that needs to be moved. We may want that as scrolling text.
- **[00:59] Speaker 2:** Yes.
- **[00:59] Speaker 1:** Let’s say we open the On Display tab and click Scrolling Text.
- **[01:07] Speaker 1:** I type the scrolling text and finish. It forms the scrolling text from what I typed.
- **[01:13] Speaker 1:** When I check it on or double-click it, it automatically loads down there.
- **[01:21] Speaker 2:** On the live video?
- **[01:23] Speaker 1:** Yes, on the live video.
- **[01:24] Speaker 1:** It can remain as a separate item so that we can add it to another display—just that one item scrolling along the bottom.
- **[01:37] Speaker 2:** Yes, because these are two different things.
- **[01:40] Speaker 1:** The scrolling text, or marquee, should be something we can overlay.
- **[01:44] Speaker 2:** Yes, overlay it on the video.
- **[01:49] Speaker 1:** That tab is like an overlay tab. On Display is an overlay tab.
- **[01:55] Speaker 1:** We can put a logo there, and we can create a lower third.
- **[01:58] Speaker 1:** If I go to the lower-third section, there are themes available.
- **[02:01] Speaker 2:** You can also turn the logo on or off.
- **[02:05] Speaker 1:** Maybe I select a preacher theme. It could ask for the preacher’s name and sermon.
- **[02:14] Speaker 2:** The preacher’s name, sermon, or district—there could be different options.
- **[02:18] Speaker 1:** If I fill in those options—perhaps “Elder Sammy,” “English Assembly,” or where the person comes from—I type it and press Enter.
- **[02:25] Speaker 1:** It forms the graphic and uses that theme.
- **[02:31] Speaker 2:** Every section has its own theme. We select the theme, and it appears as a small graphic that we can overlay.
- **[02:39] Speakers 1 and 2:** They clarify the terminology: the preacher-information graphic is a lower third, while the moving message is scrolling or marquee text.
- **[02:50] Speaker 1:** So, we’ll have an On Display tab.
- **[02:53] Speaker 2:** On Display can have a logo.
- **[02:57] Speaker 1:** Basically, it can have overlays on top of the screen.
- **[03:01] Speaker 2:** What would help is having switches.
- **[03:04] Speaker 2:** You can turn on the logo. When the logo switch is on, the logo is on.
- **[03:09] Speaker 2:** When you switch scrolling text on, the text you entered will start scrolling.
- **[03:14] Speaker 2:** When you switch the lower third on, it appears. If you don’t want it, you toggle it off.
- **[03:23] Speaker 1:** The lower third could have a default duration—maybe a two-second fade-in, ten seconds on screen, and a two-second fade-out.
- **[03:37] Speaker 1:** That way, we don’t always have to remember to turn it off.
- **[03:42] Speaker 2:** Yes, but we would need to remember to turn scrolling text off. Scrolling text and the logo would be turned off manually.
- **[03:48] Speaker 1:** A lower third would probably show for a few seconds—maybe 10 to 15 seconds, or up to 30 seconds—and then disappear.
- **[03:55] Speaker 1:** I’m trying to decide whether we should incorporate this into FellowShow or build another application.
- **[04:01] Speaker 1:** The reason is that FellowShow already has a lot of things in it.
- **[04:07] Speaker 2:** If that’s the case, that’s why I added the preview. If FellowShow has a switch, the overlay can become a built-in layer over whatever else we do.
- **[04:18] Speaker 1:** So, it would be like the master layer.
- **[04:21] Speaker 2:** Once it is on, we can make any edits we want behind it, and the overlay will remain on.
- **[04:28] Speaker 2:** That’s why it is a toggle. When you toggle it on, it automatically appears on the display.
- **[04:33] Speaker 1:** Yes, exactly. That’s the last one.
- **[04:36] Speaker 1:** Scriptures will be renamed Sermon.
- **[04:40] Speaker 2:** Yes, rename Scriptures to Sermon.
- **[04:42] Speaker 1:** Songs are already organized by title.
- **[04:45] Speaker 1:** We’ll also have another tab for Related content.
- **[04:49] Speakers 1 and 2:** Related songs and related scriptures.
- **[04:55] Speaker 1:** Then there is Presentation. Presentation will support Word files and similar documents.
- **[04:59] Speaker 2:** In the document view, you should be able to control scrolling and zoom in or out.
- **[05:07] Speaker 1:** Normal scrolling should move up and down. A middle click or click-and-drag interaction should let you move around the document.
- **[05:15] Speaker 1:** If it is a Word file, PowerPoint, or another document, it should display as pages.
- **[05:21] Speaker 2:** The pages should appear below so you can click them to move to the next page.
- **[05:26] Speaker 1:** You should also be able to use the left and right arrow keys for the previous and next pages.
- **[05:30] Speaker 1:** The Edit tab should be at the top of the middle section.
- **[05:33] Speaker 1:** That’s it. On Display will be the last main tab.
- **[05:37] Speaker 2:** Okay. For now, that will work.
