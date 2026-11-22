import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // 1. Create the starting Cash Account
  await prisma.cashAccount.upsert({
    where: { id: 'default-account' },
    update: {},
    create: {
      id: 'default-account',
      name: 'Business Checking',
      openingBalance: 1500,
    },
  })

  // 2. Create Clients
  const techCorp = await prisma.client.create({
    data: { name: 'TechCorp Startup', email: 'billing@techcorp.com', whatsapp: '+1234567890' }
  })
  
  const sarah = await prisma.client.create({
    data: { name: 'Sarahs Bakery', email: 'sarah@bakery.com', whatsapp: '+0987654321' }
  })
  
  const fitApp = await prisma.client.create({
    data: { name: 'FitApp Mobile', email: 'pay@fitapp.com', whatsapp: '+1122334455' }
  })

  // 3. Create Invoices (TechCorp is overdue, Sarah is sent, FitApp is paid)
  const today = new Date()
  
  await prisma.invoice.create({
    data: {
      clientId: techCorp.id,
      amount: "2500",
      status: 'overdue',
      dueDate: new Date(today.getTime() - 12 * 24 * 60 * 60 * 1000), // 12 days ago
      description: 'Brand Identity Final Payment'
    }
  })

  await prisma.invoice.create({
    data: {
      clientId: sarah.id,
      amount: "800",
      status: 'sent',
      dueDate: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      description: 'Website UI Design Deposit'
    }
  })

  await prisma.invoice.create({
    data: {
      clientId: fitApp.id,
      amount: "1200",
      status: 'paid',
      dueDate: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      description: 'App Icon Design'
    }
  })

  // 4. Create Bills
  await prisma.bill.create({
    data: {
      name: 'Adobe Creative Cloud',
      amount: "54.99",
      dueDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      status: 'unpaid'
    }
  })

  await prisma.bill.create({
    data: {
      name: 'Studio Rent',
      amount: "1200",
      dueDate: new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      status: 'unpaid'
    }
  })

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
