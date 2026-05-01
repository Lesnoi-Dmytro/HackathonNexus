ALL_SKILLS: list[str] = [
    # Languages
    "Python", "JavaScript", "TypeScript", "Java", "C++", "Go",
    "Swift", "Kotlin", "Rust", "C#", "Ruby", "PHP", "Scala", "R",
    # Frontend
    "React", "Vue.js", "Angular", "Svelte", "Next.js", "Tailwind CSS",
    # Backend
    "Node.js", "Django", "FastAPI", "Spring Boot", "Express.js", "Flask",
    "GraphQL", "REST API Design", "gRPC",
    # Databases
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
    "Cassandra", "SQLite", "Neo4j",
    # DevOps / Infra
    "Docker", "Kubernetes", "AWS", "GCP", "Azure", "Linux", "Git",
    "Terraform", "CI/CD", "Ansible",
    # ML / Data
    "TensorFlow", "PyTorch", "scikit-learn", "NLP", "LLM Fine-tuning",
    "Computer Vision", "Pandas", "NumPy", "Spark", "Kafka",
    "Data Visualization", "Feature Engineering",
    # Mobile
    "React Native", "Flutter", "SwiftUI", "Jetpack Compose",
    # Blockchain
    "Solidity", "Web3.js", "Hardhat",
    # Embedded / Hardware
    "Arduino", "Embedded C", "FPGA", "RTOS",
    # Game / XR
    "Unity", "Unreal Engine", "WebGL",
    # Design / Product
    "Figma", "UI/UX Design", "Prototyping", "User Research",
    # Security
    "Penetration Testing", "Cryptography", "OAuth/OIDC",
    # Cross-cutting / Supplementary
    "Unit Testing", "Agile / Scrum", "System Design",
    "Technical Writing", "Monitoring / Observability",
]

SKILL_TO_IDX: dict[str, int] = {s: i for i, s in enumerate(ALL_SKILLS)}
IDX_TO_SKILL: dict[int, str] = {i: s for s, i in SKILL_TO_IDX.items()}

N_SKILLS = len(ALL_SKILLS)

SUPPLEMENTARY_SKILLS: list[str] = [
    "Unit Testing",
    "Agile / Scrum",
    "System Design",
    "Technical Writing",
    "Monitoring / Observability",
]

# Primary skill pools per position (used for position-correlated data generation)
POSITION_SKILLS: dict[str, list[str]] = {
    "Backend Developer": [
        "Python", "Java", "Go", "C#", "Ruby", "PHP", "Scala",
        "Node.js", "Django", "FastAPI", "Spring Boot", "Express.js", "Flask",
        "GraphQL", "REST API Design", "gRPC",
        "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "Cassandra", "SQLite",
        "Docker", "Linux", "Git",
        "Unit Testing", "System Design", "Monitoring / Observability",
    ],
    "Frontend Developer": [
        "JavaScript", "TypeScript",
        "React", "Vue.js", "Angular", "Svelte", "Next.js", "Tailwind CSS",
        "GraphQL", "REST API Design",
        "Figma", "UI/UX Design", "Prototyping",
        "Unit Testing", "Agile / Scrum",
    ],
    "Full Stack Developer": [
        "JavaScript", "TypeScript", "Python",
        "React", "Vue.js", "Next.js",
        "Node.js", "Django", "FastAPI", "Express.js", "Flask",
        "PostgreSQL", "MongoDB", "Redis",
        "Docker", "Git", "REST API Design", "GraphQL",
        "Unit Testing", "System Design", "Agile / Scrum", "Monitoring / Observability",
    ],
    "Machine Learning Engineer": [
        "Python", "R",
        "TensorFlow", "PyTorch", "scikit-learn",
        "NLP", "LLM Fine-tuning", "Computer Vision",
        "Pandas", "NumPy", "Spark", "Kafka",
        "Feature Engineering", "Data Visualization",
        "Docker", "AWS", "GCP", "Git",
        "Technical Writing", "System Design", "Monitoring / Observability",
    ],
    "Data Scientist": [
        "Python", "R",
        "Pandas", "NumPy", "scikit-learn", "TensorFlow", "PyTorch",
        "Data Visualization", "Feature Engineering",
        "Spark", "Kafka",
        "PostgreSQL", "MySQL", "Elasticsearch", "Git",
        "Technical Writing", "Agile / Scrum",
    ],
    "Mobile Developer": [
        "Swift", "Kotlin", "JavaScript", "TypeScript",
        "React Native", "Flutter", "SwiftUI", "Jetpack Compose",
        "REST API Design", "Git", "Figma", "UI/UX Design",
        "Unit Testing", "Agile / Scrum",
    ],
    "DevOps Engineer": [
        "Docker", "Kubernetes", "AWS", "GCP", "Azure",
        "Linux", "Git", "Terraform", "CI/CD", "Ansible",
        "Python", "Go",
        "Monitoring / Observability", "System Design",
    ],
    "Security Engineer": [
        "Penetration Testing", "Cryptography", "OAuth/OIDC",
        "Python", "Go", "C++", "Linux", "Docker", "Git",
        "Technical Writing",
    ],
    "Blockchain Developer": [
        "Solidity", "Web3.js", "Hardhat",
        "JavaScript", "TypeScript", "Python", "Rust",
        "Cryptography", "Git",
        "Unit Testing", "Technical Writing",
    ],
    "Game Developer": [
        "Unity", "Unreal Engine", "WebGL",
        "C++", "C#", "Python", "JavaScript", "Rust", "Git",
        "Unit Testing", "Technical Writing",
    ],
    "Embedded / IoT Engineer": [
        "Arduino", "Embedded C", "FPGA", "RTOS",
        "C++", "Rust", "Python", "Linux",
        "Unit Testing", "Technical Writing",
    ],
    "UI/UX Designer": [
        "Figma", "UI/UX Design", "Prototyping", "User Research",
        "JavaScript", "TypeScript", "React", "Git",
        "Technical Writing", "Agile / Scrum",
    ],
    "AR/VR Developer": [
        "Unity", "Unreal Engine", "WebGL",
        "C++", "C#", "JavaScript", "TypeScript", "Python",
        "Computer Vision", "TensorFlow",
        "React", "Figma", "UI/UX Design", "Git",
        "Unit Testing", "Technical Writing",
    ],
    "Product Manager": [
        "Figma", "UI/UX Design", "Prototyping", "User Research",
        "Data Visualization", "REST API Design",
        "Technical Writing", "Agile / Scrum", "System Design",
    ],
    "QA Engineer": [
        "Python", "JavaScript", "TypeScript",
        "Unit Testing", "REST API Design",
        "Docker", "Git",
        "Technical Writing", "Agile / Scrum",
    ],
}
