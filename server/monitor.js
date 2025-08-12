const express = require('express');
const database = require('./services/database');

class ProductionMonitor {
  constructor() {
    this.app = express();
    this.metrics = {
      startTime: Date.now(),
      requests: 0,
      activeConnections: 0,
      totalRooms: 0,
      activeRooms: 0,
      totalAnswers: 0,
      cacheHits: 0,
      cacheMisses: 0,
      avgResponseTime: 0,
      responseTimes: [],
      errors: 0
    };
    
    this.setupRoutes();
    this.setupMiddleware();
  }

  setupMiddleware() {
    // CORS for dashboard access
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      next();
    });

    // Request counter
    this.app.use((req, res, next) => {
      this.metrics.requests++;
      next();
    });
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        uptime: Date.now() - this.metrics.startTime,
        timestamp: new Date().toISOString()
      });
    });

    // Real-time metrics API
    this.app.get('/metrics', async (req, res) => {
      try {
        const dbMetrics = await this.getDatabaseMetrics();
        const systemMetrics = this.getSystemMetrics();
        
        res.json({
          ...systemMetrics,
          ...dbMetrics,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch metrics' });
      }
    });

    // Performance dashboard HTML
    this.app.get('/dashboard', (req, res) => {
      res.send(this.getDashboardHTML());
    });

    // Detailed performance report
    this.app.get('/report', async (req, res) => {
      try {
        const report = await this.generatePerformanceReport();
        res.json(report);
      } catch (error) {
        res.status(500).json({ error: 'Failed to generate report' });
      }
    });
  }

  async getDatabaseMetrics() {
    try {
      // Get MongoDB stats
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      
      const [roomStats, wordStats] = await Promise.all([
        db.collection('rooms').countDocuments(),
        db.collection('words').countDocuments()
      ]);

      const activeRooms = await db.collection('rooms').countDocuments({ isActive: true });

      return {
        database: {
          totalRooms: roomStats,
          activeRooms: activeRooms,
          totalWords: wordStats,
          connected: mongoose.connection.readyState === 1
        }
      };
    } catch (error) {
      return {
        database: {
          error: error.message,
          connected: false
        }
      };
    }
  }

  getSystemMetrics() {
    const uptime = Date.now() - this.metrics.startTime;
    
    return {
      system: {
        uptime: uptime,
        uptimeFormatted: this.formatUptime(uptime),
        requests: this.metrics.requests,
        activeConnections: this.metrics.activeConnections,
        avgResponseTime: this.metrics.avgResponseTime,
        errors: this.metrics.errors
      },
      performance: {
        cacheHits: this.metrics.cacheHits,
        cacheMisses: this.metrics.cacheMisses,
        cacheHitRate: this.getCacheHitRate(),
        totalAnswers: this.metrics.totalAnswers
      }
    };
  }

  getCacheHitRate() {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses;
    return total > 0 ? ((this.metrics.cacheHits / total) * 100).toFixed(2) : 0;
  }

  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  async generatePerformanceReport() {
    const metrics = await this.getDatabaseMetrics();
    const system = this.getSystemMetrics();
    
    return {
      summary: {
        status: 'operational',
        uptime: system.system.uptimeFormatted,
        totalRequests: system.system.requests,
        avgResponseTime: system.system.avgResponseTime,
        errorRate: ((system.system.errors / system.system.requests) * 100).toFixed(2)
      },
      database: metrics.database,
      cache: {
        hitRate: system.performance.cacheHitRate,
        totalHits: system.performance.cacheHits,
        totalMisses: system.performance.cacheMisses
      },
      game: {
        totalAnswers: system.performance.totalAnswers,
        activeRooms: metrics.database.activeRooms,
        totalRooms: metrics.database.totalRooms
      },
      recommendations: this.getRecommendations(system, metrics)
    };
  }

  getRecommendations(system, metrics) {
    const recommendations = [];
    
    if (system.system.avgResponseTime > 100) {
      recommendations.push('Consider optimizing database queries - response time is high');
    }
    
    if (parseFloat(system.performance.cacheHitRate) < 80) {
      recommendations.push('Cache hit rate is low - consider adjusting cache TTL settings');
    }
    
    if (system.system.errors / system.system.requests > 0.01) {
      recommendations.push('Error rate is above 1% - investigate error logs');
    }
    
    if (metrics.database.activeRooms > 100) {
      recommendations.push('High number of active rooms - monitor memory usage');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('System is performing optimally');
    }
    
    return recommendations;
  }

  getDashboardHTML() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WordRush Production Monitor</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #333; }
        .metric-value { font-size: 24px; font-weight: bold; color: #007bff; margin-bottom: 5px; }
        .metric-label { font-size: 14px; color: #666; }
        .status-good { color: #28a745; }
        .status-warning { color: #ffc107; }
        .status-error { color: #dc3545; }
        .refresh-btn { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
        .refresh-btn:hover { background: #0056b3; }
        .chart-container { height: 200px; background: #f8f9fa; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎮 WordRush Production Monitor</h1>
            <button class="refresh-btn" onclick="refreshMetrics()">🔄 Refresh Metrics</button>
            <p>Real-time performance monitoring for 300+ concurrent users</p>
        </div>
        
        <div class="metrics-grid" id="metricsGrid">
            <div class="metric-card">
                <div class="metric-title">System Status</div>
                <div class="metric-value status-good" id="systemStatus">Loading...</div>
                <div class="metric-label">Overall system health</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">Uptime</div>
                <div class="metric-value" id="uptime">Loading...</div>
                <div class="metric-label">System uptime</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">Active Connections</div>
                <div class="metric-value" id="connections">Loading...</div>
                <div class="metric-label">Current WebSocket connections</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">Active Rooms</div>
                <div class="metric-value" id="activeRooms">Loading...</div>
                <div class="metric-label">Games in progress</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">Response Time</div>
                <div class="metric-value" id="responseTime">Loading...</div>
                <div class="metric-label">Average response time (ms)</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">Cache Hit Rate</div>
                <div class="metric-value" id="cacheHitRate">Loading...</div>
                <div class="metric-label">Redis cache efficiency</div>
            </div>
        </div>
        
        <div style="margin-top: 30px;">
            <div class="metric-card">
                <div class="metric-title">Performance Recommendations</div>
                <ul id="recommendations">
                    <li>Loading recommendations...</li>
                </ul>
            </div>
        </div>
    </div>

    <script>
        async function refreshMetrics() {
            try {
                const response = await fetch('/metrics');
                const data = await response.json();
                
                document.getElementById('systemStatus').textContent = data.database.connected ? 'Healthy' : 'Warning';
                document.getElementById('systemStatus').className = 'metric-value ' + (data.database.connected ? 'status-good' : 'status-warning');
                
                document.getElementById('uptime').textContent = data.system.uptimeFormatted;
                document.getElementById('connections').textContent = data.system.activeConnections;
                document.getElementById('activeRooms').textContent = data.database.activeRooms;
                document.getElementById('responseTime').textContent = data.system.avgResponseTime.toFixed(2) + 'ms';
                document.getElementById('cacheHitRate').textContent = data.performance.cacheHitRate + '%';
                
                // Get recommendations
                const reportResponse = await fetch('/report');
                const report = await reportResponse.json();
                
                const recommendationsList = document.getElementById('recommendations');
                recommendationsList.innerHTML = '';
                report.recommendations.forEach(rec => {
                    const li = document.createElement('li');
                    li.textContent = rec;
                    recommendationsList.appendChild(li);
                });
                
            } catch (error) {
                console.error('Failed to refresh metrics:', error);
            }
        }
        
        // Auto-refresh every 10 seconds
        setInterval(refreshMetrics, 10000);
        
        // Initial load
        refreshMetrics();
    </script>
</body>
</html>`;
  }

  // Update metrics from external sources
  updateMetrics(type, data) {
    switch (type) {
      case 'connection':
        this.metrics.activeConnections = data.count;
        break;
      case 'response_time':
        this.metrics.responseTimes.push(data.time);
        this.updateAvgResponseTime();
        break;
      case 'cache_hit':
        this.metrics.cacheHits++;
        break;
      case 'cache_miss':
        this.metrics.cacheMisses++;
        break;
      case 'answer':
        this.metrics.totalAnswers++;
        break;
      case 'error':
        this.metrics.errors++;
        break;
    }
  }

  updateAvgResponseTime() {
    if (this.metrics.responseTimes.length > 0) {
      const recent = this.metrics.responseTimes.slice(-100); // Last 100 requests
      const sum = recent.reduce((a, b) => a + b, 0);
      this.metrics.avgResponseTime = sum / recent.length;
    }
  }

  start(port = 3001) {
    this.app.listen(port, () => {
      console.log(`📊 Production Monitor running on http://localhost:${port}`);
      console.log(`📈 Dashboard: http://localhost:${port}/dashboard`);
      console.log(`🔍 Metrics API: http://localhost:${port}/metrics`);
    });
  }
}

// Export for integration with main server
module.exports = ProductionMonitor;

// Run standalone if called directly
if (require.main === module) {
  const monitor = new ProductionMonitor();
  monitor.start();
}
