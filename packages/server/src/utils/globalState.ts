import type { SocketController } from "../controllers/SocketController.js";
import type { MetricsService } from "../services/MetricsService.js";
import type { RedisClient } from "../services/RedisClient.js";

type ServerGlobalState = typeof globalThis & {
  socketController?: SocketController;
  metricsService?: MetricsService;
  redisClient?: RedisClient | null;
};

const globalState = globalThis as ServerGlobalState;

/**
 * Returns the global SocketController instance, if it exists.
 */
export const getSocketController = (): SocketController | undefined =>
  globalState.socketController;

/**
 * Updates the global SocketController instance.
 */
export const setSocketController = (
  socketController: SocketController | undefined,
): void => {
  globalState.socketController = socketController;
};

/**
 * Returns the global MetricsService instance, if it exists.
 */
export const getMetricsService = (): MetricsService | undefined =>
  globalState.metricsService;

/**
 * Updates the global MetricsService instance.
 */
export const setMetricsService = (
  metricsService: MetricsService | undefined,
): void => {
  globalState.metricsService = metricsService;
};

/**
 * Returns the server's Redis client: undefined before startup, null when
 * Redis was unavailable at startup.
 */
export const getRedisClient = (): RedisClient | null | undefined =>
  globalState.redisClient;

/**
 * Updates the server's Redis client.
 */
export const setRedisClient = (redisClient: RedisClient | null): void => {
  globalState.redisClient = redisClient;
};
