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
      "Alice", "Bob", "Carol", "David", "Eve", "Frank", "Grace", "Hank",
      "Iris", "Jack", "Karen", "Liam", "Mia", "Noah", "Olivia", "Paul",
      "Quinn", "Rose", "Sam", "Tina", "Ulrich", "Vera", "Will", "Xena",
      "Yara", "Zack", "Ana", "Ben", "Chloe", "Dan", "Elena", "Finn",
      "Gina", "Hugo", "Ivy", "Jake", "Kim", "Leo", "Maya", "Ned",
      "Opal", "Pete", "Rita", "Steve", "Tara", "Uma", "Vic", "Wendy",
      "Xander", "Yuki",
    ];

    const lastNames = [
      "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
      "Davis", "Wilson", "Moore", "Taylor", "Anderson", "Thomas", "Jackson",
      "White", "Harris", "Martin", "Thompson", "Young", "Lewis",
      "Walker", "Hall", "Allen", "King", "Wright", "Scott", "Green",
      "Baker", "Adams", "Nelson", "Carter", "Mitchell", "Roberts", "Turner",
      "Phillips", "Campbell", "Parker", "Evans", "Edwards", "Collins",
      "Stewart", "Morris", "Rogers", "Reed", "Cook", "Morgan", "Bell",
      "Murphy", "Bailey", "Rivera",
    ];

    const positions = [
      "Backend Developer", "Frontend Developer", "Full Stack Developer",
      "Machine Learning Engineer", "Data Scientist", "Mobile Developer",
      "DevOps Engineer", "Security Engineer", "Blockchain Developer",
      "Game Developer", "Embedded / IoT Engineer", "UI/UX Designer",
      "AR/VR Developer", "Product Manager", "QA Engineer",
    ];

    const allSkills = [
      "Python", "JavaScript", "TypeScript", "Java", "C++", "Go",
      "Swift", "Kotlin", "Rust", "C#", "Ruby", "PHP", "Scala", "R",
      "React", "Vue.js", "Angular", "Svelte", "Next.js", "Tailwind CSS",
      "Node.js", "Django", "FastAPI", "Spring Boot", "Express.js", "Flask",
      "GraphQL", "REST API Design", "gRPC",
      "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
      "Docker", "Kubernetes", "AWS", "GCP", "Azure", "Linux", "Git",
      "TensorFlow", "PyTorch", "scikit-learn", "NLP",
      "React Native", "Flutter",
      "Solidity", "Web3.js",
      "Unity", "Unreal Engine",
      "Figma", "UI/UX Design",
      "Penetration Testing", "Cryptography",
      "Unit Testing", "Agile / Scrum", "System Design",
    ];

    const participantIds: string[] = [];

    for (let i = 0; i < 50; i++) {
      const userId = randomUUID();
      const participantId = randomUUID();
      const firstName = firstNames[i % firstNames.length];
      const lastName = lastNames[i % lastNames.length];
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@seed.dev`;
      const position = pick(positions);
      const skills = sample(allSkills, 5 + (i % 4));
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
      AI_ML:       "AI / Machine Learning",
      AR_VR:       "AR / VR",
      BLOCKCHAIN:  "Blockchain / Web3",
      CYBERSEC:    "Cybersecurity",
      FINTECH:     "FinTech",
      GAME:        "Game Development",
      HEALTH:      "HealthTech",
      IOT:         "IoT & Embedded",
      MOBILE:      "Mobile Development",
      WEB:         "Web Development",
    } as const;

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
      {
        title: "AI Innovation Sprint",
        description: "Build intelligent applications using the latest AI/ML frameworks. From NLP chatbots to computer vision solutions, this hackathon challenges participants to push the boundaries of artificial intelligence.",
        topic: hackathonTopics.AI_ML,
        startDate: new Date("2025-03-15T09:00:00Z"),
        durationHours: 48,
        maxTeamSize: 4,
        maxParticipants: 120,
        imageUrl: null,
      },
      {
        title: "MetaWorld Hackathon",
        description: "Dive into immersive experiences! Create AR/VR applications that redefine how we interact with digital and physical worlds using WebXR, Unity, or Unreal Engine.",
        topic: hackathonTopics.AR_VR,
        startDate: new Date("2025-04-20T10:00:00Z"),
        durationHours: 36,
        maxTeamSize: 3,
        maxParticipants: 60,
        imageUrl: null,
      },
      {
        title: "DeFi Builders Week",
        description: "Design and deploy decentralised finance protocols, NFT platforms, or DAO governance tools on EVM-compatible chains. Real-world impact on the future of money.",
        topic: hackathonTopics.BLOCKCHAIN,
        startDate: new Date("2025-05-10T08:00:00Z"),
        durationHours: 72,
        maxTeamSize: 5,
        maxParticipants: 200,
        imageUrl: null,
      },
      {
        title: "SecureCode Challenge",
        description: "Identify vulnerabilities, build zero-trust systems and create security tooling for modern cloud-native applications. Bring your ethical hacking skills to the table.",
        topic: hackathonTopics.CYBERSEC,
        startDate: new Date("2025-06-05T09:00:00Z"),
        durationHours: 24,
        maxTeamSize: 3,
        maxParticipants: 90,
        imageUrl: null,
      },
      {
        title: "FinTech Frontier",
        description: "Reinvent banking, payments, and financial inclusion. Build open-banking integrations, personal finance tools, or micro-lending platforms that serve the underbanked.",
        topic: hackathonTopics.FINTECH,
        startDate: new Date("2025-07-18T08:30:00Z"),
        durationHours: 48,
        maxTeamSize: 4,
        maxParticipants: 160,
        imageUrl: null,
      },
      {
        title: "GameJam XL",
        description: "48 hours. One theme revealed at kick-off. Build a complete playable game from scratch using any engine or framework. Judged on creativity, fun factor, and execution.",
        topic: hackathonTopics.GAME,
        startDate: new Date("2025-08-22T18:00:00Z"),
        durationHours: 48,
        maxTeamSize: 5,
        maxParticipants: 250,
        imageUrl: null,
      },
      {
        title: "HealthHack 2025",
        description: "Leverage data science, wearables, and telemedicine APIs to improve patient outcomes, mental health, or healthcare accessibility. Lives may depend on what you build.",
        topic: hackathonTopics.HEALTH,
        startDate: new Date("2025-09-12T09:00:00Z"),
        durationHours: 36,
        maxTeamSize: 4,
        maxParticipants: 100,
        imageUrl: null,
      },
      {
        title: "IoT Connect Hackathon",
        description: "Build smart-home devices, industrial monitoring solutions, or environmental sensors. Raspberry Pi, Arduino, and ESP32 boards are all welcome.",
        topic: hackathonTopics.IOT,
        startDate: new Date("2025-10-03T10:00:00Z"),
        durationHours: 48,
        maxTeamSize: 4,
        maxParticipants: 80,
        imageUrl: null,
      },
      {
        title: "Mobile Velocity",
        description: "Ship a polished mobile app in 36 hours. React Native, Flutter, SwiftUI, or Jetpack Compose — you pick the stack. App Store quality UI is the minimum bar.",
        topic: hackathonTopics.MOBILE,
        startDate: new Date("2025-11-07T09:00:00Z"),
        durationHours: 36,
        maxTeamSize: 3,
        maxParticipants: 120,
        imageUrl: null,
      },
      {
        title: "WebCraft Open",
        description: "Design and build full-stack web applications that solve real-world problems. REST or GraphQL APIs, any frontend framework — get creative with UX and performance.",
        topic: hackathonTopics.WEB,
        startDate: new Date("2025-12-01T09:00:00Z"),
        durationHours: 48,
        maxTeamSize: 5,
        maxParticipants: 200,
        imageUrl: null,
      },
      {
        title: "LLM Engineering Summit",
        description: "Fine-tune, prompt-engineer, or RAG-augment large language models to build production-ready AI assistants, code generators, or knowledge-base search tools.",
        topic: hackathonTopics.AI_ML,
        startDate: new Date("2026-01-24T09:00:00Z"),
        durationHours: 48,
        maxTeamSize: 4,
        maxParticipants: 140,
        imageUrl: null,
      },
      {
        title: "Smart City Challenge",
        description: "Harness IoT, data analytics, and civic APIs to solve urban problems: traffic, pollution, energy efficiency, and public safety.",
        topic: hackathonTopics.IOT,
        startDate: new Date("2026-02-14T08:00:00Z"),
        durationHours: 60,
        maxTeamSize: 5,
        maxParticipants: 150,
        imageUrl: null,
      },
      {
        title: "Crypto Security Arena",
        description: "Audit smart contracts, break CTF challenges, and demonstrate responsible disclosure practices in a live DeFi environment.",
        topic: hackathonTopics.CYBERSEC,
        startDate: new Date("2026-03-08T10:00:00Z"),
        durationHours: 24,
        maxTeamSize: 3,
        maxParticipants: 60,
        imageUrl: null,
      },
      {
        title: "Open HealthData Sprint",
        description: "Use public health datasets to build analytics dashboards, predictive models, or visualisations that help clinicians and policy makers make data-driven decisions.",
        topic: hackathonTopics.HEALTH,
        startDate: new Date("2026-04-11T09:00:00Z"),
        durationHours: 36,
        maxTeamSize: 4,
        maxParticipants: 100,
        imageUrl: null,
      },
      {
        title: "NextGen Web3 Hackathon",
        description: "Build the next wave of Web3 dApps — identity, social, gaming, or infrastructure. Cross-chain interoperability and user experience are this edition's core themes.",
        topic: hackathonTopics.BLOCKCHAIN,
        startDate: new Date("2026-05-30T08:00:00Z"),
        durationHours: 72,
        maxTeamSize: 5,
        maxParticipants: 200,
        imageUrl: null,
      },
      {
        title: "Cloud Native Sprint",
        description: "Design resilient, scalable cloud-native services using Kubernetes, serverless functions, and managed databases. Observability, zero-downtime deploys, and infrastructure-as-code are judging criteria.",
        topic: hackathonTopics.WEB,
        startDate: new Date("2026-07-11T09:00:00Z"),
        durationHours: 48,
        maxTeamSize: 4,
        maxParticipants: 160,
        imageUrl: null,
      },
      {
        title: "Robotics & Embedded Challenge",
        description: "Program autonomous robots, drones, or custom PCB boards to solve real-world physical tasks. Teams will be judged on hardware design, firmware quality, and live demo performance.",
        topic: hackathonTopics.IOT,
        startDate: new Date("2026-08-22T10:00:00Z"),
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

    const teamBlueprints: Array<{ name: string; hackathonIdx: number; extraMembers: number }> = [
      { name: "Neural Ninjas",        hackathonIdx: 0,  extraMembers: 3 },
      { name: "Data Drifters",        hackathonIdx: 0,  extraMembers: 2 },
      { name: "Model Mavericks",      hackathonIdx: 0,  extraMembers: 1 },
      { name: "Gradient Guardians",   hackathonIdx: 0,  extraMembers: 0 },
      { name: "XR Explorers",         hackathonIdx: 1,  extraMembers: 2 },
      { name: "Virtual Vanguard",     hackathonIdx: 1,  extraMembers: 1 },
      { name: "Hologram Heroes",      hackathonIdx: 1,  extraMembers: 0 },
      { name: "Chain Changers",       hackathonIdx: 2,  extraMembers: 4 },
      { name: "Token Titans",         hackathonIdx: 2,  extraMembers: 2 },
      { name: "Block Builders",       hackathonIdx: 2,  extraMembers: 0 },
      { name: "Red Team Alpha",       hackathonIdx: 3,  extraMembers: 2 },
      { name: "Vuln Hunters",         hackathonIdx: 3,  extraMembers: 1 },
      { name: "Zero Day Squad",       hackathonIdx: 3,  extraMembers: 0 },
      { name: "PayPioneers",          hackathonIdx: 4,  extraMembers: 3 },
      { name: "Ledger Lords",         hackathonIdx: 4,  extraMembers: 1 },
      { name: "Pixel Pushers",        hackathonIdx: 5,  extraMembers: 4 },
      { name: "Level Loaders",        hackathonIdx: 5,  extraMembers: 2 },
      { name: "Spawn Point",          hackathonIdx: 5,  extraMembers: 0 },
      { name: "MedMinds",             hackathonIdx: 6,  extraMembers: 3 },
      { name: "Vital Vectors",        hackathonIdx: 6,  extraMembers: 1 },
      { name: "Sensor Squad",         hackathonIdx: 7,  extraMembers: 3 },
      { name: "Edge Engineers",       hackathonIdx: 7,  extraMembers: 2 },
      { name: "Byte Brigade",         hackathonIdx: 7,  extraMembers: 0 },
      { name: "Swift Shifters",       hackathonIdx: 8,  extraMembers: 2 },
      { name: "Flutter Flyers",       hackathonIdx: 8,  extraMembers: 1 },
      { name: "DOM Destroyers",       hackathonIdx: 9,  extraMembers: 4 },
      { name: "API Architects",       hackathonIdx: 9,  extraMembers: 2 },
      { name: "CSS Sorcerers",        hackathonIdx: 9,  extraMembers: 0 },
      { name: "Prompt Engineers",     hackathonIdx: 10, extraMembers: 3 },
      { name: "Inference Ninjas",     hackathonIdx: 10, extraMembers: 1 },
      { name: "K8s Kommanders",        hackathonIdx: 15, extraMembers: 3 },
      { name: "Serverless Sages",      hackathonIdx: 15, extraMembers: 1 },
      { name: "Infra Artists",         hackathonIdx: 15, extraMembers: 0 },
      { name: "Circuit Breakers",      hackathonIdx: 16, extraMembers: 3 },
      { name: "Firmware Fanatics",     hackathonIdx: 16, extraMembers: 2 },
      { name: "Drone Dynamix",         hackathonIdx: 16, extraMembers: 0 },
    ];

    let participantCursor = 0;
    const usedLeaders = new Set<string>();

    for (const blueprint of teamBlueprints) {
      const hackathonId = hackathonIds[blueprint.hackathonIdx];
      const teamId = randomUUID();

      let leaderId: string;
      do {
        leaderId = participantIds[participantCursor % participantIds.length];
        participantCursor++;
      } while (usedLeaders.has(leaderId) && usedLeaders.size < participantIds.length);
      usedLeaders.add(leaderId);

      await queryRunner.query(
        `INSERT INTO "teams" ("id","name","hackathonId","leaderId","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,now(),now())`,
        [teamId, blueprint.name, hackathonId, leaderId],
      );

      await queryRunner.query(
        `INSERT INTO "team_members" ("teamId","participantId") VALUES ($1,$2)`,
        [teamId, leaderId],
      );

      const membersAdded = new Set<string>([leaderId]);
      for (let m = 0; m < blueprint.extraMembers; m++) {
        let memberId: string;
        let attempts = 0;
        do {
          memberId = participantIds[participantCursor % participantIds.length];
          participantCursor++;
          attempts++;
        } while (membersAdded.has(memberId) && attempts < participantIds.length);

        if (!membersAdded.has(memberId)) {
          membersAdded.add(memberId);
          await queryRunner.query(
            `INSERT INTO "team_members" ("teamId","participantId") VALUES ($1,$2)`,
            [teamId, memberId],
          );
        }
      }
    }

    console.log(
      `[SeedData] Done — 1 admin, 50 participants, ${hackathonIds.length} hackathons, ${teamBlueprints.length} teams.`,
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
