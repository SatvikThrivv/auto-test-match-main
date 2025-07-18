import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

type LLMInput = {
  specText: string;
  testCases: string[];
};

type LLMOutput = {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  error?: {
    message: string;
  };
};

async function logLLMResponse(jobId: string, input: LLMInput, output: LLMOutput, duration: number) {
  try {
    const logData = {
      timestamp: new Date().toISOString(),
      jobId,
      type: "llm_response",
      input,
      output,
      duration,
    };
    
    // Log to console for development
    console.log(JSON.stringify(logData, null, 2));
    
    // Send log to API endpoint
    await fetch("/api/log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(logData),
    });
  } catch (error) {
    console.error("Failed to log LLM response:", error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { specText, testCases } = body as LLMInput;
    const jobId = uuidv4();

    // Start timing
    const startTime = Date.now();

    // Process with AI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert in software testing and requirements analysis. Analyze the given specification and test cases to identify coverage gaps and provide recommendations."
          },
          {
            role: "user",
            content: JSON.stringify({
              specText,
              testCases,
            }),
          },
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json() as LLMOutput;
    const duration = Date.now() - startTime;

    // Log the LLM response
    await logLLMResponse(
      jobId,
      { specText, testCases },
      data,
      duration
    );

    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to process with AI");
    }

    return NextResponse.json({
      jobId,
      result: data.choices[0].message.content,
    });
  } catch (error) {
    console.error("Processing error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
} 