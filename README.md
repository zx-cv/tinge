# Tinge: Technical Design & Architecture Document

## 1. Executive Summary
Tinge is a next-generation dating platform powered by AI-generated digital doubles. These personalized avatars are built from a user's facial scan, voice, Myers-Briggs personality profile, and communication history. Tinge redefines how people connect by letting them choose their own level of exposure: real, digital, or a blend of both. This architecture document outlines the technical foundation for Tinge, integrating Google's **Gemini 3.5 Flash** as the core LLM driving the agents' personality and conversational logic.

---

## 2. Core Interaction Modes
Tinge operates on a multi-modal interaction framework that lowers the barrier to entry for users, particularly the estimated 40% of adults who identify as introverted or socially anxious.

* **Real Chat**: The real user texts directly. This mode facilitates standard messaging with another real person or their double.
* **Double Chat**: The user's double texts on their behalf. This allows shy users to let their double break the ice. 
* **Real Meet**: The real user participates in a video or in-person meeting. This represents a traditional date, vetted by prior double interaction.
* **Double Meet**: The user's double attends a video meeting. This serves as a low-pressure way to evaluate compatibility before meeting in person.

---

## 3. The Digital Double AI Pipeline
The Digital Double is a living, AI-powered representation of the user visually, vocally, and personality-wise. It is not a chatbot; it is trained on who the user actually is, and it represents them honestly in pre-authorized interaction modes. 

### 3.1 Visual and Audio Synthesis
* **Avatar Engine**: Builds a photorealistic animated double. The system uses neural rendering and GAN fine-tuning based on the user's facial scan.
* **Voice Engine**: Replicates user speech patterns. It utilizes diffusion-based Text-to-Speech (TTS) trained on a provided voice sample.

### 3.2 Personality & Agent Engine (Powered by Gemini 3.5 Flash)
The core conversational brain of the Digital Double is driven by Gemini 3.5 Flash. 
* **Initialization**: The personality model is seeded with the user's Myers-Briggs Type Indicator (MBTI) and an in-app personality quiz. 
* **Fine-Tuning**: The model is fine-tuned on the user's opt-in chat history to capture their specific communication style.
* **Execution**: During agent-to-agent or agent-to-user interactions, Gemini 3.5 Flash generates real-time dialogue matching the user's tone, pacing, and vocabulary. 
* **Reinforcement Learning**: User reviews and preferences provide ongoing reinforcement learning to continuously improve the double's accuracy.

---

## 4. Platform Architecture

### 4.1 Client-Side Infrastructure
* **Application Environment**: The frontend is built as a mobile-first application for iOS and Android, alongside a progressive web app for desktop users.
* **Processing Distribution**: On-device processing is utilized for facial scan initiation to maximize efficiency and privacy.
* **Real-time Interface**: The application features a "Live Nexus Feed" to simulate autonomous agents negotiating compatibility in real-time, displaying metrics like synchronicity scores and sentiment analysis. 

### 4.2 Server-Side Infrastructure & ML Ops
* **Rendering**: Cloud rendering is employed for real-time double interactions to handle heavy graphical loads.
* **Match Algorithm**: Pairs real users and/or their doubles. It relies on collaborative filtering combined with double-compatibility weighting.
* **Feedback Engine**: After every interaction, the double delivers private feedback to the user. This includes compatibility signals, red flags, emotional tone analysis, and suggestions for the next step. This module leverages Gemini 3.5 Flash for multimodal sentiment and compatibility scoring.

---

## 5. Trust, Safety, and Consent Framework
Because Tinge relies on advanced generative AI to represent real human beings, stringent safety guardrails are architected into the system's foundation.

* **Explicit Authorization**: Users explicitly authorize every double interaction. There is no autonomous double contact without user approval. Both users must opt into double-to-double or double-to-real interactions.
* **Content Traceability**: All double-generated content is watermarked and traceable to prevent misuse.
* **Identity Protection**: Identity verification is required before double creation to prevent impersonation. End-to-end encryption is enforced on all chats.
* **User Control**: Double interactions are fully user-owned and deletable. The report and block system applies symmetrically to both real users and their AI doubles.

## Development: Real-time messaging

The development server includes a WebSocket server for real-time chat delivery. When running locally, the browser client opens a WebSocket connection to the same origin and exchanges messages in real time. To run locally:

```
npm install
npm run dev
```

The in-browser client identifies itself with a username after connecting. Messages are forwarded through the server to any connected peer with that username. Matching still uses the `/api/match` HTTP endpoint; only chat message delivery is real-time.