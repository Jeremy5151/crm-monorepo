import { Controller, Get } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

// Store logs in memory (last 1000 entries)
const logs: Array<{ timestamp: string; level: string; message: string }> = [];
const LOG_FILE = path.join(process.cwd(), 'crm-logs.jsonl');

// Load previous logs from file
function loadLogsFromFile() {
  try {
    if (fs.existsSync(LOG_FILE)) {
      const data = fs.readFileSync(LOG_FILE, 'utf-8');
      const lines = data.split('\n').filter(line => line.trim());
      const loaded = lines.slice(-1000).map(line => {
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

// Override console.log to capture logs
const originalLog = console.log;
const originalError = console.error;

console.log = function(...args: any[]) {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'LOG',
    message
  };
  
  logs.push(logEntry);
  appendLogToFile(logEntry);
  
  // Keep only last 1000 logs
  if (logs.length > 1000) logs.shift();
  
  originalLog.apply(console, args);
};

console.error = function(...args: any[]) {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    message
  };
  
  logs.push(logEntry);
  appendLogToFile(logEntry);
  
  // Keep only last 1000 logs
  if (logs.length > 1000) logs.shift();
  
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