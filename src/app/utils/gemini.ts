import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { kv } from "@vercel/kv";
import { createHash } from "crypto";

interface GeminiResponse {
  requirements: Array<{
    id: string;
    text: string;
    type: "functional" | "non-functional";
    status: "new" | "modified" | "stable" | "deprecated";
    priority: "high" | "medium" | "low";
    risk: "high" | "medium" | "low";
  }>;
  testcases: Array<{
    id: string;
    text: string;
    type: "positive" | "negative" | "edge-case" | "regression";
    complexity: "simple" | "moderate" | "complex";
  }>;
  links: Array<{
    requirementId: string;
    testcaseId: string;
    matchType: "exact" | "partial" | "none";
    confidence: number;
    explanation: string;
    coverageAreas: string[];
    gaps: string[];
  }>;
  coverageMetrics: {
    totalRequirements: number;
    coveredRequirements: number;
    partiallyCoveredRequirements: number;
    uncoveredRequirements: number;
    coveragePercentage: number;
    highRiskUncovered: number;
    mediumRiskUncovered: number;
    lowRiskUncovered: number;
  };
  recommendations: Array<{
    requirementId: string;
    priority: "high" | "medium" | "low";
    suggestion: string;
    impact: string;
  }>;
  status: "ok" | "irrelevant_docs" | "mismatched_tests";
}

// Helper function to clean and extract JSON from LLM response
function cleanJsonResponse(rawText: string): string {
  try {
    // Remove any markdown code block indicators
    let cleaned = rawText.replace(/```json\s*|\s*```/g, '').trim();

    // Find the start of the JSON object
    let jsonStart = cleaned.indexOf('{');
    if (jsonStart === -1) {
      // Try to find any JSON object start if the specific pattern isn't found
      jsonStart = cleaned.search(/\{[\s]*["']/);
    }

    if (jsonStart >= 0) {
      cleaned = cleaned.slice(jsonStart);

      // Find matching closing brace
      let braceCount = 0;
      let inString = false;
      let escapeNext = false;

      for (let i = 0; i < cleaned.length; i++) {
        const char = cleaned[i];

        if (escapeNext) {
          escapeNext = false;
          continue;
        }

        if (char === '\\') {
          escapeNext = true;
          continue;
        }

        if (char === '"' && !escapeNext) {
          inString = !inString;
          continue;
        }

        if (!inString) {
          if (char === '{') {
            braceCount++;
          } else if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
              // Found the end of the JSON object
              return cleaned.slice(0, i + 1);
            }
          }
        }
      }
    }

    // If we couldn't find a clean JSON object, return the cleaned text
    return cleaned;
  } catch (error) {
    console.error('Error cleaning JSON response:', error);
    return rawText;
  }
}

const CHUNK_SIZE = 10; // Number of requirements to process at once

// ---- Cache Busting ----
// Increment ANALYSIS_VERSION whenever the analysis logic changes in a way that affects
// the structure or values of the returned result. This forces regeneration even if the
// input documents have not changed.
const ANALYSIS_VERSION = "v2"; // <-- bump this to invalidate old cached artefacts

const CACHE_TTL = 60 * 60 * 24; // 24 hours in seconds

async function processChunk(
  model: GenerativeModel,
  requirements: string[],
  tests: string[][],
  chunkIndex: number
): Promise<GeminiResponse> {
  const prompt = `Analyze the following requirements and test cases (chunk ${chunkIndex + 1}):

Requirements (including typical and edge-case items such as error states, performance ceilings, extreme data sizes, and security constraints):
${requirements.join("\n")}

Test Cases (including edge-case scenarios such as invalid inputs, boundary values, and unexpected user interactions):
${tests.map((test) => test.join(", ")).join("\n")}

You MUST respond with ONE valid JSON object that adheres EXACTLY to the schema below.
Guidelines for output (read carefully):
- Do NOT wrap the JSON in markdown code fences or any explanatory text—output the raw JSON only.
- Keep all keys and nesting exactly as shown; do not add, remove, or reorder keys.
- All numeric values must be numbers (not strings) and non-negative; decimals may have up to three digits of precision.
- Preserve every identifier (e.g., requirementId, testcaseId) exactly as provided; never invent new IDs.
- If a field value is unavailable, use an empty string "" (for strings) or 0 (for numbers) rather than omitting the field.
- The JSON must parse directly via JSON.parse without any preprocessing.
Failure to comply with these rules will be treated as a critical error.

Provide the JSON using this schema:
{
  "requirements": [
    {
      "id": "REQ-1",
      "text": "requirement text",
      "type": "functional|non-functional",
      "status": "new|modified|stable|deprecated",
      "priority": "high|medium|low",
      "risk": "high|medium|low"
    }
  ],
  "testcases": [
    {
      "id": "TC-1",
      "text": "test case text",
      "type": "positive|negative|edge-case|regression",
      "complexity": "simple|moderate|complex"
    }
  ],
  "links": [
    {
      "requirementId": "REQ-1",
      "testcaseId": "TC-1",
      "matchType": "exact|partial|none",
      "confidence": 0.95,
      "explanation": "Detailed explanation of why this test case matches the requirement",
      "coverageAreas": ["List of specific areas covered by this test case"],
      "gaps": ["List of any gaps in coverage"]
    }
  ]
}`;

  const request = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
  };

  const result = await model.generateContent(request);
  const response = await result.response;
  const rawText = response.text();

  // Log raw LLM output for this chunk
  console.log(`Gemini LLM raw output (chunk ${chunkIndex + 1}):`, rawText);

  try {
    const cleanedJson = cleanJsonResponse(rawText);
    const parsedJson = JSON.parse(cleanedJson);
    // Log parsed JSON for this chunk
    console.log(`Gemini LLM parsed JSON (chunk ${chunkIndex + 1}):`, JSON.stringify(parsedJson, null, 2));
    if (parsedJson.requirements && parsedJson.testcases && parsedJson.links) {
      return parsedJson;
    }
    throw new Error('Invalid JSON structure');
  } catch (error) {
    console.error('JSON processing error:', error);
    throw error;
  }
}

export async function generateContent(
  base: string,
  updated: string,
  tests: string[][]
): Promise<GeminiResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  // Build a deterministic but compact cache key by hashing the inputs instead of
  // embedding the entire content. This prevents hitting Upstash's 32KB key size
  // limit while still ensuring uniqueness per distinct combination of inputs
  // and analysis version.
  const hash = createHash("sha256")
    .update(base)
    .update(updated)
    .update(JSON.stringify(tests))
    .digest("hex");

  const cacheKey = `analysis:${ANALYSIS_VERSION}:${hash}`;
  
  // Try to get cached result
  const cachedResult = await kv.get(cacheKey);
  if (cachedResult) {
    console.log('Using cached analysis result');
    return cachedResult as GeminiResponse;
  }

  // LLM call will happen below, log input
  console.log('Calling Gemini LLM with:', {
    base: base.slice(0, 200) + (base.length > 200 ? '...[truncated]' : ''),
    updated: updated.slice(0, 200) + (updated.length > 200 ? '...[truncated]' : ''),
    testsSample: tests.slice(0, 2),
  });

  // Split requirements into chunks
  const requirements = base.split('\n').filter(line => line.trim());
  const chunks = [];
  for (let i = 0; i < requirements.length; i += CHUNK_SIZE) {
    chunks.push(requirements.slice(i, i + CHUNK_SIZE));
  }

  // Process chunks in parallel with a limit
  const results = await Promise.all(
    chunks.map((chunk, index) => processChunk(model, chunk, tests, index))
  );

  // --- Requirement sanitisation & deduplication ---
  const sanitizeRequirement = (req: GeminiResponse["requirements"][number]) => {
    // Provide sane defaults for missing/invalid risk / priority
    const validRisks = new Set(["high", "medium", "low"]);
    const validPriorities = new Set(["high", "medium", "low"]);

    return {
      ...req,
      risk: validRisks.has(req.risk) ? req.risk : "medium",
      priority: validPriorities.has(req.priority) ? req.priority : "medium",
    } as GeminiResponse["requirements"][number];
  };

  const uniqueReqMap = new Map<string, GeminiResponse["requirements"][number]>();
  for (const req of results.flatMap(r => r.requirements)) {
    const key = req.id || req.text; // Fallback to text as dedup key if id missing
    if (!uniqueReqMap.has(key)) {
      uniqueReqMap.set(key, sanitizeRequirement(req));
    }
  }
  const dedupedRequirements = Array.from(uniqueReqMap.values());

  // Merge results
  const mergedResult: GeminiResponse = {
    requirements: dedupedRequirements,
    testcases: results[0].testcases, // Test cases are the same for all chunks
    links: results.flatMap(r => r.links),
    coverageMetrics: {
      totalRequirements: 0,
      coveredRequirements: 0,
      partiallyCoveredRequirements: 0,
      uncoveredRequirements: 0,
      coveragePercentage: 0,
      highRiskUncovered: 0,
      mediumRiskUncovered: 0,
      lowRiskUncovered: 0
    },
    recommendations: [],
    status: "ok"
  };

  // --- Detect malformed or empty tests ---
  const testsAreMalformed = tests.length <= 1 || tests[0].length === 0;

  // Calculate coverage metrics
  mergedResult.coverageMetrics.totalRequirements = mergedResult.requirements.length;
  const coveredReqIds = new Set<string>();
  const partiallyCoveredReqIds = new Set<string>();

  mergedResult.links.forEach((link) => {
    if (link.matchType === 'exact') {
      coveredReqIds.add(link.requirementId);
    } else if (link.matchType === 'partial') {
      partiallyCoveredReqIds.add(link.requirementId);
    }
  });

  mergedResult.coverageMetrics.coveredRequirements = coveredReqIds.size;
  mergedResult.coverageMetrics.partiallyCoveredRequirements = partiallyCoveredReqIds.size;
  mergedResult.coverageMetrics.uncoveredRequirements = Math.max(0,
    mergedResult.coverageMetrics.totalRequirements -
      mergedResult.coverageMetrics.coveredRequirements -
      mergedResult.coverageMetrics.partiallyCoveredRequirements);
  
  mergedResult.coverageMetrics.coveragePercentage = mergedResult.coverageMetrics.totalRequirements > 0 ?
    Math.min(100,
      ((mergedResult.coverageMetrics.coveredRequirements +
        mergedResult.coverageMetrics.partiallyCoveredRequirements * 0.5) /
      mergedResult.coverageMetrics.totalRequirements) * 100) : 0;

  // Calculate risk metrics
  mergedResult.coverageMetrics.highRiskUncovered = mergedResult.requirements.filter(
    req => req.risk === 'high' && !mergedResult.links.some(link => 
      link.requirementId === req.id && link.matchType !== 'none'
    )
  ).length;

  mergedResult.coverageMetrics.mediumRiskUncovered = mergedResult.requirements.filter(
    req => req.risk === 'medium' && !mergedResult.links.some(link => 
      link.requirementId === req.id && link.matchType !== 'none'
    )
  ).length;

  mergedResult.coverageMetrics.lowRiskUncovered = mergedResult.requirements.filter(
    req => req.risk === 'low' && !mergedResult.links.some(link => 
      link.requirementId === req.id && link.matchType !== 'none'
    )
  ).length;

  // Generate recommendations
  mergedResult.recommendations = mergedResult.requirements
    .filter(req => !mergedResult.links.some(link => 
      link.requirementId === req.id && link.matchType !== 'none'
    ))
    .map(req => ({
      requirementId: req.id,
      priority: req.priority,
      suggestion: `Add test cases to cover ${req.text}`,
      impact: `Improves coverage of ${req.type} requirement with ${req.risk} risk`
    }));

  // Determine status based on analysis outcome
  if (mergedResult.requirements.length === 0) {
    mergedResult.status = "irrelevant_docs";
  } else {
    const hasCoverage = mergedResult.links.some(link => link.matchType !== "none");
    if (!hasCoverage || testsAreMalformed) {
      mergedResult.status = "mismatched_tests";
    }
  }

  // If mismatched_tests or irrelevant_docs, zero-out coverage metrics
  if (mergedResult.status === "mismatched_tests" || mergedResult.status === "irrelevant_docs") {
    mergedResult.coverageMetrics = {
      totalRequirements: mergedResult.requirements.length,
      coveredRequirements: 0,
      partiallyCoveredRequirements: 0,
      uncoveredRequirements: mergedResult.requirements.length,
      coveragePercentage: 0,
      highRiskUncovered: mergedResult.requirements.filter(r => r.risk === "high").length,
      mediumRiskUncovered: mergedResult.requirements.filter(r => r.risk === "medium").length,
      lowRiskUncovered: mergedResult.requirements.filter(r => r.risk === "low").length,
    };
  }

  // Cache the result
  await kv.set(cacheKey, mergedResult, { ex: CACHE_TTL });

  // Log the merged result for Vercel logs
  console.log('Gemini merged analysis result:', JSON.stringify(mergedResult, null, 2));

  return mergedResult;
} 