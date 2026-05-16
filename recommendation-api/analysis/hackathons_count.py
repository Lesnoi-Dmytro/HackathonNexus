import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv("./data/hackathons.csv")

df["year"] = df["period"].str.extract(r"(\d{4})").astype(float)

hackathons_per_year = df.groupby("year").size().sort_index()
hackathons_per_year = hackathons_per_year[hackathons_per_year.index < 2023]

fig, ax = plt.subplots(figsize=(10, 5))
ax.bar(hackathons_per_year.index.astype(int), hackathons_per_year.values)
ax.set_xlabel("Year")
ax.set_ylabel("Number of Hackathons")
ax.set_title("Number of Hackathons per Year")
ax.set_xticks(hackathons_per_year.index.astype(int))
plt.tight_layout()
plt.show()
