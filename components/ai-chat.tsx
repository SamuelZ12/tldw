"use client";

import { useState, useRef, useEffect } from "react";
import { ChatMessage, TranscriptSegment, Topic, Citation } from "@/lib/types";
import { ChatMessageComponent } from "./chat-message";
import { SuggestedQuestions } from "./suggested-questions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Send, Loader2, ChevronUp, ChevronDown } from "lucide-react";

interface AIChatProps {
  transcript: TranscriptSegment[];
  topics: Topic[];
  videoId: string;
  videoTitle?: string;
  onCitationClick: (citation: Citation) => void;
  onTimestampClick: (seconds: number, endSeconds?: number, isCitation?: boolean, citationText?: string) => void;
  onPlayAllCitations?: (citations: Citation[]) => void;
  cachedSuggestedQuestions?: string[] | null;
}

export function AIChat({ transcript, topics, videoId, videoTitle, onCitationClick, onTimestampClick, onPlayAllCitations, cachedSuggestedQuestions }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [askedQuestions, setAskedQuestions] = useState<Set<string>>(new Set());
  const [showSuggestions, setShowSuggestions] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Reset questions when video changes
  useEffect(() => {
    setSuggestedQuestions([]);
    setAskedQuestions(new Set());
  }, [videoId]);

  // Update suggested questions when cached questions change
  useEffect(() => {
    if (cachedSuggestedQuestions && cachedSuggestedQuestions.length > 0) {
      setSuggestedQuestions(cachedSuggestedQuestions);
    }
  }, [cachedSuggestedQuestions]);

  // Only fetch new questions if we don't have cached ones
  useEffect(() => {
    if (transcript.length > 0 && suggestedQuestions.length === 0 && !cachedSuggestedQuestions) {
      fetchSuggestedQuestions();
    }
  }, [transcript, cachedSuggestedQuestions]);


  const fetchSuggestedQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const response = await fetch("/api/suggested-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, topics, videoTitle }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuggestedQuestions(data.questions || []);
      }
    } catch (error) {
    } finally {
      setLoadingQuestions(false);
    }
  };

  const sendMessage = async (messageText?: string, retryCount = 0) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    // Only add user message on first attempt
    if (retryCount === 0) {
      setMessages(prev => [...prev, userMessage]);
      setInput("");
      // Track if this was a suggested question
      if (messageText) {
        setAskedQuestions(prev => new Set(prev).add(messageText));
      }
    }
    setIsLoading(true);

    try {
      // Add timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          transcript,
          topics,
          videoId,
          chatHistory: messages,
          model: 'gemini-2.5-flash-lite',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Check if it's a rate limit or temporary error
        if (response.status === 429 || response.status === 503) {
          throw new Error("Service temporarily unavailable");
        }
        throw new Error(`Failed to get response (${response.status})`);
      }

      const data = await response.json();
      
      // Validate response has content
      if (!data.content || data.content.trim() === "") {
        throw new Error("Empty response received");
      }
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content,
        citations: data.citations || [],
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      
      // Retry logic for temporary failures
      const errorName = error instanceof Error ? error.name : '';
      const errorMessage = error instanceof Error ? error.message : '';
      if (retryCount < 2 && (
        errorName === 'AbortError' ||
        errorMessage.includes('temporarily unavailable') ||
        errorMessage.includes('Empty response')
      )) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1500 * (retryCount + 1)));
        return sendMessage(text, retryCount + 1);
      }
      
      // Provide specific error messages
      let errorContent = "Sorry, I encountered an error processing your request.";
      
      if (errorName === 'AbortError') {
        errorContent = "The request took too long to process. Please try again with a simpler question.";
      } else if (errorMessage.includes('temporarily unavailable')) {
        errorContent = "The AI service is temporarily unavailable. Please try again in a moment.";
      } else if (errorMessage.includes('Empty response')) {
        errorContent = "I couldn't generate a proper response. Please try rephrasing your question.";
      }
      
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: errorContent,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <TooltipProvider delayDuration={0} skipDelayDuration={0} disableHoverableContent={false}>
      <div className="w-full h-full flex flex-col">
        <ScrollArea className="flex-1 p-3" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatMessageComponent
                key={message.id}
                message={message}
                onCitationClick={onCitationClick}
                onTimestampClick={onTimestampClick}
                onPlayAllCitations={onPlayAllCitations}
              />
            ))}
            
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
                <Card className="p-4 bg-muted/30">
                  <p className="text-sm text-muted-foreground">Thinking...</p>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>

        {suggestedQuestions.length > 0 && (
          <div className="px-3 py-2 border-t">
            <div className="space-y-2">
              <button
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
              >
                {showSuggestions ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                <span className="font-medium">Suggested questions</span>
              </button>
              {showSuggestions && (
                <SuggestedQuestions
                  questions={suggestedQuestions}
                  onQuestionClick={sendMessage}
                  isLoading={loadingQuestions}
                  askedQuestions={askedQuestions}
                />
              )}
            </div>
          </div>
        )}

        <div className="p-3 border-t">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about the video..."
              className="resize-none"
              rows={2}
              disabled={isLoading}
            />
            <Button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="self-end"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}