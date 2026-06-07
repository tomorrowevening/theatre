# Theatre.js changelog

## 1.0.28

* New features
  * `theatre-sync` added — remotely control Theatre via WebSocket or BroadcastChannel transport
  * `SyncClient` supports bidirectional state sync between a host and remote clients
  * WebSocket server (`theatre/sync/server`) for cross-device synchronization

## 1.0.27

* Improvements
  * Migrated `styled-components` from v5 to v6
  * Style constants extracted for easier theming
  * TypeScript build error fixes in DopeSheet and Graph Editor

## 1.0.26

* Improvements
  * ESM build (`dist/index.mjs`) added for `theatre-core` and `theatre-studio`
  * `exports` and `module` fields added to package manifests for proper ESM resolution
  * Fixes Bun bundler compatibility — `import studio from '@tomorrowevening/theatre-studio'` now resolves the native ESM file, bypassing `__esModule` interop issues

## 1.0.25

* Bug fixes
  * Audio track colors now stored to localStorage
  * Fixed drag & drop of audio files into the Sequence Editor

## 1.0.24

* New features
  * Extended audio support: multi-track audio example added
  * Audio tracks can be saved to JSON with labels

## 1.0.23

* New features
  * Audio tracks now support multiple attachments with an editor view
  * Audio visualized inside the Sequence Editor
  * Audio start time configurable
  * Audio tracks are orderable

## 1.0.22

* New features
  * Object reordering in the editor
  * Extension panes support optional size and position

## 1.0.21

* Bug fixes
  * TypeScript linting fixes
  * Grid line opacity corrected
  * Analysis value clamping fixed
* Improvements
  * Data panel renamed with minor aesthetic changes

## 1.0.20 (feat/editor-updates)

* New features
  * Object reordering added to the outline panel
  * Extension panes now support optional size and position

## 1.0.19

* New features
  * Sequence popup added to the Sequence Editor
  * Easy keyframe copy/paste
* Bug fixes
  * SequenceEditor splitter drag clamped to valid range
  * Scrolling performance improved
  * Randomize color fixed on track bar
  * Fixed dragging behaviour in collapsed state

## 1.0.18

* Bug fixes
  * Sequence Editor resize improvements (resizable left panel fixes)

## 1.0.17

* Bug fixes
  * Sequence Editor left panel is now resizable
  * Left collapsed scroll margin added

## 1.0.16

* Bug fixes
  * Internal logging removed and replaced with correct logic

## 1.0.15

* New features
  * Subsequences added to sequences
  * DopeSheet context menu added
* Bug fixes
  * DetailsPanel removed from Sequence Editor
  * CSS flexbox fix
  * TypeScript linting fixes

## 1.0.14

* Bug fixes
  * Collapsed state minimum size updated

## 1.0.12

* New features
  * Sequence Editor improvements
* Bug fixes
  * Editor selections fixed
  * Sequence playhead repositions correctly on stop

## 1.0.11

* New features
  * Audio attachment and visualizer added
* Bug fixes
  * Events markers no longer overlap other markers
  * Log output removed
* Improvements
  * `theatric` package renamed to `@tomorrowevening/theatric`
  * Enhanced SVG Viewer and NPM publishing improvements

## 1.0.8

* New features
  * Events added to sequences
  * Searchable properties and objects
* Bug fixes
  * Marker state syncing fixed
  * Default range now based on sequence duration
  * TypeScript and ESLint errors resolved

## 1.0.0

* Rebrand to `@tomorrowevening` scope
* New features
  * SVG Viewer with view toggle (persisted to localStorage)
  * Sequence marker save/load and navigation API
  * Z-order support for extension panes
  * Sheets added to Sequence Editor menu
  * Editable time, duration, and FPS inputs in sequence header
  * Frame counter in sequence header
  * RGBA swatches shown for all colour properties
  * Sequence Editor horizontal scrollbar enlarged
* Bug fixes
  * Overlapping pane-extensions fixed
  * Graph editor visibility corrected
  * Editor shows animation data when available
  * CSS and TypeScript minor fixes

---

## 0.4.5

* New features
  * `sequence.attachAudio()` now uses an internal [`GainNode`](https://developer.mozilla.org/en-US/docs/Web/API/GainNode) that you can customize by connecting it to your own audio graph. Docs [here](https://docs.theatrejs.com/in-depth/#sound-and-music).

## 0.4.4

* New features
  * Implemented [@tomorrowevening/theatre-browser-bundles](https://www.npmjs.com/package/@tomorrowevening/theatre-browser-bundles), a custom build of Theatre.js that can be used via a `<script>` tag and a CDN. This should enable Theatre.js to be used in CodePen or projects that don't use a bundler.

## 0.4.3

* New features
  * `sequence.attachAudio()` now [accepts](https://github.com/AriaMinaei/theatre/commit/3f0556b9eb66a0893b43e38a3ee889e13d3a6667) any `AudioNode` as destination.
  * Implemented `studio.createContentOfSaveFile()` for programmatically exporting the project's state.

## 0.4.2

* New features
  * `sequence.attachAudio` now handles autoplay blocking ([Docs](https://docs.theatrejs.com/in-depth/#sequence-attachaudio)).
  * `studio.selection` and co have a more [lax](https://github.com/AriaMinaei/theatre/commit/dcf90983a565e585661b631b457a807eb4a4d874) type constraint.
* Bug fixes
  * Fixed the builds of internal examples.

## 0.4.1

* Bug fixes
  * [Fixed](https://github.com/AriaMinaei/theatre/commit/fe4010c2c64626029a26e29b9ad9104df9c56ad4) the jumping issue with `sequence.play({range})`.
  * [Fixed](https://github.com/AriaMinaei/theatre/commit/769eefb5e521c8206152b0e23937d5a3cd872b8b) a typo in the `dependencies` field, thanks [Nikhil Saraf](https://github.com/nksaraf)!