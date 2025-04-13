import React, { useState } from "react";
import { motion } from "framer-motion";
import CodeEditor from "./components/CodeEditor";
import DebugTimeline from "./components/DebugTimeline";
import RecursionTree from "./components/RecursionTree";
import VariablesPanel from "./components/VariablesPanel";
import RecursionAnalytics from "./components/RecursionAnalytics";
import { callDebugAPI } from "./lib/api";
import ComplexityPanel from "./components/ComplexityPanel";

const App = () => {
  const [code, setCode] = useState(
    `def fact(n):
    # Base case
    if n == 1:
        return 1
    # Recursive case
    else:
        return n * fact(n-1)
        
# Call factorial function with n=5
result = fact(5)
print(result)
`
  );
  const [testCase, setTestCase] = useState("");
  const [debugData, setDebugData] = useState({
    debugStates: {
      debugStates: [],
      callHierarchy: [],
    },
    success: false,
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDebug = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await callDebugAPI(code, testCase);
      if (response && response.success) {
        setDebugData(response);
        setCurrentStep(0);
      } else {
        setError("Debugging failed. Please check your code and try again.");
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStepChange = (step) => {
    setCurrentStep(step);
  };

  const handleNext = () => {
    if (currentStep < debugData.debugStates.debugStates.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getCurrentDebugState = () => {
    return debugData.debugStates.debugStates[currentStep] || {};
  };

  const getCurrentLine = () => {
    const state = getCurrentDebugState();
    return state?.line || null;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 py-8 bg-gray-50 min-h-screen"
      style={{ maxWidth: "1400px" }}
    >
      <motion.h1
        initial={{ y: -20 }}
        animate={{ y: 0 }}
        className="text-4xl font-bold mb-8 text-center text-indigo-900"
      >
        Logicly Visual Debugger
      </motion.h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ x: -20 }}
          animate={{ x: 0 }}
          className="space-y-6"
        >
          <div className="bg-white rounded-xl shadow-lg p-6">
            <CodeEditor
              code={code}
              setCode={setCode}
              currentLine={getCurrentLine()}
            />
            <div className="mt-4">
              <h2 className="text-lg font-semibold mb-2">Test Input</h2>
              <textarea
                placeholder="Enter test input (optional)..."
                value={testCase}
                onChange={(e) => setTestCase(e.target.value)}
                className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                onClick={handleDebug}
                disabled={loading}
                className="mt-4 w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400"
              >
                {loading ? "Debugging..." : "Start Debugging"}
              </button>
              {error && (
                <div className="mt-3 text-red-600 bg-red-50 p-3 rounded-lg">
                  {error}
                </div>
              )}
            </div>
          </div>
          <ComplexityPanel complexity={debugData.debugStates?.complexity} />
          <motion.div
            initial={{ x: -20 }}
            animate={{ x: 0 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <RecursionAnalytics
              debugData={debugData.debugStates}
              currentStep={currentStep}
            />
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ x: 20 }}
          animate={{ x: 0 }}
          className="space-y-6"
        >
          <div className="bg-white rounded-xl shadow-lg p-6">
            <VariablesPanel currentState={getCurrentDebugState()} />
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Debug Timeline</h2>
              <div className="space-x-2">
                <button
                  onClick={handlePrev}
                  disabled={currentStep === 0}
                  className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={handleNext}
                  disabled={
                    currentStep >= debugData.debugStates.debugStates.length - 1
                  }
                  className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
            <DebugTimeline
              debugStates={debugData.debugStates.debugStates}
              currentStep={currentStep}
              onStepChange={handleStepChange}
            />
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <RecursionTree
              debugData={debugData.debugStates}
              currentStep={currentStep}
              onStepChange={handleStepChange}
            />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default App;
