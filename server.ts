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

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  pt: "Portuguese",
  es: "Spanish",
  it: "Italian",
  ru: "Russian",
  zh: "Simplified Chinese",
  tr: "Turkish",
  pl: "Polish",
  de: "German",
  fr: "French",
};

const fetchiTunesSongDetails = async (query: string) => {
  try {
    const cleanQuery = query.replace(/\(.*?\)/g, "").trim();
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&entity=song&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      const track = data.results[0];
      return {
        albumCoverUrl: track.artworkUrl100 ? track.artworkUrl100.replace("100x100bb", "600x600bb") : null,
        albumName: track.collectionName || null,
        releaseYear: track.releaseDate ? track.releaseDate.substring(0, 4) : null,
        artistName: track.artistName || null,
      };
    }
  } catch (err) {
    console.warn("iTunes Search API error:", err);
  }
  return null;
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable CORS for all hosts and origins
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-gemini-api-key, x-gemini-model, x-app-language");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Set limits for large audio file payloads (base64)
  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ limit: "100mb", extended: true }));

  // Endpoint to check Ollama server connection and list installed models
  app.post("/api/ollama/check", async (req, res) => {
    try {
      const ollamaUrl = (req.body?.ollamaUrl || "http://localhost:11434").replace(/\/$/, "");
      const tagsUrl = `${ollamaUrl}/api/tags`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(tagsUrl, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Servidor Ollama retornou código HTTP ${response.status}`);
      }

      const data = await response.json();
      const models = (data.models || []).map((m: any) => ({
        name: m.name,
        size: m.size,
        modified_at: m.modified_at,
      }));

      return res.json({
        ok: true,
        message: `Servidor Ollama conectado com sucesso! (${models.length} modelos instalados encontrados)`,
        models,
      });
    } catch (err: any) {
      return res.status(400).json({
        ok: false,
        error: `Não foi possível conectar ao Ollama: ${err.message || "Servidor offline ou URL inacessível"}`,
      });
    }
  });

  // Endpoint to verify API key or provider validity
  app.post("/api/verify-key", async (req, res) => {
    try {
      const { provider, apiKey, model, ollamaUrl } = req.body;

      if (provider === "ollama") {
        const targetUrl = (ollamaUrl || "http://localhost:11434").replace(/\/$/, "");
        const response = await fetch(`${targetUrl}/api/tags`);
        if (!response.ok) throw new Error("Não foi possível comunicar com o Ollama.");
        const data = await response.json();
        return res.json({
          valid: true,
          message: `Servidor Ollama e modelo (${model || "selecionado"}) prontos para uso!`,
          models: data.models || [],
        });
      }

      // Gemini check
      const keyToTest = apiKey || (req.headers["x-gemini-api-key"] as string) || process.env.GEMINI_API_KEY;
      const targetModel = model || (req.headers["x-gemini-model"] as string) || "gemini-3.6-flash";

      if (!keyToTest || keyToTest.trim() === "" || keyToTest === "MY_GEMINI_API_KEY") {
        return res.status(400).json({ valid: false, error: "Nenhuma chave API do Gemini fornecida." });
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
        error: err.message || "Falha ao validar o provedor."
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
      if (typeof apiKey === "string" && apiKey.trim() !== "") {
        process.env.GEMINI_API_KEY = apiKey.trim();
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
      return res.json({ success: true, message: "Configurações salvas." });
    } catch (err: any) {
      return res.status(500).json({ error: "Erro ao salvar configurações.", details: err.message });
    }
  });

  // API endpoint to analyze music
  app.post("/api/analyze-music", async (req, res) => {
    try {
      const {
        fileName,
        mimeType,
        fileData,
        provider = "gemini",
        selectedModel: bodyModel,
        ollamaUrl = "http://localhost:11434",
        language = "en"
      } = req.body;

      if (!fileData) {
        return res.status(400).json({ error: "Nenhum arquivo de áudio foi enviado." });
      }

      // Clean base64 prefix
      const cleanBase64 = fileData.includes(";base64,")
        ? fileData.split(";base64,")[1]
        : fileData;

      const clientApiKey = (req.headers["x-gemini-api-key"] as string) || req.body?.apiKey;
      const targetModel = (req.headers["x-gemini-model"] as string) || bodyModel || req.body?.model || "gemini-3.6-flash";
      const targetLang = (req.headers["x-app-language"] as string) || language || "en";
      const targetLangName = LANGUAGE_NAMES[targetLang] || "English";

      const prompt = `You are a world-class Shazam-like acoustic music identification and transcription system.
Listen to the provided audio sample with maximum attention to acoustic fingerprinting, melodies, vocal pitch, chord progressions, and lyrics.

CRITICAL TASK: SHAZAM-STYLE AMBIENT AUDIO IDENTIFICATION
- The audio sample may be recorded via a live microphone in ambient noise, background hum, low volume, or slightly distorted acoustics.
- Filter out background noise, hums, or ambient room reverb and focus on the core melody, vocal timbre, drum pattern, or lyric snippet.
- If the audio corresponds to any known real-world commercial song, popular track, indie release, or cover version, identify the EXACT real song title and artist name! Set 'songIdentificationType' to 'recognized' and set 'songName' to "Song Title by Artist Name" (e.g., "Bohemian Rhapsody by Queen" or "Shape of You by Ed Sheeran").
- DO NOT invent a fantasy title if it is a real commercial song!
- Only if the audio is genuinely an original custom home demo or improvised recording should you set 'songIdentificationType' to 'estimate' and generate a fitting title.

CRITICAL LANGUAGE INSTRUCTION:
Output all textual descriptions, summary, singer profiles (name description, gender, estimated age, estimated nationality) and style tags in ${targetLangName.toUpperCase()} language.

Your task is to return a JSON object with:
1. songName: Official song name and artist if recognized, or a creative estimated title.
2. songIdentificationType: 'recognized' or 'estimate'.
3. lyrics: Precisely transcribed lyrics in Suno.ai structure using bracket tags like [Intro], [Verse], [Chorus], [Bridge], [Guitar Solo], [Vocal Outro].
4. bpm: Estimated BPM (single integer).
5. styles: Array of detected styles/moods.
6. singers: Array of objects with properties { name, gender, estimatedAge, estimatedNationality }.
7. genres: Array of music genres.
8. instruments: Array of objects with { name, percentage } where percentage is an integer between 1 and 100 representing the approximate mix presence of each detected musical instrument.
9. tags: Array of descriptive instruments and production tags.
10. similarSongs: Array of objects with { name, similarity } where similarity is an integer between 1 and 100.
11. summary: A gorgeous 1-2 sentence summary of the musical analysis in ${targetLangName}.`;

      if (provider === "ollama") {
        // Execute analysis via Ollama API
        const targetOllamaUrl = ollamaUrl.replace(/\/$/, "");
        const ollamaPayload = {
          model: targetModel,
          prompt: `${prompt}\n\nRespond strictly with valid raw JSON object conforming to the specification, with no markdown formatting or extra text wrappers.`,
          images: [cleanBase64], // Ollama accepts base64 files/images/audio in images field
          stream: false,
          format: "json",
        };

        const ollamaRes = await fetch(`${targetOllamaUrl}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ollamaPayload),
        });

        if (!ollamaRes.ok) {
          throw new Error(`Erro no servidor Ollama (${ollamaRes.status}): ${ollamaRes.statusText}`);
        }

        const ollamaData = await ollamaRes.json();
        const responseText = ollamaData.response || ollamaData.text || "";
        const result = JSON.parse(responseText.trim());
        return res.json(result);
      } else {
        // Execute analysis via Google Gemini API
        let ai;
        try {
          ai = getGeminiClient(clientApiKey);
        } catch (err: any) {
          return res.status(401).json({
            error: "Chave API do Gemini ausente.",
            details: err.message,
          });
        }

        const cleanMimeType = (mimeType || "audio/mp3").split(";")[0].trim();

        const audioPart = {
          inlineData: {
            mimeType: cleanMimeType,
            data: cleanBase64,
          },
        };

        const response = await ai.models.generateContent({
          model: targetModel,
          contents: [audioPart, prompt],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                songName: { type: Type.STRING },
                songIdentificationType: { type: Type.STRING, enum: ["recognized", "estimate"] },
                lyrics: { type: Type.STRING },
                bpm: { type: Type.INTEGER },
                styles: { type: Type.ARRAY, items: { type: Type.STRING } },
                singers: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      gender: { type: Type.STRING },
                      estimatedAge: { type: Type.STRING },
                      estimatedNationality: { type: Type.STRING },
                    },
                    required: ["name", "gender", "estimatedAge", "estimatedNationality"]
                  }
                },
                genres: { type: Type.ARRAY, items: { type: Type.STRING } },
                instruments: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      percentage: { type: Type.INTEGER }
                    },
                    required: ["name", "percentage"]
                  }
                },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                similarSongs: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      similarity: { type: Type.INTEGER }
                    },
                    required: ["name", "similarity"]
                  }
                },
                summary: { type: Type.STRING }
              },
              required: ["songName", "songIdentificationType", "lyrics", "bpm", "styles", "singers", "genres", "instruments", "tags", "similarSongs", "summary"]
            }
          }
        });

        const responseText = response.text;
        if (!responseText) throw new Error("Resposta vazia recebida do Gemini.");
        const result = JSON.parse(responseText.trim());

        // Enrich result with official iTunes cover art & singer photos
        if (result.songName) {
          const itunesInfo = await fetchiTunesSongDetails(result.songName);
          if (itunesInfo) {
            if (itunesInfo.officialSongName && (result.songIdentificationType === "recognized" || !result.songName.includes(" by "))) {
              result.songName = itunesInfo.officialSongName;
              result.songIdentificationType = "recognized";
            }
            if (itunesInfo.albumCoverUrl) result.albumCoverUrl = itunesInfo.albumCoverUrl;
            if (itunesInfo.albumName) result.albumName = itunesInfo.albumName;
            if (itunesInfo.releaseYear) result.releaseYear = itunesInfo.releaseYear;
            if (itunesInfo.artistName) result.artistName = itunesInfo.artistName;
          }
        }

        if (Array.isArray(result.singers)) {
          result.singers = result.singers.map((singer: any) => {
            if (typeof singer === "string") {
              return {
                name: singer,
                gender: "Vocalista",
                estimatedAge: "N/A",
                estimatedNationality: "Global",
                photoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(singer)}&background=1e1b4b&color=88aaff&bold=true&size=256`,
              };
            }
            const nameStr = singer.name || "Vocalista";
            return {
              ...singer,
              photoUrl: singer.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(nameStr)}&background=1e1b4b&color=88aaff&bold=true&size=256`,
            };
          });
        }

        return res.json(result);
      }
    } catch (error: any) {
      console.error("Analysis Error:", error);
      return res.status(500).json({
        error: "Falha ao analisar o arquivo de áudio.",
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
