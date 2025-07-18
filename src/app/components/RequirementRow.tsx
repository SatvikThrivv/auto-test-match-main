import React, { useState } from "react";
import { ChevronDown, ChevronUp, AlertTriangle, Flag } from "lucide-react";
import TestLinkList from "./TestLinkList";

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

interface RequirementRowProps {
  requirement: Requirement;
  links: Link[];
}

export default function RequirementRow({ requirement, links }: RequirementRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getChipColor = () => {
    switch (requirement.coverage) {
      case "full": return "bg-green-600";
      case "partial": return "bg-amber-600";
      case "none": return "bg-red-600";
      default: return "bg-slate-600";
    }
  };

  const getStatusColor = () => {
    switch (requirement.status) {
      case "new": return "text-green-600";
      case "modified": return "text-amber-600";
      case "deprecated": return "text-red-600";
      default: return "text-slate-600";
    }
  };

  const getPriorityColor = () => {
    switch (requirement.priority) {
      case "high": return "text-red-600";
      case "medium": return "text-amber-600";
      case "low": return "text-green-600";
      default: return "text-slate-600";
    }
  };

  const getRiskColor = () => {
    switch (requirement.risk) {
      case "high": return "text-red-600";
      case "medium": return "text-amber-600";
      case "low": return "text-green-600";
      default: return "text-slate-600";
    }
  };

  return (
    <div className="border border-slate-200 rounded-lg mb-4 overflow-hidden hover:shadow-md transition-shadow duration-200">
      <button
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors duration-200"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4 flex-1">
          <div className="flex flex-col items-center gap-1 min-w-[100px]">
            <span className={`px-2 py-0.5 rounded text-xs text-white ${getChipColor()}`}>
              {requirement.coverage}
            </span>
            <span className={`text-xs ${getStatusColor()}`}>
              {requirement.status}
            </span>
          </div>
          
          <div className="flex flex-col gap-1 min-w-[120px]">
            <div className="flex items-center gap-1">
              <Flag className="h-4 w-4 text-slate-400" />
              <span className={`text-sm font-medium ${getPriorityColor()}`}>
                {requirement.priority} Priority
              </span>
            </div>
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-slate-400" />
              <span className={`text-sm font-medium ${getRiskColor()}`}>
                {requirement.risk} Risk
              </span>
            </div>
          </div>

          <span className="font-medium text-slate-800 flex-1">{requirement.text}</span>
        </div>
        
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-400 flex-shrink-0" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-sm">
              <span className="text-slate-500">Type:</span>{" "}
              <span className="font-medium text-slate-700">{requirement.type}</span>
            </div>
            <div className="text-sm">
              <span className="text-slate-500">Priority:</span>{" "}
              <span className={`font-medium ${getPriorityColor()}`}>{requirement.priority}</span>
            </div>
            <div className="text-sm">
              <span className="text-slate-500">Risk:</span>{" "}
              <span className={`font-medium ${getRiskColor()}`}>{requirement.risk}</span>
            </div>
          </div>
          <TestLinkList links={links} />
        </div>
      )}
    </div>
  );
} 