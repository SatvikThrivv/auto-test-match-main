"use client";

import React, { useState } from "react";
import { FileUp, Plus, LoaderCircle, Trash2 } from "lucide-react";
import { nanoid } from "nanoid";
import { Result as KvResult } from "@/app/utils/kv";

interface Pair {
  id: string;
  baseFile: File | null;
  testsFile: File | null;
  jobId?: string;
  phase?: string;
  error?: string;
  result?: KvResult;
}

interface MultiFileSelectorProps {
  onComplete: (results: Array<{ jobId: string; result: KvResult }>) => void;
}

export default function MultiFileSelector({ onComplete }: MultiFileSelectorProps) {
  const [pairs, setPairs] = useState<Pair[]>([{
    id: nanoid(),
    baseFile: null,
    testsFile: null,
  }]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const addPair = () => {
    setPairs([...pairs, { id: nanoid(), baseFile: null, testsFile: null }]);
  };

  const removePair = (id: string) => {
    if (pairs.length === 1) return; // keep at least one
    setPairs(pairs.filter((p) => p.id !== id));
  };

  const handleFileChange = (
    pairId: string,
    field: "base" | "tests",
    file: File | null
  ) => {
    setPairs((prev) =>
      prev.map((p) =>
        p.id === pairId ? { ...p, [field === "base" ? "baseFile" : "testsFile"]: file } : p
      )
    );
  };

  const submitAll = async (): Promise<void> => {
    // Validate
    const invalid = pairs.some((p) => !p.baseFile || !p.testsFile);
    if (invalid) {
      alert("Please select both FSD and Testcase CSV for every pair.");
      return;
    }

    setIsSubmitting(true);

    const updatedPairs: Pair[] = [...pairs];

    const processPair = async (pair: Pair): Promise<Pair> => {
      try {
        pair.phase = "uploading";
        setPairs([...updatedPairs]);

        const formData = new FormData();
        formData.append("baseFsd", pair.baseFile as File);
        formData.append("testsCsv", pair.testsFile as File);

        const submitRes = await fetch("/api/submit", {
          method: "POST",
          body: formData,
        });
        const submitData = await submitRes.json();

        if (!submitRes.ok) throw new Error(submitData.error || "Submit failed");

        pair.jobId = submitData.jobId;

        // Poll until complete or error
        while (true) {
          if (!pair.jobId) throw new Error("Missing job ID");
          const statusRes = await fetch(`/api/status?jobId=${pair.jobId}`);
          const statusData = await statusRes.json();
          if (!statusRes.ok) throw new Error(statusData.error || "Status error");

          pair.phase = statusData.phase;
          setPairs([...updatedPairs]);

          if (statusData.phase === "complete") {
            const resultRes = await fetch(`/api/result?jobId=${pair.jobId}`);
            const resultData = await resultRes.json();
            pair.result = resultData as KvResult;
            pair.phase = "complete";
            setPairs([...updatedPairs]);
            return pair;
          }

          if (statusData.phase === "error") {
            pair.error = statusData.message || "Processing error";
            setPairs([...updatedPairs]);
            return pair;
          }

          // wait 2s then loop
          await new Promise((res) => setTimeout(res, 2000));
        }
      } catch (err) {
        pair.error = (err as Error).message;
        setPairs([...updatedPairs]);
        return pair;
      }
    };

    const finalPairs = await Promise.all(updatedPairs.map(processPair));

    const successful = finalPairs.filter((p) => p.result).map((p) => ({ jobId: p.jobId!, result: p.result as KvResult }));
    onComplete(successful);
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      {pairs.map((pair, index) => (
        <div key={pair.id} className="relative grid grid-cols-2 gap-6 items-center border border-slate-200 rounded-lg p-4">
          {/* FSD column */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">FSD #{index + 1}</label>
            <div className="flex items-center gap-2">
              <FileUp className="h-5 w-5 text-slate-400" />
              <input
                type="file"
                accept=".pdf,.docx"
                disabled={isSubmitting}
                onChange={(e) => handleFileChange(pair.id, "base", e.target.files?.[0] || null)}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
              />
            </div>
            {pair.baseFile && <p className="mt-1 text-sm text-green-600">{pair.baseFile.name}</p>}
          </div>

          {/* Testcase column */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Test Cases CSV #{index + 1}</label>
            <div className="flex items-center gap-2">
              <FileUp className="h-5 w-5 text-slate-400" />
              <input
                type="file"
                accept=".csv"
                disabled={isSubmitting}
                onChange={(e) => handleFileChange(pair.id, "tests", e.target.files?.[0] || null)}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
              />
            </div>
            {pair.testsFile && <p className="mt-1 text-sm text-green-600">{pair.testsFile.name}</p>}
          </div>

          {/* Remove button */}
          {pairs.length > 1 && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => removePair(pair.id)}
              className="absolute -right-3 -top-3 bg-red-500 hover:bg-red-600 text-white rounded-full p-1">
              <Trash2 className="h-4 w-4" />
            </button>
          )}

          {/* Progress/Error display */}
          {(pair.phase && !pair.result) && (
            <div className="col-span-2 mt-3 text-sm text-slate-600 flex items-center gap-2">
              {pair.error ? (
                <span className="text-red-600">Error: {pair.error}</span>
              ) : (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin text-teal-600" />
                  <span>{pair.phase}...</span>
                </>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Add Pair Button */}
      <button
        type="button"
        onClick={addPair}
        disabled={isSubmitting}
        className="flex items-center gap-2 text-teal-700 hover:text-teal-900 font-medium"
      >
        <Plus className="h-4 w-4" />
        Add Pair
      </button>

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={submitAll}
          disabled={isSubmitting}
          className={`px-6 py-3 rounded-lg font-medium text-white flex items-center gap-2 ${isSubmitting ? 'bg-slate-300 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700'}`}
        >
          {isSubmitting ? (
            <>
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Analyzing...
            </>
          ) : (
            'Analyze Coverage'
          )}
        </button>
      </div>
    </div>
  );
} 