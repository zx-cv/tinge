import express from 'express';
import path from 'path';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer } from 'ws';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());
const PORT: number = 3000;

// Global in-memory user registry for multiplayer prototype
const globalRegisteredUsers: any[] = [];

// WebSocket clients map: name -> ws
const wsClients: Map<string, any> = new Map();

// Initialize the Gemini client matching aistudio-build parameters
let ai: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  } else {
    console.warn("GEMINI_API_KEY is not defined. AI endpoints will fail.");
  }
} catch (e) {
  console.error("Failed to initialize GoogleGenAI", e);
}

app.post('/api/register', (req, res) => {
  const { profile } = req.body;
  if (!profile || !profile.name) return res.status(400).json({ error: 'invalid profile' });

  const realProfile = { ...profile, isReal: true };
  
  // Add if not exists (simple name check for prototype)
  if (!globalRegisteredUsers.find(u => u.name === realProfile.name)) {
    globalRegisteredUsers.push(realProfile);
  } else {
    // Update existing profile
    const idx = globalRegisteredUsers.findIndex(u => u.name === realProfile.name);
    globalRegisteredUsers[idx] = realProfile;
  }
  
  // Return all *other* registered users
  const others = globalRegisteredUsers.filter(u => u.name !== realProfile.name);
  res.json({ candidates: others });
});

app.post('/api/simulate', async (req, res) => {
  if (!ai) {
    return res.status(500).json({ error: 'AI Client not initialized (Missing API Key)' });
  }

  const { agentA, agentB } = req.body;
  if (!agentA || !agentB) {
    return res.status(400).json({ error: 'Both agentA and agentB are required' });
  }

  try {
    const transcript: { speaker: string; message: string; sentiment: string }[] = [];

    const systemPromptA = `You are an AI digital double representing ${agentA.name}.
Traits: ${agentA.traits?.join(', ')}.
Interests: ${agentA.interests?.join(', ')}.
You are speed-dating the AI double of ${agentB.name} (${agentB.traits?.join(', ')}).
Respond in character, briefly (1-2 sentences), like a text message. Also provide a brief hidden emotion/sentiment you are conveying.`;

    const systemPromptB = `You are an AI digital double representing ${agentB.name}.
Traits: ${agentB.traits?.join(', ')}.
Interests: ${agentB.interests?.join(', ')}.
You are speed-dating the AI double of ${agentA.name} (${agentA.traits?.join(', ')}).
Respond in character, briefly (1-2 sentences), like a text message. Also provide a brief hidden emotion/sentiment you are conveying.`;

    // 4 turns of conversation
    for (let i = 0; i < 4; i++) {
        const isAgentA = i % 2 === 0;
        const currentAgent = isAgentA ? agentA : agentB;
        const currentSystemPrompt = isAgentA ? systemPromptA : systemPromptB;
        
        let prompt = `Here is the conversation so far:\n`;
        if (transcript.length === 0) {
            prompt += `(Conversation is empty, you speak first.)\n\nYou speak first. What do you say?`;
        } else {
            transcript.forEach(t => {
                prompt += `${t.speaker}: ${t.message}\n`;
            });
            prompt += `\nGenerate your reply to continue the conversation.`;
        }

        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
            config: {
                systemInstruction: currentSystemPrompt,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        message: { type: Type.STRING },
                        sentiment: { type: Type.STRING }
                    },
                    required: ["message", "sentiment"]
                }
            }
        });
        
        const turnData = JSON.parse(response.text?.trim() || "{}");
        transcript.push({
            speaker: currentAgent.name,
            message: turnData.message || "...",
            sentiment: turnData.sentiment || "Neutral"
        });
    }

    // Now evaluate compatibility based on the generated conversation
    const evalPrompt = `Review this conversation between ${agentA.name} and ${agentB.name}:\n` +
      transcript.map(t => `${t.speaker}: ${t.message}`).join("\n") +
      `\n\nAnalyze their compatibility based on this transcript and their original profiles.
Output a JSON object containing:
- an overall synchronicityScore (0-100)
- a brief conclusion of whether they match and why
- compatibilitySignals: a list of positive indicators observed in the transcript
- redFlags: a list of potential issues or areas of friction
- emotionalToneAnalysis: an assessment of the overall emotional tone of the interaction
- suggestionsForNextStep: actionable advice on what the real user should do next (e.g., 'Proceed to real chat', 'Schedule a video meet', 'Pass').
Make the conclusion sound like a sophisticated dating AI feedback loop.`;

    const evalResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: evalPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    synchronicityScore: {
                        type: Type.INTEGER,
                        description: "The compatibility score between 0 and 100"
                    },
                    conclusion: {
                        type: Type.STRING,
                        description: "A short summary of whether they match and why"
                    },
                    compatibilitySignals: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "Positive indicators of compatibility"
                    },
                    redFlags: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "Potential issues or areas of friction"
                    },
                    emotionalToneAnalysis: {
                        type: Type.STRING,
                        description: "Assessment of the overall emotional tone"
                    },
                    suggestionsForNextStep: {
                        type: Type.STRING,
                        description: "Actionable advice on what the real user should do next"
                    }
                },
                required: ["synchronicityScore", "conclusion", "compatibilitySignals", "redFlags", "emotionalToneAnalysis", "suggestionsForNextStep"]
            }
        }
    });

    const evalData = JSON.parse(evalResponse.text?.trim() || "{}");
    
    res.json({
        conversation: transcript,
        synchronicityScore: evalData.synchronicityScore,
        conclusion: evalData.conclusion,
        compatibilitySignals: evalData.compatibilitySignals || [],
        redFlags: evalData.redFlags || [],
        emotionalToneAnalysis: evalData.emotionalToneAnalysis || "",
        suggestionsForNextStep: evalData.suggestionsForNextStep || ""
    });
  } catch (error: any) {
    console.error("Simulation error", error);
    res.status(500).json({ error: "Failed to simulate interaction", details: error.message });
  }
});

app.post('/api/match', async (req, res) => {
  if (!ai) {
    return res.status(500).json({ error: 'AI Client not initialized (Missing API Key)' });
  }

  const { user, candidates } = req.body;
  if (!user || !candidates || !Array.isArray(candidates)) {
    return res.status(400).json({ error: 'user and an array of candidates are required' });
  }

  try {
    const matchPrompt = `You are the Tinge match algorithm. You use collaborative filtering and double-compatibility weighting.
Here is the target user:
Name: ${user.name}
Traits: ${user.traits?.join(', ')}
Interests: ${user.interests?.join(', ')}

Here are the candidates:
${candidates.map((c: any, index: number) => `Candidate ${index}:
Name: ${c.name}
Traits: ${c.traits?.join(', ')}
Interests: ${c.interests?.join(', ')}`).join('\n\n')}

Analyze compatibility and return a JSON array of objects, one for each candidate.
Each object should have:
- index (the candidate's original index)
- compatibilityScore (0-100)
- reasoning (a brief explanation of why this score was given)
Sort the array from highest compatibilityScore to lowest.`;

    const matchResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: matchPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        index: { type: Type.INTEGER },
                        compatibilityScore: { type: Type.INTEGER },
                        reasoning: { type: Type.STRING }
                    },
                    required: ["index", "compatibilityScore", "reasoning"]
                }
            }
        }
    });

    const matchData = JSON.parse(matchResponse.text?.trim() || "[]");
    
    // Map back to candidate data and sort safely
    const results = matchData.map((m: any) => {
      let candidate = m.index !== undefined ? candidates[m.index] : null;
      if (!candidate && m.name) {
        candidate = candidates.find((c: any) => c.name === m.name);
      }
      return {
        candidate,
        compatibilityScore: m.compatibilityScore || 50,
        reasoning: m.reasoning || "Good potential."
      };
    }).filter((r: any) => r.candidate !== undefined && r.candidate !== null)
      .sort((a: any, b: any) => b.compatibilityScore - a.compatibilityScore);

    if (results.length === 0) {
      throw new Error("Gemini returned zero valid candidate maps.");
    }

    res.json({ matches: results });
  } catch (error: any) {
    console.error("Match error", error);
    res.status(500).json({ error: "Failed to evaluate matches", details: error.message });
  }
});

app.post('/api/generate_reply', async (req, res) => {
  if (!ai) {
    return res.status(500).json({ error: 'AI Client not initialized (Missing API Key)' });
  }

  const { speakerProfile, partnerProfile, chatHistory } = req.body;
  if (!speakerProfile || !partnerProfile || !Array.isArray(chatHistory)) {
    return res.status(400).json({ error: 'speakerProfile, partnerProfile, and chatHistory array are required' });
  }

  try {
    const systemPrompt = `You are an AI digital double representing ${speakerProfile.name}.
Traits: ${speakerProfile.traits?.join(', ')}.
Interests: ${speakerProfile.interests?.join(', ')}.
You are chatting with ${partnerProfile.name} (${partnerProfile.traits?.join(', ')}).
Respond in character, briefly (1-2 sentences), like a text message. Also provide a brief hidden emotion/sentiment you are conveying.`;

    let prompt = `Here is the conversation so far:\n`;
    if (chatHistory.length === 0) {
        prompt += `(Conversation is empty, you speak first.)\n\nYou speak first. What do you say?`;
    } else {
        chatHistory.forEach((t: any) => {
            prompt += `${t.speaker}: ${t.message}\n`;
        });
        prompt += `\nGenerate your reply to continue the conversation.`;
    }

    const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    message: { type: Type.STRING },
                    sentiment: { type: Type.STRING }
                },
                required: ["message", "sentiment"]
            }
        }
    });

    const turnData = JSON.parse(response.text?.trim() || "{}");
    // If the partner is connected via WebSocket, push the generated reply to them
    try {
      const partnerName = partnerProfile.name;
      const ws = wsClients.get(partnerName);
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({
          type: 'message',
          from: turnData.speaker || speakerProfile.name || 'AI',
          payload: {
            speaker: speakerProfile.name,
            message: turnData.message || "...",
            sentiment: turnData.sentiment || "Neutral"
          }
        }));
      }
    } catch (e) {
      // non-fatal
    }

    res.json({
        message: turnData.message || "...",
        sentiment: turnData.sentiment || "Neutral"
    });
  } catch (error: any) {
    console.error("Generate reply error", error);
    res.status(500).json({ error: "Failed to generate reply", details: error.message });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve static files. Note the wildcard 'get' works as expected in express 4
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Create an HTTP server so we can attach a WebSocket server to it
  const httpServer = http.createServer(app);

  // Vite middleware attached to express app is fine; the underlying http server serves it

  // Create WebSocket server
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws) => {
    let clientName: string | null = null;
    ws.on('message', (msg: any) => {
      try {
        const data = JSON.parse(msg.toString());
        if (data.type === 'identify' && data.name) {
          clientName = data.name;
          wsClients.set(clientName, ws);
          console.log('WS: identified', clientName);
        } else if (data.type === 'outgoing_message' && data.target && data.message) {
            const targetWs = wsClients.get(data.target);
            if (targetWs && targetWs.readyState === 1) {
              targetWs.send(JSON.stringify({ type: 'message', from: data.from, payload: data.message }));
          }
        }
      } catch (e) {
        console.error('WS message parse error', e);
      }
    });

    ws.on('close', () => {
      if (clientName) {
        wsClients.delete(clientName);
      }
    });
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
