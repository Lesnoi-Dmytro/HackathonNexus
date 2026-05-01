ALL_TOPICS: list[str] = [
    "AI / Machine Learning",
    "AR / VR",
    "Blockchain / Web3",
    "Cybersecurity",
    "FinTech",
    "Game Development",
    "HealthTech",
    "IoT & Embedded",
    "Mobile Development",
    "Web Development",
]

# Pure assumption. Should NOT be used for model training
HACKATHON_TOPICS: dict[str, dict[str, list[str]]] = {
    "AI / Machine Learning": {
        "required": ["Python", "TensorFlow", "PyTorch", "scikit-learn", "NLP", "Computer Vision"],
        "bonus":    ["Pandas", "NumPy", "Docker", "AWS"],
    },
    "Web Development": {
        "required": ["JavaScript", "TypeScript", "React", "Node.js", "PostgreSQL"],
        "bonus":    ["Docker", "AWS", "Redis", "MongoDB", "Vue.js", "Figma", "UI/UX Design"],
    },
    "Mobile Development": {
        "required": ["Flutter", "React Native", "Swift", "Kotlin"],
        "bonus":    ["JavaScript", "MongoDB", "UI/UX Design", "Figma"],
    },
    "Cybersecurity": {
        "required": ["Penetration Testing", "Python", "Linux", "C++"],
        "bonus":    ["Go", "Docker", "AWS"],
    },
    "Blockchain / Web3": {
        "required": ["Solidity", "Web3.js", "JavaScript", "Python"],
        "bonus":    ["React", "Node.js", "PostgreSQL", "Go"],
    },
    "IoT & Embedded": {
        "required": ["Arduino", "Embedded C", "C++", "Python"],
        "bonus":    ["Linux", "Docker", "AWS"],
    },
    "Game Development": {
        "required": ["Unity", "C++", "Python"],
        "bonus":    ["JavaScript", "Figma", "UI/UX Design"],
    },
    "FinTech": {
        "required": ["Python", "JavaScript", "PostgreSQL", "Docker", "FastAPI"],
        "bonus":    ["AWS", "React", "Redis", "Kubernetes", "Figma", "UI/UX Design"],
    },
    "HealthTech": {
        "required": ["Python", "TensorFlow", "scikit-learn", "PostgreSQL", "React"],
        "bonus":    ["Computer Vision", "NLP", "Docker", "FastAPI", "Figma", "UI/UX Design"],
    },
    "AR / VR": {
        "required": ["Unity", "JavaScript", "Python", "Computer Vision"],
        "bonus":    ["React", "C++", "TensorFlow", "Figma", "UI/UX Design"],
    },
}

TOPIC_POSITION_WEIGHTS: dict[str, list[int]] = {
    "AI / Machine Learning": [2, 1, 2, 6, 5, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1],
    "AR / VR":               [1, 3, 2, 2, 1, 4, 1, 1, 1, 6, 1, 6, 7, 2, 1],
    "Blockchain / Web3":     [3, 2, 3, 1, 1, 1, 2, 2, 7, 1, 1, 1, 1, 2, 1],
    "Cybersecurity":         [2, 1, 1, 1, 1, 1, 3, 7, 1, 1, 1, 1, 1, 1, 2],
    "FinTech":               [5, 2, 4, 2, 3, 1, 3, 1, 1, 1, 1, 3, 1, 3, 2],
    "Game Development":      [2, 2, 2, 1, 1, 1, 1, 1, 1, 7, 1, 4, 4, 2, 2],
    "HealthTech":            [3, 2, 3, 6, 5, 1, 2, 1, 1, 1, 1, 3, 2, 3, 1],
    "IoT & Embedded":        [2, 1, 1, 2, 1, 1, 3, 2, 1, 1, 7, 1, 1, 1, 1],
    "Mobile Development":    [2, 2, 3, 1, 1, 7, 2, 1, 1, 1, 1, 5, 2, 3, 2],
    "Web Development":       [4, 5, 6, 1, 1, 1, 3, 1, 1, 1, 1, 4, 1, 3, 2],
}

TOPIC_TO_IDX: dict[str, int] = {t: i for i, t in enumerate(ALL_TOPICS)}

N_TOPICS = len(ALL_TOPICS)
