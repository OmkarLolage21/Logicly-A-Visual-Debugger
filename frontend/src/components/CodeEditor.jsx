import React, { useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";

const CodeEditor = ({ code, setCode, currentLine = null }) => {
  const editorRef = useRef(null);
  const decorationsRef = useRef([]);
  
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Set up default Python formatting
    monaco.languages.registerDocumentFormattingEditProvider('python', {
      provideDocumentFormattingEdits: (model) => {
        return [{
          range: model.getFullModelRange(),
          text: model.getValue()
        }];
      }
    });
  };

  const handleChange = (value) => {
    setCode(value);
  };
  
  // Effect to highlight the current line when it changes
  useEffect(() => {
    if (editorRef.current && currentLine) {
      const monaco = window.monaco;
      if (!monaco) return;
      
      // Clear previous decorations
      decorationsRef.current = editorRef.current.deltaDecorations(
        decorationsRef.current,
        [
          {
            range: new monaco.Range(currentLine, 1, currentLine, 1),
            options: {
              isWholeLine: true,
              className: 'current-line',
              glyphMarginClassName: 'current-line-glyph'
            }
          }
        ]
      );
      
      // Scroll to the current line
      editorRef.current.revealLineInCenter(currentLine);
    }
  }, [currentLine]);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Code Editor</h2>
      <div className="border border-gray-300 rounded-md overflow-hidden">
        <Editor
          height="400px"
          defaultLanguage="python"
          value={code}
          onChange={handleChange}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            fontFamily: "'Fira Code', monospace",
            automaticLayout: true,
            lineNumbers: "on",
            glyphMargin: true,
            folding: true,
            renderIndentGuides: true,
            tabSize: 4
          }}
          className="h-full"
        />
      </div>
    </div>
  );
};

export default CodeEditor;