import { eq } from "drizzle-orm";
import { getDb } from "../api/queries/connection";
import { hashPassword } from "../api/auth";
import {
  users,
  departments,
  positions,
  employees,
  jobPostings,
  candidates,
  attendanceRecords,
  leaveRequests,
  payslips,
  performanceReviews,
  announcements,
} from "./schema";

function d(offsetDays: number): string {
  const dt = new Date();
  dt.setDate(dt.getDate() + offsetDays);
  return dt.toISOString().slice(0, 10);
}

function period(offsetMonths: number): string {
  const dt = new Date();
  dt.setMonth(dt.getMonth() + offsetMonths);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

async function seed() {
  const db = getDb();
  console.log("Seeding database...");

  // idempotent: clear existing rows first
  await db.delete(attendanceRecords);
  await db.delete(leaveRequests);
  await db.delete(payslips);
  await db.delete(performanceReviews);
  await db.delete(candidates);
  await db.delete(jobPostings);
  await db.delete(announcements);
  await db.delete(users);
  await db.delete(employees);
  await db.delete(positions);
  await db.delete(departments);
  console.log("Cleared existing data.");

  /* ---------------- Departments ---------------- */
  const deptData = [
    { name: "Engineering", description: "Pengembangan produk dan infrastruktur teknologi" },
    { name: "Product", description: "Manajemen produk dan riset pengguna" },
    { name: "Human Resources", description: "Pengelolaan SDM dan budaya perusahaan" },
    { name: "Finance", description: "Keuangan, akuntansi, dan payroll" },
    { name: "Marketing", description: "Pemasaran digital dan brand" },
    { name: "Sales", description: "Penjualan dan pengembangan bisnis" },
    { name: "Operations", description: "Operasional harian perusahaan" },
    { name: "Design", description: "Desain produk, UI/UX, dan kreatif" },
  ];
  await db.insert(departments).values(deptData);
  const deptRows = await db.select().from(departments);
  const deptId = (name: string) => deptRows.find((x) => x.name === name)!.id;

  /* ---------------- Positions ---------------- */
  const posData = [
    { title: "Frontend Engineer", departmentId: deptId("Engineering"), level: "Mid" as const },
    { title: "Backend Engineer", departmentId: deptId("Engineering"), level: "Senior" as const },
    { title: "DevOps Engineer", departmentId: deptId("Engineering"), level: "Mid" as const },
    { title: "QA Engineer", departmentId: deptId("Engineering"), level: "Junior" as const },
    { title: "Engineering Manager", departmentId: deptId("Engineering"), level: "Manager" as const },
    { title: "Product Manager", departmentId: deptId("Product"), level: "Senior" as const },
    { title: "Product Analyst", departmentId: deptId("Product"), level: "Junior" as const },
    { title: "HR Manager", departmentId: deptId("Human Resources"), level: "Manager" as const },
    { title: "HR Specialist", departmentId: deptId("Human Resources"), level: "Mid" as const },
    { title: "Recruiter", departmentId: deptId("Human Resources"), level: "Junior" as const },
    { title: "Finance Manager", departmentId: deptId("Finance"), level: "Manager" as const },
    { title: "Accountant", departmentId: deptId("Finance"), level: "Mid" as const },
    { title: "Digital Marketing Specialist", departmentId: deptId("Marketing"), level: "Mid" as const },
    { title: "Content Strategist", departmentId: deptId("Marketing"), level: "Junior" as const },
    { title: "Sales Executive", departmentId: deptId("Sales"), level: "Junior" as const },
    { title: "Sales Manager", departmentId: deptId("Sales"), level: "Manager" as const },
    { title: "Operations Officer", departmentId: deptId("Operations"), level: "Mid" as const },
    { title: "UI/UX Designer", departmentId: deptId("Design"), level: "Mid" as const },
    { title: "Graphic Designer", departmentId: deptId("Design"), level: "Junior" as const },
    { title: "CEO", departmentId: deptId("Operations"), level: "Director" as const },
  ];
  await db.insert(positions).values(posData);
  const posRows = await db.select().from(positions);
  const posId = (title: string) => posRows.find((x) => x.title === title)!.id;

  /* ---------------- Employees ---------------- */
  const empData = [
    { employeeNo: "EMP001", fullName: "Andi Wijaya", email: "andi.wijaya@nexushr.id", phone: "081234567001", gender: "male" as const, birthDate: "1985-03-12", address: "Jl. Sudirman No. 10, Jakarta", departmentId: deptId("Operations"), positionId: posId("CEO"), hireDate: "2018-01-15", status: "active" as const, baseSalary: 75000000, skills: "Leadership, Strategy, Business Development", bio: "Pendiri dan CEO NexusHR, 20 tahun pengalaman di industri teknologi." },
    { employeeNo: "EMP002", fullName: "Sinta Maharani", email: "sinta.maharani@nexushr.id", phone: "081234567002", gender: "female" as const, birthDate: "1988-07-25", address: "Jl. Kemang Raya No. 5, Jakarta", departmentId: deptId("Human Resources"), positionId: posId("HR Manager"), hireDate: "2019-02-01", status: "active" as const, baseSalary: 28000000, skills: "Recruitment, Employee Relations, HRIS, Labor Law", bio: "HR Manager dengan fokus pada transformasi digital HR." },
    { employeeNo: "EMP003", fullName: "Budi Kurniawan", email: "budi.kurniawan@nexushr.id", phone: "081234567003", gender: "male" as const, birthDate: "1992-11-08", address: "Jl. Tebet Barat No. 22, Jakarta", departmentId: deptId("Engineering"), positionId: posId("Engineering Manager"), hireDate: "2019-06-10", status: "active" as const, baseSalary: 35000000, skills: "Node.js, React, AWS, Team Leadership, System Architecture", bio: "Engineering Manager, memimpin tim produk inti." },
    { employeeNo: "EMP004", fullName: "Dewi Anggraini", email: "dewi.anggraini@nexushr.id", phone: "081234567004", gender: "female" as const, birthDate: "1995-01-30", address: "Jl. Pancoran No. 8, Jakarta", departmentId: deptId("Engineering"), positionId: posId("Frontend Engineer"), hireDate: "2021-03-01", status: "active" as const, baseSalary: 18000000, skills: "React, TypeScript, Tailwind CSS, Next.js, Figma", bio: "Frontend engineer yang passionate soal design system." },
    { employeeNo: "EMP005", fullName: "Rizky Firmansyah", email: "rizky.firmansyah@nexushr.id", phone: "081234567005", gender: "male" as const, birthDate: "1990-09-17", address: "Jl. Mampang No. 44, Jakarta", departmentId: deptId("Engineering"), positionId: posId("Backend Engineer"), hireDate: "2020-08-15", status: "active" as const, baseSalary: 22000000, skills: "Node.js, PostgreSQL, MySQL, Redis, Docker, Kubernetes", bio: "Backend engineer spesialis sistem berskala besar." },
    { employeeNo: "EMP006", fullName: "Ayu Lestari", email: "ayu.lestari@nexushr.id", phone: "081234567006", gender: "female" as const, birthDate: "1996-05-21", address: "Jl. Setiabudi No. 12, Jakarta", departmentId: deptId("Engineering"), positionId: posId("QA Engineer"), hireDate: "2022-01-10", status: "active" as const, baseSalary: 12000000, skills: "Selenium, Cypress, Jest, API Testing, Test Automation", bio: "QA engineer yang teliti dengan automation testing." },
    { employeeNo: "EMP007", fullName: "Hendra Gunawan", email: "hendra.gunawan@nexushr.id", phone: "081234567007", gender: "male" as const, birthDate: "1991-12-03", address: "Jl. Gatot Subroto No. 77, Jakarta", departmentId: deptId("Engineering"), positionId: posId("DevOps Engineer"), hireDate: "2021-07-01", status: "active" as const, baseSalary: 20000000, skills: "AWS, Terraform, Docker, Kubernetes, CI/CD, Monitoring", bio: "DevOps engineer, menjaga uptime 99.9%." },
    { employeeNo: "EMP008", fullName: "Maya Putri", email: "maya.putri@nexushr.id", phone: "081234567008", gender: "female" as const, birthDate: "1993-04-14", address: "Jl. Senayan No. 3, Jakarta", departmentId: deptId("Product"), positionId: posId("Product Manager"), hireDate: "2020-11-20", status: "active" as const, baseSalary: 25000000, skills: "Product Strategy, Agile, User Research, Roadmap, SQL", bio: "Product manager dengan background data analytics." },
    { employeeNo: "EMP009", fullName: "Fikri Ramadhan", email: "fikri.ramadhan@nexushr.id", phone: "081234567009", gender: "male" as const, birthDate: "1997-02-28", address: "Jl. Cipete No. 19, Jakarta", departmentId: deptId("Product"), positionId: posId("Product Analyst"), hireDate: "2023-02-13", status: "active" as const, baseSalary: 11000000, skills: "SQL, Python, Metabase, A/B Testing, Data Visualization", bio: "Product analyst fresh graduate berbakat." },
    { employeeNo: "EMP010", fullName: "Rina Marlina", email: "rina.marlina@nexushr.id", phone: "081234567010", gender: "female" as const, birthDate: "1994-08-09", address: "Jl. Pasar Minggu No. 30, Jakarta", departmentId: deptId("Human Resources"), positionId: posId("HR Specialist"), hireDate: "2021-09-01", status: "active" as const, baseSalary: 13000000, skills: "Payroll, Benefits Administration, HRIS, Onboarding", bio: "HR specialist yang menangani payroll dan benefit." },
    { employeeNo: "EMP011", fullName: "Joko Susilo", email: "joko.susilo@nexushr.id", phone: "081234567011", gender: "male" as const, birthDate: "1998-10-11", address: "Jl. Jagakarsa No. 55, Jakarta", departmentId: deptId("Human Resources"), positionId: posId("Recruiter"), hireDate: "2024-01-08", status: "probation" as const, baseSalary: 9000000, skills: "Talent Sourcing, Interviewing, LinkedIn Recruiter, ATS", bio: "Recruiter junior yang sedang masa percobaan." },
    { employeeNo: "EMP012", fullName: "Sri Wahyuni", email: "sri.wahyuni@nexushr.id", phone: "081234567012", gender: "female" as const, birthDate: "1987-06-19", address: "Jl. Kuningan No. 88, Jakarta", departmentId: deptId("Finance"), positionId: posId("Finance Manager"), hireDate: "2019-04-15", status: "active" as const, baseSalary: 26000000, skills: "Accounting, Budgeting, Tax, Financial Reporting, Audit", bio: "Finance manager bersertifikat CPA." },
    { employeeNo: "EMP013", fullName: "Agus Salim", email: "agus.salim@nexushr.id", phone: "081234567013", gender: "male" as const, birthDate: "1995-12-25", address: "Jl. Mampang Prapatan No. 7, Jakarta", departmentId: deptId("Finance"), positionId: posId("Accountant"), hireDate: "2022-05-02", status: "active" as const, baseSalary: 12500000, skills: "Bookkeeping, Tax Reporting, Excel, Accurate, Reconciliation", bio: "Akuntan detail-oriented." },
    { employeeNo: "EMP014", fullName: "Putri Handayani", email: "putri.handayani@nexushr.id", phone: "081234567014", gender: "female" as const, birthDate: "1996-03-07", address: "Jl. Bintaro No. 21, Tangerang Selatan", departmentId: deptId("Marketing"), positionId: posId("Digital Marketing Specialist"), hireDate: "2022-08-16", status: "active" as const, baseSalary: 14000000, skills: "SEO, SEM, Google Ads, Meta Ads, Content Marketing, Analytics", bio: "Digital marketer dengan ROI kampanye terbaik 2024." },
    { employeeNo: "EMP015", fullName: "Taufik Hidayat", email: "taufik.hidayat@nexushr.id", phone: "081234567015", gender: "male" as const, birthDate: "1999-01-16", address: "Jl. Ciledug No. 9, Tangerang", departmentId: deptId("Marketing"), positionId: posId("Content Strategist"), hireDate: "2024-06-01", status: "active" as const, baseSalary: 9500000, skills: "Copywriting, SEO Content, Social Media, Storytelling", bio: "Content strategist kreatif dengan gaya storytelling unik." },
    { employeeNo: "EMP016", fullName: "Nurul Aini", email: "nurul.aini@nexushr.id", phone: "081234567016", gender: "female" as const, birthDate: "1997-07-04", address: "Jl. Radio Dalam No. 14, Jakarta", departmentId: deptId("Sales"), positionId: posId("Sales Executive"), hireDate: "2023-03-20", status: "active" as const, baseSalary: 10000000, skills: "B2B Sales, Negotiation, CRM, Prospecting, Presentation", bio: "Sales executive dengan pencapaian 120% target kuartal lalu." },
    { employeeNo: "EMP017", fullName: "Bambang Sutrisno", email: "bambang.sutrisno@nexushr.id", phone: "081234567017", gender: "male" as const, birthDate: "1989-11-29", address: "Jl. TB Simatupang No. 66, Jakarta", departmentId: deptId("Sales"), positionId: posId("Sales Manager"), hireDate: "2020-01-13", status: "active" as const, baseSalary: 24000000, skills: "Sales Strategy, Key Account Management, Team Leadership, Forecasting", bio: "Sales manager dengan jaringan enterprise luas." },
    { employeeNo: "EMP018", fullName: "Lina Kusuma", email: "lina.kusuma@nexushr.id", phone: "081234567018", gender: "female" as const, birthDate: "1993-09-02", address: "Jl. Fatmawati No. 41, Jakarta", departmentId: deptId("Operations"), positionId: posId("Operations Officer"), hireDate: "2021-10-05", status: "active" as const, baseSalary: 13500000, skills: "Process Improvement, Vendor Management, Logistics, Budgeting", bio: "Operations officer yang efisien mengelola vendor." },
    { employeeNo: "EMP019", fullName: "Kevin Pratama", email: "kevin.pratama@nexushr.id", phone: "081234567019", gender: "male" as const, birthDate: "1995-05-30", address: "Jl. Panglima Polim No. 2, Jakarta", departmentId: deptId("Design"), positionId: posId("UI/UX Designer"), hireDate: "2022-03-14", status: "active" as const, baseSalary: 16000000, skills: "Figma, User Research, Prototyping, Design System, Usability Testing", bio: "UI/UX designer dengan portofolio fintech dan SaaS." },
    { employeeNo: "EMP020", fullName: "Ratna Sari", email: "ratna.sari@nexushr.id", phone: "081234567020", gender: "female" as const, birthDate: "1998-08-22", address: "Jl. Blok M No. 17, Jakarta", departmentId: deptId("Design"), positionId: posId("Graphic Designer"), hireDate: "2024-02-19", status: "probation" as const, baseSalary: 8500000, skills: "Adobe Illustrator, Photoshop, Branding, Social Media Design", bio: "Graphic designer junior penuh ide segar." },
    { employeeNo: "EMP021", fullName: "Dodi Permana", email: "dodi.permana@nexushr.id", phone: "081234567021", gender: "male" as const, birthDate: "1994-02-11", address: "Jl. Kramat Jati No. 33, Jakarta Timur", departmentId: deptId("Engineering"), positionId: posId("Frontend Engineer"), hireDate: "2022-11-07", status: "active" as const, baseSalary: 17500000, skills: "Vue.js, React, JavaScript, CSS, Web Performance", bio: "Frontend engineer yang fokus pada web performance." },
    { employeeNo: "EMP022", fullName: "Eko Prasetyo", email: "eko.prasetyo@nexushr.id", phone: "081234567022", gender: "male" as const, birthDate: "1991-10-26", address: "Jl. Duren Tiga No. 60, Jakarta", departmentId: deptId("Engineering"), positionId: posId("Backend Engineer"), hireDate: "2021-01-18", status: "active" as const, baseSalary: 21500000, skills: "Go, Python, gRPC, Kafka, PostgreSQL, Microservices", bio: "Backend engineer spesialis microservices dan event-driven." },
    { employeeNo: "EMP023", fullName: "Wulan Puspita", email: "wulan.puspita@nexushr.id", phone: "081234567023", gender: "female" as const, birthDate: "1996-12-08", address: "Jl. Pejaten No. 25, Jakarta", departmentId: deptId("Sales"), positionId: posId("Sales Executive"), hireDate: "2023-09-11", status: "active" as const, baseSalary: 9800000, skills: "Telesales, CRM, Lead Generation, Customer Relations", bio: "Sales executive dengan closing rate tertinggi tim." },
    { employeeNo: "EMP024", fullName: "Hadi Purnomo", email: "hadi.purnomo@nexushr.id", phone: "081234567024", gender: "male" as const, birthDate: "1986-04-03", address: "Jl. Warung Buncit No. 9, Jakarta", departmentId: deptId("Operations"), positionId: posId("Operations Officer"), hireDate: "2019-08-26", status: "active" as const, baseSalary: 14500000, skills: "Facility Management, Procurement, Compliance, Budgeting", bio: "Senior operations officer, mengawasi 3 kantor cabang." },
  ];
  await db.insert(employees).values(empData);
  const empRows = await db.select().from(employees);
  const empId = (no: string) => empRows.find((x) => x.employeeNo === no)!.id;

  // set managers
  for (const e of empRows) {
    let managerId: number | null = null;
    if (["EMP004", "EMP005", "EMP006", "EMP007", "EMP021", "EMP022"].includes(e.employeeNo)) managerId = empId("EMP003");
    else if (["EMP010", "EMP011"].includes(e.employeeNo)) managerId = empId("EMP002");
    else if (["EMP016", "EMP023"].includes(e.employeeNo)) managerId = empId("EMP017");
    else if (["EMP013"].includes(e.employeeNo)) managerId = empId("EMP012");
    else if (["EMP002", "EMP003", "EMP008", "EMP012", "EMP017", "EMP018", "EMP024"].includes(e.employeeNo)) managerId = empId("EMP001");
    if (managerId) {
      await db.update(employees).set({ managerId }).where(eq(employees.id, e.id));
    }
  }

  /* ---------------- Users ---------------- */
  await db.insert(users).values([
    { username: "admin", passwordHash: hashPassword("admin123"), fullName: "Administrator", email: "admin@nexushr.id", role: "admin" },
    { username: "sinta.hr", passwordHash: hashPassword("hr12345"), fullName: "Sinta Maharani", email: "sinta.maharani@nexushr.id", role: "hr", employeeId: empId("EMP002") },
    { username: "budi.k", passwordHash: hashPassword("budi123"), fullName: "Budi Kurniawan", email: "budi.kurniawan@nexushr.id", role: "employee", employeeId: empId("EMP003") },
  ]);

  /* ---------------- Job postings ---------------- */
  const jobData = [
    {
      title: "Senior Frontend Engineer",
      departmentId: deptId("Engineering"),
      description: "Membangun antarmuka web modern untuk platform HR SaaS. Bekerja dengan React, TypeScript, dan Tailwind CSS. Bertanggung jawab atas kualitas kode, performa, dan aksesibilitas produk.",
      requirements: "Minimal 4 tahun pengalaman React/TypeScript. Memahami state management, testing (Jest/Vitest), dan design system. Nilai plus: pengalaman Next.js dan GraphQL.",
      employmentType: "full-time" as const,
      location: "Jakarta (Hybrid)",
      salaryMin: 20000000,
      salaryMax: 32000000,
      status: "open" as const,
    },
    {
      title: "Backend Engineer (Node.js/Go)",
      departmentId: deptId("Engineering"),
      description: "Mengembangkan API dan layanan backend yang scalable. Desain database, optimasi query, dan implementasi microservices dengan Node.js atau Go.",
      requirements: "Minimal 3 tahun backend development. Kuat di SQL dan NoSQL. Pengalaman Docker/Kubernetes dan CI/CD. Memahami prinsip distributed system.",
      employmentType: "full-time" as const,
      location: "Jakarta (Remote OK)",
      salaryMin: 18000000,
      salaryMax: 30000000,
      status: "open" as const,
    },
    {
      title: "HR Specialist - Recruitment",
      departmentId: deptId("Human Resources"),
      description: "Mengelola proses rekrutmen end-to-end: sourcing, screening CV, interview, hingga offering. Membangun employer branding dan pipeline talenta.",
      requirements: "Minimal 2 tahun di bidang rekrutmen. Terbiasa dengan ATS dan LinkedIn Recruiter. Komunikasi excellent. Memahami UU Ketenagakerjaan dasar.",
      employmentType: "full-time" as const,
      location: "Jakarta",
      salaryMin: 10000000,
      salaryMax: 16000000,
      status: "open" as const,
    },
    {
      title: "Product Manager",
      departmentId: deptId("Product"),
      description: "Memimpin pengembangan fitur produk HR dari riset hingga peluncuran. Menyusun roadmap, prioritas backlog, dan berkolaborasi dengan engineering serta design.",
      requirements: "Minimal 3 tahun sebagai product manager di produk SaaS/B2B. Data-driven, terbiasa SQL dasar. Pengalaman agile/scrum. Komunikasi stakeholder yang kuat.",
      employmentType: "full-time" as const,
      location: "Jakarta (Hybrid)",
      salaryMin: 22000000,
      salaryMax: 35000000,
      status: "open" as const,
    },
    {
      title: "Digital Marketing Specialist",
      departmentId: deptId("Marketing"),
      description: "Merencanakan dan mengeksekusi kampanye digital marketing: SEO, SEM, paid social, dan email marketing. Menganalisis performa kampanye dan optimasi konversi.",
      requirements: "Minimal 2 tahun digital marketing. Mahir Google Ads, Meta Ads, dan Google Analytics. Memahami SEO on-page/off-page. Kreatif dan analitis.",
      employmentType: "full-time" as const,
      location: "Jakarta",
      salaryMin: 11000000,
      salaryMax: 18000000,
      status: "open" as const,
    },
  ];
  await db.insert(jobPostings).values(jobData);
  const jobRows = await db.select().from(jobPostings);
  const jobId = (title: string) => jobRows.find((x) => x.title === title)!.id;

  /* ---------------- Candidates (with realistic CV texts) ---------------- */
  const candData = [
    // Frontend Engineer candidates
    { jobId: jobId("Senior Frontend Engineer"), fullName: "Arif Maulana", email: "arif.maulana@gmail.com", phone: "085712345601", status: "new" as const, source: "LinkedIn", cvText: "Frontend Developer dengan 5 tahun pengalaman membangun aplikasi React dan TypeScript di startup fintech. Ahli state management (Redux, Zustand), testing dengan Jest dan Vitest, serta membangun design system dengan Tailwind CSS. Pernah memimpin migrasi ke Next.js yang meningkatkan skor Lighthouse dari 60 ke 95. Familiar dengan GraphQL dan REST API. S1 Teknik Informatika Universitas Indonesia." },
    { jobId: jobId("Senior Frontend Engineer"), fullName: "Sarah Amalia", email: "sarah.amalia@gmail.com", phone: "085712345602", status: "new" as const, source: "Website", cvText: "Software Engineer 6 tahun fokus pada pengembangan frontend web. Stack utama: React, Next.js, TypeScript. Berpengalaman membangun dashboard analytics real-time dengan WebSocket dan Recharts. Kontributor open source komponen UI. Pernah bekerja di Gojek dan Tokopedia sebagai frontend engineer. Passionate tentang aksesibilitas web (WCAG) dan web performance optimization." },
    { jobId: jobId("Senior Frontend Engineer"), fullName: "Doni Setiawan", email: "doni.setiawan@gmail.com", phone: "085712345603", status: "new" as const, source: "JobStreet", cvText: "Web developer dengan 2 tahun pengalaman menggunakan HTML, CSS, JavaScript, dan jQuery. Pernah membuat website company profile dan toko online WordPress. Sedang belajar React dari kursus online. Lulusan SMK jurusan Rekayasa Perangkat Lunak. Mencari kesempatan berkembang sebagai frontend engineer profesional." },
    { jobId: jobId("Senior Frontend Engineer"), fullName: "Jessica Tan", email: "jessica.tan@gmail.com", phone: "085712345604", status: "interview" as const, source: "Referral", cvText: "Senior Frontend Engineer dengan 7 tahun pengalaman di perusahaan SaaS enterprise. Expert React, TypeScript, dan arsitektur micro-frontend. Membangun design system yang dipakai 12 produk. Mentor tim junior, code review, dan menetapkan standar testing (coverage 85%+). Pengalaman dengan Module Federation, monorepo (Turborepo), dan CI/CD frontend. S2 Computer Science Nanyang Technological University." },
    { jobId: jobId("Senior Frontend Engineer"), fullName: "Bima Aditya", email: "bima.aditya@gmail.com", phone: "085712345605", status: "new" as const, source: "LinkedIn", cvText: "Fullstack developer 4 tahun dengan dominan backend PHP Laravel dan MySQL. Frontend menggunakan Bootstrap dan sedikit Vue.js. Berpengalaman membangun sistem informasi manajemen untuk pemerintahan. Ingin transisi fokus ke frontend engineering modern." },
    // Backend candidates
    { jobId: jobId("Backend Engineer (Node.js/Go)"), fullName: "Fauzan Akbar", email: "fauzan.akbar@gmail.com", phone: "085712345611", status: "new" as const, source: "LinkedIn", cvText: "Backend Engineer 5 tahun dengan Node.js dan Go di perusahaan e-commerce. Membangun layanan pembayaran yang menangani 1 juta transaksi/hari. Ahli PostgreSQL, Redis, Kafka, dan desain microservices. Pengalaman Kubernetes di GCP dan AWS. Menulis RFC teknis dan memimpin desain sistem. S1 Ilmu Komputer ITB." },
    { jobId: jobId("Backend Engineer (Node.js/Go)"), fullName: "Gita Permata", email: "gita.permata@gmail.com", phone: "085712345612", status: "screening" as const, source: "Website", cvText: "Software developer 3 tahun, spesialisasi Python Django dan Flask untuk sistem internal perusahaan logistik. Terbiasa PostgreSQL, Celery, dan Redis. Sedang mempelajari Go dan arsitektur microservices. Pernah deploy aplikasi dengan Docker di VPS. Kontributor komunitas Python Indonesia." },
    { jobId: jobId("Backend Engineer (Node.js/Go)"), fullName: "Rian Prakoso", email: "rian.prakoso@gmail.com", phone: "085712345613", status: "new" as const, source: "JobStreet", cvText: "Fresh graduate S1 Sistem Informasi, magang 6 bulan sebagai backend developer Java Spring Boot. Memahami dasar REST API, SQL, dan Git. Mengerjakan proyek skripsi sistem inventory dengan MySQL. Antusias belajar Node.js dan cloud computing." },
    { jobId: jobId("Backend Engineer (Node.js/Go)"), fullName: "Hafiz Nugroho", email: "hafiz.nugroho@gmail.com", phone: "085712345614", status: "new" as const, source: "LinkedIn", cvText: "DevOps Engineer 4 tahun yang ingin bertransisi ke backend development. Mahir Docker, Kubernetes, Terraform, AWS. Pengalaman scripting Python dan Bash untuk otomasi. Membangun pipeline CI/CD untuk 20+ layanan. Memahami konsep microservices dari sisi infrastruktur." },
    // HR Specialist candidates
    { jobId: jobId("HR Specialist - Recruitment"), fullName: "Nadia Fitriani", email: "nadia.fitriani@gmail.com", phone: "085712345621", status: "new" as const, source: "LinkedIn", cvText: "HR Recruiter 3 tahun di perusahaan teknologi dengan 200+ hiring per tahun. Expert talent sourcing via LinkedIn Recruiter dan JobStreet. Mengelola ATS (Talenta/Mekari), menyusun job description, dan menjalankan structured interview. Menurunkan time-to-hire dari 45 ke 28 hari. S1 Psikologi Universitas Padjadjaran." },
    { jobId: jobId("HR Specialist - Recruitment"), fullName: "Oscar Wijaya", email: "oscar.wijaya@gmail.com", phone: "085712345622", status: "new" as const, source: "Website", cvText: "Staff administrasi 5 tahun di perusahaan distribusi, menangani arsip dokumen dan data entry. Ingin berpindah karier ke bidang HR karena tertarik berinteraksi dengan orang. Mengikuti pelatihan dasar HR online. Teliti, rapi, dan komunikatif." },
    { jobId: jobId("HR Specialist - Recruitment"), fullName: "Larasati Dewi", email: "larasati.dewi@gmail.com", phone: "085712345623", status: "offer" as const, source: "Referral", cvText: "HR Business Partner 4 tahun dengan fokus rekrutmen dan employer branding di startup edtech. Membangun program campus hiring di 10 universitas. Terbiasa competency-based interview dan assessment center. Memahami UU Ketenagakerjaan dan BPJS. Sertifikasi CHRP. S1 Manajemen Universitas Brawijaya." },
    // PM candidates
    { jobId: jobId("Product Manager"), fullName: "Yoga Pratama", email: "yoga.pratama@gmail.com", phone: "085712345631", status: "new" as const, source: "LinkedIn", cvText: "Product Manager 4 tahun di perusahaan SaaS B2B HR-tech. Memimpin squad 8 orang, meluncurkan 15+ fitur dengan adoption rate rata-rata 70%. Data-driven: SQL, Amplitude, A/B testing. Menyusun roadmap kuartalan dan OKR. Background software engineer sehingga komunikasi teknis lancar. S1 Teknik Elektro UGM." },
    { jobId: jobId("Product Manager"), fullName: "Citra Kirana", email: "citra.kirana@gmail.com", phone: "085712345632", status: "new" as const, source: "Website", cvText: "Business Analyst 3 tahun di konsultan manajemen. Menyusun business requirement document, flow proses, dan analisis pasar untuk klien perbankan. Mahir Excel dan PowerPoint. Ingin berkembang menjadi product manager. S1 Ekonomi Universitas Diponegoro." },
    { jobId: jobId("Product Manager"), fullName: "Reza Fahlevi", email: "reza.fahlevi@gmail.com", phone: "085712345633", status: "interview" as const, source: "LinkedIn", cvText: "Associate Product Manager 2 tahun di fintech lending, fokus pada fitur onboarding dan KYC. Menurunkan drop-off onboarding 25% melalui eksperimen UX. Terbiasa agile, menulis PRD, dan user story mapping. Sertifikasi Scrum Product Owner (PSPO I). S1 Informatika Universitas Telkom." },
    // Digital marketing candidates
    { jobId: jobId("Digital Marketing Specialist"), fullName: "Tiara Kusuma", email: "tiara.kusuma@gmail.com", phone: "085712345641", status: "new" as const, source: "JobStreet", cvText: "Digital Marketing Specialist 3 tahun di agensi digital. Mengelola budget iklan Rp 500 juta/bulan untuk 8 klien. Expert Google Ads, Meta Ads, dan TikTok Ads. Meningkatkan ROAS rata-rata klien dari 2.1 ke 4.3. Mahir Google Analytics 4, SEO (Ahrefs, Semrush), dan email marketing automation. S1 Ilmu Komunikasi Universitas Airlangga." },
    { jobId: jobId("Digital Marketing Specialist"), fullName: "Irfan Hakim", email: "irfan.hakim@gmail.com", phone: "085712345642", status: "new" as const, source: "Website", cvText: "Content creator TikTok dan Instagram dengan 50 ribu followers. Membuat konten video pendek tentang review gadget. Pernah kerjasama brand endorsement. Belajar ads manager secara otodidak. Mencari posisi digital marketing untuk mengembangkan karier profesional." },
    { jobId: jobId("Digital Marketing Specialist"), fullName: "Anisa Rahmawati", email: "anisa.rahmawati@gmail.com", phone: "085712345643", status: "screening" as const, source: "LinkedIn", cvText: "SEO Specialist 2 tahun di e-commerce fashion. Optimasi 500+ halaman produk, meningkatkan organic traffic 180% dalam setahun. Mahir technical SEO, keyword research, link building. Terbiasa Google Search Console, Screaming Frog, dan Google Analytics. S1 Sastra Inggris Universitas Negeri Jakarta." },
  ];
  await db.insert(candidates).values(candData);

  /* ---------------- Attendance (last 10 working days) ---------------- */
  const activeEmps = empRows.filter((e) => e.status === "active");
  const attValues = [];
  for (let dayOffset = -13; dayOffset <= 0; dayOffset++) {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    if (date.getDay() === 0 || date.getDay() === 6) continue; // skip weekends
    const dateStr = date.toISOString().slice(0, 10);
    for (const emp of activeEmps) {
      const hash = Math.abs((emp.id * 7 + dayOffset * 13) % 100);
      let status: "present" | "late" | "absent" | "leave" | "sick" = "present";
      if (hash < 8) status = "late";
      else if (hash < 12) status = "absent";
      else if (hash < 14) status = "sick";
      else if (hash < 16) status = "leave";
      if (status === "absent") {
        attValues.push({ employeeId: emp.id, date: dateStr, status });
        continue;
      }
      if (status === "leave" || status === "sick") {
        attValues.push({ employeeId: emp.id, date: dateStr, status });
        continue;
      }
      const checkIn = new Date(`${dateStr}T08:${String(30 + (hash % 30)).padStart(2, "0")}:00+07:00`);
      const checkOut = new Date(`${dateStr}T17:${String(hash % 60).padStart(2, "0")}:00+07:00`);
      attValues.push({ employeeId: emp.id, date: dateStr, checkIn, checkOut, status });
    }
  }
  // chunk insert to avoid packet limits
  for (let i = 0; i < attValues.length; i += 100) {
    await db.insert(attendanceRecords).values(attValues.slice(i, i + 100));
  }

  /* ---------------- Leave requests ---------------- */
  await db.insert(leaveRequests).values([
    { employeeId: empId("EMP004"), type: "annual", startDate: d(3), endDate: d(5), days: 3, reason: "Liburan keluarga ke Bali", status: "pending" },
    { employeeId: empId("EMP016"), type: "sick", startDate: d(-2), endDate: d(-1), days: 2, reason: "Demam dan flu, istirahat sesuai anjuran dokter", status: "approved", approverName: "Sinta Maharani", decidedAt: new Date() },
    { employeeId: empId("EMP021"), type: "annual", startDate: d(10), endDate: d(12), days: 3, reason: "Acara pernikahan saudara di Bandung", status: "pending" },
    { employeeId: empId("EMP019"), type: "other", startDate: d(-7), endDate: d(-7), days: 1, reason: "Menghadiri konferensi desain UX Indonesia", status: "approved", approverName: "Sinta Maharani", decidedAt: new Date() },
    { employeeId: empId("EMP023"), type: "unpaid", startDate: d(20), endDate: d(24), days: 5, reason: "Keperluan keluarga mendesak di kampung", status: "pending" },
    { employeeId: empId("EMP006"), type: "annual", startDate: d(-10), endDate: d(-9), days: 2, reason: "Mengurus dokumen kependudukan", status: "rejected", approverName: "Sinta Maharani", decidedAt: new Date() },
    { employeeId: empId("EMP014"), type: "sick", startDate: d(1), endDate: d(1), days: 1, reason: "Sakit kepala berkelanjutan", status: "pending" },
  ]);

  /* ---------------- Payslips (last 2 months) ---------------- */
  const workDays = 22;
  for (const monthOffset of [-2, -1]) {
    const per = period(monthOffset);
    for (const emp of activeEmps) {
      const base = emp.baseSalary;
      const allowance = Math.round(base * 0.1);
      const overtime = monthOffset === -1 ? Math.round(base * 0.02 * ((emp.id % 3) + 1)) : 0;
      const deduction = emp.id % 7 === 0 ? Math.round(base * 0.05) : 0;
      const gross = base + allowance + overtime - deduction;
      const tax = Math.round(gross * 0.05);
      await db.insert(payslips).values({
        employeeId: emp.id,
        period: per,
        baseSalary: base,
        allowance,
        overtime,
        bonus: 0,
        deduction,
        tax,
        netSalary: gross - tax,
        status: monthOffset === -2 ? "paid" : "draft",
        paidAt: monthOffset === -2 ? new Date() : null,
      });
    }
  }

  /* ---------------- Performance reviews ---------------- */
  const reviewPeriod = `${new Date().getFullYear()}-Q2`;
  await db.insert(performanceReviews).values([
    { employeeId: empId("EMP004"), reviewerName: "Budi Kurniawan", period: reviewPeriod, goals: "Menyelesaikan redesign dashboard utama dan meningkatkan coverage testing komponen hingga 80%", achievements: "Redesign dashboard selesai 2 minggu lebih awal, coverage testing mencapai 85%, membangun 12 komponen reusable baru", reviewerScore: 88, status: "reviewed" },
    { employeeId: empId("EMP005"), reviewerName: "Budi Kurniawan", period: reviewPeriod, goals: "Migrasi layanan autentikasi ke microservice dan optimasi query database lambat", achievements: "Migrasi berhasil tanpa downtime, waktu respon API turun 40%, menulis dokumentasi arsitektur lengkap", reviewerScore: 92, status: "reviewed" },
    { employeeId: empId("EMP016"), reviewerName: "Bambang Sutrisno", period: reviewPeriod, goals: "Mencapai target penjualan Rp 800 juta dan membuka 10 akun enterprise baru", achievements: "Penjualan Rp 960 juta (120% target), 13 akun enterprise baru, churn rate terendah di tim", reviewerScore: 95, status: "reviewed" },
    { employeeId: empId("EMP014"), reviewerName: "Andi Wijaya", period: reviewPeriod, goals: "Meningkatkan organic traffic 50% dan ROAS kampanye paid minimal 3.0", achievements: "Organic traffic naik 62%, ROAS rata-rata 3.8, meluncurkan blog teknis dengan 20 artikel", reviewerScore: 87, status: "reviewed" },
    { employeeId: empId("EMP019"), reviewerName: "Maya Putri", period: reviewPeriod, goals: "Menyelesaikan design system v2 dan usability testing 3 fitur utama", achievements: "Design system v2 rilis dengan 40 komponen, usability testing 4 fitur selesai, skor SUS naik dari 68 ke 79", reviewerScore: 84, status: "reviewed" },
    { employeeId: empId("EMP011"), reviewerName: "Sinta Maharani", period: reviewPeriod, goals: "Merekrut 5 engineer dan menurunkan time-to-hire di bawah 30 hari", achievements: "Merekrut 4 engineer (1 dalam proses), time-to-hire rata-rata 26 hari, membangun talent pool 200 kandidat", reviewerScore: 76, status: "submitted" },
    { employeeId: empId("EMP008"), reviewerName: "Andi Wijaya", period: reviewPeriod, goals: "Meluncurkan modul payroll dan mencapai adoption 60% pelanggan aktif", achievements: "Modul payroll rilis tepat waktu, adoption 68%, NPS fitur 8.2/10, mengurangi churn 15%", reviewerScore: 91, status: "reviewed" },
    { employeeId: empId("EMP007"), reviewerName: "Budi Kurniawan", period: reviewPeriod, goals: "Mencapai uptime 99.9% dan mengurangi biaya cloud 20%", achievements: "Uptime 99.95%, biaya cloud turun 23% via rightsizing, implementasi auto-scaling", reviewerScore: 89, status: "reviewed" },
    { employeeId: empId("EMP022"), reviewerName: "Budi Kurniawan", period: reviewPeriod, goals: "Membangun event-driven architecture untuk notifikasi dan integrasi Kafka", achievements: "Kafka cluster production-ready, 8 event types terintegrasi, latency notifikasi di bawah 200ms", reviewerScore: 90, status: "reviewed" },
    { employeeId: empId("EMP023"), reviewerName: "Bambang Sutrisno", period: reviewPeriod, goals: "Closing 50 deal telesales dan maintain customer satisfaction di atas 4.5", achievements: "Closing 58 deal, CSAT 4.7, konversi lead tertinggi tim (34%)", reviewerScore: 86, status: "reviewed" },
  ]);

  /* ---------------- Announcements ---------------- */
  await db.insert(announcements).values([
    { title: "Selamat Datang di NexusHR", content: "Portal HR terpadu kini aktif. Semua karyawan dapat mengakses absensi, pengajuan cuti, dan slip gaji melalui platform ini.", pinned: true },
    { title: "Kebijakan Kerja Hybrid Q3", content: "Mulai kuartal depan, kebijakan kerja hybrid 3 hari WFO dan 2 hari WFH berlaku untuk seluruh departemen Engineering dan Product.", pinned: false },
    { title: "Town Hall Meeting", content: "Town hall bulanan akan dilaksanakan Jumat pukul 15.00 WIB via Google Meet. Agenda: update bisnis, pengumuman promosi, dan sesi tanya jawab.", pinned: false },
  ]);

  console.log("Done. Seeded:");
  console.log(`  ${deptData.length} departments, ${posData.length} positions, ${empData.length} employees`);
  console.log(`  ${jobData.length} jobs, ${candData.length} candidates, ${attValues.length} attendance records`);
  console.log("  users: admin/admin123, sinta.hr/hr12345, budi.k/budi123");
  process.exit(0);
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
