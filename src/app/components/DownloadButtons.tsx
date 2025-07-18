import React from "react";
import { Download } from "lucide-react";

interface DownloadButtonsProps {
  onDownloadJson: () => void;
  onDownloadCsv: () => void;
}

export default function DownloadButtons({ onDownloadJson, onDownloadCsv }: DownloadButtonsProps) {
  return (
    <div className="flex gap-2">
      <button
        onClick={onDownloadJson}
        className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors"
      >
        <Download className="h-4 w-4" />
        <span>Download JSON</span>
      </button>
      <button
        onClick={onDownloadCsv}
        className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors"
      >
        <Download className="h-4 w-4" />
        <span>Download CSV</span>
      </button>
    </div>
  );
} 