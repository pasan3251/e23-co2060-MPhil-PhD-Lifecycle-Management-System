const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteUser(email) {
  if (!email) {
    console.error('Please provide an email: node scripts/delete-user.js user@example.com');
    process.exit(1);
  }

  console.log(`--- Deleting User: ${email} ---`);

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        student: true,
        supervisor: true,
        examiner: true,
        administrator: true
      }
    });

    if (!user) {
      console.log('❌ User not found in database.');
      return;
    }

    console.log(`Found user ID: ${user.id}`);

    // 1. Delete specialized profiles first (due to Restrict constraint)
    if (user.student) {
      await prisma.student.delete({ where: { id: user.student.id } });
      console.log('✅ Deleted Student profile.');
    }
    if (user.supervisor) {
      await prisma.supervisor.delete({ where: { id: user.supervisor.id } });
      console.log('✅ Deleted Supervisor profile.');
    }
    if (user.examiner) {
      await prisma.examiner.delete({ where: { id: user.examiner.id } });
      console.log('✅ Deleted Examiner profile.');
    }
    if (user.administrator) {
      await prisma.administrator.delete({ where: { id: user.administrator.id } });
      console.log('✅ Deleted Administrator profile.');
    }

    // 2. Delete the main User record
    await prisma.user.delete({ where: { id: user.id } });
    console.log('✅ Deleted main User record.');

    console.log('\nSUCCESS: User has been completely removed from the database.');
  } catch (error) {
    console.error(`\n❌ Error during deletion: ${error.message}`);
    console.error('Note: This user might have other linked records (notifications, etc.) that prevent deletion.');
  } finally {
    await prisma.$disconnect();
  }
}

const emailToDelete = process.argv[2];
deleteUser(emailToDelete);
