<p align="center">
  <img alt="Simplex Resolver" src="https://shieldcn.dev/header/glow.svg?title=Simplex+Resolver&subtitle=A+simple+and+interactive+way+to+understand+how+the+Simplex+method+works+in+Operational+Research.&logo=lu%3ACalculator&mode=dark&theme=emerald&align=left" />
</p>

<p align="center">
  <img alt="built in" src="https://shieldcn.dev/flag/br.svg" />
  <a href="https://github.com/Edgarcsr/simplex-resolver"><img alt="repo views" src="https://shieldcn.dev/views/repo/Edgarcsr/simplex-resolver.svg?variant=outline" /></a>
  <a href="https://edgarcsr.github.io/simplex-resolver/"><img alt="badge" src="https://shieldcn.dev/badge/Deployed%20on%20GitHub%20Pages.svg?logo=github" /></a>
</p>

## Overview

An interactive website aimed towards operational research students to have a better understanding of how the simplex method works. Currently this version is focused in Brazilian Portuguese language. [Access deployed site](https://edgarcsr.github.io/simplex-resolver/)

<p align="center">
  <img alt="chart" src="https://shieldcn.dev/chart/github/issues/edgarcsr/simplex-resolver.svg?theme=emerald&logo=false" />
</p>

## Example Problem

A factory produces chairs (A) and tables (B). Each chair spends 2 hours of carpentry and 1 hour of finishing. Each table spends 1 hour of carpentry and 3 hours of finishing. Available: 120 hours of carpentry, 90 hours of finishing. Profit: R$ 40/chair, R$ 60/table.

## How it Works

1. Screen shows the problem with real context + Simplex table
2. "Start Tutorial" → driver.js spotlight on each part of the table
3. "Step-by-Step Solver" → iterations with previous/next navigation
4. Each step describes what changed and why

## Stack

- [TanStack Start](https://tanstack.com/start) - SSR + file-based routing
- [shadcn/ui](https://ui.shadcn.com/) - Table, Button
- [driver.js](https://driver.js.org/) - interactive spotlight tours
- [Tailwind CSS](https://tailwindcss.com/) - styles

## Run

```bash
bun install
bun --bun run dev
```

## Structure

```
src/
├── routes/
│   ├── __root.tsx           # layout
│   └── index.tsx            # home page
├── components/
│   ├── ui/                  # shadcn (table, button, card)
│   ├── simplex-table.tsx    # Simplex table with highlights
│   └── tour.tsx             # driver.js config
└── lib/
    └── simplex.ts           # method logic
```

## Recent Improvements

- Interactive Simplex table with responsive design
- Step-by-step guided tutorial using driver.js
- Visual feedback on every pivot operation
- shadcn/ui components with Tailwind CSS 4
- File-based routing with TanStack Start
