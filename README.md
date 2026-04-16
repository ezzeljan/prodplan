<div align="center">

# 🏭 Prodly: AI Production Planning Agent

**An intelligent production planning assistant powered by MiniMax M2.5 via OpenRouter**

</div>

---

## Overview

**Prodly** is an AI-powered production planning agent developed by Lifewood OJT Group 3. It assists production teams in generating, analyzing, and optimizing production plans through a conversational AI interface — streamlining workflows and reducing manual planning overhead.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, Tailwind CSS |
| Backend | Spring Boot |
| Database | MySQL |
| Deployment | Vercel |
| AI/LLM | MiniMax M2.5 via OpenRouter |

---

## Getting Started

### Prerequisites

- Node.js
- Java (for Spring Boot backend)
- MySQL
- An [OpenRouter](https://openrouter.ai/) API key

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd <your-repo-folder>
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Install UI components (shadcn + React Bits DarkVeil):**
   ```bash
   npx shadcn@latest add @react-bits/DarkVeil-TS-CSS
   ```

   > If you encounter dependency issues after this step, run:
   > ```bash
   > npm audit fix
   > ```
   > This should resolve any vulnerabilities and return **0 issues found**.

4. **Set up environment variables:**

   Create a `.env.local` file in the root directory and add:
   ```env
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   ```

5. **Configure the backend:**

   Update `application.properties` with your MySQL credentials:
   ```properties
   spring.datasource.url=jdbc:mysql://localhost:3306/prodly_db
   spring.datasource.username=your_mysql_username
   spring.datasource.password=your_mysql_password
   ```

6. **Run the frontend:**
   ```bash
   npm run dev
   ```

7. **Run the backend:**
   ```bash
   ./mvnw spring-boot:run
   ```

---

## Deployment

This project is deployed via **Vercel** for the frontend. To deploy your own instance:

1. Push your repository to GitHub.
2. Import the project in [Vercel](https://vercel.com/).
3. Add your environment variables in the Vercel dashboard.
4. Deploy.

---

## Team

Developed by the **Lifewood OJT Group 3** as part of an on-the-job training project.

---
