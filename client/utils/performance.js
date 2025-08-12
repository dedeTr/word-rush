// Frontend Performance Optimization Utilities
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

// Debounce hook for input optimization
export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Throttle hook for frequent updates
export function useThrottle(callback, delay) {
  const lastRun = useRef(Date.now());

  return useCallback((...args) => {
    if (Date.now() - lastRun.current >= delay) {
      callback(...args);
      lastRun.current = Date.now();
    }
  }, [callback, delay]);
}

// Memoized socket event handlers
export function useSocketHandlers(socket, handlers) {
  const memoizedHandlers = useMemo(() => {
    const optimizedHandlers = {};
    
    Object.keys(handlers).forEach(event => {
      optimizedHandlers[event] = useCallback(handlers[event], []);
    });
    
    return optimizedHandlers;
  }, [handlers]);

  useEffect(() => {
    if (!socket) return;

    // Attach optimized handlers
    Object.keys(memoizedHandlers).forEach(event => {
      socket.on(event, memoizedHandlers[event]);
    });

    // Cleanup
    return () => {
      Object.keys(memoizedHandlers).forEach(event => {
        socket.off(event, memoizedHandlers[event]);
      });
    };
  }, [socket, memoizedHandlers]);
}

// Virtual scrolling for large lists
export function useVirtualScroll(items, itemHeight, containerHeight) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    );
    
    return items.slice(startIndex, endIndex).map((item, index) => ({
      ...item,
      index: startIndex + index,
      top: (startIndex + index) * itemHeight
    }));
  }, [items, itemHeight, containerHeight, scrollTop]);

  return {
    visibleItems,
    totalHeight: items.length * itemHeight,
    onScroll: useCallback((e) => setScrollTop(e.target.scrollTop), [])
  };
}

// Performance monitoring hook
export function usePerformanceMonitor(componentName) {
  const renderCount = useRef(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    renderCount.current++;
    const renderTime = Date.now() - startTime.current;
    
    if (renderTime > 16) { // More than one frame (60fps)
      console.warn(`${componentName} slow render: ${renderTime}ms (render #${renderCount.current})`);
    }
    
    startTime.current = Date.now();
  });

  return {
    renderCount: renderCount.current,
    logPerformance: useCallback((action) => {
      console.log(`${componentName} ${action} - Render #${renderCount.current}`);
    }, [componentName])
  };
}

// Optimized state updater for frequent updates
export function useOptimizedState(initialState) {
  const [state, setState] = useState(initialState);
  const stateRef = useRef(state);
  
  const optimizedSetState = useCallback((newState) => {
    // Batch updates and prevent unnecessary re-renders
    if (typeof newState === 'function') {
      const updatedState = newState(stateRef.current);
      if (JSON.stringify(updatedState) !== JSON.stringify(stateRef.current)) {
        stateRef.current = updatedState;
        setState(updatedState);
      }
    } else {
      if (JSON.stringify(newState) !== JSON.stringify(stateRef.current)) {
        stateRef.current = newState;
        setState(newState);
      }
    }
  }, []);

  return [state, optimizedSetState];
}

// Connection quality monitor
export function useConnectionQuality(socket) {
  const [quality, setQuality] = useState('good');
  const [latency, setLatency] = useState(0);
  const pingInterval = useRef(null);

  useEffect(() => {
    if (!socket) return;

    // Ping server every 5 seconds to measure latency
    pingInterval.current = setInterval(() => {
      const start = Date.now();
      
      socket.emit('ping', start);
      
      socket.once('pong', (timestamp) => {
        const currentLatency = Date.now() - timestamp;
        setLatency(currentLatency);
        
        // Determine connection quality
        if (currentLatency < 50) {
          setQuality('excellent');
        } else if (currentLatency < 100) {
          setQuality('good');
        } else if (currentLatency < 200) {
          setQuality('fair');
        } else {
          setQuality('poor');
        }
      });
    }, 5000);

    return () => {
      if (pingInterval.current) {
        clearInterval(pingInterval.current);
      }
    };
  }, [socket]);

  return { quality, latency };
}

// Batch state updates for better performance
export function useBatchedUpdates() {
  const updates = useRef([]);
  const timeoutRef = useRef(null);

  const batchUpdate = useCallback((updateFn) => {
    updates.current.push(updateFn);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      // Apply all batched updates
      updates.current.forEach(fn => fn());
      updates.current = [];
    }, 16); // Next frame
  }, []);

  return batchUpdate;
}

export default {
  useDebounce,
  useThrottle,
  useSocketHandlers,
  useVirtualScroll,
  usePerformanceMonitor,
  useOptimizedState,
  useConnectionQuality,
  useBatchedUpdates
};
