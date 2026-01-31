import type { SocketController } from "../controllers/SocketController.js";
import type { MetricsService } from "../services/MetricsService.js";

type ServerGlobalState = typeof globalThis & {
  socketController?: SocketController;
  metricsService?: MetricsService;
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
