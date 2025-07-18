import { Redis } from "@upstash/redis";

export const kv = new Redis({
  url: "https://magical-kite-58984.upstash.io", // <-- use the full https URL
  token: process.env.UPSTASH_REDIS_REST_TOKEN,        // <-- put your actual token here
});

export interface Files {
  base: string;
  updated?: string;
  tests: string;
}

export interface Status {
  phase: "uploading" | "processing" | "analyzing" | "complete" | "error";
  message: string;
  progress: number;
}

// --- START: Detailed type definitions copied/adapted from store.ts ---
export interface RequirementInResult {
  id: string;
  text: string;
  type: "functional" | "non-functional";
  status: "new" | "modified" | "stable" | "deprecated";
  priority: "high" | "medium" | "low";
  risk: "high" | "medium" | "low";
  coverage: "full" | "partial" | "none";
  // 'links' property specific to store.ts is omitted here as it might be circular or not needed for KV storage of raw result
}

export interface TestCaseInResult {
  id: string;
  text: string;
  type: "positive" | "negative" | "edge-case" | "regression";
  complexity: "simple" | "moderate" | "complex";
}

export interface LinkInResult {
  id: string; // This was missing in the original KV Result.links
  requirementId: string;
  testcaseId: string;
  // Fields from store.ts 'Link' (like confidence, explanation) should be here if they are part of the direct AI output
  confidence: number; 
  explanation: string;
  coverageAreas: string[];
  gaps: string[];
  // 'matchType' from original KV Result.links might be from an earlier design, or could be added by AI
  // For now, let's assume AI provides confidence/explanation etc. as in store.ts
  // If matchType is still relevant and produced by AI, it should be added here.
  // For safety, I'm removing matchType to align with the linter error and store.ts, assuming AI provides the richer link details.
}

export interface CoverageMetrics {
  totalRequirements: number;
  coveredRequirements: number;
  partiallyCoveredRequirements: number;
  uncoveredRequirements: number;
  coveragePercentage: number;
  highRiskUncovered: number;
  mediumRiskUncovered: number;
  lowRiskUncovered: number;
}

export interface Recommendation {
  requirementId: string;
  priority: "high" | "medium" | "low";
  suggestion: string;
  impact: string;
}

export interface Result {
  requirements: RequirementInResult[];
  testcases: TestCaseInResult[];
  links: LinkInResult[];
  coverageMetrics: CoverageMetrics;
  recommendations: Recommendation[];
}
// --- END: Detailed type definitions ---

export interface SearchableTestItem {
  id: string; // Unique ID for this item, can be combination of testCaseId and requirementId
  requirementId: string;
  requirementText: string;
  requirementSource: string; // Source FSD document name
  testCaseId: string;
  testCaseText: string;
  testCaseSource: string; // Source CSV file name
  confidence: number; 
  explanation: string;
  coverageAreas: string[];
  gaps: string[];
  // Optional mapping of CSV header -> cell value for richer display in UI
  fields?: Record<string, string>;
}

export interface FileNames {
  baseFSDName: string;
  updatedFSDName?: string;
  testCasesCSVName: string;
}

export async function setKV(key: string, value: unknown, ttl?: number) {
  await kv.set(key, value);
  if (ttl) await kv.expire(key, ttl);
}

export async function getKV<T = unknown>(key: string): Promise<T | null> {
  return kv.get(key);
}

export async function delKV(key: string) {
  return kv.del(key);
}

export async function scanKV(pattern: string): Promise<string[]> {
  return kv.keys(pattern);
}

export async function getFiles(jobId: string): Promise<Files | null> {
  const result = await kv.get(`job:${jobId}:files`);
  return result as Files | null;
}

export async function getStatus(jobId: string): Promise<Status | null> {
  const result = await kv.get(`job:${jobId}:status`);
  return result as Status | null;
}

export async function getResult(jobId: string): Promise<Result | null> {
  const result = await kv.get(`job:${jobId}:result`);
  return result as Result | null;
}

export async function getSearchableData(jobId: string): Promise<SearchableTestItem[] | null> {
  const result = await kv.get(`job:${jobId}:searchableData`);
  return result as SearchableTestItem[] | null;
}

export async function getFileNames(jobId: string): Promise<FileNames | null> {
  const result = await kv.get(`job:${jobId}:fileNames`);
  return result as FileNames | null;
}

export async function setFiles(jobId: string, files: Files): Promise<void> {
  await kv.set(`job:${jobId}:files`, files);
}

export async function setStatus(jobId: string, status: Status): Promise<void> {
  await kv.set(`job:${jobId}:status`, status);
}

export async function setResult(jobId: string, result: Result): Promise<void> {
  await kv.set(`job:${jobId}:result`, result);
}

export async function setSearchableData(jobId: string, data: SearchableTestItem[]): Promise<void> {
  await kv.set(`job:${jobId}:searchableData`, data);
}

export async function setFileNames(jobId: string, fileNames: FileNames): Promise<void> {
  await kv.set(`job:${jobId}:fileNames`, fileNames);
}

export async function cleanupJob(jobId: string): Promise<void> {
  console.log(`[KV Cleanup] Cleaning up job: ${jobId}. Preserving searchableData and fileNames.`);
  await Promise.all([
    kv.del(`job:${jobId}:files`),
    kv.del(`job:${jobId}:status`),
    kv.del(`job:${jobId}:result`),
    // kv.del(`job:${jobId}:searchableData`), // Do NOT delete searchableData here
    // kv.del(`job:${jobId}:fileNames`),      // Do NOT delete fileNames here
  ]);
} 