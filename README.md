# CSC805 — Lakers vs Warriors Basketball Analysis

A five-season (2020–2025) interactive dashboard comparing the Los Angeles Lakers and Golden State Warriors using real data from Basketball-Reference.

## Features

- **Season Selector** — Team per-game stats (PTS, REB, AST, FG%) for each season
- **Player Comparison** — Radar chart + stat bars for any two players side by side
- **Team Comparison** — Season-by-season bar chart comparison
- **Team Analytics** — Multi-season trend lines for scoring, FG%, and 3-point attempts

## Project Structure

```
CSC805-Basketball-Analysis/
├── home.html        # Main page (HTML structure)
├── style.css        # Styles
├── main.js          # All JavaScript logic
└── datasets/
    ├── lakers/      # lakers2020-2021.csv … lakers2024-2025.csv
    ├── warriors/    # warriors2020-2021.csv … warriors2024-2025.csv
    └── nba_lal_gsw_2020-2025_cleaned.csv
```

## How to Run

This project loads CSV files via HTTP and requires a local web server.

```bash
# In the project folder:
python -m http.server 8000
```

Then open your browser and go to:

```
http://localhost:8000/home.html
```

## Data Source

All statistics are sourced from [Basketball-Reference](https://www.basketball-reference.com/), covering NBA seasons 2020–21 through 2024–25.

## Tech Stack

- HTML / CSS / JavaScript (vanilla)
- [Chart.js 4.4](https://www.chartjs.org/) — charts and visualizations
- [IBM Plex fonts](https://fonts.google.com/specimen/IBM+Plex+Sans) via Google Fonts
