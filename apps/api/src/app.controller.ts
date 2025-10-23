import { Controller, Get } from '@nestjs/common';

// Store logs in memory (last 1000 entries)
const logs: Array<{ timestamp: string; level: string; message: string }> = [];

// Override console.log to capture logs
const originalLog = console.log;
const originalError = console.error;

console.log = function(...args: any[]) {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');
  
  logs.push({
    timestamp: new Date().toISOString(),
    level: 'LOG',
    message
  });
  
  // Keep only last 1000 logs
  if (logs.length > 1000) logs.shift();
  
  originalLog.apply(console, args);
};

console.error = function(...args: any[]) {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');
  
  logs.push({
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    message
  });
  
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