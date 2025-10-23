// src/hooks/useDebounce.js
import { useState, useEffect } from "react";

// Custom React hook for debouncing a value
// It delays updating the value until after the specified time (delay)
// This helps to reduce unnecessary actions (like API calls) while typing or changing input rapidly
export const useDebounce = (value, delay = 500) => {
  // Store the debounced value
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set a timer that will update the debounced value after the delay
    const handler = setTimeout(() => setDebouncedValue(value), delay);

    // If value changes again before delay is over, clear the previous timer
    // This ensures the update only happens when the user stops changing the value
    return () => clearTimeout(handler);
  }, [value, delay]); // Re-run effect when value or delay changes

  // Return the debounced value
  return debouncedValue;
};

