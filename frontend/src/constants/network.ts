// Network and WebSocket constants
export const WEBSOCKET = {
  HEARTBEAT_INTERVAL: 10000, // 10 seconds
  HEARTBEAT_TIMEOUT: 25000, // 25 seconds
  CONNECTION_CHECK_INTERVAL: 5000, // 5 seconds
} as const;

export const RECONNECTION = {
  INITIAL_DELAY: 100,
  STEP_DELAYS: [100, 1000, 3000, 5000], // Progressive delays
  MAX_DELAY: 10000,
  UNLIMITED_ATTEMPTS: -1,
  DISPLAY_MAX_FOR_UNLIMITED: 999,
} as const;

export const TIMEOUTS = {
  WEBSOCKET_RECEIVE: 20000, // 20 seconds
  COMMAND_EXECUTION: 30000, // 30 seconds
  API_REQUEST: 10000, // 10 seconds
} as const;

export const RETRY = {
  MAX_API_RETRIES: 3,
  API_RETRY_DELAY: 1000,
  NETWORK_CHECK_INTERVAL: 5000,
} as const;