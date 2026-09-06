import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
const prisma = new PrismaClient();
async function main() {
    try {
        const hash = await argon2.hash('Password123!');
        const user = await prisma.user.create({
            data: {
                firstName: 'Prueba',
                lastName: 'Prueba',
                email: 'prueba12345@gmail.com',
                passwordHash: hash,
                roleId: null,
                branchId: null
            }
        });
        console.log('Success:', user);
    }
    catch (error) {
        console.error('Error:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
