import React, { useState } from "react";
import CodeEditor from "./components/CodeEditor";
import DebugTimeline from "./components/DebugTimeline";
import RecursionTree from "./components/RecursionTree";
import VariablesPanel from "./components/VariablesPanel";
import { callDebugAPI } from "./lib/api";

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
      callHierarchy: []
    }, 
    success: false 
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
    <div className="container mx-auto px-4 py-8" style={{ maxWidth: '1200px', color: '#213547' }}>
      <h1 style={{ color: '#213547' }}>Visual Debugger</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Code Editor */}
        <div className="card">
          <CodeEditor 
            code={code} 
            setCode={setCode} 
            currentLine={getCurrentLine()} 
          />
          <div style={{ marginTop: '1rem' }}>
            <h2 style={{ color: '#213547' }}>Test Input</h2>
            <textarea
              placeholder="Enter test input (optional)..."
              value={testCase}
              onChange={(e) => setTestCase(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '0.5rem',
                marginTop: '0.5rem',
                height: '5rem',
                border: '1px solid #ccc',
                borderRadius: '0.25rem',
                color: '#213547'
              }}
            />
            <button 
              onClick={handleDebug} 
              disabled={loading}
              className="btn-primary"
              style={{ marginTop: '1rem' }}
            >
              {loading ? "Debugging..." : "Start Debugging"}
            </button>
            {error && (
              <p style={{ color: 'red', marginTop: '0.5rem' }}>
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Variables Panel */}
        <div className="card">
          <VariablesPanel 
            currentState={getCurrentDebugState()} 
          />
        </div>

        {/* Debug Timeline */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ color: '#213547' }}>Debug Timeline</h2>
            <div>
              <button 
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="btn-secondary"
                style={{ marginRight: '0.5rem' }}
              >
                Previous
              </button>
              <button 
                onClick={handleNext}
                disabled={currentStep >= (debugData.debugStates.debugStates.length - 1)}
                className="btn-secondary"
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

        {/* Recursion Tree */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <RecursionTree
            debugData={debugData.debugStates}
            currentStep={currentStep}
            onStepChange={handleStepChange}
          />
        </div>
      </div>
    </div>
  );
};

export default App;