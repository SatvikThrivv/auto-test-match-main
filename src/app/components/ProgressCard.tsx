import React from "react";
import { LoaderCircle, AlertTriangle, RotateCw } from "lucide-react";

interface ProgressCardProps {
  jobId: string;
  phase: string;
  error?: string;
  onRetry?: () => void;
}

export default function ProgressCard({ jobId, phase, error, onRetry }: ProgressCardProps) {
  const getPhaseText = () => {
    switch (phase) {
      case "uploading": return "Uploading files...";
      case "extracting": return "Extracting spec text...";
      case "ai": return "Analyzing with AI...";
      case "complete": return "Finalizing results...";
      default: return phase;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto flex flex-col gap-6 items-center border border-slate-200">
      <div className="text-slate-800 text-lg font-semibold">Job ID: {jobId}</div>
      
      {error ? (
        <>
          <AlertTriangle className="h-12 w-12 text-red-600" />
          <div className="text-red-600 font-bold text-center">{error}</div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-6 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors duration-200"
            >
              <RotateCw className="h-4 w-4" />
              Try again
            </button>
          )}
        </>
      ) : (
        <>
          <div className="w-full">
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-teal-600 transition-all duration-500 ease-in-out" 
                style={{ 
                  width: phase === "ai" ? "100%" : "0%",
                  animation: phase === "ai" ? "pulse 2s infinite" : "none"
                }} 
              />
            </div>
            <div className="mt-2 text-sm text-slate-500 text-center">
              {getPhaseText()}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LoaderCircle className="h-8 w-8 text-teal-600 animate-spin" />
            <div className="text-slate-700 font-medium">{getPhaseText()}</div>
          </div>
        </>
      )}
    </div>
  );
} 