export const callDebugAPI = async (code, testCase) => {
    try {
      const response = await fetch("http://localhost:5000/api/debug", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code, testCase }),
      });
  
      if (!response.ok) {
        throw new Error("Failed to fetch debug data");
      }
  
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error calling debug API:", error);
      return null;
    }
  };