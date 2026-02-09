"use client";

import { useEffect, useRef } from "react";
import { useChatManager } from "../_hooks/useChatManager";
import { ChatMessageList } from "./ChatMessage";
import { Console } from "./Message-console";

export function ClientSection() {
  const {
    messages,
    error,
    isLoadingHistory,
    isUpdatingFavorite,
    pendingFavoriteIds,
    handleWindowScroll,
    messagesEndRef,
    toggleFavorite,
  } = useChatManager();
  const hasScrolledToEndRef = useRef(false);

  useEffect(() => {
    if (isLoadingHistory || hasScrolledToEndRef.current) {
      return;
    }

    if (!messages.length) {
      return;
    }

    hasScrolledToEndRef.current = true;

    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ block: "end", behavior: "auto" });
    });
  }, [isLoadingHistory, messages, messagesEndRef]);

  useEffect(() => {
    window.addEventListener("scroll", handleWindowScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleWindowScroll);
  }, [handleWindowScroll]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 max-w-5xl mx-auto px-3 sm:px-4 pt-6 pb-40 w-full">
        <ChatMessageList
          messages={messages}
          isLoadingHistory={isLoadingHistory}
          error={error}
          isTogglingFavorite={isUpdatingFavorite}
          pendingFavoriteIds={pendingFavoriteIds}
          onToggleFavorite={toggleFavorite}
        />
        <div ref={messagesEndRef} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
        <div className="max-w-5xl mx-auto px-3 py-4 flex justify-center sm:px-4 sm:py-6 pointer-events-auto">
          <Console />
        </div>
      </div>
    </div>
  );
}
