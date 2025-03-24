import { useCallback, useRef } from 'react';

export function useKeyboardControls(onAction: (action: string) => void) {
  const keysPressed = useRef<Record<string, boolean>>({});

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Skip if we're typing in an input or textarea
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }
    if (keysPressed.current[e.key]) return; // Don't trigger if already pressed

    keysPressed.current[e.key] = true;

    // Map keys to actions
    switch (e.key) {
      case 'ArrowUp':
        onAction('forward');
        break;
      case 'ArrowDown':
        onAction('backward');
        break;
      case 'ArrowLeft':
        onAction('left');
        break;
      case 'ArrowRight':
        onAction('right');
        break;
      case ' ': // Space
        onAction('jump');
        e.preventDefault(); // Prevent page scrolling
        break;
      case 'e':
      case 'E':
        onAction('use');
        break;
      case 'q':
      case 'Q':
        onAction('attack');
        break;
    }
  }, [onAction]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keysPressed.current[e.key] = false;

    // Only stop movement for arrow keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      onAction('stop');
    }
  }, [onAction]);

  return { handleKeyDown, handleKeyUp };
}