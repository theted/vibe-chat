import express from "express";
import { describe, it, expect } from "bun:test";
import type { AddressInfo } from "node:net";
import {
  createHealthRouter,
  createMetricsRouter,
  createRoomsRouter,
  createStatsRouter,
} from "./index.js";
import type { SocketController } from "@/controllers/SocketController.js";
import type { MetricsService } from "@/services/MetricsService.js";

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  return app;
};

const withServer = async <T>(
  app: express.Express,
  action: (baseUrl: string) => Promise<T>,
): Promise<T> => {
  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    return await action(baseUrl);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
};

describe("server routes integration", () => {
  it("serves health checks", async () => {
    const app = createTestApp();
    app.use(createHealthRouter());

    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/health`);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.status).toBe("ok");
      expect(typeof body.timestamp).toBe("number");
      expect(typeof body.uptime).toBe("number");
    });
  });

  it("reports ok on detailed health when no dependency is down", async () => {
    const app = createTestApp();
    app.use(
      createHealthRouter({
        checks: {
          redis: async () => ({ status: "up", latencyMs: 1 }),
          chroma: async () => ({ status: "disabled" }),
        },
      }),
    );

    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/health/detailed`);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.status).toBe("ok");
      expect(body.checks).toEqual({
        redis: { status: "up", latencyMs: 1 },
        chroma: { status: "disabled" },
      });
    });
  });

  it("answers 503 on detailed health when a dependency is down", async () => {
    const app = createTestApp();
    app.use(
      createHealthRouter({
        checks: {
          redis: async () => ({ status: "up", latencyMs: 1 }),
          chroma: async () => ({ status: "down", error: "unreachable" }),
        },
      }),
    );

    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/health/detailed`);
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body.status).toBe("unhealthy");
      expect(body.checks.chroma).toEqual({
        status: "down",
        error: "unreachable",
      });
    });
  });

  it("counts a check that throws as down", async () => {
    const app = createTestApp();
    app.use(
      createHealthRouter({
        checks: {
          redis: async () => {
            throw new Error("boom");
          },
        },
      }),
    );

    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/health/detailed`);
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body.checks.redis).toEqual({
        status: "down",
        error: "check failed",
      });
    });
  });

  it("returns stats when socket controller is ready", async () => {
    const app = createTestApp();
    const statsPayload = { activeRooms: 2, activeUsers: 4 };
    app.use(
      createStatsRouter({
        getSocketController: () =>
          ({
            getStats: () => statsPayload,
          }) as unknown as SocketController,
      }),
    );

    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/stats`);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(statsPayload);
    });
  });

  it("returns 503 for stats when socket controller is missing", async () => {
    const app = createTestApp();
    app.use(createStatsRouter({ getSocketController: () => undefined }));

    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/stats`);
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body).toEqual({ error: "Socket controller not ready" });
    });
  });

  it("returns rooms from the socket controller", async () => {
    const app = createTestApp();
    const roomsPayload = [{ id: "lobby", name: "Lobby" }];
    app.use(
      createRoomsRouter({
        getSocketController: () =>
          ({
            roomManager: {
              getRoomList: () => roomsPayload,
            },
          }) as unknown as SocketController,
      }),
    );

    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/rooms`);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(roomsPayload);
    });
  });

  it("returns metrics and history from the metrics service", async () => {
    const app = createTestApp();
    const metricsPayload = { activeConnections: 1 };
    const historyPayload = [{ timestamp: 1, activeConnections: 2 }];
    app.use(
      createMetricsRouter({
        getMetricsService: () =>
          ({
            getDetailedMetrics: () => metricsPayload,
            getMetricsHistory: (duration?: number) => {
              expect(duration).toBe(60);
              return historyPayload;
            },
          }) as unknown as MetricsService,
      }),
    );

    await withServer(app, async (baseUrl) => {
      const metricsResponse = await fetch(`${baseUrl}/api/metrics`);
      const metricsBody = await metricsResponse.json();
      const historyResponse = await fetch(
        `${baseUrl}/api/metrics/history?duration=60`,
      );
      const historyBody = await historyResponse.json();

      expect(metricsResponse.status).toBe(200);
      expect(metricsBody).toEqual(metricsPayload);
      expect(historyResponse.status).toBe(200);
      expect(historyBody).toEqual(historyPayload);
    });
  });

  it("returns 503 for metrics when service is missing", async () => {
    const app = createTestApp();
    app.use(createMetricsRouter({ getMetricsService: () => undefined }));

    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/metrics`);
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body).toEqual({ error: "Metrics service not ready" });
    });
  });
});
