import { NextResponse } from "next/server";
import { getFiles, setStatus, setResult, getFileNames, setSearchableData, SearchableTestItem, /*FileNames,*/ Result as KvResult, getSearchableData as getSearchableDataFromKV } from "@/app/utils/kv";
import { parseFiles } from "@/app/utils/parseFiles";
import { generateContent } from "@/app/utils/gemini";

const TIMEOUT_MS = 50000; // 50 seconds timeout

export async function POST(request: Request) {
  let jobId: string | undefined;
  
  try {
    const body = await request.json();
    jobId = body.jobId;

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    // Get files from KV
    const files = await getFiles(jobId);
    if (!files) {
      return NextResponse.json(
        { error: "Files not found" },
        { status: 404 }
      );
    }
    
    // Get file names from KV
    const fileNames = await getFileNames(jobId);
    if (!fileNames) {
      // This should ideally not happen if submit was successful
      console.warn(`File names not found for job ${jobId}, search sources might be generic.`);
      // return NextResponse.json(
      //   { error: "File names not found, processing cannot continue for search" },
      //   { status: 404 }
      // );
    }

    // Update status to processing
    await setStatus(jobId, {
      phase: "processing",
      message: "Processing files...",
      progress: 0,
    });

    // Parse files with timeout
    const parsePromise = parseFiles(files);
    const parseTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('File parsing timed out')), TIMEOUT_MS)
    );
    const parseResult = await Promise.race([parsePromise, parseTimeout]) as {
      base: string;
      updated: string;
      tests: string[][];
    };
    const { base, updated, tests } = parseResult;

    // Update status to analyzing
    await setStatus(jobId, {
      phase: "analyzing",
      message: "Analyzing requirements...",
      progress: 50,
    });

    // Generate content with timeout
    const generatePromise = generateContent(base, updated, tests);
    const generateTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Analysis timed out')), TIMEOUT_MS)
    );
    const result = await Promise.race([generatePromise, generateTimeout]) as KvResult;

    // Store result in KV
    await setResult(jobId, result);

    // ---- START: Generate and store searchable data ----
    if (result && result.requirements && result.testcases && result.links && fileNames) {
      console.log("[Process] Generating searchable data for job:", jobId);
      console.log("[Process] File names:", fileNames);
      console.log("[Process] Result counts - requirements:", result.requirements.length, "testcases:", result.testcases.length, "links:", result.links.length);

      // The first row of the CSV is assumed to be headers (e.g., ["ID", "Description", ...]).
      // We'll build one SearchableTestItem per *row* (excluding headers), treating the first
      // column as the test-case identifier and the remainder concatenated as free-text so
      // the search can match against any part of the row.

      const [csvHeaders, ...csvRows] = tests;

      const searchableItems: SearchableTestItem[] = csvRows.map((row, idx) => {
        const testCaseId = row[0] || `row-${idx + 1}`;
        const testCaseTextParts = row.slice(1).filter(Boolean);
        const testCaseText = testCaseTextParts.length > 0 ? testCaseTextParts.join(" | ") : testCaseId;

        return {
          id: `tc-${jobId}-${testCaseId}`,
          requirementId: "",
          requirementText: "",
          requirementSource: "",
          testCaseId,
          testCaseText,
          testCaseSource: fileNames.testCasesCSVName,
          confidence: 1,
          explanation: "",
          coverageAreas: [],
          gaps: [],
          fields: csvHeaders.reduce<Record<string,string>>((acc, header, i) => {
            acc[header] = row[i] ?? "";
            return acc;
          }, {}),
        } as SearchableTestItem;
      });

      console.log(`[Process] Generated ${searchableItems.length} searchable test-case items`);

      if (searchableItems.length > 0) {
        await setSearchableData(jobId, searchableItems);
        console.log("[Process] Saved searchable test-case data to KV");

        // DIAGNOSTIC: Attempt to read back immediately
        try {
          const immediateRead = await getSearchableDataFromKV(jobId);
          if (immediateRead && immediateRead.length > 0) {
            console.log("[Process] DIAGNOSTIC: Successfully read back test-case searchable data immediately. Count:", immediateRead.length);
          } else {
            console.warn("[Process] DIAGNOSTIC: Failed to read back test-case searchable data immediately or it was empty.");
          }
        } catch (diagError) {
          console.error("[Process] DIAGNOSTIC: Error reading back test-case searchable data immediately:", diagError);
        }
      } else {
        console.warn("[Process] No searchable test-case items generated, skipping KV save");
      }
    } else {
      console.warn(`Could not generate searchable data for job ${jobId} due to missing result components or fileNames.`)
    }
    // ---- END: Generate and store searchable data ----

    // Update status to complete
    await setStatus(jobId, {
      phase: "complete",
      message: "Analysis complete",
      progress: 100,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Process error:", error);
    
    // Update status to error
    if (jobId) {
      await setStatus(jobId, {
        phase: "error",
        message: error instanceof Error ? error.message : "Failed to process files",
        progress: 0,
      });
    }

    return NextResponse.json(
      { error: "Failed to process files" },
      { status: 500 }
    );
  }
} 