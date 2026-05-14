import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedData1777767200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (process.env.SEED_DATA !== "true") {
      console.log("[SeedData] SEED_DATA env flag is not 'true' — skipping seed.");
      return;
    }

    console.log("[SeedData] Seeding database …");

    const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const sample = <T>(arr: T[], n: number): T[] => {
      const copy = [...arr];
      const result: T[] = [];
      for (let i = 0; i < n && copy.length > 0; i++) {
        const idx = Math.floor(Math.random() * copy.length);
        result.push(copy.splice(idx, 1)[0]);
      }
      return result;
    };

    const hashedPassword = await bcrypt.hash("Seed1234!", 10);

    const adminId = randomUUID();
    await queryRunner.query(
      `INSERT INTO "users" ("id","firstName","lastName","email","password","role","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,'hackathon-admin',now(),now())`,
      [adminId, "Admin", "Seeded", "admin@seed.dev", hashedPassword],
    );

    const firstNames = [
      "Alice",
      "Bob",
      "Carol",
      "David",
      "Eve",
      "Frank",
      "Grace",
      "Hank",
      "Iris",
      "Jack",
      "Karen",
      "Liam",
      "Mia",
      "Noah",
      "Olivia",
      "Paul",
      "Quinn",
      "Rose",
      "Sam",
      "Tina",
      "Ulrich",
      "Vera",
      "Will",
      "Xena",
      "Yara",
      "Zack",
      "Ana",
      "Ben",
      "Chloe",
      "Dan",
      "Elena",
      "Finn",
      "Gina",
      "Hugo",
      "Ivy",
      "Jake",
      "Kim",
      "Leo",
      "Maya",
      "Ned",
      "Opal",
      "Pete",
      "Rita",
      "Steve",
      "Tara",
      "Uma",
      "Vic",
      "Wendy",
      "Xander",
      "Yuki",
      "Adrian",
      "Bianca",
      "Carlos",
      "Diana",
      "Ethan",
      "Fiona",
      "George",
      "Helena",
      "Ivan",
      "Julia",
      "Kevin",
      "Laura",
      "Marcus",
      "Nina",
      "Oscar",
      "Petra",
      "Ravi",
      "Sara",
      "Tom",
      "Ursula",
      "Victor",
      "Wanda",
      "Xerxes",
      "Yvonne",
      "Zane",
      "Arjun",
      "Beatrice",
      "Connor",
      "Daria",
      "Emil",
      "Fatima",
      "Gregor",
      "Hana",
      "Igor",
      "Jade",
      "Kai",
      "Lena",
      "Max",
      "Nadia",
      "Omar",
      "Priya",
      "Qian",
      "Rex",
      "Selena",
      "Theo",
      "Una",
      "Vito",
      "Wei",
      "Ximena",
      "Yusuf",
      "Zara",
    ];

    const lastNames = [
      "Smith",
      "Johnson",
      "Williams",
      "Brown",
      "Jones",
      "Garcia",
      "Miller",
      "Davis",
      "Wilson",
      "Moore",
      "Taylor",
      "Anderson",
      "Thomas",
      "Jackson",
      "White",
      "Harris",
      "Martin",
      "Thompson",
      "Young",
      "Lewis",
      "Walker",
      "Hall",
      "Allen",
      "King",
      "Wright",
      "Scott",
      "Green",
      "Baker",
      "Adams",
      "Nelson",
      "Carter",
      "Mitchell",
      "Roberts",
      "Turner",
      "Phillips",
      "Campbell",
      "Parker",
      "Evans",
      "Edwards",
      "Collins",
      "Stewart",
      "Morris",
      "Rogers",
      "Reed",
      "Cook",
      "Morgan",
      "Bell",
      "Murphy",
      "Bailey",
      "Rivera",
      "Cooper",
      "Richardson",
      "Cox",
      "Howard",
      "Ward",
      "Torres",
      "Peterson",
      "Gray",
      "Ramirez",
      "James",
      "Watson",
      "Brooks",
      "Kelly",
      "Sanders",
      "Price",
      "Bennett",
      "Wood",
      "Barnes",
      "Ross",
      "Henderson",
      "Coleman",
      "Jenkins",
      "Perry",
      "Powell",
      "Long",
      "Patterson",
      "Hughes",
      "Flores",
      "Washington",
      "Butler",
      "Simmons",
      "Foster",
      "Gonzales",
      "Bryant",
      "Alexander",
      "Russell",
      "Griffin",
      "Diaz",
      "Hayes",
      "Myers",
      "Ford",
      "Hamilton",
      "Graham",
      "Sullivan",
      "Wallace",
      "Woods",
      "Cole",
      "West",
      "Jordan",
      "Owens",
      "Reynolds",
      "Fisher",
      "Ellis",
      "Harrison",
    ];

    const positions = [
      "Backend Developer",
      "Frontend Developer",
      "Full Stack Developer",
      "Machine Learning Engineer",
      "Data Scientist",
      "Mobile Developer",
      "DevOps Engineer",
      "Security Engineer",
      "Blockchain Developer",
      "Game Developer",
      "Embedded / IoT Engineer",
      "UI/UX Designer",
      "AR/VR Developer",
      "Product Manager",
      "QA Engineer",
    ];

    // Position → skill assumptions: core skills are highly likely, supplemental fills the rest
    const positionSkillSets: Record<string, { core: string[]; supplemental: string[] }> = {
      "Backend Developer": {
        core: [
          "Python",
          "Node.js",
          "Java",
          "Go",
          "PostgreSQL",
          "Redis",
          "Docker",
          "REST API Design",
          "Express.js",
          "FastAPI",
          "Django",
          "Spring Boot",
        ],
        supplemental: [
          "TypeScript",
          "MongoDB",
          "Kubernetes",
          "gRPC",
          "AWS",
          "MySQL",
          "GraphQL",
          "Linux",
          "Git",
        ],
      },
      "Frontend Developer": {
        core: [
          "JavaScript",
          "TypeScript",
          "React",
          "Vue.js",
          "Angular",
          "Tailwind CSS",
          "Next.js",
          "Svelte",
          "Figma",
        ],
        supplemental: ["Node.js", "GraphQL", "REST API Design", "Git", "Unit Testing"],
      },
      "Full Stack Developer": {
        core: [
          "JavaScript",
          "TypeScript",
          "React",
          "Node.js",
          "PostgreSQL",
          "REST API Design",
          "Docker",
          "Next.js",
          "Express.js",
        ],
        supplemental: ["MongoDB", "GraphQL", "AWS", "Redis", "Vue.js", "Git", "MySQL"],
      },
      "Machine Learning Engineer": {
        core: ["Python", "TensorFlow", "PyTorch", "scikit-learn", "NLP", "R", "Scala"],
        supplemental: ["Docker", "AWS", "GCP", "PostgreSQL", "FastAPI", "Git", "Elasticsearch"],
      },
      "Data Scientist": {
        core: ["Python", "R", "scikit-learn", "TensorFlow", "NLP", "PostgreSQL", "Elasticsearch"],
        supplemental: ["Scala", "Docker", "AWS", "FastAPI", "MongoDB", "MySQL"],
      },
      "Mobile Developer": {
        core: ["React Native", "Flutter", "Swift", "Kotlin", "Java"],
        supplemental: [
          "TypeScript",
          "JavaScript",
          "REST API Design",
          "GraphQL",
          "Git",
          "Unit Testing",
          "Figma",
        ],
      },
      "DevOps Engineer": {
        core: ["Docker", "Kubernetes", "AWS", "GCP", "Azure", "Linux", "Git"],
        supplemental: [
          "Python",
          "Go",
          "Rust",
          "PostgreSQL",
          "Redis",
          "Elasticsearch",
          "System Design",
        ],
      },
      "Security Engineer": {
        core: ["Penetration Testing", "Cryptography", "Linux", "Python", "C++"],
        supplemental: ["Go", "Rust", "Docker", "Kubernetes", "AWS", "Git", "C#"],
      },
      "Blockchain Developer": {
        core: ["Solidity", "Web3.js", "JavaScript", "TypeScript", "Cryptography"],
        supplemental: ["Rust", "Go", "Python", "PostgreSQL", "Docker", "React"],
      },
      "Game Developer": {
        core: ["Unity", "Unreal Engine", "C#", "C++", "JavaScript"],
        supplemental: ["Rust", "Python", "Git", "UI/UX Design", "Figma", "Svelte"],
      },
      "Embedded / IoT Engineer": {
        core: ["C++", "Rust", "Python", "Linux", "C#"],
        supplemental: ["Docker", "Go", "AWS", "Git", "Java"],
      },
      "UI/UX Designer": {
        core: ["Figma", "UI/UX Design", "JavaScript", "TypeScript", "React"],
        supplemental: ["Vue.js", "Tailwind CSS", "Svelte", "Next.js", "Angular"],
      },
      "AR/VR Developer": {
        core: ["Unity", "Unreal Engine", "C#", "C++", "JavaScript"],
        supplemental: ["Python", "React Native", "TypeScript", "Git", "Figma"],
      },
      "Product Manager": {
        core: ["Agile / Scrum", "System Design", "Figma", "UI/UX Design"],
        supplemental: ["JavaScript", "Python", "REST API Design", "Git", "SQL"],
      },
      "QA Engineer": {
        core: ["Unit Testing", "Python", "JavaScript", "System Design", "Agile / Scrum"],
        supplemental: ["TypeScript", "Docker", "Git", "REST API Design", "Java"],
      },
    };

    const pickPositionSkills = (position: string, count: number): string[] => {
      const set = positionSkillSets[position];
      if (!set) return sample(allSkills, count);
      const coreCount = Math.min(Math.ceil(count * 0.7), set.core.length);
      const coreSkills = sample(set.core, coreCount);
      const remaining = allSkills.filter((s) => !coreSkills.includes(s));
      const extras = sample(remaining, count - coreCount);
      return [...coreSkills, ...extras];
    };

    const allSkills = [
      "Python",
      "JavaScript",
      "TypeScript",
      "Java",
      "C++",
      "Go",
      "Swift",
      "Kotlin",
      "Rust",
      "C#",
      "Ruby",
      "PHP",
      "Scala",
      "R",
      "React",
      "Vue.js",
      "Angular",
      "Svelte",
      "Next.js",
      "Tailwind CSS",
      "Node.js",
      "Django",
      "FastAPI",
      "Spring Boot",
      "Express.js",
      "Flask",
      "GraphQL",
      "REST API Design",
      "gRPC",
      "PostgreSQL",
      "MySQL",
      "MongoDB",
      "Redis",
      "Elasticsearch",
      "Docker",
      "Kubernetes",
      "AWS",
      "GCP",
      "Azure",
      "Linux",
      "Git",
      "TensorFlow",
      "PyTorch",
      "scikit-learn",
      "NLP",
      "React Native",
      "Flutter",
      "Solidity",
      "Web3.js",
      "Unity",
      "Unreal Engine",
      "Figma",
      "UI/UX Design",
      "Penetration Testing",
      "Cryptography",
      "Unit Testing",
      "Agile / Scrum",
      "System Design",
    ];

    const participantIds: string[] = [];

    // 250 participants with position-based skill distributions
    for (let i = 0; i < 250; i++) {
      const userId = randomUUID();
      const participantId = randomUUID();
      const firstName = firstNames[i % firstNames.length];
      const lastName = lastNames[i % lastNames.length];
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@seed.dev`;
      const position = pick(positions);
      const skillCount = 5 + (i % 4);
      const skills = pickPositionSkills(position, skillCount);
      const yearsOfExp = 1 + (i % 10);
      const experience = `${yearsOfExp} years of experience in software development, specialising in ${skills.slice(0, 2).join(" and ")}.`;

      await queryRunner.query(
        `INSERT INTO "users" ("id","firstName","lastName","email","password","role","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,'participant',now(),now())`,
        [userId, firstName, lastName, email, hashedPassword],
      );

      const skillsLiteral = `{${skills.map((s) => `"${s}"`).join(",")}}`;
      await queryRunner.query(
        `INSERT INTO "participants" ("id","userId","experience","yearsOfExperience","skills","position","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5::skill_enum[],$6::position_enum,now(),now())`,
        [participantId, userId, experience, yearsOfExp, skillsLiteral, position],
      );

      participantIds.push(participantId);
    }

    const hackathonTopics = {
      AI_ML: "AI / Machine Learning",
      AR_VR: "AR / VR",
      BLOCKCHAIN: "Blockchain / Web3",
      CYBERSEC: "Cybersecurity",
      FINTECH: "FinTech",
      GAME: "Game Development",
      HEALTH: "HealthTech",
      IOT: "IoT & Embedded",
      MOBILE: "Mobile Development",
      WEB: "Web Development",
    } as const;

    const daysAgo = (d: number, hour = 10) => {
      const dt = new Date(Date.now() - d * 24 * 60 * 60 * 1000);
      dt.setHours(hour, 0, 0, 0);
      return dt;
    };
    const daysFromNow = (d: number, hour = 10) => {
      const dt = new Date(Date.now() + d * 24 * 60 * 60 * 1000);
      dt.setHours(hour, 0, 0, 0);
      return dt;
    };

    const hackathonData: Array<{
      title: string;
      description: string;
      topic: string;
      startDate: Date;
      durationHours: number;
      maxTeamSize: number;
      maxParticipants: number | null;
      imageUrl: string | null;
    }> = [
      // ── ENDED (8) ────────────────────────────────────────────────────────────
      {
        title: "AI Innovation Sprint",
        description:
          "Build intelligent applications using the latest AI/ML frameworks. From NLP chatbots to computer vision solutions, this hackathon challenges participants to push the boundaries of artificial intelligence.",
        topic: hackathonTopics.AI_ML,
        startDate: daysAgo(90, 9),
        durationHours: 48,
        maxTeamSize: 4,
        maxParticipants: 120,
        imageUrl: null,
      },
      {
        title: "MetaWorld Hackathon",
        description:
          "Dive into immersive experiences! Create AR/VR applications that redefine how we interact with digital and physical worlds using WebXR, Unity, or Unreal Engine.",
        topic: hackathonTopics.AR_VR,
        startDate: daysAgo(75, 11),
        durationHours: 36,
        maxTeamSize: 3,
        maxParticipants: 60,
        imageUrl: null,
      },
      {
        title: "DeFi Builders Week",
        description:
          "Design and deploy decentralised finance protocols, NFT platforms, or DAO governance tools on EVM-compatible chains. Real-world impact on the future of money.",
        topic: hackathonTopics.BLOCKCHAIN,
        startDate: daysAgo(60, 8),
        durationHours: 72,
        maxTeamSize: 5,
        maxParticipants: 200,
        imageUrl: null,
      },
      {
        title: "SecureCode Challenge",
        description:
          "Identify vulnerabilities, build zero-trust systems and create security tooling for modern cloud-native applications. Bring your ethical hacking skills to the table.",
        topic: hackathonTopics.CYBERSEC,
        startDate: daysAgo(50, 10),
        durationHours: 24,
        maxTeamSize: 3,
        maxParticipants: 90,
        imageUrl: null,
      },
      {
        title: "FinTech Frontier",
        description:
          "Reinvent banking, payments, and financial inclusion. Build open-banking integrations, personal finance tools, or micro-lending platforms that serve the underbanked.",
        topic: hackathonTopics.FINTECH,
        startDate: daysAgo(40, 12),
        durationHours: 48,
        maxTeamSize: 4,
        maxParticipants: 160,
        imageUrl: null,
      },
      {
        title: "GameJam XL",
        description:
          "48 hours. One theme revealed at kick-off. Build a complete playable game from scratch using any engine or framework. Judged on creativity, fun factor, and execution.",
        topic: hackathonTopics.GAME,
        startDate: daysAgo(25, 9),
        durationHours: 48,
        maxTeamSize: 5,
        maxParticipants: 250,
        imageUrl: null,
      },
      {
        title: "HealthHack",
        description:
          "Leverage data science, wearables, and telemedicine APIs to improve patient outcomes, mental health, or healthcare accessibility. Lives may depend on what you build.",
        topic: hackathonTopics.HEALTH,
        startDate: daysAgo(18, 11),
        durationHours: 36,
        maxTeamSize: 4,
        maxParticipants: 100,
        imageUrl: null,
      },
      {
        title: "IoT Connect Hackathon",
        description:
          "Build smart-home devices, industrial monitoring solutions, or environmental sensors. Raspberry Pi, Arduino, and ESP32 boards are all welcome.",
        topic: hackathonTopics.IOT,
        startDate: daysAgo(10, 8),
        durationHours: 48,
        maxTeamSize: 4,
        maxParticipants: 80,
        imageUrl: null,
      },
      // ── ONGOING / STARTED BUT NOT ENDED (3) ──────────────────────────────────
      {
        title: "Mobile Velocity",
        description:
          "Ship a polished mobile app in 36 hours. React Native, Flutter, SwiftUI, or Jetpack Compose — you pick the stack. App Store quality UI is the minimum bar.",
        topic: hackathonTopics.MOBILE,
        startDate: daysAgo(1, 10), // started 1 day ago, ends in ~12 h
        durationHours: 36,
        maxTeamSize: 3,
        maxParticipants: 120,
        imageUrl: null,
      },
      {
        title: "WebCraft Open",
        description:
          "Design and build full-stack web applications that solve real-world problems. REST or GraphQL APIs, any frontend framework — get creative with UX and performance.",
        topic: hackathonTopics.WEB,
        startDate: daysAgo(1, 9), // started 1 day ago, ends in ~1 day
        durationHours: 48,
        maxTeamSize: 5,
        maxParticipants: 200,
        imageUrl: null,
      },
      {
        title: "LLM Engineering Summit",
        description:
          "Fine-tune, prompt-engineer, or RAG-augment large language models to build production-ready AI assistants, code generators, or knowledge-base search tools.",
        topic: hackathonTopics.AI_ML,
        startDate: daysAgo(1, 8), // started 1 day ago, ends in ~1 day
        durationHours: 60,
        maxTeamSize: 4,
        maxParticipants: 140,
        imageUrl: null,
      },
      // ── FUTURE (6) ───────────────────────────────────────────────────────────
      {
        title: "Smart City Challenge",
        description:
          "Harness IoT, data analytics, and civic APIs to solve urban problems: traffic, pollution, energy efficiency, and public safety.",
        topic: hackathonTopics.IOT,
        startDate: daysFromNow(7, 10),
        durationHours: 60,
        maxTeamSize: 5,
        maxParticipants: 150,
        imageUrl: null,
      },
      {
        title: "Crypto Security Arena",
        description:
          "Audit smart contracts, break CTF challenges, and demonstrate responsible disclosure practices in a live DeFi environment.",
        topic: hackathonTopics.CYBERSEC,
        startDate: daysFromNow(14, 9),
        durationHours: 24,
        maxTeamSize: 3,
        maxParticipants: 60,
        imageUrl: null,
      },
      {
        title: "Open HealthData Sprint",
        description:
          "Use public health datasets to build analytics dashboards, predictive models, or visualisations that help clinicians and policy makers make data-driven decisions.",
        topic: hackathonTopics.HEALTH,
        startDate: daysFromNow(21, 11),
        durationHours: 36,
        maxTeamSize: 4,
        maxParticipants: 100,
        imageUrl: null,
      },
      {
        title: "NextGen Web3 Hackathon",
        description:
          "Build the next wave of Web3 dApps — identity, social, gaming, or infrastructure. Cross-chain interoperability and user experience are this edition's core themes.",
        topic: hackathonTopics.BLOCKCHAIN,
        startDate: daysFromNow(35, 8),
        durationHours: 72,
        maxTeamSize: 5,
        maxParticipants: 200,
        imageUrl: null,
      },
      {
        title: "Cloud Native Sprint",
        description:
          "Design resilient, scalable cloud-native services using Kubernetes, serverless functions, and managed databases. Observability, zero-downtime deploys, and infrastructure-as-code are judging criteria.",
        topic: hackathonTopics.WEB,
        startDate: daysFromNow(50, 10),
        durationHours: 48,
        maxTeamSize: 4,
        maxParticipants: 160,
        imageUrl: null,
      },
      {
        title: "Robotics & Embedded Challenge",
        description:
          "Program autonomous robots, drones, or custom PCB boards to solve real-world physical tasks. Teams will be judged on hardware design, firmware quality, and live demo performance.",
        topic: hackathonTopics.IOT,
        startDate: daysFromNow(70, 9),
        durationHours: 60,
        maxTeamSize: 4,
        maxParticipants: 80,
        imageUrl: null,
      },
    ];

    const hackathonIds: string[] = [];
    for (const h of hackathonData) {
      const hId = randomUUID();
      await queryRunner.query(
        `INSERT INTO "hackathons"
           ("id","createdById","title","description","topic","startDate","durationHours","maxTeamSize","maxParticipants","imageUrl","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5::hackathon_topic_enum,$6,$7,$8,$9,$10,now(),now())`,
        [
          hId,
          adminId,
          h.title,
          h.description,
          h.topic,
          h.startDate.toISOString(),
          h.durationHours,
          h.maxTeamSize,
          h.maxParticipants,
          h.imageUrl,
        ],
      );
      hackathonIds.push(hId);
    }

    // ── Team name generation ───────────────────────────────────────────────
    const teamAdj = [
      "Agile",
      "Atomic",
      "Binary",
      "Bold",
      "Bright",
      "Chaotic",
      "Clever",
      "Cosmic",
      "Crafty",
      "Critical",
      "Cyber",
      "Dark",
      "Data",
      "Digital",
      "Dynamic",
      "Edge",
      "Elite",
      "Epic",
      "Fast",
      "Fuzzy",
      "Ghost",
      "Grand",
      "Green",
      "Hyper",
      "Indie",
      "Infinite",
      "Iron",
      "Kernel",
      "Laser",
      "Lean",
      "Logic",
      "Mega",
      "Micro",
      "Nano",
      "Neural",
      "Nimble",
      "Nova",
      "Open",
      "Optimal",
      "Pixel",
      "Prime",
      "Quantum",
      "Rapid",
      "Raw",
      "Root",
      "Rust",
      "Sharp",
      "Silent",
      "Sleek",
      "Smart",
      "Solid",
      "Sonic",
      "Stack",
      "Stealth",
      "Swift",
      "Tactical",
      "Turbo",
      "Ultra",
      "Vector",
      "Void",
      "Wild",
      "Zero",
    ];
    const teamNoun = [
      "Agents",
      "Aces",
      "Architects",
      "Array",
      "Bots",
      "Builders",
      "Bytes",
      "Clan",
      "Coders",
      "Collective",
      "Crafters",
      "Crew",
      "Crusaders",
      "Devs",
      "Drifters",
      "Dynamos",
      "Engineers",
      "Experts",
      "Force",
      "Forge",
      "Geeks",
      "Giants",
      "Grid",
      "Guardians",
      "Guild",
      "Hackers",
      "Heroes",
      "Hunters",
      "Labs",
      "League",
      "Legion",
      "Makers",
      "Minds",
      "Mavericks",
      "Ninjas",
      "Nodes",
      "Operators",
      "Pack",
      "Pioneers",
      "Pirates",
      "Protocol",
      "Rangers",
      "Rebels",
      "Runners",
      "Sages",
      "Shifters",
      "Signal",
      "Slayers",
      "Squad",
      "Stars",
      "Strike",
      "Surge",
      "Titans",
      "Troopers",
      "Unit",
      "Vanguard",
      "Warriors",
      "Wolves",
    ];
    const usedTeamNames = new Set<string>();
    const genTeamName = (): string => {
      let name: string;
      let attempts = 0;
      do {
        name = `${pick(teamAdj)} ${pick(teamNoun)}`;
        attempts++;
      } while (usedTeamNames.has(name) && attempts < 500);
      usedTeamNames.add(name);
      return name;
    };

    const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

    let participantCursor = 0;
    void participantCursor; // kept for compatibility; not used in new logic
    const hackathonTeamMemberMap = new Map<string, Set<string>>();
    for (const hId of hackathonIds) {
      hackathonTeamMemberMap.set(hId, new Set<string>());
    }

    let totalTeams = 0;
    const now = new Date();

    const insertTeam = async (hackathonId: string, leaderId: string, memberIds: string[]) => {
      const teamId = randomUUID();
      const teamName = genTeamName();

      await queryRunner.query(
        `INSERT INTO "teams" ("id","name","hackathonId","leaderId","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,now(),now())`,
        [teamId, teamName, hackathonId, leaderId],
      );

      for (const pid of memberIds) {
        await queryRunner.query(
          `INSERT INTO "team_members" ("teamId","participantId") VALUES ($1,$2)`,
          [teamId, pid],
        );
        await queryRunner.query(
          `INSERT INTO "hackathon_registrations" ("hackathonId","participantId")
           VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [hackathonId, pid],
        );
      }

      for (const pid of memberIds) hackathonTeamMemberMap.get(hackathonId)!.add(pid);
      totalTeams++;
    };

    for (let hIdx = 0; hIdx < hackathonIds.length; hIdx++) {
      const hackathonId = hackathonIds[hIdx];
      const { maxTeamSize, maxParticipants, startDate } = hackathonData[hIdx];
      const hackathonStarted = startDate <= now;

      const capacity = maxParticipants ?? 100;
      const targetTotal = Math.round(capacity * (0.7 + Math.random() * 0.1));

      const available = participantIds.filter(
        (p) => !hackathonTeamMemberMap.get(hackathonId)!.has(p),
      );
      for (let i = available.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [available[i], available[j]] = [available[j], available[i]];
      }
      let cursor = 0;

      if (hackathonStarted) {
        const pool: string[] = [];
        while (pool.length < targetTotal && cursor < available.length) {
          pool.push(available[cursor++]);
        }

        let i = 0;
        while (i < pool.length) {
          const slice = pool.slice(i, i + maxTeamSize);
          await insertTeam(hackathonId, slice[0], slice);
          i += slice.length;
        }
      } else {
        const inTeamTarget = Math.round(targetTotal * 0.5);
        const soloTarget = targetTotal - inTeamTarget;

        let inTeamCount = 0;
        while (inTeamCount < inTeamTarget && cursor < available.length) {
          const isFull = Math.random() < 0.3;
          const size = isFull ? maxTeamSize : randInt(1, maxTeamSize - 1);
          const slice: string[] = [];
          while (
            slice.length < size &&
            cursor < available.length &&
            inTeamCount + slice.length < inTeamTarget
          ) {
            slice.push(available[cursor++]);
          }
          if (slice.length === 0) break;
          await insertTeam(hackathonId, slice[0], slice);
          inTeamCount += slice.length;
        }

        const teamMembers = hackathonTeamMemberMap.get(hackathonId)!;
        const soloPool = participantIds.filter(
          (p) => !teamMembers.has(p) && !available.slice(0, cursor).includes(p),
        );
        const soloSample = sample(soloPool, Math.min(soloTarget, soloPool.length));
        for (const pid of soloSample) {
          await queryRunner.query(
            `INSERT INTO "hackathon_registrations" ("hackathonId","participantId")
             VALUES ($1,$2) ON CONFLICT DO NOTHING`,
            [hackathonId, pid],
          );
        }
      }
    }

    console.log(
      `[SeedData] Done — 1 admin, 250 participants, ${hackathonIds.length} hackathons, ${totalTeams} teams.`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (process.env.SEED_DATA !== "true") {
      return;
    }

    await queryRunner.query(`DELETE FROM "users" WHERE "email" LIKE '%@seed.dev'`);

    console.log("[SeedData] Seed data removed.");
  }
}
