import React from "react";

const VariablesPanel = ({ currentState }) => {
  if (!currentState) {
    return (
      <div>
        <h2 style={{ color: "#213547" }}>Variables</h2>
        <p style={{ color: "#666" }}>No debug data available</p>
      </div>
    );
  }

  const { variables, function: functionName, callStack } = currentState;

  return (
    <div>
      <h2 style={{ color: "#213547" }}>Variables</h2>

      <h3
        style={{
          color: "#213547",
          fontSize: "0.875rem",
          fontWeight: "500",
          marginBottom: "0.5rem",
        }}
      >
        Function: {functionName}
      </h3>

      <div
        style={{
          marginBottom: "1rem",
          border: "1px solid #eee",
          borderRadius: "0.25rem",
          overflow: "hidden",
          backgroundColor: "white",
        }}
      >
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {Object.entries(variables || {}).map(([name, value], index) => (
            <li
              key={name}
              style={{
                padding: "0.75rem",
                borderBottom:
                  index < Object.keys(variables).length - 1
                    ? "1px solid #eee"
                    : "none",
              }}
            >
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: "0.875rem",
                  color: "#213547",
                }}
              >
                {name}
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: "0.75rem",
                  color: "#666",
                  wordBreak: "break-all",
                }}
              >
                {JSON.stringify(value)}
              </div>
            </li>
          ))}
          {Object.keys(variables || {}).length === 0 && (
            <li style={{ padding: "0.75rem", color: "#666" }}>
              No variables at this step
            </li>
          )}
        </ul>
      </div>

      <h3
        style={{
          color: "#213547",
          fontSize: "0.875rem",
          fontWeight: "500",
          marginBottom: "0.5rem",
        }}
      >
        Call Stack
      </h3>

      <div
        style={{
          border: "1px solid #eee",
          borderRadius: "0.25rem",
          overflow: "hidden",
          backgroundColor: "white",
        }}
      >
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {(callStack || []).map((call, index) => (
            <li
              key={index}
              style={{
                padding: "0.75rem",
                borderBottom:
                  index < callStack.length - 1 ? "1px solid #eee" : "none",
                backgroundColor:
                  index === callStack.length - 1 ? "#f0f7ff" : "white",
              }}
            >
              <div
                style={{
                  color: "#213547",
                  fontWeight: index === callStack.length - 1 ? "500" : "normal",
                }}
              >
                {call.function}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#666" }}>
                Line: {call.line}
              </div>
            </li>
          ))}
          {(!callStack || callStack.length === 0) && (
            <li style={{ padding: "0.75rem", color: "#666" }}>
              Call stack empty
            </li>
          )}
        </ul>
      </div>

      {currentState.eventType === "return" &&
        currentState.returnValue !== undefined && (
          <div
            style={{
              marginTop: "1rem",
              padding: "0.75rem",
              backgroundColor: "#f0fff4",
              border: "1px solid #c6f6d5",
              borderRadius: "0.25rem",
            }}
          >
            <span style={{ fontWeight: "500", color: "#276749" }}>
              Return Value: {JSON.stringify(currentState.returnValue)}
            </span>
          </div>
        )}
    </div>
  );
};
export default VariablesPanel;
