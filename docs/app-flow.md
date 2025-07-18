# App Flow

1.  **Upload:** The user navigates to the application and is presented with the `FileSelector` component. They upload their functional specification documents (in PDF or DOCX format) and a CSV file containing their test cases.

2.  **Submission:** Upon clicking the submit button, the frontend sends the files to the `/api/submit` endpoint.

3.  **Job Creation:** The backend receives the files, generates a unique `jobId`, and saves the files to Vercel KV, a Redis-based data store. It then sets an initial "processing" status for the job.

4.  **Asynchronous Processing:** The `submit` endpoint triggers a background worker by making a request to the `/api/process` endpoint. This ensures the user gets an immediate response without waiting for the entire analysis to complete.

5.  **Polling:** The frontend begins polling the `/api/status` endpoint every few seconds, using the `jobId` to check the progress of the analysis.

6.  **File Parsing & AI Analysis:** The `/api/process` worker retrieves the files from Vercel KV. It uses utility functions to parse the text content from the PDF/DOCX and CSV files. The extracted text is then formatted into a detailed prompt and sent to the Google Generative AI.

7.  **Result Storage:** The AI returns a structured JSON object containing the complete coverage analysis, including requirements, test cases, links, metrics, and recommendations. The worker stores this JSON result in Vercel KV, associated with the `jobId`.

8.  **Completion:** The worker updates the job status to "complete".

9.  **Display Results:** On the next poll, the frontend sees the "complete" status and makes a final request to `/api/result` to fetch the analysis data. The UI then updates to display the `CoverageMetrics` and the detailed `RequirementRow` components.

10. **Download:** The user can review the results on the page or use the `DownloadButtons` to download the complete analysis as a JSON or CSV file for offline use.
