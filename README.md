# AutoTestMatch

A web tool that analyzes test coverage by comparing functional specification documents (FSDs) with test cases using AI. The tool helps identify gaps in test coverage and ensures all requirements are properly tested.

## Features

- Drag-and-drop upload for PDF/DOCX + CSV files
- Mobile-responsive design for on-the-go analysis
- AI-driven requirement extraction and classification
- Smart detection of irrelevant documents and mismatched test cases
- Test case matching with confidence scores and detailed explanations
- Coverage analysis (Full/Partial/None) with risk assessment
- Support for edge cases including error states and performance limits
- Downloadable JSON and CSV reports for further analysis
- Searchable view for test cases
- Support for uploading multiple requirement documents (e.g. base FSD and updated FSD)

## Tech Stack

- **Framework**: Next.js 14 (App Router) + React 19
- **Language**: TypeScript 5.x
- **Styles**: Tailwind CSS 3.x
- **State**: Zustand
- **Storage**: Vercel KV (ephemeral; TTL 24h)
- **AI**: Google Generative AI SDK (Gemini Flash 2.5)

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/auto-test-match.git
   cd auto-test-match
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file with the following variables:
   ```
   GOOGLE_API_KEY=your_gemini_api_key_here
   KV_REST_API_TOKEN=your_vercel_kv_token_here
   INTERNAL_API_SECRET=match-worker-42
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment

1. Create a Vercel account and install the Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Link your project:
   ```bash
   vercel link
   ```

3. Set up environment variables in the Vercel dashboard:
   - `GOOGLE_API_KEY`: Your Gemini API key
   - `KV_REST_API_TOKEN`: Your Vercel KV token
   - `INTERNAL_API_SECRET`: A secret for internal API calls

4. Deploy:
   ```bash
   vercel deploy
   ```

## Usage

1. Upload your base FSD (PDF/DOCX)
2. Optionally upload an updated FSD
3. Upload your test cases CSV
4. Click "Analyze Coverage"
5. View the results and download reports

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── process/
│   │   ├── result/
│   │   ├── search/
│   │   ├── status/
│   │   └── submit/
│   ├── components/
│   │   ├── CoverageMetrics.tsx
│   │   ├── DownloadButtons.tsx
│   │   ├── FileSelector.tsx
│   │   ├── MultiFileSelector.tsx
│   │   ├── ProgressCard.tsx
│   │   ├── RequirementRow.tsx
│   │   ├── SearchableTestCaseView.tsx
│   │   └── TestLinkList.tsx
│   ├── utils/
│   │   ├── gemini.ts
│   │   ├── kv.ts
│   │   └── parseFiles.ts
│   ├── store.ts
│   └── page.tsx
└── ...
```