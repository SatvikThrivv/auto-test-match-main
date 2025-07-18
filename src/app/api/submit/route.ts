import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { setFileNames } from "@/app/utils/kv";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const baseFsd = formData.get("baseFsd") as File;
    const updatedFsd = formData.get("updatedFsd") as File | null;
    const testsCsv = formData.get("testsCsv") as File;

    if (!baseFsd || !testsCsv) {
      return NextResponse.json(
        { error: "Base FSD and Tests CSV are required" },
        { status: 400 }
      );
    }

    const jobId = nanoid();
    const baseBuffer = await baseFsd.arrayBuffer();
    const updatedBuffer = updatedFsd ? await updatedFsd.arrayBuffer() : null;
    const testsBuffer = await testsCsv.arrayBuffer();

    // Store file contents in KV
    await kv.set(`job:${jobId}:files`, {
      base: Buffer.from(baseBuffer).toString("base64"),
      updated: updatedBuffer ? Buffer.from(updatedBuffer).toString("base64") : null,
      tests: Buffer.from(testsBuffer).toString("base64"),
    });

    // Store file names in KV
    await setFileNames(jobId, {
      baseFSDName: baseFsd.name,
      updatedFSDName: updatedFsd ? updatedFsd.name : undefined,
      testCasesCSVName: testsCsv.name,
    });

    // Set initial status
    await kv.set(`job:${jobId}:status`, {
      phase: "extracting",
      progress: 0,
    });

    // Kick off worker
    const workerUrl = new URL("/api/process", request.url);
    const workerResponse = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.INTERNAL_API_SECRET}`,
      },
      body: JSON.stringify({ jobId }),
    });

    if (!workerResponse.ok) {
      throw new Error("Failed to start worker");
    }

    return NextResponse.json({ jobId });
  } catch (error) {
    console.error("Submit error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
} 