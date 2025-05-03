import React from "react";

const ComplexityPanel = ({ complexity }) => {
  if (!complexity) {
    return (
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Complexity Analysis</h2>
        <p className="text-gray-500">No complexity data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-lg font-semibold mb-4">Complexity Analysis</h2>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-1">
            Time Complexity
          </h3>
          <p className="text-2xl font-bold text-blue-600">{complexity.time}</p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-green-800 mb-1">
            Space Complexity
          </h3>
          <p className="text-2xl font-bold text-green-600">
            {complexity.space}
          </p>
        </div>
      </div>

      {complexity.has_recursion && (
        <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
          <h3 className="text-sm font-medium text-purple-800 mb-1">
            Recursion Detected
          </h3>
          <p className="text-sm text-purple-600">
            This function uses recursion which typically has O(n) space
            complexity (due to call stack) and O(2^n) time complexity in worst
            case.
          </p>
        </div>
      )}

      {complexity.has_loops && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Loop Details
          </h3>
          <div className="space-y-2">
            {complexity.loop_details.map((loop, index) => (
              <div key={index} className="flex items-start">
                <span
                  className={`inline-block w-4 h-4 rounded-full mt-1 mr-2 
                  ${loop.nesting_level > 1 ? "bg-red-500" : "bg-yellow-500"}`}
                ></span>
                <div>
                  <p className="text-sm font-mono">{loop.line.trim()}</p>
                  <p className="text-xs text-gray-500">
                    Nesting level: {loop.nesting_level}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplexityPanel;
