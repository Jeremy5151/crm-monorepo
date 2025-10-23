import { Controller, Get } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

// Log types
export enum LogType {
  INCOMING_LEAD = 'INCOMING_LEAD',
  OUTGOING_REQUEST = 'OUTGOING_REQUEST',
  STATUS_PULL = 'STATUS_PULL',
  AUTH = 'AUTH',
  SYSTEM = 'SYSTEM',
}

// Store logs in memory (last 500 entries - full console output)
const logs: Array<{ timestamp: string; level: string; type: LogType; message: string }> = [];
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
      }).filter(Boolean) as Array<{ timestamp: string; level: string; type: LogType; message: string }>;
      
      logs.push(...loaded);
    }
  } catch (error) {
    console.error('Failed to load logs from file:', error);
  }
}

// Helper to write log to file
function writeLogToFile(logEntry: { timestamp: string; level: string; type: LogType; message: string }) {
  try {
    fs.appendFileSync(LOG_FILE, JSON.stringify(logEntry) + '\n');
  } catch (error) {
    console.error('Failed to write log to file:', error);
  }
}

// Helper to add log
function addLog(level: string, type: LogType, message: string) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    type,
    message
  };
  logs.unshift(logEntry); // Add to beginning (newest first)
  if (logs.length > MAX_LOGS) logs.pop();
  writeLogToFile(logEntry);
}

loadLogsFromFile();

// Override console methods to capture logs with type
const originalLog = console.log;
const originalError = console.error;

console.log = function(...args: any[]) {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');
  
  // Determine log type based on content
  let logType = LogType.SYSTEM;
  if (message.includes('OUTGOING REQUEST')) logType = LogType.OUTGOING_REQUEST;
  else if (message.includes('INCOMING RESPONSE')) logType = LogType.OUTGOING_REQUEST;
  else if (message.includes('Pulling status')) logType = LogType.STATUS_PULL;
  else if (message.includes('Response from')) logType = LogType.STATUS_PULL;
  else if (message.includes('login') || message.includes('Login')) logType = LogType.AUTH;
  else if (message.includes('Lead created') || message.includes('incoming')) logType = LogType.INCOMING_LEAD;

  addLog('LOG', logType, message);
  originalLog.apply(console, args);
};

console.error = function(...args: any[]) {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');
  
  let logType = LogType.SYSTEM;
  if (message.includes('OUTGOING REQUEST')) logType = LogType.OUTGOING_REQUEST;
  else if (message.includes('Pulling status')) logType = LogType.STATUS_PULL;

  addLog('ERROR', logType, message);
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

  @Get('logs/:type')
  getLogsByType(type: string) {
    const filterType = Object.values(LogType).includes(type as LogType) ? (type as LogType) : null;
    if (!filterType) return logs; // Return all if invalid type
    return logs.filter(log => log.type === filterType);
  }
}