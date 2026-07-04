import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupGeospatialIndex() {
  console.log('Setting up 2dsphere index for Report collection...');
  
  try {
    // We use the raw MongoDB driver via prisma.$runCommandRaw
    await prisma.$runCommandRaw({
      createIndexes: 'Report',
      indexes: [
        {
          key: { location: '2dsphere' },
          name: 'location_2dsphere',
        },
      ],
    });
    console.log('Successfully created 2dsphere index!');
  } catch (error) {
    console.error('Error creating index:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupGeospatialIndex();
