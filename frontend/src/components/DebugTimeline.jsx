import React from "react";
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import CallMadeIcon from '@mui/icons-material/CallMade';
import CallReceivedIcon from '@mui/icons-material/CallReceived';

const DebugTimeline = ({ debugStates, currentStep, onStepChange }) => {
  if (!debugStates || debugStates.length === 0) {
    return <p style={{ color: '#666' }}>No debug data available</p>;
  }

  const handleSliderChange = (event) => {
    onStepChange(parseInt(event.target.value));
  };

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'step':
        return <TrendingFlatIcon fontSize="small" />;
      case 'call':
        return <CallMadeIcon fontSize="small" />;
      case 'return':
        return <CallReceivedIcon fontSize="small" />;
      default:
        return <TrendingFlatIcon fontSize="small" />;
    }
  };

  const getEventStyles = (eventType, isActive) => {
    const baseStyle = {
      padding: '0.25rem 0.5rem',
      borderRadius: '0.25rem',
      fontSize: '0.75rem',
      border: '1px solid',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      whiteSpace: 'nowrap',
      marginRight: '0.25rem'
    };

    if (isActive) {
      return {
        ...baseStyle,
        backgroundColor: '#0078d4',
        color: 'white',
        borderColor: '#005a9e'
      };
    }

    switch (eventType) {
      case 'step':
        return {
          ...baseStyle,
          backgroundColor: '#f3f4f6',
          color: '#1f2937',
          borderColor: '#d1d5db'
        };
      case 'call':
        return {
          ...baseStyle,
          backgroundColor: '#dbeafe',
          color: '#1e40af',
          borderColor: '#bfdbfe'
        };
      case 'return':
        return {
          ...baseStyle,
          backgroundColor: '#d1fae5',
          color: '#065f46',
          borderColor: '#a7f3d0'
        };
      case 'exception':
        return {
          ...baseStyle,
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          borderColor: '#fecaca'
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: '#f3f4f6',
          color: '#1f2937',
          borderColor: '#d1d5db'
        };
    }
  };

  return (
    <div style={{ color: '#213547' }}>
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="range"
          min="0"
          max={debugStates.length - 1}
          value={currentStep}
          onChange={handleSliderChange}
          style={{ width: '100%', height: '0.5rem', backgroundColor: '#e5e7eb', borderRadius: '0.25rem' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
          <span>Step 1</span>
          <span>Step {debugStates.length}</span>
        </div>
      </div>

      <div style={{ display: 'flex', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {debugStates.map((state, index) => (
          <div
            key={index}
            onClick={() => onStepChange(index)}
            style={{
              ...getEventStyles(state.eventType, index === currentStep),
              opacity: Math.abs(index - currentStep) > 5 ? 0.6 : 1
            }}
          >
            <span style={{ marginRight: '0.25rem' }}>{getEventIcon(state.eventType)}</span>
            {state.function}:{state.line}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem', color: '#213547' }}>
        <div>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#4b5563', marginBottom: '0.25rem' }}>Current Function:</h3>
          <p style={{ color: '#213547' }}>{debugStates[currentStep]?.function || 'None'}</p>
        </div>
        <div>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#4b5563', marginBottom: '0.25rem' }}>Line Number:</h3>
          <p style={{ color: '#213547' }}>{debugStates[currentStep]?.line || 'N/A'}</p>
        </div>
        <div>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#4b5563', marginBottom: '0.25rem' }}>Event Type:</h3>
          <p style={{ color: '#213547', textTransform: 'capitalize' }}>{debugStates[currentStep]?.eventType || 'step'}</p>
        </div>
        <div>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#4b5563', marginBottom: '0.25rem' }}>Stack Depth:</h3>
          <p style={{ color: '#213547' }}>{debugStates[currentStep]?.stackDepth || 0}</p>
        </div>

        {debugStates[currentStep]?.returnValue !== undefined && (
          <div style={{ gridColumn: 'span 2' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#4b5563', marginBottom: '0.25rem' }}>Return Value:</h3>
            <p style={{ color: '#047857' }}>{debugStates[currentStep]?.returnValue}</p>
          </div>
        )}

        {debugStates[currentStep]?.output && (
          <div style={{ gridColumn: 'span 2' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#4b5563', marginBottom: '0.25rem' }}>Output:</h3>
            <pre style={{ 
              backgroundColor: 'black', 
              color: 'white', 
              padding: '0.5rem', 
              borderRadius: '0.25rem',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              whiteSpace: 'pre-wrap'
            }}>
              {debugStates[currentStep].output}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugTimeline;