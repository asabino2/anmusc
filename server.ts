import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Helper to initialize Gemini SDK lazily with key override
const getGeminiClient = (customKey?: string) => {
  const apiKey = (customKey && customKey.trim().length > 0)
    ? customKey.trim()
    : process.env.GEMINI_API_KEY?.trim();

  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("Chave API do Google Gemini não configurada. Por favor, insira sua chave nas Configurações do app.");
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set limits for large audio file payloads (base64)
  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ limit: "100mb", extended: true }));

  // Endpoint to verify API key validity
  app.post("/api/verify-key", async (req, res) => {
    try {
      const { apiKey, model } = req.body;
      const keyToTest = apiKey || (req.headers["x-gemini-api-key"] as string) || process.env.GEMINI_API_KEY;
      const targetModel = model || (req.headers["x-gemini-model"] as string) || "gemini-3.6-flash";

      if (!keyToTest || keyToTest.trim() === "" || keyToTest === "MY_GEMINI_API_KEY") {
        return res.status(400).json({ valid: false, error: "Nenhuma chave API fornecida." });
      }

      const ai = new GoogleGenAI({
        apiKey: keyToTest.trim(),
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });

      const response = await ai.models.generateContent({
        model: targetModel,
        contents: "Responda apenas: OK",
      });

      if (response && response.text) {
        return res.json({ valid: true, message: `Chave API e modelo (${targetModel}) validados com sucesso!` });
      } else {
        return res.status(400).json({ valid: false, error: "Sem resposta da API Gemini." });
      }
    } catch (err: any) {
      return res.status(400).json({
        valid: false,
        error: err.message || "Falha ao validar a Chave API com o Gemini."
      });
    }
  });

  // Endpoint to get/set server-side API Key settings
  app.get("/api/settings", (req, res) => {
    const envKey = process.env.GEMINI_API_KEY;
    const hasEnvKey = Boolean(envKey && envKey.trim() !== "" && envKey !== "MY_GEMINI_API_KEY");
    res.json({
      hasEnvKey,
      maskedKey: hasEnvKey ? `${envKey!.substring(0, 6)}...${envKey!.slice(-4)}` : null,
    });
  });

  app.post("/api/settings", (req, res) => {
    try {
      const { apiKey } = req.body;
      if (typeof apiKey === "string") {
        process.env.GEMINI_API_KEY = apiKey.trim();
        
        // Persist to .env if file exists
        const envPath = path.join(process.cwd(), ".env");
        let envContent = "";
        if (fs.existsSync(envPath)) {
          envContent = fs.readFileSync(envPath, "utf-8");
          if (envContent.includes("GEMINI_API_KEY=")) {
            envContent = envContent.replace(/GEMINI_API_KEY=.*$/m, `GEMINI_API_KEY="${apiKey.trim()}"`);
          } else {
            envContent += `\nGEMINI_API_KEY="${apiKey.trim()}"\n`;
          }
        } else {
          envContent = `GEMINI_API_KEY="${apiKey.trim()}"\n`;
        }
        fs.writeFileSync(envPath, envContent, "utf-8");
      }
      return res.json({ success: true, message: "Configurações de API salvas." });
    } catch (err: any) {
      return res.status(500).json({ error: "Erro ao salvar configurações.", details: err.message });
    }
  });

  // API endpoint to analyze music
  app.post("/api/analyze-music", async (req, res) => {
    try {
      const { fileName, mimeType, fileData, selectedModel: bodyModel } = req.body;

      if (!fileData) {
        return res.status(400).json({ error: "Nenhum arquivo de áudio foi enviado." });
      }

      // Clean the base64 prefix if present
      const cleanBase64 = fileData.includes(";base64,")
        ? fileData.split(";base64,")[1]
        : fileData;

      // Extract client-provided API key & model from header or body
      const clientApiKey = (req.headers["x-gemini-api-key"] as string) || req.body?.apiKey;
      const targetModel = (req.headers["x-gemini-model"] as string) || bodyModel || req.body?.model || "gemini-3.6-flash";

      // Initialize Gemini Client
      let ai;
      try {
        ai = getGeminiClient(clientApiKey);
      } catch (err: any) {
        return res.status(401).json({
          error: "Chave API do Gemini ausente.",
          details: err.message,
        });
      }

      const audioPart = {
        inlineData: {
          mimeType: mimeType || "audio/mp3",
          data: cleanBase64,
        },
      };

      const prompt = `Analyze this uploaded music file carefully. Your task is to:
1. Identify or estimate the name of the song. If it is a known commercial/popular song, provide its actual real title (e.g., "Bohemian Rhapsody") and set the identification type to 'recognized'. If it is unknown, custom, or an indie demo, guess or generate a beautiful and appropriate song name based on the lyrics, vocals, and musical vibe, and set the identification type to 'estimate'.
2. Transcribe the lyrics precisely. Format the lyrics using the exact Suno.ai structure, utilizing bracket tags like [Intro], [Verse], [Chorus], [Bridge], [Guitar Solo], [Vocal Outro], etc. to divide sections. If there are no vocals (fully instrumental), provide a descriptive musical structure mapping instead (e.g. [Ambient Intro], [Synthesizer Section], [Guitar Melodic Build], [Outro]).
3. Estimate the BPM (Beats Per Minute) as a single integer number.
4. Identify the main styles/moods (e.g., energetic, relaxed, nostalgic, epic, futuristic, melancholic, upbeat).
5. Identify all vocalists/singers in detail. For each vocalist:
   - name: The singer's real name (if known, e.g. 'Freddie Mercury') or vocal profile (e.g. 'Vocalista Principal Masculino (Barítono)').
   - gender: The vocal gender ('Masculino', 'Feminino', 'Dueto Misto', 'Coro', or 'Instrumental').
   - estimatedAge: The estimated age range of the vocalist based on timbre, tone maturity, and delivery (e.g. '24 - 30 anos', '40 - 50 anos').
   - estimatedNationality: The estimated nationality/origin of the singer inferred from language, phonetic accents, cadence, and vocal style (e.g. 'Brasileiro (Brasil)', 'Norte-Americano (EUA)', 'Britânico (UK)', 'Português', 'Latino-Americano', etc.).
6. Identify the music genres (e.g. Rock, Synthpop, Lo-fi, Classical, Latin Pop, EDM).
7. Provide general tags associated with the instruments, production, and vibe.
8. Suggest 3 to 4 similar real-world known songs (including artist and title, e.g., "Blinding Lights by The Weeknd") along with an estimated percentage of similarity (between 1 and 100) representing how close they are in style, tempo, melody, or emotional vibe.
9. Write a beautiful, short summary of the musical analysis.`;

      // Generate content with selected Gemini model
      const response = await ai.models.generateContent({
        model: targetModel,
        contents: [audioPart, prompt],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              songName: {
                type: Type.STRING,
                description: "The official real name of the song if known, or a beautifully guessed/estimated title based on lyrics and mood."
              },
              songIdentificationType: {
                type: Type.STRING,
                enum: ["recognized", "estimate"],
                description: "Whether the song was officially recognized as a popular real-world song ('recognized') or guessed/estimated ('estimate')."
              },
              lyrics: {
                type: Type.STRING,
                description: "The full transcribed lyrics in Suno.ai formatting, complete with structural bracket tags like [Verse], [Chorus], etc."
              },
              bpm: {
                type: Type.INTEGER,
                description: "The estimated BPM (Beats Per Minute) as a single integer, e.g., 122."
              },
              styles: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array of styles or emotional moods detected."
              },
              singers: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: {
                      type: Type.STRING,
                      description: "Name of the singer or vocal profile (e.g., 'Freddie Mercury' or 'Vocal Principal')."
                    },
                    gender: {
                      type: Type.STRING,
                      description: "Gender/type of the vocalist: 'Masculino', 'Feminino', 'Coro', etc."
                    },
                    estimatedAge: {
                      type: Type.STRING,
                      description: "Estimated age or age range of the vocalist (e.g., '25 - 32 anos')."
                    },
                    estimatedNationality: {
                      type: Type.STRING,
                      description: "Estimated nationality or regional origin based on accent, dialect and vocal nuance (e.g., 'Brasileiro', 'Norte-Americano (EUA)', 'Britânico')."
                    }
                  },
                  required: ["name", "gender", "estimatedAge", "estimatedNationality"]
                },
                description: "Array of detected vocalists/singers with estimated age and nationality."
              },
              genres: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array of music genres."
              },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array of descriptive descriptive tags."
              },
              similarSongs: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: {
                      type: Type.STRING,
                      description: "The name and artist of the similar song, e.g., 'Drive by Kavinsky'."
                    },
                    similarity: {
                      type: Type.INTEGER,
                      description: "The percentage of similarity from 1 to 100."
                    }
                  },
                  required: ["name", "similarity"]
                },
                description: "Array of 3 to 4 highly similar real-world songs with percentage of similarity."
              },
              summary: {
                type: Type.STRING,
                description: "A gorgeous, descriptive 1-2 sentence summary of the musical characteristics."
              }
            },
            required: ["songName", "songIdentificationType", "lyrics", "bpm", "styles", "singers", "genres", "tags", "similarSongs", "summary"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response received from Gemini.");
      }

      const result = JSON.parse(responseText.trim());
      return res.json(result);
    } catch (error: any) {
      console.error("Analysis Error:", error);
      return res.status(500).json({
        error: "Failed to analyze music file.",
        details: error.message || error
      });
    }
  });

  // Serve static assets / Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
