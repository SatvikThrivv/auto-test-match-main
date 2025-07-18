import { NextResponse } from "next/server";
import { getResult, cleanupJob } from "@/app/utils/kv";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    const result = await getResult(jobId);
    if (!result) {
      return NextResponse.json(
        { error: "Result not found" },
        { status: 404 }
      );
    }

    // Clean up job data
    await cleanupJob(jobId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Result error:", error);
    return NextResponse.json(
      { error: "Failed to get result" },
      { status: 500 }
    );
  }
} 