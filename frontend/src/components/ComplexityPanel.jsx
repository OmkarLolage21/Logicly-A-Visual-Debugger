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
            This function uses recursion which affects the space complexity due to call stack usage.
          </p>
        </div>
      )}

      {complexity.has_dp && (
        <div className="mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
          <h3 className="text-sm font-medium text-indigo-800 mb-1">
            Dynamic Programming Pattern Detected
          </h3>
          <p className="text-sm text-indigo-600">
            This solution uses dynamic programming with tabulation (bottom-up approach).
          </p>
        </div>
      )}

      {complexity.has_loops && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Loop Analysis
          </h3>
          <div className="space-y-2">
            {complexity.loop_details.map((loop, index) => (
              <div key={index} className="flex items-start space-x-2">
                <span
                  className={`inline-block w-4 h-4 rounded-full mt-1 
                    ${loop.depth > 1 ? "bg-red-500" : "bg-yellow-500"}`}
                />
                <div>
                  <p className="text-sm">
                    <span className="font-medium">
                      {loop.type === 'for' ? 'For Loop' : 'While Loop'}
                    </span>
                    {loop.range_args && ` with ${loop.range_args} range arguments`}
                  </p>
                  <p className="text-xs text-gray-500">
                    Nesting Level: {loop.depth}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {complexity.max_nested_depth > 1 && (
            <p className="mt-2 text-sm text-amber-600">
              ⚠️ Maximum nesting depth of {complexity.max_nested_depth} detected, which impacts time complexity.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ComplexityPanel;