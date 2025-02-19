import React, { useState, useEffect } from "react";
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
  const [threadId, setThreadId] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  // Initialize OpenAI client
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const openai = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true,
  });

  const ASSISTANT_ID = "asst_BQPNcQvOPBdx3BCH2slqKtjO";

  useEffect(() => {
    const initializeChat = async () => {
      try {
        // Validate API key
        if (!apiKey) {
          throw new Error("OpenAI API key is not configured");
        }

        // Validate that the API key works by making a simple API call
        try {
          await openai.models.list();
        } catch (error: any) {
          console.error("OpenAI API validation error:", error);
          throw new Error("Invalid OpenAI API key");
        }

        // Create thread
        console.log("Creating new thread...");
        const thread = await openai.beta.threads.create();
        console.log("Created new thread:", thread.id);
        setThreadId(thread.id);
        setInitError(null);
      } catch (error: any) {
        console.error("Chat initialization error:", error);
        const errorMessage = error.message || "Failed to initialize chat";
        setInitError(errorMessage);
        setMessages([{ role: "assistant", content: `Error: ${errorMessage}. Please try refreshing the page.` }]);
      }
    };

    initializeChat();
  }, [apiKey]);

  const generateMermaidDiagram = async (userInput: string) => {
    if (!threadId) {
      console.error("Thread not initialized");
      return;
    }

    try {
      setIsLoading(true);
      console.log("Starting diagram generation for input:", userInput);
      console.log("Using thread ID:", threadId);

      // Add the user's message to the thread
      const threadMessage = await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: `Convert this description into a Mermaid diagram: ${userInput}`,
      });
      console.log("Created thread message:", threadMessage);

      // Run the assistant
      console.log("Starting assistant run with ID:", ASSISTANT_ID);
      const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: ASSISTANT_ID,
      });
      console.log("Created run:", run);

      // Poll for the run completion
      let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
      console.log("Initial run status:", runStatus.status);
      
      while (runStatus.status !== "completed") {
        if (runStatus.status === "failed" || runStatus.status === "cancelled" || runStatus.status === "expired") {
          console.error("Run failed with status:", runStatus.status);
          throw new Error(`Assistant run ${runStatus.status}`);
        }
        console.log("Waiting for completion, current status:", runStatus.status);
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
      }

      // Get the assistant's response
      console.log("Run completed, fetching messages");
      const messages = await openai.beta.threads.messages.list(threadId);
      console.log("Received messages:", messages);
      
      const assistantMessage = messages.data[0].content[0];
      console.log("Assistant message:", assistantMessage);
      
      if (assistantMessage.type === 'text') {
        const mermaidSyntax = assistantMessage.text.value;
        console.log("Mermaid syntax:", mermaidSyntax);

        try {
          const { elements } = await parseMermaidToExcalidraw(mermaidSyntax);
          console.log("Generated Excalidraw elements:", elements);
          
          excalidrawAPI.updateScene({
            elements,
          });

          setMessages((prev) => [
            ...prev,
            { role: "user", content: userInput },
            { role: "assistant", content: "Diagram generated successfully!" },
          ]);
        } catch (parseError) {
          console.error("Error parsing Mermaid syntax:", parseError);
          throw new Error("Failed to parse Mermaid diagram");
        }
      } else {
        console.error("Unexpected message type:", assistantMessage.type);
        throw new Error("Unexpected response format from assistant");
      }
    } catch (err) {
      console.error("Error in generateMermaidDiagram:", err);
      const error = err as Error;
      setMessages((prev) => [
        ...prev,
        { role: "user", content: userInput },
        { role: "assistant", content: `Error: ${error.message || "Failed to generate diagram"}. Please try again.` },
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
            {initError ? (
              <div className="message error">
                Error: {initError}
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`message ${message.role === "user" ? "user" : "bot"}`}
                >
                  {message.content}
                </div>
              ))
            )}
            {isLoading && <div className="message bot">Generating diagram...</div>}
          </div>
          <form onSubmit={handleSubmit} className="chat-input">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Describe your diagram..."
              disabled={isLoading || !!initError}
            />
            <button type="submit" disabled={isLoading || !!initError}>
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}; 