import { create } from 'zustand';

interface Link {
  id: string;
  text: string;
  confidence: number;
  explanation: string;
  coverageAreas: string[];
  gaps: string[];
}

interface Requirement {
  id: string;
  text: string;
  type: "functional" | "non-functional";
  status: "new" | "modified" | "stable" | "deprecated";
  priority: "high" | "medium" | "low";
  risk: "high" | "medium" | "low";
  coverage: "full" | "partial" | "none";
  links: Link[];
}

interface TestCase {
  id: string;
  text: string;
  type: "positive" | "negative" | "edge-case" | "regression";
  complexity: "simple" | "moderate" | "complex";
}

interface CoverageMetrics {
  totalRequirements: number;
  coveredRequirements: number;
  partiallyCoveredRequirements: number;
  uncoveredRequirements: number;
  coveragePercentage: number;
  highRiskUncovered: number;
  mediumRiskUncovered: number;
  lowRiskUncovered: number;
}

interface Recommendation {
  requirementId: string;
  priority: "high" | "medium" | "low";
  suggestion: string;
  impact: string;
}

interface Result {
  requirements: Requirement[];
  testcases: TestCase[];
  links: {
    id: string;
    requirementId: string;
    testcaseId: string;
    confidence: number;
    explanation: string;
    coverageAreas: string[];
    gaps: string[];
  }[];
  coverageMetrics: CoverageMetrics;
  recommendations: Recommendation[];
}

interface Status {
  phase: "uploading" | "extracting" | "ai" | "complete" | "error";
  message?: string;
  progress: number;
}

interface Store {
  // Files
  baseFile: File | null;
  updatedFile: File | null;
  testsFile: File | null;
  setBaseFile: (file: File | null) => void;
  setUpdatedFile: (file: File | null) => void;
  setTestsFile: (file: File | null) => void;

  // Job
  jobId: string | null;
  setJobId: (id: string | null) => void;

  // Status
  status: Status | null;
  setStatus: (status: Status | null) => void;

  // Results
  result: Result | null;
  setResult: (result: Result | null) => void;

  // View
  view: "upload" | "processing" | "results";
  setView: (view: "upload" | "processing" | "results") => void;

  // Reset
  reset: () => void;
}

export const useStore = create<Store>((set) => ({
  // Files
  baseFile: null,
  updatedFile: null,
  testsFile: null,
  setBaseFile: (file) => set({ baseFile: file }),
  setUpdatedFile: (file) => set({ updatedFile: file }),
  setTestsFile: (file) => set({ testsFile: file }),

  // Job
  jobId: null,
  setJobId: (id) => set({ jobId: id }),

  // Status
  status: null,
  setStatus: (status) => set({ status }),

  // Results
  result: null,
  setResult: (result) => set({ result }),

  // View
  view: "upload",
  setView: (view) => set({ view }),

  // Reset
  reset: () =>
    set({
      baseFile: null,
      updatedFile: null,
      testsFile: null,
      jobId: null,
      status: null,
      result: null,
      view: "upload",
    }),
})); 