ALL_POSITIONS: list[str] = [
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
]

POSITION_TO_IDX: dict[str, int] = {p: i for i, p in enumerate(ALL_POSITIONS)}

N_POSITIONS = len(ALL_POSITIONS)

POSITION_WEIGHTS: list[int] = [
    4,  # Backend Developer
    3,  # Frontend Developer
    4,  # Full Stack Developer
    2,  # Machine Learning Engineer
    2,  # Data Scientist
    2,  # Mobile Developer
    2,  # DevOps Engineer
    1,  # Security Engineer
    1,  # Blockchain Developer
    1,  # Game Developer
    1,  # Embedded / IoT Engineer
    3,  # UI/UX Designer
    1,  # AR/VR Developer
    2,  # Product Manager
    1,  # QA Engineer
]
