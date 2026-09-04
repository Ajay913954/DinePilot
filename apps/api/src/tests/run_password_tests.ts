import { hashPassword, verifyPassword, comparePassword } from '../utils/auth.js';

async function runPasswordTests() {
  console.log('================================================');
  console.log('🧪 RUNNING CHECKPOINT 2: PASSWORD SECURITY TESTS');
  console.log('================================================\n');

  const rawPassword = 'SuperSecretPassword123!';
  
  // 1. Hash Password
  console.log('[Test 1]: Hashing password...');
  const hash = await hashPassword(rawPassword);
  
  if (hash === rawPassword) {
    throw new Error('FAIL: Hash matches raw password!');
  }
  if (!hash.startsWith('$2b$') && !hash.startsWith('$2a$')) {
    throw new Error('FAIL: Hash does not match bcrypt format');
  }
  console.log('✅ PASS: Password hashed successfully:', hash);

  // 2. Verify Valid Password
  console.log('\n[Test 2]: Verifying valid password...');
  const isValid = await verifyPassword(rawPassword, hash);
  if (!isValid) {
    throw new Error('FAIL: Valid password failed verification!');
  }
  console.log('✅ PASS: Valid password verified successfully');

  // 3. Verify Invalid Password
  console.log('\n[Test 3]: Verifying invalid password...');
  const isInvalidValid = await verifyPassword('WrongPassword123!', hash);
  if (isInvalidValid) {
    throw new Error('FAIL: Invalid password passed verification!');
  }
  console.log('✅ PASS: Incorrect password correctly rejected');

  console.log('\n================================================');
  console.log('🎉 CHECKPOINT 2: PASSWORD SECURITY VERIFIED 100%!');
  console.log('================================================\n');
}

runPasswordTests().catch((err) => {
  console.error('❌ PASSWORD TEST FAILED:', err);
  process.exit(1);
});
