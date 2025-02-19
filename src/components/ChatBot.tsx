import React, { useState } from "react";
import OpenAI from "openai";
import { parseMermaidToExcalidraw } from "@excalidraw/mermaid-to-excalidraw";

interface ChatBotProps {
  onDiagramGenerated: (result: any) => void;
}

const ChatBot: React.FC<ChatBotProps> = ({ onDiagramGenerated }) => {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openai = new OpenAI({
    apiKey: process.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
  });

  const generateMermaidDiagram = async (text: string) => {
    try {
      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that converts text descriptions into Mermaid diagram syntax. Always respond with valid Mermaid syntax only, no explanations or other text."
          },
          {
            role: "user",
            content: `Convert this text into a Mermaid flowchart: ${text}`
          }
        ],
        model: "gpt-3.5-turbo",
      });

      const mermaidSyntax = completion.choices[0].message.content;
      if (!mermaidSyntax) throw new Error("No diagram generated");

      const excalidrawElements = await parseMermaidToExcalidraw(mermaidSyntax);
      onDiagramGenerated(excalidrawElements);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      await generateMermaidDiagram(input);
      setInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chatbot-container" style={{
      position: "fixed",
      bottom: "20px",
      right: "20px",
      width: "300px",
      backgroundColor: "white",
      borderRadius: "8px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
      padding: "16px",
      zIndex: 1000
    }}>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe your diagram..."
          style={{
            width: "100%",
            padding: "8px",
            marginBottom: "8px",
            borderRadius: "4px",
            border: "1px solid #ddd"
          }}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: "100%",
            padding: "8px",
            backgroundColor: "#1971c2",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: isLoading ? "not-allowed" : "pointer"
          }}
        >
          {isLoading ? "Generating..." : "Generate Diagram"}
        </button>
      </form>
      {error && (
        <div style={{ color: "red", marginTop: "8px", fontSize: "14px" }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default ChatBot; 