import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRoleAndParticipant1777766500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM ('hackathon-admin', 'participant')
    `);

    await queryRunner.query(`
      CREATE TYPE "skill_enum" AS ENUM (
        'Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'Go',
        'Swift', 'Kotlin', 'Rust', 'C#', 'Ruby', 'PHP', 'Scala', 'R',
        'React', 'Vue.js', 'Angular', 'Svelte', 'Next.js', 'Tailwind CSS',
        'Node.js', 'Django', 'FastAPI', 'Spring Boot', 'Express.js', 'Flask',
        'GraphQL', 'REST API Design', 'gRPC',
        'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch',
        'Cassandra', 'SQLite', 'Neo4j',
        'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Linux', 'Git',
        'Terraform', 'CI/CD', 'Ansible',
        'TensorFlow', 'PyTorch', 'scikit-learn', 'NLP', 'LLM Fine-tuning',
        'Computer Vision', 'Pandas', 'NumPy', 'Spark', 'Kafka',
        'Data Visualization', 'Feature Engineering',
        'React Native', 'Flutter', 'SwiftUI', 'Jetpack Compose',
        'Solidity', 'Web3.js', 'Hardhat',
        'Arduino', 'Embedded C', 'FPGA', 'RTOS',
        'Unity', 'Unreal Engine', 'WebGL',
        'Figma', 'UI/UX Design', 'Prototyping', 'User Research',
        'Penetration Testing', 'Cryptography', 'OAuth/OIDC',
        'Unit Testing', 'Agile / Scrum', 'System Design',
        'Technical Writing', 'Monitoring / Observability'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "position_enum" AS ENUM (
        'Backend Developer', 'Frontend Developer', 'Full Stack Developer',
        'Machine Learning Engineer', 'Data Scientist', 'Mobile Developer',
        'DevOps Engineer', 'Security Engineer', 'Blockchain Developer',
        'Game Developer', 'Embedded / IoT Engineer', 'UI/UX Designer',
        'AR/VR Developer', 'Product Manager', 'QA Engineer'
      )
    `);

    // Modify users table: drop isAdmin, add role
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isAdmin"`);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "role" "user_role_enum" NOT NULL DEFAULT 'participant'
    `);

    // Create participants table
    await queryRunner.query(`
      CREATE TABLE "participants" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid UNIQUE,
        "experience" text,
        "skills" "skill_enum"[] NOT NULL DEFAULT '{}',
        "position" "position_enum",
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_participants" PRIMARY KEY ("id"),
        CONSTRAINT "FK_participants_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "participants"`);

    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "isAdmin" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`DROP TYPE "position_enum"`);
    await queryRunner.query(`DROP TYPE "skill_enum"`);
    await queryRunner.query(`DROP TYPE "user_role_enum"`);
  }
}
