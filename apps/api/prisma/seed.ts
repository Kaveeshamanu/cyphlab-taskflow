import { PrismaClient, Role, TaskStatus, Priority, ProjectStatus } from '@prisma/client'
import { hash } from '@node-rs/argon2'

const prisma = new PrismaClient()

const PASSWORD = 'Password123!'

async function main() {
  const existing = await prisma.user.findFirst({ where: { role: Role.ADMIN } })
  if (existing) {
    console.log('Database already seeded — skipping.')
    return
  }

  console.log('🌱 Seeding database...')
  const pw = await hash(PASSWORD)

  // ── Users ──────────────────────────────────────────────────────────────────

  const [sarah, james, priya, carlos] = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Sarah Mitchell',
        email: 'sarah@taskflow.dev',
        passwordHash: pw,
        role: Role.ADMIN,
        isEmailVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        name: 'James Okafor',
        email: 'james@taskflow.dev',
        passwordHash: pw,
        role: Role.PROJECT_MANAGER,
        isEmailVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Priya Mehta',
        email: 'priya@taskflow.dev',
        passwordHash: pw,
        role: Role.PROJECT_MANAGER,
        isEmailVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Carlos Rivera',
        email: 'carlos@taskflow.dev',
        passwordHash: pw,
        role: Role.PROJECT_MANAGER,
        isEmailVerified: true,
      },
    }),
  ])

  const [aisha, noah, luna, marcus, sofia, ethan, yuki, fatima] = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Aisha Thompson',
        email: 'aisha@taskflow.dev',
        passwordHash: pw,
        role: Role.TEAM_MEMBER,
        isEmailVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Noah Bergstrom',
        email: 'noah@taskflow.dev',
        passwordHash: pw,
        role: Role.TEAM_MEMBER,
        isEmailVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Luna Chen',
        email: 'luna@taskflow.dev',
        passwordHash: pw,
        role: Role.TEAM_MEMBER,
        isEmailVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Marcus Williams',
        email: 'marcus@taskflow.dev',
        passwordHash: pw,
        role: Role.TEAM_MEMBER,
        isEmailVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Sofia Andersen',
        email: 'sofia@taskflow.dev',
        passwordHash: pw,
        role: Role.TEAM_MEMBER,
        isEmailVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Ethan Patel',
        email: 'ethan@taskflow.dev',
        passwordHash: pw,
        role: Role.TEAM_MEMBER,
        isEmailVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Yuki Tanaka',
        email: 'yuki@taskflow.dev',
        passwordHash: pw,
        role: Role.TEAM_MEMBER,
        isEmailVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Fatima Al-Hassan',
        email: 'fatima@taskflow.dev',
        passwordHash: pw,
        role: Role.TEAM_MEMBER,
        isEmailVerified: true,
      },
    }),
  ])

  // ── Tags ───────────────────────────────────────────────────────────────────

  const tagData = [
    { name: 'bug', color: '#ef4444' },
    { name: 'feature', color: '#3b82f6' },
    { name: 'enhancement', color: '#8b5cf6' },
    { name: 'documentation', color: '#6b7280' },
    { name: 'security', color: '#f59e0b' },
    { name: 'performance', color: '#10b981' },
    { name: 'ux', color: '#ec4899' },
    { name: 'backend', color: '#0ea5e9' },
    { name: 'frontend', color: '#f97316' },
    { name: 'devops', color: '#14b8a6' },
  ]

  const tags = await Promise.all(tagData.map((t) => prisma.tag.create({ data: t })))
  const tagMap = Object.fromEntries(tags.map((t) => [t.name, t.id]))

  // ── Projects ───────────────────────────────────────────────────────────────

  const now = new Date()
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000)
  const daysAhead = (n: number) => new Date(now.getTime() + n * 86400000)

  const ecommerce = await prisma.project.create({
    data: {
      name: 'E-Commerce Platform Redesign',
      description:
        'Full redesign of the storefront and checkout flow to improve conversion rates and mobile experience.',
      status: ProjectStatus.ACTIVE,
      managerId: james.id,
      createdAt: daysAgo(45),
    },
  })

  const mobileApp = await prisma.project.create({
    data: {
      name: 'Mobile App — Customer Facing',
      description:
        'React Native app for iOS and Android with product browsing, cart, and order tracking.',
      status: ProjectStatus.ACTIVE,
      managerId: priya.id,
      createdAt: daysAgo(30),
    },
  })

  const analytics = await prisma.project.create({
    data: {
      name: 'Analytics & Reporting Dashboard',
      description:
        'Internal BI dashboard giving sales and ops teams real-time visibility into KPIs.',
      status: ProjectStatus.PLANNING,
      managerId: carlos.id,
      createdAt: daysAgo(14),
    },
  })

  const apiGateway = await prisma.project.create({
    data: {
      name: 'API Gateway Modernisation',
      description:
        'Replace legacy NGINX-based routing with a purpose-built gateway supporting rate limiting and auth delegation.',
      status: ProjectStatus.ON_HOLD,
      managerId: james.id,
      createdAt: daysAgo(60),
    },
  })

  const portal = await prisma.project.create({
    data: {
      name: 'Internal Customer Portal',
      description:
        'Self-service portal for B2B customers to manage orders, invoices, and support tickets.',
      status: ProjectStatus.COMPLETED,
      managerId: priya.id,
      createdAt: daysAgo(90),
    },
  })

  // ── Project members ────────────────────────────────────────────────────────

  const memberData = [
    // E-Commerce: James manages, aisha noah luna marcus join
    { projectId: ecommerce.id, userId: aisha.id },
    { projectId: ecommerce.id, userId: noah.id },
    { projectId: ecommerce.id, userId: luna.id },
    { projectId: ecommerce.id, userId: marcus.id },
    // Mobile App: Priya manages, sofia ethan yuki fatima join
    { projectId: mobileApp.id, userId: sofia.id },
    { projectId: mobileApp.id, userId: ethan.id },
    { projectId: mobileApp.id, userId: yuki.id },
    { projectId: mobileApp.id, userId: fatima.id },
    // Analytics: Carlos manages, aisha noah sofia join
    { projectId: analytics.id, userId: aisha.id },
    { projectId: analytics.id, userId: noah.id },
    { projectId: analytics.id, userId: sofia.id },
    // API Gateway: James manages, ethan yuki marcus join
    { projectId: apiGateway.id, userId: ethan.id },
    { projectId: apiGateway.id, userId: yuki.id },
    { projectId: apiGateway.id, userId: marcus.id },
    // Portal (completed): Priya manages, luna fatima noah join
    { projectId: portal.id, userId: luna.id },
    { projectId: portal.id, userId: fatima.id },
    { projectId: portal.id, userId: noah.id },
  ]

  await prisma.projectMember.createMany({ data: memberData })

  // ── Tasks ──────────────────────────────────────────────────────────────────

  type TaskInput = {
    title: string
    description?: string
    status: TaskStatus
    priority: Priority
    dueDate?: Date
    position: number
    projectId: string
    assigneeId?: string
    tagNames?: string[]
  }

  async function createTask(input: TaskInput) {
    const { tagNames, ...rest } = input
    const task = await prisma.task.create({ data: rest })
    if (tagNames?.length) {
      await prisma.taskTag.createMany({
        data: tagNames.map((n) => ({ taskId: task.id, tagId: tagMap[n] })),
      })
    }
    return task
  }

  // E-Commerce tasks (15)
  const [t1, t2, t3, t4, t5] = await Promise.all([
    createTask({
      title: 'Redesign product listing page',
      description: 'Apply new design tokens, improve grid layout, lazy-load images.',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      dueDate: daysAhead(7),
      position: 1000,
      projectId: ecommerce.id,
      assigneeId: luna.id,
      tagNames: ['frontend', 'ux'],
    }),
    createTask({
      title: 'Implement Stripe checkout v2',
      description: 'Migrate from legacy PaymentIntent to the new Stripe Elements flow.',
      status: TaskStatus.TODO,
      priority: Priority.URGENT,
      dueDate: daysAhead(5),
      position: 2000,
      projectId: ecommerce.id,
      assigneeId: marcus.id,
      tagNames: ['backend', 'feature'],
    }),
    createTask({
      title: 'Fix cart quantity update bug',
      description:
        'Updating quantity above 10 resets to 1. Tracked in issue #441. Root cause: parseInt overflow in reducer.',
      status: TaskStatus.IN_REVIEW,
      priority: Priority.HIGH,
      dueDate: daysAhead(2),
      position: 1000,
      projectId: ecommerce.id,
      assigneeId: aisha.id,
      tagNames: ['bug', 'frontend'],
    }),
    createTask({
      title: 'Add product image zoom on hover',
      status: TaskStatus.TODO,
      priority: Priority.LOW,
      position: 3000,
      projectId: ecommerce.id,
      assigneeId: luna.id,
      tagNames: ['frontend', 'ux'],
    }),
    createTask({
      title: 'Optimise category page queries',
      description: 'N+1 detected in Datadog. Add eager loading for product images and variants.',
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      dueDate: daysAhead(14),
      position: 4000,
      projectId: ecommerce.id,
      assigneeId: noah.id,
      tagNames: ['backend', 'performance'],
    }),
  ])

  await Promise.all([
    createTask({
      title: 'Write API docs for product endpoints',
      status: TaskStatus.DONE,
      priority: Priority.MEDIUM,
      position: 1000,
      projectId: ecommerce.id,
      assigneeId: noah.id,
      tagNames: ['documentation', 'backend'],
    }),
    createTask({
      title: 'Add wishlist feature',
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      dueDate: daysAhead(21),
      position: 5000,
      projectId: ecommerce.id,
      assigneeId: aisha.id,
      tagNames: ['feature', 'backend'],
    }),
    createTask({
      title: 'Mobile responsive checkout',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.URGENT,
      dueDate: daysAhead(3),
      position: 2000,
      projectId: ecommerce.id,
      assigneeId: marcus.id,
      tagNames: ['frontend', 'ux'],
    }),
    createTask({
      title: 'Search autocomplete performance',
      status: TaskStatus.DONE,
      priority: Priority.HIGH,
      position: 2000,
      projectId: ecommerce.id,
      assigneeId: noah.id,
      tagNames: ['performance', 'frontend'],
    }),
    createTask({
      title: 'Set up CSP headers',
      status: TaskStatus.TODO,
      priority: Priority.HIGH,
      position: 6000,
      projectId: ecommerce.id,
      assigneeId: marcus.id,
      tagNames: ['security', 'devops'],
    }),
    createTask({
      title: 'A/B test new CTA button',
      status: TaskStatus.IN_REVIEW,
      priority: Priority.LOW,
      position: 2000,
      projectId: ecommerce.id,
      assigneeId: luna.id,
      tagNames: ['ux'],
    }),
    createTask({
      title: 'Localisation — add French support',
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      dueDate: daysAhead(30),
      position: 7000,
      projectId: ecommerce.id,
      assigneeId: aisha.id,
      tagNames: ['feature'],
    }),
    createTask({
      title: 'Fix broken image fallback on Safari',
      status: TaskStatus.DONE,
      priority: Priority.MEDIUM,
      position: 3000,
      projectId: ecommerce.id,
      tagNames: ['bug', 'frontend'],
    }),
    createTask({
      title: 'Upgrade Next.js to latest',
      status: TaskStatus.TODO,
      priority: Priority.LOW,
      position: 8000,
      projectId: ecommerce.id,
      assigneeId: noah.id,
      tagNames: ['devops'],
    }),
    createTask({
      title: 'Implement product review system',
      description: 'Star ratings + text reviews with moderation queue.',
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      dueDate: daysAhead(28),
      position: 9000,
      projectId: ecommerce.id,
      assigneeId: aisha.id,
      tagNames: ['feature', 'backend'],
    }),
  ])

  // Subtask example: t3 has a subtask
  await createTask({
    title: 'Write unit tests for cart reducer',
    status: TaskStatus.TODO,
    priority: Priority.MEDIUM,
    position: 1000,
    projectId: ecommerce.id,
    assigneeId: aisha.id,
    tagNames: ['bug'],
  })

  // Mobile App tasks (15)
  await Promise.all([
    createTask({
      title: 'Design onboarding flow',
      description: '3-screen onboarding with permission requests for notifications and location.',
      status: TaskStatus.DONE,
      priority: Priority.HIGH,
      position: 1000,
      projectId: mobileApp.id,
      assigneeId: sofia.id,
      tagNames: ['ux', 'frontend'],
    }),
    createTask({
      title: 'Implement push notifications',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      dueDate: daysAhead(6),
      position: 1000,
      projectId: mobileApp.id,
      assigneeId: ethan.id,
      tagNames: ['feature', 'backend'],
    }),
    createTask({
      title: 'Crash on Android 12 deep link',
      description: 'NullPointerException in MainActivity when opened via product:// scheme.',
      status: TaskStatus.IN_REVIEW,
      priority: Priority.URGENT,
      dueDate: daysAhead(1),
      position: 1000,
      projectId: mobileApp.id,
      assigneeId: yuki.id,
      tagNames: ['bug'],
    }),
    createTask({
      title: 'Order tracking screen',
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      dueDate: daysAhead(14),
      position: 1000,
      projectId: mobileApp.id,
      assigneeId: fatima.id,
      tagNames: ['feature', 'frontend'],
    }),
    createTask({
      title: 'Biometric authentication (FaceID / fingerprint)',
      status: TaskStatus.TODO,
      priority: Priority.HIGH,
      dueDate: daysAhead(10),
      position: 2000,
      projectId: mobileApp.id,
      assigneeId: ethan.id,
      tagNames: ['security', 'feature'],
    }),
    createTask({
      title: 'Offline mode — cache product catalogue',
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      position: 3000,
      projectId: mobileApp.id,
      assigneeId: sofia.id,
      tagNames: ['feature', 'performance'],
    }),
    createTask({
      title: 'App store screenshots',
      status: TaskStatus.DONE,
      priority: Priority.LOW,
      position: 2000,
      projectId: mobileApp.id,
      assigneeId: fatima.id,
      tagNames: ['documentation'],
    }),
    createTask({
      title: 'Dark mode support',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.MEDIUM,
      position: 2000,
      projectId: mobileApp.id,
      assigneeId: sofia.id,
      tagNames: ['ux', 'frontend'],
    }),
    createTask({
      title: 'Fix memory leak in image carousel',
      status: TaskStatus.DONE,
      priority: Priority.HIGH,
      position: 3000,
      projectId: mobileApp.id,
      assigneeId: yuki.id,
      tagNames: ['bug', 'performance'],
    }),
    createTask({
      title: 'Payment methods — Apple Pay',
      status: TaskStatus.TODO,
      priority: Priority.HIGH,
      dueDate: daysAhead(18),
      position: 4000,
      projectId: mobileApp.id,
      assigneeId: ethan.id,
      tagNames: ['feature', 'backend'],
    }),
    createTask({
      title: 'Accessibility audit',
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      position: 5000,
      projectId: mobileApp.id,
      assigneeId: fatima.id,
      tagNames: ['ux'],
    }),
    createTask({
      title: 'Setup CI for React Native',
      status: TaskStatus.DONE,
      priority: Priority.HIGH,
      position: 4000,
      projectId: mobileApp.id,
      assigneeId: yuki.id,
      tagNames: ['devops'],
    }),
    createTask({
      title: 'Product search with filters',
      status: TaskStatus.IN_REVIEW,
      priority: Priority.HIGH,
      dueDate: daysAhead(4),
      position: 2000,
      projectId: mobileApp.id,
      assigneeId: sofia.id,
      tagNames: ['feature', 'frontend'],
    }),
    createTask({
      title: 'Analytics event tracking',
      status: TaskStatus.TODO,
      priority: Priority.LOW,
      position: 6000,
      projectId: mobileApp.id,
      assigneeId: ethan.id,
      tagNames: ['backend'],
    }),
    createTask({
      title: 'Beta TestFlight distribution',
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      dueDate: daysAhead(21),
      position: 7000,
      projectId: mobileApp.id,
      assigneeId: yuki.id,
      tagNames: ['devops'],
    }),
  ])

  // Analytics tasks (10)
  await Promise.all([
    createTask({
      title: 'Define KPI data model',
      status: TaskStatus.DONE,
      priority: Priority.HIGH,
      position: 1000,
      projectId: analytics.id,
      assigneeId: carlos.id,
      tagNames: ['backend', 'documentation'],
    }),
    createTask({
      title: 'Set up Redshift data warehouse',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      dueDate: daysAhead(10),
      position: 1000,
      projectId: analytics.id,
      assigneeId: noah.id,
      tagNames: ['devops', 'backend'],
    }),
    createTask({
      title: 'Sales funnel visualisation',
      status: TaskStatus.TODO,
      priority: Priority.HIGH,
      dueDate: daysAhead(20),
      position: 1000,
      projectId: analytics.id,
      assigneeId: sofia.id,
      tagNames: ['frontend', 'feature'],
    }),
    createTask({
      title: 'Revenue chart with date range picker',
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      dueDate: daysAhead(25),
      position: 2000,
      projectId: analytics.id,
      assigneeId: aisha.id,
      tagNames: ['frontend', 'feature'],
    }),
    createTask({
      title: 'Role-based dashboard access',
      status: TaskStatus.TODO,
      priority: Priority.URGENT,
      dueDate: daysAhead(15),
      position: 3000,
      projectId: analytics.id,
      assigneeId: noah.id,
      tagNames: ['security', 'backend'],
    }),
    createTask({
      title: 'Export to CSV endpoint',
      status: TaskStatus.TODO,
      priority: Priority.LOW,
      position: 4000,
      projectId: analytics.id,
      assigneeId: aisha.id,
      tagNames: ['backend', 'feature'],
    }),
    createTask({
      title: 'Scheduled email digest',
      status: TaskStatus.TODO,
      priority: Priority.LOW,
      position: 5000,
      projectId: analytics.id,
      tagNames: ['feature', 'backend'],
    }),
    createTask({
      title: 'Performance benchmarks for query layer',
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      position: 6000,
      projectId: analytics.id,
      assigneeId: noah.id,
      tagNames: ['performance', 'backend'],
    }),
    createTask({
      title: 'Write data dictionary',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.MEDIUM,
      position: 2000,
      projectId: analytics.id,
      assigneeId: aisha.id,
      tagNames: ['documentation'],
    }),
    createTask({
      title: 'Spike: evaluate Metabase vs custom dashboard',
      status: TaskStatus.DONE,
      priority: Priority.HIGH,
      position: 2000,
      projectId: analytics.id,
      assigneeId: sofia.id,
      tagNames: ['documentation'],
    }),
  ])

  // API Gateway tasks (10)
  await Promise.all([
    createTask({
      title: 'Evaluate Kong vs Traefik vs custom',
      status: TaskStatus.DONE,
      priority: Priority.HIGH,
      position: 1000,
      projectId: apiGateway.id,
      assigneeId: james.id,
      tagNames: ['devops', 'documentation'],
    }),
    createTask({
      title: 'Design rate-limiting strategy',
      status: TaskStatus.DONE,
      priority: Priority.HIGH,
      position: 2000,
      projectId: apiGateway.id,
      assigneeId: ethan.id,
      tagNames: ['backend', 'security'],
    }),
    createTask({
      title: 'Implement JWT validation at gateway layer',
      status: TaskStatus.TODO,
      priority: Priority.URGENT,
      position: 1000,
      projectId: apiGateway.id,
      assigneeId: ethan.id,
      tagNames: ['security', 'backend'],
    }),
    createTask({
      title: 'Traffic routing config for v1 / v2 split',
      status: TaskStatus.TODO,
      priority: Priority.HIGH,
      position: 2000,
      projectId: apiGateway.id,
      assigneeId: yuki.id,
      tagNames: ['devops'],
    }),
    createTask({
      title: 'Load test at 10k rps',
      status: TaskStatus.TODO,
      priority: Priority.HIGH,
      position: 3000,
      projectId: apiGateway.id,
      assigneeId: marcus.id,
      tagNames: ['performance'],
    }),
    createTask({
      title: 'Canary deployment runbook',
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      position: 4000,
      projectId: apiGateway.id,
      assigneeId: yuki.id,
      tagNames: ['devops', 'documentation'],
    }),
    createTask({
      title: 'Set up Prometheus metrics scraping',
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      position: 5000,
      projectId: apiGateway.id,
      assigneeId: marcus.id,
      tagNames: ['devops'],
    }),
    createTask({
      title: 'mTLS between internal services',
      status: TaskStatus.TODO,
      priority: Priority.HIGH,
      position: 6000,
      projectId: apiGateway.id,
      assigneeId: ethan.id,
      tagNames: ['security'],
    }),
    createTask({
      title: 'Update team on hold decision',
      status: TaskStatus.DONE,
      priority: Priority.LOW,
      position: 3000,
      projectId: apiGateway.id,
      assigneeId: james.id,
      tagNames: ['documentation'],
    }),
    createTask({
      title: 'Archive NGINX config in repo',
      status: TaskStatus.DONE,
      priority: Priority.LOW,
      position: 4000,
      projectId: apiGateway.id,
      assigneeId: marcus.id,
      tagNames: ['devops'],
    }),
  ])

  // Portal tasks (10 — mostly done since project is completed)
  await Promise.all([
    createTask({
      title: 'Design system tokens',
      status: TaskStatus.DONE,
      priority: Priority.HIGH,
      position: 1000,
      projectId: portal.id,
      assigneeId: luna.id,
      tagNames: ['ux', 'frontend'],
    }),
    createTask({
      title: 'Order history page',
      status: TaskStatus.DONE,
      priority: Priority.HIGH,
      position: 2000,
      projectId: portal.id,
      assigneeId: fatima.id,
      tagNames: ['frontend', 'feature'],
    }),
    createTask({
      title: 'Invoice download as PDF',
      status: TaskStatus.DONE,
      priority: Priority.MEDIUM,
      position: 3000,
      projectId: portal.id,
      assigneeId: noah.id,
      tagNames: ['backend', 'feature'],
    }),
    createTask({
      title: 'Support ticket creation',
      status: TaskStatus.DONE,
      priority: Priority.HIGH,
      position: 4000,
      projectId: portal.id,
      assigneeId: luna.id,
      tagNames: ['feature', 'backend'],
    }),
    createTask({
      title: 'SSO via SAML 2.0',
      status: TaskStatus.DONE,
      priority: Priority.URGENT,
      position: 5000,
      projectId: portal.id,
      assigneeId: noah.id,
      tagNames: ['security', 'backend'],
    }),
    createTask({
      title: 'Email notifications on order status',
      status: TaskStatus.DONE,
      priority: Priority.MEDIUM,
      position: 6000,
      projectId: portal.id,
      assigneeId: fatima.id,
      tagNames: ['feature', 'backend'],
    }),
    createTask({
      title: 'Accessibility WCAG AA audit',
      status: TaskStatus.DONE,
      priority: Priority.HIGH,
      position: 7000,
      projectId: portal.id,
      assigneeId: luna.id,
      tagNames: ['ux'],
    }),
    createTask({
      title: 'Rate limiting on auth endpoints',
      status: TaskStatus.DONE,
      priority: Priority.HIGH,
      position: 8000,
      projectId: portal.id,
      assigneeId: noah.id,
      tagNames: ['security', 'backend'],
    }),
    createTask({
      title: 'User acceptance testing',
      status: TaskStatus.DONE,
      priority: Priority.HIGH,
      position: 9000,
      projectId: portal.id,
      assigneeId: fatima.id,
      tagNames: ['documentation'],
    }),
    createTask({
      title: 'Production deployment checklist',
      status: TaskStatus.DONE,
      priority: Priority.URGENT,
      position: 10000,
      projectId: portal.id,
      assigneeId: priya.id,
      tagNames: ['devops'],
    }),
  ])

  // ── Comments ───────────────────────────────────────────────────────────────

  await prisma.comment.createMany({
    data: [
      {
        body: 'Switching to CSS Grid here — the old flexbox approach was causing issues on Safari 16. @noah can you review?',
        taskId: t1.id,
        authorId: luna.id,
        createdAt: daysAgo(3),
        updatedAt: daysAgo(3),
      },
      {
        body: 'LGTM overall. One thing: lazy-loading breaks the LCP score on slow connections — add a `loading="eager"` to the first 4 images.',
        taskId: t1.id,
        authorId: noah.id,
        createdAt: daysAgo(2),
        updatedAt: daysAgo(2),
      },
      {
        body: 'Good catch @noah — fixed in latest push.',
        taskId: t1.id,
        authorId: luna.id,
        createdAt: daysAgo(1),
        updatedAt: daysAgo(1),
      },
      {
        body: 'Reproducible on Chrome and Firefox too. The issue is in `cartSlice.ts` line 84 — `parseInt` without a radix defaults to octal on some inputs.',
        taskId: t3.id,
        authorId: aisha.id,
        createdAt: daysAgo(5),
        updatedAt: daysAgo(5),
      },
      {
        body: 'Fixed! Adding `parseInt(value, 10)`. PR up for review.',
        taskId: t3.id,
        authorId: aisha.id,
        createdAt: daysAgo(1),
        updatedAt: daysAgo(1),
      },
      {
        body: '@marcus Stripe docs say we need to generate the PaymentIntent server-side now — client-side creation was deprecated in v3.',
        taskId: t2.id,
        authorId: noah.id,
        createdAt: daysAgo(4),
        updatedAt: daysAgo(4),
      },
      {
        body: "On it. I'll create a `/payments/intent` endpoint and update the frontend accordingly.",
        taskId: t2.id,
        authorId: marcus.id,
        createdAt: daysAgo(3),
        updatedAt: daysAgo(3),
      },
      {
        body: 'N+1 confirmed via EXPLAIN ANALYZE. Adding a `select` with `include: { images: true }` resolves it. Query time drops from 340ms to 12ms.',
        taskId: t5.id,
        authorId: noah.id,
        createdAt: daysAgo(2),
        updatedAt: daysAgo(2),
      },
      {
        body: 'Dependency bump needed: Stripe SDK 12.x broke some types. Pinning to 11.18.0 for now — @marcus to upgrade once types are fixed upstream.',
        taskId: t4.id,
        authorId: aisha.id,
        createdAt: daysAgo(1),
        updatedAt: daysAgo(1),
      },
    ],
  })

  // ── Activity logs (sample) ─────────────────────────────────────────────────

  const actorId = sarah.id
  await prisma.activityLog.createMany({
    data: [
      {
        entityType: 'project',
        entityId: ecommerce.id,
        action: 'CREATED',
        actorId: james.id,
        metadata: { name: ecommerce.name },
        createdAt: daysAgo(45),
      },
      {
        entityType: 'project',
        entityId: mobileApp.id,
        action: 'CREATED',
        actorId: priya.id,
        metadata: { name: mobileApp.name },
        createdAt: daysAgo(30),
      },
      {
        entityType: 'project',
        entityId: analytics.id,
        action: 'CREATED',
        actorId: carlos.id,
        metadata: { name: analytics.name },
        createdAt: daysAgo(14),
      },
      {
        entityType: 'project',
        entityId: apiGateway.id,
        action: 'UPDATED',
        actorId: james.id,
        metadata: { field: 'status', from: 'ACTIVE', to: 'ON_HOLD' },
        createdAt: daysAgo(10),
      },
      {
        entityType: 'task',
        entityId: t3.id,
        action: 'CREATED',
        actorId: james.id,
        metadata: { title: t3.title },
        createdAt: daysAgo(8),
      },
      {
        entityType: 'task',
        entityId: t3.id,
        action: 'STATUS_CHANGED',
        actorId: aisha.id,
        metadata: { from: 'TODO', to: 'IN_REVIEW' },
        createdAt: daysAgo(1),
      },
      {
        entityType: 'user',
        entityId: ethan.id,
        action: 'CREATED',
        actorId: actorId,
        metadata: { name: ethan.name, role: 'TEAM_MEMBER' },
        createdAt: daysAgo(40),
      },
    ],
  })

  console.log('✅ Seed complete.')
  console.log('')
  console.log('Demo accounts (all passwords: Password123!):')
  console.log('  Admin          sarah@taskflow.dev')
  console.log('  Project Mgr    james@taskflow.dev')
  console.log('  Team Member    aisha@taskflow.dev')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
