import { PrismaClient, ItemCategory } from '@prisma/client'
import dayjs from 'dayjs'

const prisma = new PrismaClient()

async function main() {
    // Clean up
    await prisma.orderItem.deleteMany()
    await prisma.order.deleteMany()
    await prisma.menuItem.deleteMany()
    await prisma.menu.deleteMany()

    console.log('Seeding menus...')

    const today = dayjs().startOf('day').toDate()

    for (let i = 0; i < 3; i++) {
        const menuDate = dayjs(today).add(i, 'day').toDate()

        const menu = await prisma.menu.create({
            data: {
                date: menuDate,
                items: {
                    create: [
                        {
                            name: `Daily Special ${i + 1}`,
                            description: 'Delicious homemade special with fresh ingredients.',
                            price: 15.0,
                            category: 'MAIN'
                        },
                        {
                            name: 'Tomato Soup',
                            description: 'Creamy tomato soup with basil.',
                            price: 8.0,
                            category: 'STARTER'
                        },
                        {
                            name: 'Chocolate Cake',
                            description: 'Rich chocolate cake with ganache.',
                            price: 6.5,
                            category: 'DESSERT'
                        },
                        {
                            name: 'Coke',
                            description: 'Chilled soda.',
                            price: 2.5,
                            category: 'DRINK'
                        }
                    ]
                }
            }
        })
        console.log(`Created menu for ${menuDate}`)
    }
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
