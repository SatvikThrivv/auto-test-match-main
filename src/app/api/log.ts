import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { jobId, type, input, output, duration } = body;

    // Log to Vercel with structured format
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      jobId,
      type,
      input,
      output,
      duration,
      environment: process.env.NODE_ENV,
    }, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to log:", error);
    return NextResponse.json(
      { error: "Failed to log" },
      { status: 500 }
    );
  }
} 