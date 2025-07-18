"use client";

import { useState } from "react";
import { useStore } from "./store";
import MultiFileSelector from "./components/MultiFileSelector";
import RequirementRow from "./components/RequirementRow";
import CoverageMetrics from "./components/CoverageMetrics";
import SearchableTestCaseView from "./components/SearchableTestCaseView";
import { Result as KvResult, RequirementInResult, LinkInResult, TestCaseInResult } from "@/app/utils/kv";

interface DummyLink {
  id: string;
  text: string;
  confidence: number;
  explanation: string;
  coverageAreas: string[];
  gaps: string[];
}

interface RequirementForRow extends RequirementInResult {
  links: DummyLink[];
}

function aggregateResults(results: KvResult[]): KvResult {
  const aggregated: KvResult = {
    requirements: [],
    testcases: [],
    links: [],
    coverageMetrics: {
      totalRequirements: 0,
      coveredRequirements: 0,
      partiallyCoveredRequirements: 0,
      uncoveredRequirements: 0,
      coveragePercentage: 0,
      highRiskUncovered: 0,
      mediumRiskUncovered: 0,
      lowRiskUncovered: 0,
    },
    recommendations: [],
  };

  results.forEach((res) => {
    aggregated.requirements.push(...res.requirements);
    aggregated.testcases.push(...res.testcases);
    aggregated.links.push(...res.links);
    aggregated.recommendations.push(...res.recommendations);

    // Sum metrics
    const m = res.coverageMetrics;
    aggregated.coverageMetrics.totalRequirements += m.totalRequirements;
    aggregated.coverageMetrics.coveredRequirements += m.coveredRequirements;
    aggregated.coverageMetrics.partiallyCoveredRequirements += m.partiallyCoveredRequirements;
    aggregated.coverageMetrics.uncoveredRequirements += m.uncoveredRequirements;
    aggregated.coverageMetrics.highRiskUncovered += m.highRiskUncovered;
    aggregated.coverageMetrics.mediumRiskUncovered += m.mediumRiskUncovered;
    aggregated.coverageMetrics.lowRiskUncovered += m.lowRiskUncovered;
  });

  if (aggregated.coverageMetrics.totalRequirements > 0) {
    aggregated.coverageMetrics.coveragePercentage =
      (aggregated.coverageMetrics.coveredRequirements / aggregated.coverageMetrics.totalRequirements) * 100;
  }

  return aggregated;
}

export default function Home() {
  const { view, setView } = useStore();

  // Local state for multi-job workflow
  const [combinedResult, setCombinedResult] = useState<KvResult | null>(null);
  const [jobIds, setJobIds] = useState<string[]>([]);

  const handleMultiComplete = (completedResults: Array<{ jobId: string; result: KvResult }>) => {
    setCombinedResult(aggregateResults(completedResults.map((r) => r.result)));
    setJobIds(completedResults.map((r) => r.jobId));
    setView("results");
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        {view === "upload" && (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold text-slate-800">
                AutoTestMatch
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Upload multiple FSDs and their corresponding test cases to analyze coverage across versions.
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-200">
              <MultiFileSelector onComplete={handleMultiComplete} />
            </div>
          </div>
        )}

        {view === "results" && combinedResult && (
          <div className="space-y-8">
            <SearchableTestCaseView jobIds={jobIds} />

            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold text-slate-800">
                  Coverage Analysis
                </h1>
                <p className="text-lg text-slate-600">
                  Review the analysis results and download the report
                </p>
              </div>
              {/* Download functionality can be added per-result if needed */}
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-200">
              <CoverageMetrics
                metrics={combinedResult.coverageMetrics}
                recommendations={combinedResult.recommendations}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-2xl font-semibold text-slate-800 mb-6">
                Requirements Analysis
              </h3>
              {combinedResult.requirements.map((requirement: RequirementInResult) => {
                const requirementWithLinks: RequirementForRow = { ...requirement, links: [] };
                const relatedLinks = combinedResult.links
                  .filter((link: LinkInResult) => link.requirementId === requirement.id)
                  .map((link: LinkInResult) => {
                    const testCase = combinedResult.testcases.find(
                      (tc: TestCaseInResult) => tc.id === link.testcaseId
                    );
                    return {
                      id: link.id,
                      text: testCase?.text || "",
                      confidence: link.confidence,
                      explanation: link.explanation,
                      coverageAreas: link.coverageAreas,
                      gaps: link.gaps
                    };
                  });

                return (
                  <RequirementRow
                    key={requirement.id}
                    requirement={requirementWithLinks}
                    links={relatedLinks}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
