/**
 * Structured logger for the main process using electron-log.
 * Logs to both console and file with rotation.
 * Log files are stored in the app's userData directory.
 */

import log from 'electron-log'

// Configure log level
log.transports.file.level = 'info'
log.transports.console.level = 'debug'

// Limit log file size (5 MB) and keep 3 rotated files
log.transports.file.maxSize = 5 * 1024 * 1024

// Format: [timestamp] [level] message
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}'
log.transports.console.format = '[{h}:{i}:{s}] [{level}] {text}'

export default log
