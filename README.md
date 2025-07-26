# SpeedConnect

A fast-paced, real-time word connections game where players race against time to identify groups of related words. Inspired by the popular NYT Connections puzzle, SpeedConnect adds competitive multiplayer elements and AI-generated content for when one puzzle a day is not enough.

## Game Overview

Players are presented with a grid of 16 words and must identify four groups of four related words. Each group has a specific theme or connection that links the words together. The challenge lies in finding these connections while racing against a 5-minute timer and competing with other players.

### Key Features

- **AI-Generated Content**: Powered by LLMs to create unique, varied word puzzles for each round
- **Competitive Scoring**: Players earn points for correctly identifying word groups
- **Multi-Round Games**: Continue playing through multiple rounds with fresh puzzles

## 🏗️ Architecture

### Frontend (React + TypeScript)
- Modern React application with TypeScript
- Responsive design using Tailwind CSS
- Real-time game state management
- Interactive word selection interface
- Live timer and scoring displays

### Backend (FastAPI + Python)
- RESTful API built with FastAPI
- OpenAI integration for dynamic word generation
- Supabase database for game state and player data
- Real-time leaderboard updates
- Deterministic word generation per game round
---

*Built with React, FastAPI, OpenAI GPT, and Supabase*
