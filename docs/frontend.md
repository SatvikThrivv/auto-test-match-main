# Frontend

*   **Framework:** Next.js with React and TypeScript.
*   **UI:** A single-page interface built with Tailwind CSS for styling.
*   **State Management:** Zustand is used for managing the application's state.
*   **Components:**
    *   `FileSelector`: Allows users to upload a base FSD, an updated FSD (optional), and a CSV file with test cases.
    *   `CoverageMetrics`: Displays key metrics from the analysis, such as total requirements, coverage percentage, and the number of high-risk uncovered requirements.
    *   `RequirementRow`: Provides a detailed breakdown of each requirement, including its status, priority, risk, and a list of test cases that cover it.
    *   `DownloadButtons`: Allows users to download the full analysis report in either JSON or CSV format.
