const admin = require('firebase-admin');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function run() {
  console.log('--- Syncing New Admin User ---');
  
  // 1. Load Environment
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

  // 2. Init Firebase
  const serviceAccountPath = path.join(__dirname, '../../test-b069c-firebase-adminsdk-fbsvc-6298251c02.json');
  let credential;
  if (fs.existsSync(serviceAccountPath)) {
    credential = admin.credential.cert(serviceAccountPath);
  } else {
    credential = admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    });
  }
  
  if (admin.apps.length === 0) {
    admin.initializeApp({ credential });
  }

  const email = process.argv[2] || 'admin@gmail.com';

  try {
    // 3. Get Firebase User
    const firebaseUser = await admin.auth().getUserByEmail(email);
    console.log(`✅ Found Firebase user: ${email} (UID: ${firebaseUser.uid})`);

    // 4. Update Custom Claims
    await admin.auth().setCustomUserClaims(firebaseUser.uid, { role: 'ADMINISTRATOR' });
    console.log('✅ Updated Firebase custom claims to ADMINISTRATOR.');

    // 5. Sync with PostgreSQL
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { firebaseUid: firebaseUser.uid, role: 'ADMINISTRATOR' }
      });
      console.log('✅ Updated existing database user record.');
    } else {
      await prisma.user.create({
        data: {
          email,
          displayName: 'Admin User',
          firebaseUid: firebaseUser.uid,
          role: 'ADMINISTRATOR',
          administrator: { create: { department: 'System' } }
        }
      });
      console.log('✅ Created new database user and administrator records.');
    }

    console.log('\nSUCCESS: You can now login with this user.');
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

run();
