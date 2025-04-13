import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

const RecursionTree = ({ debugData, currentStep, onStepChange }) => {
  const svgRef = useRef();
  const containerRef = useRef();

  useEffect(() => {
    if (!debugData?.callHierarchy?.length) return;

    // Clear previous visualization
    d3.select(svgRef.current).selectAll("*").remove();

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = 400;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Build tree data
    const buildTree = () => {
      const nodesMap = new Map();
      const rootNodes = [];

      debugData.callHierarchy.forEach((call) => {
        nodesMap.set(call.call_id, {
          id: call.call_id,
          name: call.function,
          children: [],
          depth: call.stack_depth,
        });
      });

      debugData.callHierarchy.forEach((call) => {
        const node = nodesMap.get(call.call_id);
        if (call.parent_id) {
          const parent = nodesMap.get(call.parent_id);
          parent?.children.push(node);
        } else {
          rootNodes.push(node);
        }

        // Add return values
        const returnState = debugData.debugStates?.find(
          (s) => s.callId === call.call_id && s.eventType === "return"
        );
        if (returnState) node.returnValue = returnState.returnValue;
      });

      return rootNodes.length === 1
        ? rootNodes[0]
        : { name: "root", children: rootNodes };
    };

    const root = d3.hierarchy(buildTree());
    const treeLayout = d3
      .tree()
      .size([
        width - margin.left - margin.right,
        height - margin.top - margin.bottom,
      ]);
    treeLayout(root);

    // Highlight current path
    const currentCallId = debugData.debugStates?.[currentStep]?.callId;
    const getAncestors = (id) => {
      const ancestors = new Set();
      let currentId = id;
      while (currentId) {
        ancestors.add(currentId);
        currentId = debugData.callHierarchy.find(
          (c) => c.call_id === currentId
        )?.parent_id;
      }
      return ancestors;
    };
    const highlightedNodes = currentCallId
      ? getAncestors(currentCallId)
      : new Set();

    // Draw links
    svg
      .selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr(
        "d",
        d3
          .linkVertical()
          .x((d) => d.x)
          .y((d) => d.y)
      )
      .attr("fill", "none")
      .attr("stroke", (d) =>
        highlightedNodes.has(d.target.data.id) ? "#ff7f0e" : "#999"
      )
      .attr("stroke-width", (d) =>
        highlightedNodes.has(d.target.data.id) ? 2 : 1
      )
      .attr("stroke-opacity", 0.6);

    // Create node groups
    const nodeGroups = svg
      .selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .on("click", (_, d) => {
        if (!d.data.id) return;
        const matchingStep = debugData.debugStates.findIndex(
          (s) => s.callId === d.data.id
        );
        if (matchingStep >= 0) onStepChange(matchingStep);
      });

    // Add circles
    nodeGroups
      .append("circle")
      .attr("r", 8)
      .attr("fill", (d) => {
        if (d.data.id === currentCallId) return "#ff7f0e";
        if (highlightedNodes.has(d.data.id)) return "#ffbb78";
        return "#1f77b4";
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    // Add function names
    nodeGroups
      .append("text")
      .attr("dy", (d) => (d.children ? -15 : 15))
      .attr("text-anchor", "middle")
      .text((d) => (d.data.name ? `${d.data.name}()` : ""))
      .attr("font-size", "11px")
      .attr("fill", "#333");

    // Add return values
    nodeGroups
      .filter((d) => d.data.returnValue !== undefined)
      .append("text")
      .attr("dy", 25)
      .attr("text-anchor", "middle")
      .text((d) => `→ ${d.data.returnValue}`)
      .attr("font-size", "9px")
      .attr("fill", "#e41a1c");
  }, [debugData, currentStep, onStepChange]);

  return (
    <div className="bg-white rounded-xl shadow-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold">Recursion Tree</h2>
        <div className="text-xs text-gray-500">
          {debugData?.debugStates?.length || 0} steps
        </div>
      </div>

      <div ref={containerRef} className="overflow-x-auto">
        <svg ref={svgRef} width="100%" height="400" className="block" />
      </div>

      <div className="mt-3 text-xs text-gray-600">
        <div className="flex flex-wrap gap-3 justify-center">
          <span className="flex items-center">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1"></span>
            <span>Function</span>
          </span>
          <span className="flex items-center">
            <span className="inline-block w-2 h-2 rounded-full bg-orange-500 mr-1"></span>
            <span>Current</span>
          </span>
          <span className="flex items-center">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1"></span>
            <span>Returns</span>
          </span>
        </div>
        <p className="mt-1 text-center">Click nodes to navigate</p>
      </div>
    </div>
  );
};

export default RecursionTree;
