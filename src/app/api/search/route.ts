import { NextResponse } from "next/server";
import { getSearchableData, SearchableTestItem, kv } from "@/app/utils/kv";
import { GoogleGenerativeAI } from "@google/generative-ai";

// In-memory cache for synonym lookups to avoid repeated LLM calls during cold-start window
const synonymCache = new Map<string, string[]>();

async function fetchSynonyms(token: string): Promise<string[]> {
  // Return from cache if available
  if (synonymCache.has(token)) return synonymCache.get(token)!;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[Search API] GEMINI_API_KEY not set – skipping semantic expansion for token", token);
    synonymCache.set(token, []);
    return [];
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `You are a domain vocabulary assistant.\n` +
      `Strictly ONLY return a comma-separated list (no numbering, no explanations, no other text) of up to 10 words or short phrases that are valid synonyms, abbreviations, or highly related terms for the word \"${token}\".\n` +
      `Respond ONLY with the list.`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const response = await result.response;
    const raw = response.text().trim();

    // Split by comma, strip whitespace & quotes
    const list = raw.split(/,|\n/).map((s) => s.replace(/^["'\s]+|["'\s]+$/g, "")).filter(Boolean);

    synonymCache.set(token, list);
    return list;
  } catch (err) {
    console.error("[Search API] Gemini synonym fetch failed for token", token, err);
    synonymCache.set(token, []); // Avoid retry storms
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    const jobIdsParam = searchParams.get("jobIds");
    const query = searchParams.get("query");

    if (!query) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    console.log("[Search API] jobId:", jobId, "jobIds:", jobIdsParam, "query:", query);

    let searchableData;

    if (jobIdsParam) {
      const ids = jobIdsParam.split(',').map((id) => id.trim()).filter(Boolean);
      const keys = ids.map((id) => `job:${id}:searchableData`);
      const dataArrays = await Promise.all(keys.map((key) => kv.get<SearchableTestItem[]>(key)));
      searchableData = dataArrays.flat().filter(Boolean) as SearchableTestItem[];
    }
    // Support aggregated search across all jobs when jobId is 'all' or omitted and jobIdsParam not provided
    else if (!jobId || jobId.toLowerCase() === "all") {
      console.log("[Search API] Performing aggregated search across all jobs");
      // Fetch keys matching pattern job:*:searchableData
      const keys = await kv.keys("job:*:searchableData");
      console.log(`[Search API] Found ${keys.length} searchableData keys`);
      const dataArrays = await Promise.all(keys.map((key) => kv.get<SearchableTestItem[]>(key)));
      searchableData = dataArrays.flat().filter(Boolean) as SearchableTestItem[];
    } else {
      const searchDataKey = `job:${jobId}:searchableData`;
      console.log("[Search API] Checking existence of key:", searchDataKey);
      const keyExists = await kv.exists(searchDataKey);
      console.log("[Search API] Key exists in KV reported by search route:", keyExists);

      searchableData = await getSearchableData(jobId);

      if (!searchableData) {
        console.warn("[Search API] No searchable data found for job", jobId);
        return NextResponse.json([]);
      }
    }

    const lowerCaseQuery = query.toLowerCase();

    // --- Simple semantic-ish search: token match scoring ---
    const baseTokens = lowerCaseQuery.split(/\s+/).filter(Boolean);

    // Fetch Gemini-based synonyms for each base token in parallel
    const synonymLists = await Promise.all(baseTokens.map(fetchSynonyms));

    const queryTokensArr = baseTokens.concat(...synonymLists).filter(Boolean).map((t) => t.toLowerCase());
    const queryTokens = Array.from(new Set(queryTokensArr));

    type Scored = { item: SearchableTestItem; score: number };

    const filteredData = searchableData.filter((it) => !(it.requirementId && it.requirementId.trim() !== ""));

    const scoredResults: Scored[] = filteredData.map((item) => {
      const text = (item.testCaseText || "").toLowerCase();
      const matchedTokens = queryTokens.filter((tok) => text.includes(tok));
      const score = matchedTokens.length / queryTokens.length; // 0–1

      // Inject score into a copy of the item so that UI can show a % relevance
      const scoredItem: SearchableTestItem = {
        ...item,
        confidence: score,
      };

      return { item: scoredItem, score } as Scored;
    }).filter(({ score }) => score > 0);

    // Sort by score (desc), then by testCaseId for deterministic order
    scoredResults.sort((a, b) => b.score - a.score || a.item.testCaseId.localeCompare(b.item.testCaseId));

    // Deduplicate by testCaseId and source
    const dedupedMap = new Map<string, SearchableTestItem>();
    for (const { item } of scoredResults) {
      const key = `${item.testCaseId}-${item.testCaseSource}`;
      if (!dedupedMap.has(key)) {
        dedupedMap.set(key, item);
      }
    }

    const dedupedResults = Array.from(dedupedMap.values());

    console.log(`[Search API] Found ${dedupedResults.length} unique test cases for query`);

    return NextResponse.json(dedupedResults);
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    );
  }
} 