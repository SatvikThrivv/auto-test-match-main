import React from "react";

interface CoverageMetricsProps {
  metrics: {
    totalRequirements: number;
    coveredRequirements: number;
    partiallyCoveredRequirements: number;
    uncoveredRequirements: number;
    coveragePercentage: number;
    highRiskUncovered: number;
    mediumRiskUncovered: number;
    lowRiskUncovered: number;
  };
  recommendations: Array<{
    requirementId: string;
    priority: "high" | "medium" | "low";
    suggestion: string;
    impact: string;
  }>;
}

export default function CoverageMetrics({ metrics, recommendations }: CoverageMetricsProps) {
  const getPriorityColor = (priority: "high" | "medium" | "low") => {
    switch (priority) {
      case "high": return "text-red-600";
      case "medium": return "text-amber-600";
      case "low": return "text-green-600";
      default: return "text-slate-600";
    }
  };

  return (
    <div className="space-y-6">
      {/* Coverage Overview */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-4">Coverage Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-700">{metrics.totalRequirements}</div>
            <div className="text-sm text-slate-500">Total Requirements</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{metrics.coveredRequirements}</div>
            <div className="text-sm text-slate-500">Fully Covered</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{metrics.partiallyCoveredRequirements}</div>
            <div className="text-sm text-slate-500">Partially Covered</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{metrics.uncoveredRequirements}</div>
            <div className="text-sm text-slate-500">Uncovered</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="w-full bg-slate-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${metrics.coveragePercentage}%` }}
            ></div>
          </div>
          <div className="text-center mt-2 text-sm text-slate-600">
            Overall Coverage: {metrics.coveragePercentage.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Risk Analysis */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-4">Risk Analysis</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{metrics.highRiskUncovered}</div>
            <div className="text-sm text-slate-500">High Risk Uncovered</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{metrics.mediumRiskUncovered}</div>
            <div className="text-sm text-slate-500">Medium Risk Uncovered</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{metrics.lowRiskUncovered}</div>
            <div className="text-sm text-slate-500">Low Risk Uncovered</div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-4">Recommendations</h3>
        <div className="space-y-4">
          {recommendations.map((rec, index) => (
            <div key={index} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Requirement {rec.requirementId}</span>
                <span className={`text-sm ${getPriorityColor(rec.priority)}`}>
                  Priority: {rec.priority}
                </span>
              </div>
              <div className="text-sm text-slate-600 mb-2">{rec.suggestion}</div>
              <div className="text-sm text-slate-500">
                <span className="font-medium">Impact:</span> {rec.impact}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 