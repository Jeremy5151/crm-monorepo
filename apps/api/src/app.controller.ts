import { Controller, Get } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

// Store logs in memory (last 500 entries - full console output)
const logs: Array<{ timestamp: string; level: string; message: string }> = [];
const LOG_FILE = path.join(process.cwd(), 'crm-logs.jsonl');
const MAX_LOGS = 500;

// Load previous logs from file
function loadLogsFromFile() {
  try {
    if (fs.existsSync(LOG_FILE)) {
      const data = fs.readFileSync(LOG_FILE, 'utf-8');
      const lines = data.split('\n').filter(line => line.trim());
      const loaded = lines.slice(-MAX_LOGS).map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(Boolean) as Array<{ timestamp: string; level: string; message: string }>;
      
      logs.push(...loaded);
    }
  } catch (error) {
    console.error('Failed to load logs from file:', error);
  }
}

// Append log to file
function appendLogToFile(log: { timestamp: string; level: string; message: string }) {
  try {
    fs.appendFileSync(LOG_FILE, JSON.stringify(log) + '\n');
  } catch (error) {
    console.error('Failed to write log to file:', error);
  }
}

loadLogsFromFile();

// Override console.log to capture ALL output
const originalLog = console.log;
const originalError = console.error;

console.log = function(...args: any[]) {
  // Convert all args to strings, handling multiline content
  const message = args.map((arg, i) => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');
  
  // Split multiline messages into separate logs
  const lines = message.split('\n');
  lines.forEach(line => {
    if (line.trim()) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'LOG',
        message: line
      };
      
      logs.unshift(logEntry); // Add to front (newest first)
      appendLogToFile(logEntry);
      
      // Keep only last 500 logs
      if (logs.length > MAX_LOGS) logs.pop();
    }
  });
  
  originalLog.apply(console, args);
};

console.error = function(...args: any[]) {
  const message = args.map((arg, i) => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');
  
  // Split multiline messages into separate logs
  const lines = message.split('\n');
  lines.forEach(line => {
    if (line.trim()) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        message: line
      };
      
      logs.unshift(logEntry); // Add to front (newest first)
      appendLogToFile(logEntry);
      
      // Keep only last 500 logs
      if (logs.length > MAX_LOGS) logs.pop();
    }
  });
  
  originalError.apply(console, args);
};

@Controller('v1')
export class AppController {
  @Get('ping')
  ping() {
    return { status: 'ok' };
  }

  @Get('logs')
  getLogs() {
    return logs;
  }
}