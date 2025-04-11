import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

const RecursionTree = ({ debugData, currentStep, onStepChange }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!debugData || !debugData.callHierarchy || debugData.callHierarchy.length === 0) return;

    // Clear previous visualization
    d3.select(svgRef.current).selectAll("*").remove();
    
    // Create a hierarchical tree structure from the callHierarchy data
    const createTreeData = (callHierarchy) => {
      // Create a map of call_id to node for quick lookups
      const nodesMap = new Map();
      
      // Initialize all nodes first
      callHierarchy.forEach(call => {
        nodesMap.set(call.call_id, {
          id: call.call_id,
          name: call.function,
          stackDepth: call.stack_depth,
          entryLine: call.entry_line,
          children: []
        });
      });
      
      // Find root nodes (those with no parent or parent is null)
      const rootNodes = [];
      
      // Build the tree by connecting children to their parents
      callHierarchy.forEach(call => {
        const node = nodesMap.get(call.call_id);
        
        if (!call.parent_id) {
          rootNodes.push(node);
        } else {
          const parentNode = nodesMap.get(call.parent_id);
          if (parentNode) {
            parentNode.children.push(node);
          }
        }
      });
      
      // Add return values from the debug states
      if (debugData.debugStates) {
        debugData.debugStates.forEach(state => {
          if (state.eventType === 'return' && state.callId && state.returnValue !== undefined) {
            const node = nodesMap.get(state.callId);
            if (node) {
              node.returnValue = state.returnValue;
            }
          }
        });
      }
      
      // Skip module nodes and other non-essential nodes if needed
      const filteredRoots = rootNodes.filter(node => 
        node.name !== 'decode' && 
        !node.name.startsWith('_')
      );
      
      // If we have a module node with children, return its children
      for (const root of rootNodes) {
        if (root.name === '<module>' && root.children.length > 0) {
          return root.children;
        }
      }
      
      return filteredRoots.length > 0 ? filteredRoots : rootNodes;
    };
    
    const treeData = createTreeData(debugData.callHierarchy);
    
    // Set up SVG for the visualization
    const width = 800;
    const height = 500;
    const margin = { top: 40, right: 120, bottom: 40, left: 120 };
    
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Prepare the tree layout
    // If we have multiple root nodes, create a virtual root
    let hierarchyRoot;
    if (treeData.length > 1) {
      hierarchyRoot = d3.hierarchy({ name: "root", children: treeData });
      // Hide the virtual root
      hierarchyRoot.depth = -1;
    } else if (treeData.length === 1) {
      hierarchyRoot = d3.hierarchy(treeData[0]);
    } else {
      return; // No data to visualize
    }
    
    const treeLayout = d3.tree()
      .size([height - margin.top - margin.bottom, width - margin.left - margin.right - 100]);
    
    // Adjust the node positions
    const nodes = treeLayout(hierarchyRoot);
    
    // Get current call ID from the current step
    const currentCallId = debugData.debugStates[currentStep]?.callId;
    
    // Find all parent nodes of the current node
    const getAncestorIds = (callId, ancestorIds = new Set()) => {
      const callInfo = debugData.callHierarchy.find(c => c.call_id === callId);
      if (callInfo && callInfo.parent_id) {
        ancestorIds.add(callInfo.parent_id);
        getAncestorIds(callInfo.parent_id, ancestorIds);
      }
      return ancestorIds;
    };
    
    const ancestorIds = currentCallId ? getAncestorIds(currentCallId) : new Set();
    
    // Draw links between nodes
    svg.selectAll(".link")
      .data(nodes.descendants().slice(1)) // Skip the virtual root if it exists
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", d => {
        if (!d.parent || d.parent.depth < 0) {
          // Handle case for children of virtual root
          return `M${d.y},${d.x} L${d.y},${d.x}`;
        }
        return `M${d.y},${d.x} L${d.parent.y},${d.parent.x}`;
      })
      .attr("fill", "none")
      .attr("stroke", d => {
        // Highlight the path to the current node
        if (d.data.id === currentCallId || ancestorIds.has(d.data.id)) {
          return "#ff7f0e";
        }
        return "#555";
      })
      .attr("stroke-width", d => {
        // Make the current path thicker
        if (d.data.id === currentCallId || ancestorIds.has(d.data.id)) {
          return 2;
        }
        return 1.5;
      });
    
    // Create node groups
    const nodeGroups = svg.selectAll(".node")
      .data(nodes.descendants().filter(d => d.depth >= 0)) // Skip the virtual root if it exists
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.y},${d.x})`)
      .on("click", (event, d) => {
        // Find the corresponding debug state when node is clicked
        const clickedCallId = d.data.id;
        const matchingStateIndex = debugData.debugStates.findIndex(
          state => state.callId === clickedCallId
        );
        
        if (matchingStateIndex >= 0 && onStepChange) {
          onStepChange(matchingStateIndex);
        }
      });
    
    // Add circles for the nodes
    nodeGroups.append("circle")
      .attr("r", 8)
      .attr("fill", d => {
        // Highlight the current node
        if (d.data.id === currentCallId) {
          return "#ff7f0e";
        }
        // Highlight ancestor nodes
        if (ancestorIds.has(d.data.id)) {
          return "#ffa54f";
        }
        return "#1f77b4";
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);
    
    // Add function name labels
    nodeGroups.append("text")
      .attr("dy", -12)
      .attr("x", d => d.children ? -13 : 13)
      .attr("text-anchor", d => d.children ? "end" : "start")
      .text(d => `${d.data.name}()`);
    
    // Add return value labels where available
    nodeGroups.filter(d => d.data.returnValue !== undefined)
      .append("text")
      .attr("dy", 20)
      .attr("x", d => d.children ? -13 : 13)
      .attr("text-anchor", d => d.children ? "end" : "start")
      .attr("fill", "#e41a1c")
      .text(d => `returns: ${d.data.returnValue}`);
    
  }, [debugData, currentStep, onStepChange]);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Recursion Tree</h2>
      <div className="border border-gray-300 rounded-lg p-2 overflow-x-auto">
        <svg 
          ref={svgRef} 
          width="800" 
          height="500"
          className="mx-auto block" 
        ></svg>
      </div>
      <div className="p-2 text-sm text-gray-600">
        <p className="flex items-center space-x-4">
          <span className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-1"></span>
            <span>Function call</span>
          </span>
          <span className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-orange-500 mr-1"></span>
            <span>Current function</span>
          </span>
          <span className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-1"></span>
            <span>Returns</span>
          </span>
        </p>
        <p className="text-xs mt-1">Click on any node to jump to that execution step.</p>
      </div>
    </div>
  );
};

export default RecursionTree;