// Optimized Connection Manager for High-Concurrency Scenarios
import io from 'socket.io-client';

class ConnectionManager {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.isConnecting = false;
    this.eventQueue = [];
    this.connectionQuality = 'unknown';
    this.latency = 0;
    
    // Performance metrics
    this.metrics = {
      connectTime: 0,
      totalReconnects: 0,
      messagesReceived: 0,
      messagesSent: 0,
      errors: 0
    };
  }

  // Optimized connection with retry logic
  async connect(serverUrl = 'http://localhost:5000', options = {}) {
    if (this.isConnecting || (this.socket && this.socket.connected)) {
      return this.socket;
    }

    this.isConnecting = true;
    const startTime = Date.now();

    const defaultOptions = {
      transports: ['websocket', 'polling'],
      timeout: 5000,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      forceNew: true,
      ...options
    };

    try {
      this.socket = io(serverUrl, defaultOptions);
      
      // Connection event handlers
      this.socket.on('connect', () => {
        this.metrics.connectTime = Date.now() - startTime;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        console.log(`✅ Connected to server in ${this.metrics.connectTime}ms`);
        
        // Process queued events
        this.processEventQueue();
        
        // Start latency monitoring
        this.startLatencyMonitoring();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Disconnected:', reason);
        this.isConnecting = false;
        
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, don't reconnect
          return;
        }
        
        // Auto-reconnect for other reasons
        this.handleReconnection();
      });

      this.socket.on('connect_error', (error) => {
        this.metrics.errors++;
        console.error('❌ Connection error:', error.message);
        this.isConnecting = false;
        this.handleReconnection();
      });

      this.socket.on('reconnect', (attemptNumber) => {
        this.metrics.totalReconnects++;
        console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
      });

      // Message tracking for performance monitoring
      this.socket.onAny((event, ...args) => {
        this.metrics.messagesReceived++;
      });

      return this.socket;
      
    } catch (error) {
      this.metrics.errors++;
      this.isConnecting = false;
      console.error('Failed to create socket connection:', error);
      throw error;
    }
  }

  // Handle reconnection with exponential backoff
  handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (!this.socket || !this.socket.connected) {
        this.socket?.connect();
      }
    }, delay);
  }

  // Queue events when disconnected
  emit(event, data) {
    if (this.socket && this.socket.connected) {
      this.metrics.messagesSent++;
      this.socket.emit(event, data);
    } else {
      // Queue event for when connection is restored
      this.eventQueue.push({ event, data, timestamp: Date.now() });
      console.warn(`📦 Queued event '${event}' (connection unavailable)`);
    }
  }

  // Process queued events after reconnection
  processEventQueue() {
    if (this.eventQueue.length === 0) return;
    
    console.log(`📤 Processing ${this.eventQueue.length} queued events`);
    
    // Filter out old events (older than 30 seconds)
    const now = Date.now();
    const validEvents = this.eventQueue.filter(
      item => now - item.timestamp < 30000
    );
    
    validEvents.forEach(({ event, data }) => {
      this.socket.emit(event, data);
      this.metrics.messagesSent++;
    });
    
    this.eventQueue = [];
  }

  // Monitor connection latency
  startLatencyMonitoring() {
    if (!this.socket) return;
    
    const pingInterval = setInterval(() => {
      if (!this.socket || !this.socket.connected) {
        clearInterval(pingInterval);
        return;
      }
      
      const start = Date.now();
      this.socket.emit('ping', start);
      
      this.socket.once('pong', (timestamp) => {
        this.latency = Date.now() - timestamp;
        this.updateConnectionQuality();
      });
    }, 5000);
  }

  // Update connection quality based on latency
  updateConnectionQuality() {
    if (this.latency < 50) {
      this.connectionQuality = 'excellent';
    } else if (this.latency < 100) {
      this.connectionQuality = 'good';
    } else if (this.latency < 200) {
      this.connectionQuality = 'fair';
    } else {
      this.connectionQuality = 'poor';
    }
  }

  // Optimized event listener management
  on(event, handler) {
    if (this.socket) {
      this.socket.on(event, handler);
    }
  }

  off(event, handler) {
    if (this.socket) {
      this.socket.off(event, handler);
    }
  }

  once(event, handler) {
    if (this.socket) {
      this.socket.once(event, handler);
    }
  }

  // Batch multiple events for better performance
  batchEmit(events) {
    if (!this.socket || !this.socket.connected) {
      events.forEach(({ event, data }) => {
        this.eventQueue.push({ event, data, timestamp: Date.now() });
      });
      return;
    }

    events.forEach(({ event, data }) => {
      this.socket.emit(event, data);
      this.metrics.messagesSent++;
    });
  }

  // Get connection status
  getStatus() {
    return {
      connected: this.socket?.connected || false,
      connecting: this.isConnecting,
      quality: this.connectionQuality,
      latency: this.latency,
      queuedEvents: this.eventQueue.length,
      metrics: { ...this.metrics }
    };
  }

  // Graceful disconnect
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventQueue = [];
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  // Performance report
  getPerformanceReport() {
    const status = this.getStatus();
    
    return {
      connectionTime: this.metrics.connectTime,
      totalReconnects: this.metrics.totalReconnects,
      messagesReceived: this.metrics.messagesReceived,
      messagesSent: this.metrics.messagesSent,
      errors: this.metrics.errors,
      currentLatency: this.latency,
      connectionQuality: this.connectionQuality,
      queuedEvents: this.eventQueue.length,
      uptime: this.socket?.connected ? Date.now() - (Date.now() - this.metrics.connectTime) : 0
    };
  }
}

// Singleton instance for global use
const connectionManager = new ConnectionManager();

export default connectionManager;

// Named exports for specific functionality
export {
  ConnectionManager,
  connectionManager
};
