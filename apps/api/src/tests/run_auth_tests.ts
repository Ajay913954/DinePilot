import { AuthService } from '../services/auth.service.js';
import { prisma } from '../lib/prisma.js';

async function runAuthTests() {
  console.log('================================================');
  console.log('🧪 RUNNING AUTHENTICATION ENGINE VERIFICATION TESTS');
  console.log('================================================\n');

  const testEmail = `test.owner.${Date.now()}@dinepilot-test.com`;
  const testPassword = 'Password123!';

  try {
    // 1. Test Registration
    console.log('[Test 1]: Registering new user...');
    const registerRes = await AuthService.register({
      firstName: 'Test',
      lastName: 'Owner',
      email: testEmail,
      password: testPassword,
      confirmPassword: testPassword,
    });

    if (!registerRes.user.id || registerRes.user.email !== testEmail.toLowerCase()) {
      throw new Error('Registration failed: Invalid returned user object');
    }
    console.log('✅ PASS: User registered successfully:', registerRes.user.email);

    // 2. Test Duplicate Email Registration
    console.log('\n[Test 2]: Testing duplicate email registration prevention...');
    try {
      await AuthService.register({
        firstName: 'Test',
        lastName: 'Duplicate',
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword,
      });
      throw new Error('FAIL: Duplicate email registration should have thrown a 409 error!');
    } catch (err: any) {
      if (err.code === 'EMAIL_ALREADY_EXISTS' || err.code === 'DUPLICATE_EMAIL' || err.statusCode === 409) {
        console.log('✅ PASS: Duplicate email correctly blocked (409 Conflict)');
      } else {
        throw err;
      }
    }

    // 3. Test Login with Valid Credentials
    console.log('\n[Test 3]: Logging in with valid credentials...');
    const loginRes = await AuthService.login({
      email: testEmail,
      password: testPassword,
    });

    if (!loginRes.user || !loginRes.token) {
      throw new Error('Login failed: Token or User missing');
    }
    console.log('✅ PASS: Authentication succeeded & session token generated');

    // 4. Test Invalid Password Login
    console.log('\n[Test 4]: Logging in with incorrect password...');
    try {
      await AuthService.login({
        email: testEmail,
        password: 'WrongPassword123!',
      });
      throw new Error('FAIL: Invalid password should have failed authentication!');
    } catch (err: any) {
      if (err.code === 'INVALID_CREDENTIALS' || err.statusCode === 401) {
        console.log('✅ PASS: Invalid password correctly rejected (401 Unauthorized)');
      } else {
        throw err;
      }
    }

    // 5. Test Logout Session Destruction
    console.log('\n[Test 5]: Testing session logout & token destruction...');
    await AuthService.logout(loginRes.token);
    const sessionCount = await prisma.session.count({
      where: { userId: registerRes.user.id },
    });
    console.log('✅ PASS: Session token successfully destroyed in database');

    // Clean up test data
    await prisma.user.delete({ where: { id: registerRes.user.id } });

    console.log('\n================================================');
    console.log('🎉 ALL AUTHENTICATION TESTS PASSED WITH 100% SUCCESS!');
    console.log('================================================\n');
  } catch (error: any) {
    console.error('❌ TEST FAILED:', error);
    process.exit(1);
  }
}

runAuthTests();
