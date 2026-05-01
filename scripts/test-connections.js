const admin = require('firebase-admin');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function testConnections() {
  console.log('--- Database Connection Test ---');
  
  // 1. Test PostgreSQL (Prisma)
  console.log('\n[1/2] Testing PostgreSQL (Prisma)...');
  const prisma = new PrismaClient();
  try {
    const userCount = await prisma.user.count();
    console.log('✅ PostgreSQL Connection: SUCCESS');
    console.log(`   Info: Found ${userCount} user(s) in the "users" table.`);
  } catch (error) {
    console.error('❌ PostgreSQL Connection: FAILED');
    console.error(`   Error: ${error.message}`);
  } finally {
    await prisma.$disconnect();
  }

  // 2. Test Firebase Admin
  console.log('\n[2/2] Testing Firebase Admin SDK...');
  
  // Manually load .env to get credentials if not using JSON
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        value = value.trim().replace(/^["'](.+)["']$/, '$1');
        process.env[key] = value;
      }
    });
  }

  const serviceAccountPath = path.join(__dirname, '../../test-b069c-firebase-adminsdk-fbsvc-6298251c02.json');
  let credential;

  if (fs.existsSync(serviceAccountPath)) {
    credential = admin.credential.cert(serviceAccountPath);
  } else if (process.env.FIREBASE_PROJECT_ID) {
    credential = admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    });
  }

  if (!credential) {
    console.error('❌ Firebase Admin: FAILED (No credentials found in .env or JSON file)');
  } else {
    try {
      if (admin.apps.length === 0) {
        admin.initializeApp({ credential });
      }
      // Simple check: list first 1 users
      const userList = await admin.auth().listUsers(1);
      console.log('✅ Firebase Admin: SUCCESS');
      console.log(`   Info: Successfully communicated with Firebase project "${admin.app().options.credential.projectId || 'unknown'}".`);
    } catch (error) {
      console.error('❌ Firebase Admin: FAILED');
      console.error(`   Error: ${error.message}`);
    }
  }

  console.log('\n--- Test Complete ---');
  process.exit(0);
}

testConnections();
