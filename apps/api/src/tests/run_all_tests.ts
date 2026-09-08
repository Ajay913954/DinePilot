import { execSync } from 'child_process';

const testScripts = [
  { name: 'Day 1 & Day 2: Authentication Engine', script: 'apps/api/src/tests/run_auth_tests.ts' },
  { name: 'Day 1 & Day 2: Security & Multi-Tenant Boundaries', script: 'apps/api/src/tests/run_security_tenant_tests.ts' },
  { name: 'Day 3: Restaurant Onboarding & Slug Resolution', script: 'apps/api/src/tests/run_day3_onboarding_tests.ts' },
  { name: 'Day 4: Table Management & Centralized Reservation Engine', script: 'apps/api/src/tests/run_day4_reservation_tests.ts' },
  { name: 'Day 5: Customer CRM, Intelligence & Merge Engine', script: 'apps/api/src/tests/run_day5_customer_crm_tests.ts' },
  { name: 'Day 6: Menu Management & Digital Restaurant Catalog', script: 'apps/api/src/tests/run_day6_menu_tests.ts' },
  { name: 'Day 6: Menu Security & STAFF/Force-Delete Isolation', script: 'apps/api/src/tests/run_day6_security_menu_tests.ts' },
  { name: 'Day 7: Orders, Order Items & Restaurant Order Management', script: 'apps/api/src/tests/run_day7_order_tests.ts' },
  { name: 'Day 8: Payments & Billing Foundation', script: 'apps/api/src/tests/run_day8_payment_tests.ts' },
];

async function runAllTests() {
  console.log('================================================================');
  console.log('🚀 DINEPILOT MASTER INTEGRATION & SECURITY TEST RUNNER');
  console.log('================================================================\n');

  let passedCount = 0;
  const startTime = Date.now();

  for (let i = 0; i < testScripts.length; i++) {
    const { name, script } = testScripts[i];
    console.log(`\n----------------------------------------------------------------`);
    console.log(`[TEST SUITE ${i + 1}/${testScripts.length}]: ${name}`);
    console.log(`Running: npx tsx ${script}`);
    console.log(`----------------------------------------------------------------`);

    try {
      const output = execSync(`npx tsx ${script}`, {
        encoding: 'utf-8',
        stdio: 'inherit',
      });
      passedCount++;
    } catch (err: any) {
      console.error(`\n❌ TEST SUITE FAILED: ${name}`);
      process.exit(1);
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n================================================================');
  console.log(`🎉 ALL ${passedCount}/${testScripts.length} TEST SUITES PASSED CLEANLY IN ${durationSec}s!`);
  console.log('================================================================\n');
}

runAllTests();
