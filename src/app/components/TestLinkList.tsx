import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Link {
  id: string;
  text: string;
  confidence: number;
  explanation: string;
  coverageAreas: string[];
  gaps: string[];
}

interface TestLinkListProps {
  links: Link[];
}

export default function TestLinkList({ links }: TestLinkListProps) {
  const [expandedLink, setExpandedLink] = useState<string | null>(null);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600";
    if (confidence >= 0.5) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-2">
      {links.map((link) => (
        <div key={link.id} className="border rounded-lg p-2">
          <button
            className="w-full flex items-center justify-between"
            onClick={() => setExpandedLink(expandedLink === link.id ? null : link.id)}
          >
            <div className="flex items-center gap-2">
              <span className="text-slate-700">{link.text}</span>
              <span className={`font-medium ${getConfidenceColor(link.confidence)}`}>
                {(link.confidence * 100).toFixed(0)}% match
              </span>
            </div>
            {expandedLink === link.id ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>

          {expandedLink === link.id && (
            <div className="mt-2 pl-2 space-y-2 text-sm">
              <div className="text-slate-600">
                <span className="font-medium">Explanation:</span> {link.explanation}
              </div>
              
              {link.coverageAreas.length > 0 && (
                <div>
                  <span className="font-medium text-green-600">Coverage Areas:</span>
                  <ul className="list-disc list-inside ml-2">
                    {link.coverageAreas.map((area, index) => (
                      <li key={index} className="text-slate-600">{area}</li>
                    ))}
                  </ul>
                </div>
              )}

              {link.gaps.length > 0 && (
                <div>
                  <span className="font-medium text-red-600">Coverage Gaps:</span>
                  <ul className="list-disc list-inside ml-2">
                    {link.gaps.map((gap, index) => (
                      <li key={index} className="text-slate-600">{gap}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
} 