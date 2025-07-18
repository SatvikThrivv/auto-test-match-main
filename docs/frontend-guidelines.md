## 📄 `frontend-guidelines.md` — Front-end & Design Guide

### Design principles

Minimal, content-first layout with generous white space. Clear state feedback (Uploading → Processing → Results → Error). Mobile-first responsive grid, then enhanced at ≥ 640 px.

### Layout conventions

* Max-width container `max-w-5xl mx-auto px-4 sm:px-6`
* Three views handled via React state: `UploadView`, `ProcessingView`, `ResultsView`.

### Colour palette

| Purpose        | Hex       | Tailwind token |
| -------------- | --------- | -------------- |
| Primary action | `#0d9488` | `teal-600`     |
| Background     | `#f8fafc` | `slate-50`     |
| Card           | `#ffffff` | `white`        |
| Text primary   | `#1e293b` | `slate-800`    |
| Text secondary | `#64748b` | `slate-500`    |
| Success chip   | `#16a34a` | `green-600`    |
| Warning chip   | `#d97706` | `amber-600`    |
| Error chip     | `#dc2626` | `red-600`      |

### Typography

Google Font **Inter** (400/500/700).

* `h1` `text-3xl font-bold`
* `h2` `text-2xl font-semibold border-b pb-1`
* body `text-base leading-6`

### Icons (Lucide React)

`FileUp`, `LoaderCircle` (animate-spin), `AlertTriangle`, `ChevronDown/Up`, `Download`, `RotateCw` (retry).

### Components snapshot

* `<FileSelector />` handles three labelled inputs + drag-and-drop.
* `<ProgressCard />` shows jobID and dynamic phase text.
* `<RequirementRow />` accordion with coloured chip, requirement text, and `<TestLinkList />`.
* `<DownloadButtons />` fixed in header on results view.
