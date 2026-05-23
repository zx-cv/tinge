# Tinge: AI-Powered Digital Double Dating

## 1. Executive Summary
Modern dating apps rely heavily on a superficial swipe system. Tinge replaces this outdated model by creating an AI-powered digital double for each user. Your digital double can interact with potential matches first, evaluating true compatibility before you even connect with the real person. Built on **Gemini 3.5 Flash**, Tinge learns your personality, communication style, and preferences to represent you honestly and alleviate the pressure of modern dating.

---

## 2. Why Tinge?
Dating should be about connection, not endless swiping. Tinge lowers the barrier to entry, particularly for the estimated 40% of adults who identify as introverted or socially anxious. By letting your AI double break the ice, you can choose your level of exposure and focus on matches that actually make sense.

### Core Interaction Modes
* **Real Chat:** Direct, traditional messaging with another real user.
* **Double Chat:** Your AI double texts on your behalf to break the ice and test the waters.

---

## 3. How It Works (The AI Pipeline)
Tinge does not use generic chatbots. It builds a living representation of who you are:

* **Personality Seeding:** The agent is initialized with your specific traits, interests, and Myers-Briggs (MBTI) profile.
* **The Match Algorithm:** Tinge evaluates compatibility using collaborative filtering combined with double-compatibility weighting.
* **Deep Simulation & Diagnostics:** The platform simulates a conversation between two digital doubles to generate a "Synchronicity Score." It identifies red flags, analyzes emotional tones, and suggests actionable next steps for the real users.
* **Gemini 3.5 Flash:** All conversations, sentiment analysis, and compatibility scoring are driven by Google's Gemini 3.5 Flash model.

---

## 4. Local Development & Setup
The application features a frontend built with React and Vite, supported by an Express server and WebSockets for real-time messaging.

### Prerequisites
You will need Node.js installed and an active Google Gemini API key to run the core AI generation and matching endpoints.

### Installation & Running
1.  **Clone the repository** and navigate to the project directory.
2.  **Set up your environment variables:** Create a `.env` file in the root directory and add your Gemini API key:
    ```env
    GEMINI_API_KEY=your_api_key_here
    ```
3.  **Install dependencies:**
    ```bash
    npm install
    ```
   
4.  **Start the development server:**
    ```bash
    npm run dev
    ```
   

Once the server is running on `http://localhost:3000` (or `http://0.0.0.0:3000`), the in-browser client will automatically connect via WebSockets for real-time chat delivery. Matching, profile registration, and AI simulations are handled via standard HTTP `/api/` endpoints.