// File 2: RecursionTree.jsx — FINAL FIX: call & return links spaced apart, and function arguments visible in node label

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const RecursionTree = ({ debugData, currentStep, onStepChange }) => {
  const svgRef = useRef();
  const containerRef = useRef();
  const [viewAll, setViewAll] = useState(false);
  const positions = useRef({});

  useEffect(() => {
    if (!debugData?.callHierarchy?.length) return;

    const svgElement = d3.select(svgRef.current);
    svgElement.selectAll("*").remove();

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = 500;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    const svg = svgElement
      .attr("width", width)
      .attr("height", height)
      .call(
        d3
          .zoom()
          .on("zoom", (event) => svgGroup.attr("transform", event.transform))
      )
      .append("g");

    const svgGroup = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Define arrowhead
    svgGroup
      .append("defs")
      .append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 10)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#999");

    const buildTree = () => {
      const nodesMap = new Map();
      const rootNodes = [];

      const filteredCalls = debugData.callHierarchy.filter((call) => {
        const idx = debugData.debugStates.findIndex(
          (s) => s.callId === call.call_id
        );
        return (
          viewAll ||
          idx <= currentStep ||
          (debugData.debugStates[idx]?.eventType === "return" &&
            idx <= currentStep)
        );
      });

      filteredCalls.forEach((call) => {
        const args = call.args ? Object.values(call.args).join(", ") : "";
        nodesMap.set(call.call_id, {
          id: call.call_id,
          name: `${call.function}(${args})`,
          children: [],
          depth: call.stack_depth,
        });
      });

      filteredCalls.forEach((call) => {
        const node = nodesMap.get(call.call_id);
        if (call.parent_id && nodesMap.has(call.parent_id)) {
          const parent = nodesMap.get(call.parent_id);
          parent.children.push(node);
        } else {
          rootNodes.push(node);
        }

        const returnState = debugData.debugStates.find(
          (s) => s.callId === call.call_id && s.eventType === "return"
        );

        const returnStepIndex = debugData.debugStates.findIndex(
          (s) => s.callId === call.call_id && s.eventType === "return"
        );

        if (returnState && (viewAll || returnStepIndex <= currentStep)) {
          node.returnValue = returnState.returnValue;
        }
      });

      return rootNodes.length === 1
        ? rootNodes[0]
        : { name: "root", children: rootNodes };
    };

    const root = d3.hierarchy(buildTree());
    const treeLayout = d3.tree().nodeSize([120, 120]);
    treeLayout(root);

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

    const getPos = (d) => positions.current[d.data.id] || { x: d.x, y: d.y };
    const linkGroup = svgGroup.append("g");
    const labelGroup = svgGroup.append("g");
    const nodeGroup = svgGroup.append("g");

    const drawLinks = () => {
      const links = root.links();
      const returnLinks = links.filter(
        (l) => l.target.data.returnValue !== undefined
      );
      const callLinks = links.filter(
        (l) => l.target.data.returnValue === undefined
      );

      linkGroup
        .selectAll("path.call-link")
        .data(callLinks)
        .join("path")
        .attr("class", "call-link")
        .attr("fill", "none")
        .attr("stroke", (d) =>
          highlightedNodes.has(d.target.data.id) ? "#ff7f0e" : "#999"
        )
        .attr("stroke-width", (d) =>
          highlightedNodes.has(d.target.data.id) ? 2 : 1
        )
        .attr("marker-end", "url(#arrow)")
        .attr("d", (d) => {
          const source = getPos(d.source);
          const target = getPos(d.target);
          return `M${source.x},${source.y - 5} C${source.x},${
            (source.y + target.y) / 2 - 10
          } ${target.x},${(source.y + target.y) / 2 - 10} ${target.x},${
            target.y - 5
          }`;
        });

      linkGroup
        .selectAll("path.return-link")
        .data(returnLinks)
        .join("path")
        .attr("class", "return-link")
        .attr("fill", "none")
        .attr("stroke", "#e41a1c")
        .attr("stroke-dasharray", "4 2")
        .attr("stroke-width", 1.5)
        .attr("marker-end", "url(#arrow)")
        .attr("d", (d) => {
          const source = getPos(d.source);
          const target = getPos(d.target);
          return `M${source.x},${source.y + 5} C${source.x},${
            (source.y + target.y) / 2 + 10
          } ${target.x},${(source.y + target.y) / 2 + 10} ${target.x},${
            target.y + 5
          }`;
        });

      labelGroup
        .selectAll("text.return-label")
        .data(returnLinks)
        .join("text")
        .attr("class", "return-label")
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("fill", "#e41a1c")
        .attr("x", (d) => {
          const s = getPos(d.source);
          const t = getPos(d.target);
          return (s.x + t.x) / 2;
        })
        .attr("y", (d) => {
          const s = getPos(d.source);
          const t = getPos(d.target);
          return (s.y + t.y) / 2 + 20;
        })
        .text((d) => `→ ${d.target.data.returnValue}`);
    };

    const node = nodeGroup
      .selectAll("g.node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d) => {
        positions.current[d.data.id] = { x: d.x, y: d.y };
        return `translate(${d.x},${d.y})`;
      })
      .call(
        d3.drag().on("drag", function (event, d) {
          positions.current[d.data.id] = { x: event.x, y: event.y };
          d3.select(this).attr("transform", `translate(${event.x},${event.y})`);
          drawLinks();
        })
      )
      .on("click", (_, d) => {
        if (!d.data.id) return;
        const matchingStep = debugData.debugStates.findIndex(
          (s) => s.callId === d.data.id
        );
        if (matchingStep >= 0) onStepChange(matchingStep);
      });

    node
      .append("circle")
      .attr("r", 8)
      .attr("fill", (d) => {
        if (d.data.id === currentCallId) return "#ff7f0e";
        if (d.data.returnValue !== undefined) return "#e41a1c";
        return highlightedNodes.has(d.data.id) ? "#ffbb78" : "#1f77b4";
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    node
      .append("text")
      .attr("dy", (d) => (d.children ? -15 : 15))
      .attr("text-anchor", "middle")
      .text((d) => d.data.name || "")
      .attr("font-size", "11px")
      .attr("fill", "#333");

    drawLinks();
  }, [debugData, currentStep, onStepChange, viewAll]);

  return (
    <div className="bg-white rounded-xl shadow-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold">Recursion Tree</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewAll(!viewAll)}
            className="text-xs text-blue-600 underline"
          >
            {viewAll ? "View Stepwise" : "View Full Tree"}
          </button>
          <div className="text-xs text-gray-500">
            {debugData?.debugStates?.length || 0} steps
          </div>
        </div>
      </div>

      <div ref={containerRef} className="overflow-x-auto">
        <svg ref={svgRef} width="100%" height="500" className="block" />
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
        <p className="mt-1 text-center">
          Click nodes to navigate. Drag to reposition. Scroll to zoom.
        </p>
      </div>
    </div>
  );
};

export default RecursionTree;
