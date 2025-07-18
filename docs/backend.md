# Backend

*   **Framework:** Next.js API Routes.
*   **Data Storage:** Vercel KV (powered by Upstash Redis) is used to store uploaded files, job status, and analysis results.
*   **Core Logic:**
    1.  **Submission (`/api/submit`):** When a user uploads files, the backend generates a unique `jobId`, stores the files in Vercel KV, and triggers a background worker to start the analysis.
    2.  **Processing (`/api/process`):** This is the main worker that orchestrates the analysis. It retrieves the files from KV, parses them, sends them to the Google Generative AI for analysis, and stores the results back in KV.
    3.  **Status (`/api/status`):** The frontend polls this endpoint to get real-time updates on the analysis progress.
    4.  **Result (`/api/result`):** Once the analysis is complete, the frontend fetches the final report from this endpoint.
