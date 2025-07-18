import { getDocumentProxy, extractText as extractPdfText } from 'unpdf';
import mammoth from 'mammoth';
import { parse } from 'csv-parse/sync';

export async function parseDocument(buffer: Buffer): Promise<string> {
  // Check if it's a PDF
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    // Use unpdf to extract text from PDF
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractPdfText(pdf, { mergePages: true });
    return text;
  }
  
  // Assume it's a DOCX
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export function parseCsv(buffer: Buffer): string[][] {
  return parse(buffer.toString(), {
    skip_empty_lines: true,
    trim: true,
  });
}

export function buildMatcherPrompt(
  baseText: string,
  updatedText: string,
  tests: string[][]
): string {
  const headers = tests[0];
  const testRows = tests.slice(1);

  return `You are a test coverage analyzer. Analyze the following functional specification documents and test cases to:
1. Include every requirement from the base and updated FSDs (none omitted, none duplicated, none madeup on your own)
2. Attach a coverage label of Full / Partial / None to each by applying the thresholds:
   - Full ≥ 0.90
   - Partial ≥ 0.50
   - None < 0.50
3. List all matching test cases with three-decimal confidence scores sorted high-to-low
4. Derive the summary block so that:
   - full + partial + none = total_requirements
   - coverage_pct equals that ratio to one decimal
   - no value is negative
5. Exclude any retired requirements or obsolete tests
6. Output ONLY the validated, internally consistent JSON—no markdown code fences, no explanatory prose, no additional or reordered keys, and ensure the text is directly parsable by JSON.parse without preprocessing
7. Any numeric value must be a number type (not a string) and non-negative; any decimal values must use a dot as decimal separator and no more than three fractional digits
8. Guarantee that every requirement listed in the FSD(s) appears exactly once in the "requirements" array and that every requirement has at least one corresponding entry in the "links" array (use matchType "none" with confidence 0.000 if genuinely uncovered)
9. Preserve all IDs exactly as provided—do NOT rename or invent identifiers
10. If a field value is genuinely unavailable use an empty string "" (for strings) or 0 (for numbers) rather than omitting the field
11. Give equal consideration to edge-case requirements such as error handling, performance ceilings, extreme data sizes, and security constraints—these must not be skipped or grouped under generic items

Base FSD:
${baseText}

${updatedText ? `Updated FSD:
${updatedText}` : ""}

Test Cases:
Headers: ${headers.join(", ")}
${testRows.map(row => row.join(", ")).join("\n")}

Output a JSON object with this exact schema:
{
  "requirements": [
    {
      "id": "string",
      "text": "string",
      "type": "functional" | "non-functional",
      "status": "new" | "modified" | "stable" | "deprecated",
      "coverage": "full" | "partial" | "none"
    }
  ],
  "testcases": [
    {
      "id": "string",
      "text": "string"
    }
  ],
  "links": [
    {
      "id": "string",
      "requirementId": "string",
      "testcaseId": "string",
      "confidence": number
    }
  ],
  "summary": {
    "total_requirements": number,
    "full": number,
    "partial": number,
    "none": number,
    "coverage_pct": number
  }
}`;
}

interface Files {
  base: string;
  updated?: string;
  tests: string;
}

interface ParsedFiles {
  base: string;
  updated: string;
  tests: string[][];
}

export async function parseFiles(files: Files): Promise<ParsedFiles> {
  const baseBuffer = Buffer.from(files.base, "base64");
  const updatedBuffer = files.updated ? Buffer.from(files.updated, "base64") : null;
  const testsBuffer = Buffer.from(files.tests, "base64");

  const baseText = await parseDocument(baseBuffer);
  const updatedText = updatedBuffer ? await parseDocument(updatedBuffer) : "";
  const tests = parseCsv(testsBuffer);

  return {
    base: baseText,
    updated: updatedText,
    tests,
  };
} 