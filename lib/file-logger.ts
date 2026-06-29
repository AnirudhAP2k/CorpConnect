import type fsType from "fs";
import type pathType from "path";

let logStream: fsType.WriteStream | null = null;
let currentLogDateStr: string = "";

// Dynamic loader to prevent Webpack/Turbopack from trying to resolve Node.js modules in Edge/Browser
const getFs = (): typeof fsType => {
  return eval("require")("fs");
};

const getPath = (): typeof pathType => {
  return eval("require")("path");
};

/**
 * Generates the log file name based on the current date (e.g., sentry-2026-06-29.log).
 */
function getLogFileName(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `sentry-${year}-${month}-${day}.log`;
}

/**
 * Returns a write stream for the daily log file, creating a new stream if the date changes.
 */
function getLogStream(): fsType.WriteStream {
  const logFileName = getLogFileName();

  if (logStream && currentLogDateStr === logFileName) {
    return logStream;
  }

  // Close the old stream if it exists
  if (logStream) {
    try {
      logStream.end();
    } catch (e) {
      // Ignore cleanup error
    }
  }

  const fs = getFs();
  const path = getPath();
  const logDir = path.join(process.cwd(), "logs");

  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  } catch (error) {
    // If we fail to create the directory, we will print it to stdout using raw stream
    process.stderr.write(`Failed to create logs directory: ${error}\n`);
  }

  logStream = fs.createWriteStream(path.join(logDir, logFileName), { flags: "a" });
  currentLogDateStr = logFileName;
  return logStream;
}

/**
 * Safely stringifies objects to prevent circular reference errors.
 */
function safeStringify(obj: any): string {
  if (obj === null) return "null";
  if (obj === undefined) return "undefined";

  // Format Error objects properly since JSON.stringify(new Error()) yields "{}"
  if (obj instanceof Error) {
    return obj.stack || `${obj.name}: ${obj.message}`;
  }

  if (typeof obj !== "object") return String(obj);

  try {
    return JSON.stringify(obj);
  } catch (err) {
    // Handle circular structures
    const seen = new WeakSet();
    try {
      return JSON.stringify(obj, (key, value) => {
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) {
            return "[Circular]";
          }
          seen.add(value);
        }
        return value;
      });
    } catch (innerErr) {
      return `[Unrepresentable Object: ${innerErr}]`;
    }
  }
}

/**
 * Writes a formatted message to the daily log file.
 */
export function writeToLogFile(message: string): void {
  try {
    const stream = getLogStream();
    stream.write(message + "\n");
  } catch (error) {
    process.stderr.write(`Failed writing to sentry log file: ${error}\n`);
  }
}

/**
 * Intercepts console calls in the Node.js server environment.
 * If a console log is originating from Sentry, it is redirected to the daily file.
 * Non-Sentry logs are written to the daily file AND still printed to console to keep normal server output visible.
 */
export function setupConsoleInterceptor(): void {
  if (typeof window !== "undefined" || process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalInfo = console.info;

  const formatLog = (level: string, args: any[]): string => {
    const timestamp = new Date().toISOString();
    const message = args.map(safeStringify).join(" ");
    return `[${timestamp}] [${level}] ${message}`;
  };

  const isSentryLog = (args: any[]): boolean => {
    return args.some((arg) => {
      if (typeof arg === "string") {
        const lower = arg.toLowerCase();
        return lower.includes("sentry") || lower.includes("sentry logger");
      }
      return false;
    });
  };

  console.log = (...args: any[]) => {
    const formatted = formatLog("INFO", args);
    writeToLogFile(formatted);
    if (!isSentryLog(args)) {
      originalLog(...args);
    }
  };

  console.info = (...args: any[]) => {
    const formatted = formatLog("INFO", args);
    writeToLogFile(formatted);
    if (!isSentryLog(args)) {
      originalInfo(...args);
    }
  };

  console.warn = (...args: any[]) => {
    const formatted = formatLog("WARN", args);
    writeToLogFile(formatted);
    if (!isSentryLog(args)) {
      originalWarn(...args);
    }
  };

  console.error = (...args: any[]) => {
    const formatted = formatLog("ERROR", args);
    writeToLogFile(formatted);
    if (!isSentryLog(args)) {
      originalError(...args);
    }
  };
}
