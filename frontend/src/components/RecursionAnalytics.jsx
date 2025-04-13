import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";

const RecursionAnalytics = ({ debugData, currentStep }) => {
  if (
    !debugData ||
    !debugData.debugStates ||
    debugData.debugStates.length === 0
  ) {
    return (
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Recursion Analytics</h2>
        <p className="text-gray-500">No debug data available</p>
      </div>
    );
  }

  // Calculate function call statistics
  const functionCalls = {};
  const stackDepthOverTime = [];
  const returnValues = [];

  debugData.debugStates.forEach((state, index) => {
    // Track function calls
    if (state.function) {
      functionCalls[state.function] = (functionCalls[state.function] || 0) + 1;
    }

    // Track stack depth over time
    stackDepthOverTime.push({
      step: index + 1,
      depth: state.stackDepth || 0,
    });

    // Track return values
    if (state.returnValue !== undefined) {
      returnValues.push({
        function: state.function,
        value: state.returnValue,
      });
    }
  });

  // Prepare data for function call chart
  const functionCallData = Object.entries(functionCalls).map(
    ([name, count]) => ({
      name,
      calls: count,
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Recursion Analytics</h2>

        <div className="mb-6">
          <h3 className="text-md font-medium mb-2">
            Function Call Distribution
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <BarChart width={500} height={200} data={functionCallData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="calls" fill="#8884d8" />
            </BarChart>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-md font-medium mb-2">Stack Depth Over Time</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <LineChart width={500} height={200} data={stackDepthOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="step" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="depth"
                stroke="#82ca9d"
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </div>
        </div>

        <div>
          <h3 className="text-md font-medium mb-2">Execution Statistics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-indigo-50 p-4 rounded-lg">
              <p className="text-sm text-indigo-900">Total Steps</p>
              <p className="text-2xl font-bold text-indigo-700">
                {debugData.debugStates.length}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-900">Max Stack Depth</p>
              <p className="text-2xl font-bold text-green-700">
                {Math.max(...stackDepthOverTime.map((d) => d.depth))}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-purple-900">Function Calls</p>
              <p className="text-2xl font-bold text-purple-700">
                {Object.values(functionCalls).reduce((a, b) => a + b, 0)}
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-900">Return Values</p>
              <p className="text-2xl font-bold text-blue-700">
                {returnValues.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecursionAnalytics;
