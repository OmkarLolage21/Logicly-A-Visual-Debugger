import React, { useState } from "react";
import { motion } from "framer-motion";

const DPVisualizer = ({ dpData, currentStep }) => {
  const [viewMode, setViewMode] = useState("stepwise"); // or 'complete'

  if (!dpData?.dpTables) {
    return null;
  }

  const getCurrentTableState = () => {
    if (viewMode === "complete") {
      return dpData.dpTables;
    }

    // Get table state up to current step
    const updates = dpData.dpUpdates.filter(
      (update, idx) => idx <= currentStep
    );
    const latestState = {};

    for (const update of updates) {
      if (!latestState[update.table]) {
        latestState[update.table] = {
          ...dpData.dpTables[update.table],
          values: update.value,
        };
      } else {
        latestState[update.table].values = update.value;
      }
    }

    return latestState;
  };

  const renderTable = (tableName, tableData) => {
    const values = tableData.values;

    if (tableData.type === "dict") {
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Key
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(values).map(([key, value], idx) => (
                <motion.tr
                  key={key}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {key}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {JSON.stringify(value)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (tableData.type === "list") {
      if (tableData.dimensions.length === 1) {
        return (
          <div className="flex flex-wrap gap-2 p-4">
            {values.map((value, idx) => (
              <motion.div
                key={idx}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-blue-50 p-2 rounded-md"
              >
                {JSON.stringify(value)}
              </motion.div>
            ))}
          </div>
        );
      }

      return (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <tbody>
              {values.map((row, i) => (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                >
                  {row.map((cell, j) => (
                    <motion.td
                      key={j}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: (i * row.length + j) * 0.05 }}
                      className="border px-4 py-2 text-center"
                    >
                      {JSON.stringify(cell)}
                    </motion.td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  };

  const tables = getCurrentTableState();

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">DP Table Visualization</h2>
        <div className="space-x-2">
          <button
            onClick={() => setViewMode("stepwise")}
            className={`px-3 py-1 rounded ${
              viewMode === "stepwise"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            Stepwise
          </button>
          <button
            onClick={() => setViewMode("complete")}
            className={`px-3 py-1 rounded ${
              viewMode === "complete"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            Complete
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(tables).map(([tableName, tableData]) => (
          <div key={tableName} className="border rounded-lg p-4">
            <h3 className="text-md font-medium mb-3">{tableName}</h3>
            {renderTable(tableName, tableData)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DPVisualizer;
