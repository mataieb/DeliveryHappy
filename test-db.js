const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        await prisma.$connect();
        console.log('Connected successfully!');
        await prisma.$disconnect();
    } catch (e) {
        console.error('Connection failed:', e);
        await prisma.$disconnect();
        process.exit(1);
    }
}

main();
