import express from "express";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
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
  action: (baseUrl: string) => Promise<T>
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

      assert.equal(response.status, 200);
      assert.equal(body.status, "ok");
      assert.equal(typeof body.timestamp, "number");
      assert.equal(typeof body.uptime, "number");
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
      })
    );

    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/stats`);
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.deepEqual(body, statsPayload);
    });
  });

  it("returns 503 for stats when socket controller is missing", async () => {
    const app = createTestApp();
    app.use(createStatsRouter({ getSocketController: () => undefined }));

    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/stats`);
      const body = await response.json();

      assert.equal(response.status, 503);
      assert.deepEqual(body, { error: "Socket controller not ready" });
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
      })
    );

    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/rooms`);
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.deepEqual(body, roomsPayload);
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
              assert.equal(duration, 60);
              return historyPayload;
            },
          }) as unknown as MetricsService,
      })
    );

    await withServer(app, async (baseUrl) => {
      const metricsResponse = await fetch(`${baseUrl}/api/metrics`);
      const metricsBody = await metricsResponse.json();
      const historyResponse = await fetch(
        `${baseUrl}/api/metrics/history?duration=60`
      );
      const historyBody = await historyResponse.json();

      assert.equal(metricsResponse.status, 200);
      assert.deepEqual(metricsBody, metricsPayload);
      assert.equal(historyResponse.status, 200);
      assert.deepEqual(historyBody, historyPayload);
    });
  });

  it("returns 503 for metrics when service is missing", async () => {
    const app = createTestApp();
    app.use(createMetricsRouter({ getMetricsService: () => undefined }));

    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/metrics`);
      const body = await response.json();

      assert.equal(response.status, 503);
      assert.deepEqual(body, { error: "Metrics service not ready" });
    });
  });
});
