import prisma from './src/lib/prisma';

(async () => {
  const reports = await prisma.report.findMany({
    select: { id: true, type: true, status: true, riskLevel: true, createdAt: true },
    orderBy: { createdAt: 'desc' }
  });
  console.log('Total reports:', reports.length);
  for (const r of reports) {
    console.log(`  ${r.status} | ${r.riskLevel} | ${r.type} | created: ${r.createdAt}`);
  }
  await prisma.$disconnect();
})();
