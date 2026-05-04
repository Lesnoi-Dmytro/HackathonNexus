export enum UserRole {
  HACKATHON_ADMIN = "hackathon-admin",
  PARTICIPANT = "participant",
}

export enum ChatRoomType {
  TEAM = "team",
  DIRECT = "direct",
}

export enum Skill {
  // Languages
  PYTHON = "Python",
  JAVASCRIPT = "JavaScript",
  TYPESCRIPT = "TypeScript",
  JAVA = "Java",
  CPP = "C++",
  GO = "Go",
  SWIFT = "Swift",
  KOTLIN = "Kotlin",
  RUST = "Rust",
  CSHARP = "C#",
  RUBY = "Ruby",
  PHP = "PHP",
  SCALA = "Scala",
  R = "R",
  // Frontend
  REACT = "React",
  VUE_JS = "Vue.js",
  ANGULAR = "Angular",
  SVELTE = "Svelte",
  NEXT_JS = "Next.js",
  TAILWIND_CSS = "Tailwind CSS",
  // Backend
  NODE_JS = "Node.js",
  DJANGO = "Django",
  FAST_API = "FastAPI",
  SPRING_BOOT = "Spring Boot",
  EXPRESS_JS = "Express.js",
  FLASK = "Flask",
  GRAPHQL = "GraphQL",
  REST_API_DESIGN = "REST API Design",
  GRPC = "gRPC",
  // Databases
  POSTGRESQL = "PostgreSQL",
  MYSQL = "MySQL",
  MONGODB = "MongoDB",
  REDIS = "Redis",
  ELASTICSEARCH = "Elasticsearch",
  CASSANDRA = "Cassandra",
  SQLITE = "SQLite",
  NEO4J = "Neo4j",
  // DevOps / Infra
  DOCKER = "Docker",
  KUBERNETES = "Kubernetes",
  AWS = "AWS",
  GCP = "GCP",
  AZURE = "Azure",
  LINUX = "Linux",
  GIT = "Git",
  TERRAFORM = "Terraform",
  CI_CD = "CI/CD",
  ANSIBLE = "Ansible",
  // ML / Data
  TENSORFLOW = "TensorFlow",
  PYTORCH = "PyTorch",
  SCIKIT_LEARN = "scikit-learn",
  NLP = "NLP",
  LLM_FINE_TUNING = "LLM Fine-tuning",
  COMPUTER_VISION = "Computer Vision",
  PANDAS = "Pandas",
  NUMPY = "NumPy",
  SPARK = "Spark",
  KAFKA = "Kafka",
  DATA_VISUALIZATION = "Data Visualization",
  FEATURE_ENGINEERING = "Feature Engineering",
  // Mobile
  REACT_NATIVE = "React Native",
  FLUTTER = "Flutter",
  SWIFTUI = "SwiftUI",
  JETPACK_COMPOSE = "Jetpack Compose",
  // Blockchain
  SOLIDITY = "Solidity",
  WEB3_JS = "Web3.js",
  HARDHAT = "Hardhat",
  // Embedded / Hardware
  ARDUINO = "Arduino",
  EMBEDDED_C = "Embedded C",
  FPGA = "FPGA",
  RTOS = "RTOS",
  // Game / XR
  UNITY = "Unity",
  UNREAL_ENGINE = "Unreal Engine",
  WEBGL = "WebGL",
  // Design / Product
  FIGMA = "Figma",
  UI_UX_DESIGN = "UI/UX Design",
  PROTOTYPING = "Prototyping",
  USER_RESEARCH = "User Research",
  // Security
  PENETRATION_TESTING = "Penetration Testing",
  CRYPTOGRAPHY = "Cryptography",
  OAUTH_OIDC = "OAuth/OIDC",
  // Cross-cutting / Supplementary
  UNIT_TESTING = "Unit Testing",
  AGILE_SCRUM = "Agile / Scrum",
  SYSTEM_DESIGN = "System Design",
  TECHNICAL_WRITING = "Technical Writing",
  MONITORING_OBSERVABILITY = "Monitoring / Observability",
}

export enum Position {
  BACKEND_DEVELOPER = "Backend Developer",
  FRONTEND_DEVELOPER = "Frontend Developer",
  FULL_STACK_DEVELOPER = "Full Stack Developer",
  MACHINE_LEARNING_ENGINEER = "Machine Learning Engineer",
  DATA_SCIENTIST = "Data Scientist",
  MOBILE_DEVELOPER = "Mobile Developer",
  DEVOPS_ENGINEER = "DevOps Engineer",
  SECURITY_ENGINEER = "Security Engineer",
  BLOCKCHAIN_DEVELOPER = "Blockchain Developer",
  GAME_DEVELOPER = "Game Developer",
  EMBEDDED_IOT_ENGINEER = "Embedded / IoT Engineer",
  UI_UX_DESIGNER = "UI/UX Designer",
  AR_VR_DEVELOPER = "AR/VR Developer",
  PRODUCT_MANAGER = "Product Manager",
  QA_ENGINEER = "QA Engineer",
}

export enum HackathonTopic {
  AI_ML = "AI / Machine Learning",
  AR_VR = "AR / VR",
  BLOCKCHAIN_WEB3 = "Blockchain / Web3",
  CYBERSECURITY = "Cybersecurity",
  FINTECH = "FinTech",
  GAME_DEVELOPMENT = "Game Development",
  HEALTHTECH = "HealthTech",
  IOT_EMBEDDED = "IoT & Embedded",
  MOBILE_DEVELOPMENT = "Mobile Development",
  WEB_DEVELOPMENT = "Web Development",
}

export enum TeamRequestType {
  JOIN_REQUEST = "join_request",
  INVITE = "invite",
}

export enum TeamRequestStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}
