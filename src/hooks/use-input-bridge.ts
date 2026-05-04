import { useState, useRef, useCallback } from "react";

interface InputPrompt {
  prompt: string;
  resolve: (value: string | null) => void;
}

export function useInputBridge() {
  const [currentPrompt, setCurrentPrompt] = useState<InputPrompt | null>(null);
  const resolverRef = useRef<((value: string | null) => void) | null>(null);

  const open = useCallback((prompt: string = ""): Promise<string | null> => {
    return new Promise((resolve) => {
      // If there's already a pending prompt, reject it
      if (resolverRef.current) {
        resolverRef.current(null);
      }

      resolverRef.current = resolve;
      setCurrentPrompt({ prompt, resolve });
    });
  }, []);

  const handleSubmit = useCallback((value: string) => {
    if (resolverRef.current) {
      resolverRef.current(value);
      resolverRef.current = null;
    }
    setCurrentPrompt(null);
  }, []);

  const handleCancel = useCallback(() => {
    if (resolverRef.current) {
      resolverRef.current(null);
      resolverRef.current = null;
    }
    setCurrentPrompt(null);
  }, []);

  return {
    isOpen: currentPrompt !== null,
    prompt: currentPrompt?.prompt || "",
    open,
    handleSubmit,
    handleCancel,
  };
}