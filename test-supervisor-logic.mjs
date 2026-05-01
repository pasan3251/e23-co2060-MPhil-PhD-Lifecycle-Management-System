import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const supervisorUser = await prisma.user.findFirst({
    where: { role: 'SUPERVISOR' }
  });

  if (!supervisorUser) {
    console.log("No supervisor user found.");
    return;
  }

  console.log("Found supervisor:", supervisorUser.email);

  const supervisorProfile = await prisma.supervisor.findUnique({
    where: { userId: supervisorUser.id }
  });

  if (!supervisorProfile) {
    console.log("No supervisor profile found for user:", supervisorUser.id);
    return;
  }

  console.log("Found supervisor profile:", supervisorProfile.id);

  const assignments = await prisma.supervisorAssignment.findMany({
    where: { supervisorId: supervisorProfile.id },
    include: {
      student: {
        include: {
          user: true,
          registrations: true,
          researchProposals: true
        }
      }
    }
  });

  console.log("Assignments found:", assignments.length);
  console.log(JSON.stringify(assignments, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
