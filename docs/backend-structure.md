## 📄 `backend-structure.md` — Backend & KV Schema

### 1  Key patterns in Vercel KV (TTL = 86 400 s)

| Purpose        | Key pattern       | Value                                                   |
| -------------- | ----------------- | ------------------------------------------------------- |
| Status         | `job:<id>:status` | `{ phase:"uploading" | "extracting" | "ai" | "complete" | "error", message?:string, progress:number }` |
| File buffers   | `job:<id>:files`  | `{ base:string, updated?:string, tests:string }` base64 |
| Result         | `job:<id>:result` | `{ requirements:[], testcases:[], links:[] }`           |
| Cleanup marker | `job:<id>:done`   | `"true"` set just before deletion                       |

### 2  API routes

| Method & path         | Auth                         | Responsibility                                                                                             |
| --------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **POST /api/submit**  | Public                       | Save files to KV, set status `extracting`, kick off worker, return `{jobId}`                               |
| **POST /api/process** | Bearer `INTERNAL_API_SECRET` | Worker: extract text → build single Gemini prompt → call API → validate → store result → status `complete` |
| **GET /api/status**   | Public                       | Read status key, return JSON                                                                               |
| **GET /api/result**   | Public                       | Return result key, then `del` all keys for that job                                                        |

### 3  Worker outline (`src/app/api/process/route.ts`)

```ts
1. const { baseFsd, updatedFsd, testsCsv } = await restoreFiles(jobId);
2. const baseText     = await parseDocument(baseFsd);
   const updatedText  = updatedFsd ? await parseDocument(updatedFsd) : "";
   const tests        = await parseCsv(testsCsv);               // array of rows
3. const fullPrompt   = buildMatcherPrompt(baseText, updatedText, tests);
4. const { content }  = await gemini.generateContent({ contents:[{role:"user", parts:[{text: fullPrompt}]}], response_format:{type:"json_object"} });
5. validateJson(content);
6. await kv.set(`job:${id}:result`, content);
```

`buildMatcherPrompt` inlines both specs and the CSV header + each test row into a single blocked-text section, then instructs Gemini to output the exact `{requirements, testcases, links}` schema. No embedding call is used anywhere.
