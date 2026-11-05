import { describe, expect, it } from "bun:test";
import { createApp } from "../../src/app";
import { InMemoryDeviceRepository } from "../../src/modules/catalog/infrastructure/in-memory-device.repository";
import { InMemoryReviewRepository } from "../../src/modules/reviews";
import { aConfig } from "../builders/config.builder";
import { aDevice } from "../builders/device.builder";

describe("HTTP API", () => {
  const config = aConfig().build();

  it("GET /health returns 200 with status ok and timestamp without touching database", async () => {
    const { app } = createApp({ config });
    const res = await app.request("/health");

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
  });

  it("GET /v1/devices lists active devices with specs", async () => {
    const deviceRepo = new InMemoryDeviceRepository();
    const { app } = createApp({ config, deviceRepo });

    const res = await app.request("/v1/devices");
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.items).toBeArray();
  });

  it("POST /v1/recommend returns ranked recommendations based on constraints and weights", async () => {
    const deviceRepo = new InMemoryDeviceRepository();
    const d1 = aDevice()
      .withId("d1")
      .withModel("Moto G85")
      .withPriceCents(169900)
      .withBatteryMah(5000)
      .build();
    await deviceRepo.save(d1, d1.specs);

    const { app } = createApp({ config, deviceRepo });

    const res = await app.request("/v1/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        constraints: [
          { kind: "maxPrice", value: 200000 },
        ],
        weights: {
          battery: 0.5,
          valueForMoney: 0.5,
        },
        limit: 3,
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.items).toBeArray();
    expect(body.items.length).toBe(1);
    expect(body.items[0].device.model).toBe("Moto G85");
    expect(body.items[0].fitPercent).toBeGreaterThan(50);
  });

  it("POST /v1/chat orchestrates criteria extraction, recommendation and conversational reply", async () => {
    const deviceRepo = new InMemoryDeviceRepository();
    const d1 = aDevice()
      .withId("d1")
      .withModel("Moto G85")
      .withPriceCents(169900)
      .withBatteryMah(5000)
      .build();
    await deviceRepo.save(d1, d1.specs);

    const { app } = createApp({ config, deviceRepo });

    const res = await app.request("/v1/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Quero um celular até 1800 reais com boa bateria",
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.reply).toBeString();
    expect(body.reply.length).toBeGreaterThan(10);
    expect(body.results).toBeArray();
    expect(body.results.length).toBe(1);
    expect(body.state).toBeDefined();
  });

  it("POST /v1/admin/devices requires X-Admin-Key", async () => {
    const deviceRepo = new InMemoryDeviceRepository();
    const { app } = createApp({ config, deviceRepo });

    const res = await app.request("/v1/admin/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brand: "Motorola",
        model: "Moto G85",
        priceCents: 169900,
      }),
    });

    expect(res.status).toBe(401);
  });

  it("full catalog CRUD workflow: create, get, list, update, and delete", async () => {
    const deviceRepo = new InMemoryDeviceRepository();
    const { app } = createApp({ config, deviceRepo });
    const adminHeaders = {
      "Content-Type": "application/json",
      "X-Admin-Key": config.admin.key,
    };

    // 1. Create Device
    const createRes = await app.request("/v1/admin/devices", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        brand: "Samsung",
        model: "Galaxy A55",
        priceCents: 199900,
        photos: ["https://example.com/a55.jpg"],
        specs: [
          { key: "battery_mah", valueNum: 5000 },
          { key: "ram_gb", valueNum: 8 },
          { key: "processor", valueText: "Exynos 1480" },
        ],
      }),
    });

    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as any;
    expect(created.id).toBeDefined();
    expect(created.brand).toBe("Samsung");
    expect(created.model).toBe("Galaxy A55");
    expect(created.specs).toHaveLength(3);

    const deviceId = created.id;

    // 2. GET /v1/devices/:id
    const getRes = await app.request(`/v1/devices/${deviceId}`);
    expect(getRes.status).toBe(200);
    const fetched = (await getRes.json()) as any;
    expect(fetched.id).toBe(deviceId);
    expect(fetched.priceCents).toBe(199900);

    // 3. GET /v1/devices (list)
    const listRes = await app.request("/v1/devices");
    expect(listRes.status).toBe(200);
    const listBody = (await listRes.json()) as any;
    expect(listBody.items).toHaveLength(1);
    expect(listBody.items[0].id).toBe(deviceId);

    // 4. PUT /v1/admin/devices/:id
    const updateRes = await app.request(`/v1/admin/devices/${deviceId}`, {
      method: "PUT",
      headers: adminHeaders,
      body: JSON.stringify({
        priceCents: 184900,
      }),
    });
    expect(updateRes.status).toBe(200);
    const updated = (await updateRes.json()) as any;
    expect(updated.priceCents).toBe(184900);

    // 5. DELETE /v1/admin/devices/:id
    const deleteRes = await app.request(`/v1/admin/devices/${deviceId}`, {
      method: "DELETE",
      headers: adminHeaders,
    });
    expect(deleteRes.status).toBe(204);

    // 6. Verify it is gone
    const getDeletedRes = await app.request(`/v1/devices/${deviceId}`);
    expect(getDeletedRes.status).toBe(404);
  });

  it("admin routes for review sources and import", async () => {
    const reviewRepo = new InMemoryReviewRepository();
    const { app } = createApp({ config, reviewRepo });
    const adminHeaders = {
      "Content-Type": "application/json",
      "X-Admin-Key": config.admin.key,
    };

    const deviceId = crypto.randomUUID();

    // 1. POST /v1/admin/devices/:id/sources
    const linkRes = await app.request(`/v1/admin/devices/${deviceId}/sources`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        provider: "youtube",
        externalRef: "yt-video-123",
        intervalDays: 2,
      }),
    });
    expect(linkRes.status).toBe(201);
    const linkBody = (await linkRes.json()) as any;
    expect(linkBody.data.provider).toBe("youtube");
    expect(linkBody.data.externalRef).toBe("yt-video-123");

    // 2. POST /v1/admin/reviews/import
    const importRes = await app.request("/v1/admin/reviews/import", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        items: [
          {
            deviceId,
            content: "Comprei e a bateria dura mais de um dia inteiro sem carregar",
            provider: "csv",
          },
        ],
      }),
    });
    expect(importRes.status).toBe(200);
    const importBody = (await importRes.json()) as any;
    expect(importBody.data.inserted).toBe(1);
    expect(importBody.data.relevant).toBe(1);

    // 3. GET /v1/admin/catalog/search
    const searchRes = await app.request("/v1/admin/catalog/search?q=Galaxy", {
      headers: adminHeaders,
    });
    expect(searchRes.status).toBe(200);
    const searchBody = (await searchRes.json()) as any;
    expect(searchBody.data).toBeArray();
  });
});
