import { PrismaClient } from "@prisma/client";

// Promote (or demote) a user to admin by email.
//   npm run make-admin -w backend -- you@example.com          → grant admin
//   npm run make-admin -w backend -- you@example.com --revoke → remove admin
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.toLowerCase();
  const revoke = process.argv.includes("--revoke");
  if (!email) {
    console.error("Usage: npm run make-admin -w backend -- <email> [--revoke]");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user found with email "${email}".`);
    process.exit(1);
  }

  await prisma.user.update({ where: { email }, data: { isAdmin: !revoke } });
  console.log(`${revoke ? "Revoked admin from" : "Granted admin to"} ${email}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
