import React, { useState } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import OpenAI from "openai";
import { parseMermaidToExcalidraw } from "@excalidraw/mermaid-to-excalidraw";
import "./ChatBot.scss";

interface ChatBotProps {
  excalidrawAPI: any; // TODO: Replace with proper type when available
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export const ChatBot: React.FC<ChatBotProps> = ({ excalidrawAPI }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
  });

  const generateMermaidDiagram = async (userInput: string) => {
    try {
      setIsLoading(true);
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that converts user descriptions into Mermaid diagram syntax. Only respond with valid Mermaid syntax, no explanations.",
          },
          {
            role: "user",
            content: `Convert this description into a Mermaid diagram: ${userInput}`,
          },
        ],
      });

      const mermaidSyntax = response.choices[0].message.content;
      if (mermaidSyntax) {
        const { elements } = await parseMermaidToExcalidraw(mermaidSyntax);
        excalidrawAPI.updateScene({
          elements,
        });
      }

      setMessages((prev) => [
        ...prev,
        { role: "user", content: userInput },
        { role: "assistant", content: "Diagram generated successfully!" },
      ]);
    } catch (error) {
      console.error("Error generating diagram:", error);
      setMessages((prev) => [
        ...prev,
        { role: "user", content: userInput },
        { role: "assistant", content: "Error generating diagram. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      generateMermaidDiagram(inputMessage);
      setInputMessage("");
    }
  };

  return (
    <div className="chat-bot">
      <button
        className="chat-bot-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle chat"
      >
        {isOpen ? "Close Chat" : "Open Chat"}
      </button>
      {isOpen && (
        <div className="chat-bot-container">
          <div className="chat-messages">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`message ${message.role === "user" ? "user" : "bot"}`}
              >
                {message.content}
              </div>
            ))}
            {isLoading && <div className="message bot">Generating diagram...</div>}
          </div>
          <form onSubmit={handleSubmit} className="chat-input">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Describe your diagram..."
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading}>
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}; 