import { prisma } from '../db';

async function main() {
  console.log('🗑️  Deleting all weather reports...');
  const { count } = await prisma.weatherReport.deleteMany({});
  console.log(`✅ Deleted ${count} records. The database is clean.`);
  console.log('   (Your Cities are safe and ready.)');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());