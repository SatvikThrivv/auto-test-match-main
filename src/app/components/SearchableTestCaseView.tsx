"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { SearchableTestItem } from '@/app/utils/kv';

// A simple debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

interface Props {
  jobIds: string[];
}

const SearchableTestCaseView: React.FC<Props> = ({ jobIds }) => {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500); // 500ms debounce delay
  const [results, setResults] = useState<SearchableTestItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSearchResults = useCallback(async (currentQuery: string) => {
    if (currentQuery.trim() === '') {
      setResults([]);
      setIsLoading(false);
      return;
    }

    if (jobIds.length === 0) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/search?jobIds=${jobIds.join(',')}&query=${encodeURIComponent(currentQuery)}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error: ${response.status}`);
      }
      const data: SearchableTestItem[] = await response.json();
      setResults(data);
    } catch (err) {
      console.error("Failed to fetch search results:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [jobIds]);

  useEffect(() => {
    fetchSearchResults(debouncedQuery);
  }, [debouncedQuery, fetchSearchResults]);

  return (
    <div className="mt-8 p-6 bg-white shadow-lg rounded-lg">
      <h2 className="text-2xl font-semibold mb-4 text-gray-700">Search Test Cases & Requirements</h2>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by feature or requirement (e.g., 'Transfer Limits', 'FX rate')"
        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow mb-6"
      />

      {isLoading && <p className="mt-4 text-gray-600">Searching...</p>}
      {error && <p className="mt-4 text-red-500">Error: {error}</p>}

      {!isLoading && !error && debouncedQuery && results.length === 0 && (
        <p className="mt-4 text-gray-600">No results found for &quot;{debouncedQuery}&quot;.</p>
      )}

      {results.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-xl font-medium text-gray-700">Results ({results.length}):</h3>
          {results.map((item) => (
            <div key={item.id} className="p-4 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow bg-slate-50">
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-lg font-semibold text-slate-800">
                  {item.fields?.ID || item.testCaseId || item.requirementText || "Unnamed Test Case"}
                </h4>
                {/* Confidence badge removed per user request */}
              </div>
              
              {item.requirementSource && (
                <div className="text-sm text-gray-500 mb-1">
                  <span className="font-medium">Requirement Source:</span> {item.requirementSource}
                </div>
              )}
              <div className="text-sm text-gray-500 mb-3">
                <span className="font-medium">Test Case Source:</span> {item.testCaseSource}
              </div>

              {item.fields && (
                <div className="mb-2">
                  <h5 className="text-sm font-medium text-slate-600 mb-1">Details:</h5>
                  <ul className="list-disc list-inside pl-4 text-sm text-slate-700 space-y-0.5">
                    {Object.entries(item.fields).map(([key, val]) => (
                      <li key={key}><span className="font-semibold">{key}:</span> {val}</li>
                    ))}
                  </ul>
                </div>
              )}

              {item.explanation && (
                <div className="mb-3">
                  <p className="text-sm text-slate-700">
                    <span className="font-medium text-slate-600">Explanation:</span> {item.explanation}
                  </p>
                </div>
              )}

              {item.coverageAreas && item.coverageAreas.length > 0 && (
                <div className="mb-2">
                  <h5 className="text-sm font-medium text-slate-600 mb-1">Coverage Areas:</h5>
                  <ul className="list-disc list-inside pl-4 text-sm text-slate-700 space-y-0.5">
                    {item.coverageAreas.map((area, index) => (
                      <li key={index}>{area}</li>
                    ))}
                  </ul>
                </div>
              )}

              {item.gaps && item.gaps.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-slate-600 mb-1">Gaps:</h5>
                  <ul className="list-disc list-inside pl-4 text-sm text-red-600 space-y-0.5">
                    {item.gaps.map((gap, index) => (
                      <li key={index}>{gap}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchableTestCaseView; 