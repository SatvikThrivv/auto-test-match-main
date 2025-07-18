import React, { useCallback, useState } from "react";
import { FileUp, LoaderCircle } from "lucide-react";

interface FileSelectorProps {
  onSubmit: (formData: FormData) => Promise<void>;
  isLoading: boolean;
}

export default function FileSelector({ onSubmit, isLoading }: FileSelectorProps) {
  const [baseFile, setBaseFile] = useState<File | null>(null);
  const [updatedFile, setUpdatedFile] = useState<File | null>(null);
  const [testsFile, setTestsFile] = useState<File | null>(null);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    setFile: (file: File | null) => void
  ) => {
    const file = event.target.files?.[0] || null;
    setFile(file);
  };

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>, setFile: (file: File | null) => void) => {
      event.preventDefault();
      const file = event.dataTransfer.files[0];
      if (file) {
        const extension = file.name.split(".").pop()?.toLowerCase();
        if (extension === "pdf" || extension === "docx" || extension === "csv") {
          setFile(file);
        }
      }
    },
    []
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!baseFile || !testsFile) return;

    const formData = new FormData();
    formData.append("baseFsd", baseFile);
    if (updatedFile) {
      formData.append("updatedFsd", updatedFile);
    }
    formData.append("testsCsv", testsFile);

    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div
          className="border-2 border-dashed border-slate-300 rounded-lg p-6 hover:border-teal-600 transition-colors"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => onDrop(e, setBaseFile)}
        >
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Base FSD
          </label>
          <div className="flex items-center gap-2">
            <FileUp className="h-5 w-5 text-slate-400" />
            <input
              type="file"
              accept=".pdf,.docx"
              onChange={(e) => handleFileChange(e, setBaseFile)}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
              disabled={isLoading}
            />
          </div>
          {baseFile && (
            <p className="mt-2 text-sm text-green-600">{baseFile.name}</p>
          )}
        </div>

        <div
          className="border-2 border-dashed border-slate-300 rounded-lg p-6 hover:border-teal-600 transition-colors"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => onDrop(e, setUpdatedFile)}
        >
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Updated FSD (Optional)
          </label>
          <div className="flex items-center gap-2">
            <FileUp className="h-5 w-5 text-slate-400" />
            <input
              type="file"
              accept=".pdf,.docx"
              onChange={(e) => handleFileChange(e, setUpdatedFile)}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
              disabled={isLoading}
            />
          </div>
          {updatedFile && (
            <p className="mt-2 text-sm text-green-600">{updatedFile.name}</p>
          )}
        </div>

        <div
          className="border-2 border-dashed border-slate-300 rounded-lg p-6 hover:border-teal-600 transition-colors sm:col-span-2"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => onDrop(e, setTestsFile)}
        >
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Tests CSV
          </label>
          <div className="flex items-center gap-2">
            <FileUp className="h-5 w-5 text-slate-400" />
            <input
              type="file"
              accept=".csv"
              onChange={(e) => handleFileChange(e, setTestsFile)}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
              disabled={isLoading}
            />
          </div>
          {testsFile && (
            <p className="mt-2 text-sm text-green-600">{testsFile.name}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!baseFile || !testsFile || isLoading}
          className={`px-6 py-3 rounded-lg font-medium text-white flex items-center gap-2 ${!baseFile || !testsFile || isLoading ? 'bg-slate-300 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700'}`}
        >
          {isLoading ? (
            <>
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Analyzing...
            </>
          ) : (
            'Analyze Coverage'
          )}
        </button>
      </div>
    </form>
  );
}