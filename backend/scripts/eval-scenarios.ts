import { aDevice } from "../test/builders/device.builder";
import { type CatalogApi } from "../src/modules/catalog";
import { RecommendUseCase } from "../src/modules/recommender";
import scenarios from "../../docs/cenarios/personas.json";

// Representative catalog fixtures for scenario evaluation
const catalogDevices = [
  aDevice()
    .withId("moto-g24")
    .withBrand("Motorola")
    .withModel("Moto G24")
    .withPriceCents(89900)
    .withBatteryMah(5000)
    .withRamGb(4)
    .with5g(false)
    .withProcessor("Helio G85")
    .withNumericSpec("storage_gb", 128)
    .withNumericSpec("screen_size_inches", 6.56)
    .withNumericSpec("main_camera_mp", 50)
    .build(),
  aDevice()
    .withId("moto-g85")
    .withBrand("Motorola")
    .withModel("Moto G85")
    .withPriceCents(169900)
    .withBatteryMah(5000)
    .withRamGb(8)
    .with5g(true)
    .withProcessor("Snapdragon 6s Gen 3")
    .withNumericSpec("storage_gb", 256)
    .withNumericSpec("screen_size_inches", 6.67)
    .withNumericSpec("main_camera_mp", 50)
    .build(),
  aDevice()
    .withId("galaxy-a55")
    .withBrand("Samsung")
    .withModel("Galaxy A55")
    .withPriceCents(199900)
    .withBatteryMah(5000)
    .withRamGb(8)
    .with5g(true)
    .withProcessor("Exynos 1480")
    .withNumericSpec("storage_gb", 256)
    .withNumericSpec("screen_size_inches", 6.6)
    .withNumericSpec("main_camera_mp", 50)
    .build(),
  aDevice()
    .withId("poco-x6-pro")
    .withBrand("Xiaomi")
    .withModel("Poco X6 Pro")
    .withPriceCents(219900)
    .withBatteryMah(5000)
    .withRamGb(12)
    .with5g(true)
    .withProcessor("Dimensity 8300")
    .withNumericSpec("storage_gb", 512)
    .withNumericSpec("screen_size_inches", 6.67)
    .withNumericSpec("main_camera_mp", 64)
    .build(),
  aDevice()
    .withId("galaxy-s24-ultra")
    .withBrand("Samsung")
    .withModel("Galaxy S24 Ultra")
    .withPriceCents(599900)
    .withBatteryMah(5000)
    .withRamGb(12)
    .with5g(true)
    .withProcessor("Snapdragon 8 Gen 3")
    .withNumericSpec("storage_gb", 512)
    .withNumericSpec("screen_size_inches", 6.8)
    .withNumericSpec("main_camera_mp", 200)
    .build(),
];

const fakeCatalog: CatalogApi = {
  findDeviceById: async (id) => catalogDevices.find((d) => d.id === id) ?? null,
  findByBrandAndModel: async () => null,
  listActiveDevices: async () => ({ items: catalogDevices }),
};

async function runEvaluation() {
  console.log("=== PhoneMatch Recommender Evaluation (eval-scenarios) ===");
  console.log(`Evaluating ${scenarios.length} reference personas against catalog of ${catalogDevices.length} devices...\n`);

  const recommender = new RecommendUseCase({ catalogApi: fakeCatalog });
  let passed = 0;

  for (const s of scenarios) {
    const result = await recommender.execute({
      constraints: s.query.constraints as any ?? [],
      weights: s.query.weights as any,
      limit: s.query.limit,
    });

    const topMatch = result.items[0];
    if (!topMatch) {
      console.error(`❌ [FAIL] ${s.name}: No devices returned!`);
      continue;
    }

    const satisfiesEmphasis = topMatch.topAspects.includes(s.expectedAspectEmphasis as any);
    const statusIcon = satisfiesEmphasis ? "✅" : "⚠️";

    console.log(
      `${statusIcon} ${s.name}: Top 1 -> ${topMatch.device.brand} ${topMatch.device.model} (Fit: ${topMatch.fitPercent}%, Utility: ${topMatch.utility}) [Strengths: ${topMatch.topAspects.join(", ")}]`,
    );

    if (satisfiesEmphasis) {
      passed++;
    }
  }

  console.log(`\nEvaluation complete: ${passed}/${scenarios.length} scenarios matched expected emphasis.`);
  if (passed < scenarios.length) {
    process.exit(1);
  }
}

runEvaluation().catch((err) => {
  console.error(err);
  process.exit(1);
});
