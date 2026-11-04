import { describe, expect, it } from "bun:test";
import { createApp } from "../../src/app";
import { InMemoryDeviceRepository } from "../../src/modules/catalog";
import { RuleBasedCriteriaExtractor } from "../../src/modules/chat";
import { aConfig } from "../builders/config.builder";
import { aDevice } from "../builders/device.builder";

describe("HTTP API", () => {
  const config = aConfig().withAdminKey("super-secret-admin-key-24-chars").build();

  it("GET /health returns 200 with status ok and timestamp without touching database", async () => {
    const deviceRepo = new InMemoryDeviceRepository();
    const { app } = createApp({ config, deviceRepo });

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
    expect(body.items).toHaveLength(0);
  });

  it("POST /v1/recommend returns ranked recommendations based on constraints and weights", async () => {
    const deviceRepo = new InMemoryDeviceRepository();
    const d1 = aDevice().withId("d1").withModel("Budget King").withPriceCents(130000).withBatteryMah(6000).build();
    const d2 = aDevice().withId("d2").withModel("Premium Pro").withPriceCents(350000).withBatteryMah(4500).build();
    await deviceRepo.save(d1, d1.specs);
    await deviceRepo.save(d2, d2.specs);

    const { app } = createApp({ config, deviceRepo });

    const res = await app.request("/v1/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        constraints: [
          { kind: "maxPrice", value: 200000 },
        ],
        weights: {
          battery: 0.8,
        },
        limit: 3,
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.items).toHaveLength(1);
    expect(body.items[0].device.id).toBe("d1");
    expect(body.items[0].fitPercent).toBeGreaterThanOrEqual(50);
  });

  it("POST /v1/chat orchestrates criteria extraction, recommendation and conversational reply", async () => {
    const deviceRepo = new InMemoryDeviceRepository();
    const d1 = aDevice().withId("d1").withModel("Moto G85").withPriceCents(169900).withBatteryMah(5000).build();
    await deviceRepo.save(d1, d1.specs);

    const criteriaExtractor = new RuleBasedCriteriaExtractor();
    const { app } = createApp({ config, deviceRepo, criteriaExtractor });

    const res = await app.request("/v1/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Quero um celular até 1800 reais com boa bateria",
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.reply).toBeDefined();
    expect(body.results).toHaveLength(1);
    expect(body.results[0].device.id).toBe("d1");
    expect(body.state).toBeDefined();
    expect(body.state.referenceDeviceId).toBe("d1");
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
});
