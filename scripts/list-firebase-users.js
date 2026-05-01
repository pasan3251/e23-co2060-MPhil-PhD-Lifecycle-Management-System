const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

async function listUsers() {
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

  try {
    const listUsersResult = await admin.auth().listUsers(10);
    console.log('--- Firebase Users ---');
    listUsersResult.users.forEach((userRecord) => {
      console.log(`Email: ${userRecord.email}, UID: ${userRecord.uid}, Created: ${userRecord.metadata.creationTime}`);
    });
  } catch (error) {
    console.error('Error listing users:', error);
  } finally {
    process.exit(0);
  }
}

listUsers();
