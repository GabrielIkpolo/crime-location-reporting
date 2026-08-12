import prisma from './src/lib/prisma';

(async () => {
  const now = new Date();
  console.log('Current date:', now.toISOString());
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  console.log('30 days ago:', thirtyDaysAgo.toISOString());
  
  // Check how many verified reports pass the date filter
  const count = await prisma.report.count({
    where: {
      status: 'VERIFIED',
      createdAt: { gte: thirtyDaysAgo }
    }
  });
  console.log('Verified reports in last 30 days:', count);
  
  // Check the oldest verified report
  const oldest = await prisma.report.findFirst({
    where: { status: 'VERIFIED' },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true }
  });
  console.log('Oldest verified report:', oldest?.createdAt);
  
  await prisma.$disconnect();
})();
