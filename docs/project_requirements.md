## 📄 `project_requirements.md` — Project Requirements Document

### 1  App overview

AutoTestMatch is a lightweight, serverless web tool that ingests (1) an original FSD, (2) an updated FSD, and (3) a CSV of existing test cases. It asks Gemini Flash 2.5 to classify each requirement (functional or non-functional), decide whether it is new, modified, stable, or deprecated, and then reason through which test cases fully, partially, or do not cover each requirement. The result is returned as a single JSON blob that QA can download immediately; no data is stored long-term.

### 2  User flow

1. User lands on a single-page interface and chooses the three files.
2. The frontend calls **POST /api/submit**. A Job ID is returned and the UI switches to a processing view.
3. The backend function extracts text and streams status to Vercel KV; the frontend polls **GET /api/status** every three seconds.
4. When status reaches `complete`, the frontend fetches **GET /api/result**, renders the coverage dashboard, and offers JSON/CSV downloads.
5. If the user refreshes the tab, they can paste the Job ID to resume polling until the 24-h KV TTL expires.

### 3  Tech stack & APIs

* **Framework** Next.js 14 (App Router) + React 19
* **Language** TypeScript 5.x
* **Styles** Tailwind CSS 3.x
* **State** Zustand
* **Storage** Vercel KV (ephemeral; TTL 24 h)
* **AI** Google Generative AI SDK (`@google/generative-ai`) — model `gemini-1.5-flash`

### 4  Core features

* Drag-and-drop upload for PDF/DOCX + CSV
* Asynchronous processing with live progress
* LLM-driven requirement extraction, classification, and test-case matching in a **single prompt** (no embeddings)
* Coverage labels Full / Partial / None with confidence score
* Highlight new, modified, deprecated requirements
* Downloadable traceability JSON and enriched CSV

### 5  In-scope / out-of-scope

| In scope                                   | Out of scope              |
| ------------------------------------------ | ------------------------- |
| English-language FSDs                      | User accounts & auth      |
| One-off analysis sessions; no history      | Persistent DB of projects |
| Client-side tweaks to confidence threshold | Real-time collaboration   |
| PDF & DOCX parsing; CSV ingest             | OCR for scanned docs      |

### 6  Non-functional requirements

* **Performance** One average-size spec (< 2 MB) + 800 test rows must finish < 3 min.
* **Reliability** Retry Gemini calls up to three times with exponential back-off.
* **Security** Docs are kept in memory/KV only; deleted after 24 h. Keys in env vars.
* **Scalability** Serverless functions auto-scale; no cold-start > 1 s on Vercel Edge.
* **Accessibility** WCAG 2.1 AA colour contrast and keyboard navigation.

### 7  Constraints & assumptions

* Deployed exclusively on Vercel.
* Specs follow numbered headings or clear bullet lists.
* Gemini Flash context window (128 k tokens) is sufficient for combined inputs.

### 8  Known issues & potential pitfalls

* LLM may mis-classify very terse requirements — manual review still needed.
* Large diagrams in DOCX are ignored (text-only extraction).
* Hitting the 5-min execution cap requires splitting the spec into sections.
