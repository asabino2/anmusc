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

const DEFAULT_OPENROUTER_AUDIO_MODELS = [
  {
    id: "google/gemini-2.5-flash",
    name: "Google: Gemini 2.5 Flash",
    description: "Recomendado. Alta velocidade e excelente fidelidade em áudio.",
  },
  {
    id: "google/gemini-flash-1.5",
    name: "Google: Gemini Flash 1.5",
    description: "Modelo otimizado e muito rápido com entrada de áudio.",
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Google: Gemini 2.5 Pro",
    description: "Máxima precisão e raciocínio analítico para áudio.",
  },
  {
    id: "openai/gpt-4o-audio-preview",
    name: "OpenAI: GPT-4o Audio Preview",
    description: "Análise e transcrição direta de áudio com GPT-4o.",
  },
  {
    id: "openai/gpt-4o-mini-audio-preview",
    name: "OpenAI: GPT-4o Mini Audio Preview",
    description: "Versão compacta e rápida com suporte a áudio.",
  },
  {
    id: "qwen/qwen-2-audio-7b-instruct",
    name: "Qwen: Qwen2 Audio 7B Instruct",
    description: "Modelo open-weights especializado em áudio e música.",
  },
];


const fetchiTunesSongDetails = async (query: string) => {
  try {
    const cleanQuery = query.replace(/\(.*?\)/g, "").trim();
    if (!cleanQuery || cleanQuery.length < 2) return null;

    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&entity=song&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      const track = data.results[0];
      const fullTrackTitle = `${track.trackName || ""} ${track.artistName || ""}`.toLowerCase();
      const queryLower = cleanQuery.toLowerCase();

      const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
      const matchCount = queryWords.filter(word => fullTrackTitle.includes(word)).length;

      // Verify that query words match iTunes result
      if (queryWords.length === 0 || matchCount / Math.max(queryWords.length, 1) >= 0.4) {
        return {
          officialSongName: track.trackName && track.artistName ? `${track.trackName} by ${track.artistName}` : null,
          albumCoverUrl: track.artworkUrl100 ? track.artworkUrl100.replace("100x100bb", "600x600bb") : null,
          albumName: track.collectionName || null,
          releaseYear: track.releaseDate ? track.releaseDate.substring(0, 4) : null,
          artistName: track.artistName || null,
        };
      }
    }
  } catch (err) {
    console.warn("iTunes Search API error:", err);
  }
  return null;
};

const fetchStreamingLinksForSong = async (query: string) => {
  try {
    const cleanQuery = query.replace(/\(.*?\)/g, "").trim();
    if (!cleanQuery || cleanQuery.length < 2) return null;

    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&entity=song&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();

    if (data.results && data.results.length > 0) {
      const track = data.results[0];
      const fullTrackTitle = `${track.trackName || ""} ${track.artistName || ""}`.toLowerCase();
      const queryLower = cleanQuery.toLowerCase();

      const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
      const matchCount = queryWords.filter(word => fullTrackTitle.includes(word)).length;

      if (queryWords.length === 0 || matchCount / Math.max(queryWords.length, 1) >= 0.4) {
        const titleArtist = `${track.trackName} ${track.artistName}`;
        return {
          itunes: track.trackViewUrl || null,
          spotify: `https://open.spotify.com/search/${encodeURIComponent(titleArtist)}`,
          youtubeMusic: `https://music.youtube.com/search?q=${encodeURIComponent(titleArtist)}`,
        };
      }
    }
  } catch (err) {
    console.warn("Streaming links lookup error:", query, err);
  }
  return null;
};

const calculateLyricOverlap = (transcribedLyrics: string, referenceLyrics: string) => {
  const getNormalizedWords = (text: string) =>
    text
      .replace(/\[.*?\]/g, " ")
      .toLowerCase()
      .replace(/[^\w\s\u00C0-\u00FF]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 2);

  const tWords = getNormalizedWords(transcribedLyrics);
  const rWords = getNormalizedWords(referenceLyrics);

  if (tWords.length === 0 || rWords.length === 0) {
    return { similarity: 0, matchedPhrases: [] };
  }

  const rSet = new Set(rWords);
  const matchedWordCount = tWords.filter(w => rSet.has(w)).length;

  const tSet = new Set(tWords);
  let intersection = 0;
  for (const w of tSet) {
    if (rSet.has(w)) intersection++;
  }
  const unionSize = new Set([...tSet, ...rSet]).size || 1;
  const jaccard = intersection / unionSize;
  const overlapT = matchedWordCount / tWords.length;

  const similarityScore = Math.max(jaccard, overlapT);

  const transcribedLines = transcribedLyrics.split("\n");
  const matchedPhrases: string[] = [];

  for (const rawLine of transcribedLines) {
    const lineClean = rawLine.replace(/\[.*?\]/g, "").trim();
    if (lineClean.length < 6) continue;

    const lineWords = getNormalizedWords(lineClean);
    if (lineWords.length === 0) continue;

    const lineMatchCount = lineWords.filter(w => rSet.has(w)).length;
    if (lineMatchCount / lineWords.length >= 0.6) {
      matchedPhrases.push(lineClean);
    }
  }

  return {
    similarity: Math.min(100, Math.round(similarityScore * 100)),
    matchedPhrases,
  };
};

const fetchLrclibLyrics = async (query: string) => {
  try {
    const cleanQuery = query.replace(/\(.*?\)/g, "").trim();
    if (!cleanQuery || cleanQuery.length < 2) return null;

    const url = `https://lrclib.net/api/search?q=${encodeURIComponent(cleanQuery)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      for (const item of data) {
        if (item.plainLyrics && item.plainLyrics.trim().length > 30) {
          return {
            officialSongName: `${item.trackName} by ${item.artistName}`,
            trackName: item.trackName,
            artistName: item.artistName,
            albumName: item.albumName || null,
            plainLyrics: item.plainLyrics,
          };
        }
      }
    }
  } catch (err) {
    console.warn("LRCLIB API Search error:", err);
  }
  return null;
};

const finalizeEnrichment = async (result: any) => {
  // Enrich similar songs streaming links if verified on streaming platforms
  if (Array.isArray(result.similarSongs)) {
    result.similarSongs = await Promise.all(
      result.similarSongs.map(async (song: any) => {
        const songNameStr = typeof song === "string" ? song : song?.name;
        const links = songNameStr ? await fetchStreamingLinksForSong(songNameStr) : null;
        if (typeof song === "string") {
          return {
            name: song,
            similarity: 80,
            streamingLinks: links || undefined,
          };
        }
        return {
          ...song,
          streamingLinks: links || undefined,
        };
      })
    );
  }

  // Enrich singers photos
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

  return result;
};

const enrichAnalysisResult = async (result: any) => {
  if (!result || typeof result !== "object") return result;

  // Case 1: Exact Shazam acoustic match verified on iTunes
  if (result.songName && result.songIdentificationType === "recognized") {
    const itunesInfo = await fetchiTunesSongDetails(result.songName);
    if (itunesInfo && itunesInfo.officialSongName) {
      result.songName = itunesInfo.officialSongName;
      if (itunesInfo.albumCoverUrl) result.albumCoverUrl = itunesInfo.albumCoverUrl;
      if (itunesInfo.albumName) result.albumName = itunesInfo.albumName;
      if (itunesInfo.releaseYear) result.releaseYear = itunesInfo.releaseYear;
      if (itunesInfo.artistName) result.artistName = itunesInfo.artistName;

      const mainLinks = await fetchStreamingLinksForSong(result.songName);
      if (mainLinks) result.streamingLinks = mainLinks;
      return await finalizeEnrichment(result);
    }
  }

  // Case 2: Lyric Match verification via full-text LRCLIB lyric comparison
  if (result.lyrics) {
    const candidateQuery = (result.songName && result.songName.includes(" by "))
      ? result.songName
      : result.lyrics
          .split("\n")
          .map(line => line.replace(/\[.*?\]/g, "").trim())
          .filter(line => line.length > 15)
          .slice(0, 2)
          .join(" ");

    if (candidateQuery && candidateQuery.trim().length > 3) {
      const lrclibResult = await fetchLrclibLyrics(candidateQuery);
      if (lrclibResult && lrclibResult.plainLyrics) {
        const { similarity, matchedPhrases } = calculateLyricOverlap(result.lyrics, lrclibResult.plainLyrics);

        // Accept lyric match ONLY if full-text similarity is >= 65%
        if (similarity >= 65) {
          const songName = lrclibResult.officialSongName;
          const itunesInfo = await fetchiTunesSongDetails(songName);
          const mainLinks = await fetchStreamingLinksForSong(songName);

          result.songName = songName;
          result.songIdentificationType = "lyric_match";
          result.lyricMatchPercentage = Math.max(similarity, result.lyricMatchPercentage || 0);
          result.matchedLyricPhrases = matchedPhrases;
          if (itunesInfo?.albumCoverUrl) result.albumCoverUrl = itunesInfo.albumCoverUrl;
          if (itunesInfo?.albumName) result.albumName = itunesInfo.albumName;
          if (itunesInfo?.releaseYear) result.releaseYear = itunesInfo.releaseYear;
          if (itunesInfo?.artistName) result.artistName = itunesInfo.artistName;
          if (mainLinks) result.streamingLinks = mainLinks;

          return await finalizeEnrichment(result);
        }
      }
    }
  }

  // Case 3: Revert to estimate if no acoustic Shazam match or verified >65% lyric match
  result.songIdentificationType = "estimate";
  delete result.albumCoverUrl;
  delete result.albumName;
  delete result.releaseYear;
  delete result.artistName;
  delete result.streamingLinks;
  delete result.lyricMatchPercentage;
  delete result.matchedLyricPhrases;

  return await finalizeEnrichment(result);
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

  // Endpoint to fetch OpenRouter audio-capable models
  app.get("/api/openrouter/models", async (req, res) => {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/models");
      if (!response.ok) {
        throw new Error(`OpenRouter API respondeu com status HTTP ${response.status}`);
      }
      const data = await response.json();
      const allModels = data.data || [];

      // Filter only models supporting audio input
      const audioModels = allModels
        .filter((m: any) => {
          const inputModalities = m.architecture?.input_modalities || [];
          const modality = m.architecture?.modality || "";
          const id = m.id || "";
          const name = m.name || "";
          const description = m.description || "";

          const hasAudioModality = inputModalities.includes("audio") || modality.includes("audio");
          const isKnownAudioModel = /gemini-(2\.5|3\.|1\.5)|gpt-4o-audio|qwen2-audio|whisper|ultravox|speech|audio/i.test(
            `${id} ${name} ${description}`
          );

          return hasAudioModality || isKnownAudioModel;
        })
        .map((m: any) => ({
          id: m.id,
          name: m.name || m.id,
          description: m.description || "",
        }));

      const finalModels = audioModels.length > 0 ? audioModels : DEFAULT_OPENROUTER_AUDIO_MODELS;
      return res.json({ ok: true, models: finalModels });
    } catch (err: any) {
      console.warn("Retornando lista padrão de modelos OpenRouter com áudio devido a erro de busca:", err.message);
      return res.json({ ok: true, models: DEFAULT_OPENROUTER_AUDIO_MODELS });
    }
  });

  // Endpoint to check Ollama server connection and list installed audio models
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
      const rawModels = (data.models || []).map((m: any) => ({
        name: m.name,
        size: m.size,
        modified_at: m.modified_at,
      }));

      // Filter only models with audio capabilities (e.g., qwen2-audio, whisper, ultravox, etc.)
      const AUDIO_PATTERN = /audio|whisper|ultravox|sensevoice|speech|voxtelm|salmonn|listen/i;
      const audioModels = rawModels.filter((m: any) => AUDIO_PATTERN.test(m.name));

      const modelsToReturn = audioModels.length > 0 ? audioModels : rawModels;

      return res.json({
        ok: true,
        message: audioModels.length > 0
          ? `Servidor Ollama conectado com sucesso! (${audioModels.length} modelo(s) com suporte a áudio encontrado(s))`
          : `Servidor Ollama conectado. Exibindo modelos instalados (${rawModels.length} modelo(s)).`,
        models: modelsToReturn,
        filteredByAudio: audioModels.length > 0,
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

      if (provider === "openrouter") {
        const keyToTest = apiKey || (req.headers["x-openrouter-api-key"] as string);
        const targetModel = model || "google/gemini-2.5-flash";

        if (!keyToTest || keyToTest.trim() === "") {
          return res.status(400).json({ valid: false, error: "Nenhuma chave API do OpenRouter fornecida." });
        }

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${keyToTest.trim()}`,
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "Music Analyzer",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: targetModel,
            messages: [{ role: "user", content: "Responda apenas: OK" }],
          }),
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => "");
          throw new Error(`OpenRouter retornou código HTTP ${response.status}: ${errText}`);
        }

        const data = await response.json();
        if (data && data.choices && data.choices.length > 0) {
          return res.json({
            valid: true,
            message: `Chave API do OpenRouter e modelo (${targetModel}) validados com sucesso!`,
          });
        } else {
          return res.status(400).json({ valid: false, error: "Sem resposta válida da API OpenRouter." });
        }
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
      const targetModel = bodyModel || req.body?.selectedModel || req.body?.model || (req.headers["x-gemini-model"] as string) || "gemini-3.6-flash";
      const targetLang = (req.headers["x-app-language"] as string) || language || "en";
      const targetLangName = LANGUAGE_NAMES[targetLang] || "English";

      const prompt = `You are a world-class Shazam-like acoustic music identification and transcription system.
Listen to the provided audio sample with maximum attention to acoustic fingerprinting, melodies, vocal pitch, chord progressions, and lyrics.

CRITICAL TASK: SHAZAM-STYLE AMBIENT AUDIO & LYRIC IDENTIFICATION
- The audio sample may be recorded via a live microphone in ambient noise, background hum, low volume, or slightly distorted acoustics.
- Filter out background noise, hums, or ambient room reverb and focus on the core melody, vocal timbre, drum pattern, or lyric snippet.
- IDENTIFICATION TYPES ('songIdentificationType'):
  * 'recognized': Set ONLY IF the audio is an exact acoustic match of a known real-world commercial master recording or official cover version (same performance/melody/recording). Set 'songName' to "Song Title by Artist Name" (e.g. "Bohemian Rhapsody by Queen").
  * 'lyric_match': Set IF the audio is an AI-generated song (Suno/Udio), custom cover, or new musical arrangement, BUT the transcribed lyrics correspond by >90% to an existing commercial song's lyrics! Set 'songName' to "Song Title by Artist Name".
  * 'estimate': Set IF the audio is an original custom song, home demo, or AI track with unique/original lyrics (no commercial song lyrics match >90%). Set 'songName' to a fitting title for the song (e.g. "Vozes do Amanhã").
- DO NOT invent a fantasy title if it is a real commercial song!

CRITICAL LANGUAGE INSTRUCTION:
Output all textual descriptions, summary, singer profiles (name description, gender, estimated age, estimated nationality), style tags, rating strengths, improvements, potential issues, and feedback in ${targetLangName.toUpperCase()} language.

Your task is to return a JSON object with:
1. songName: Official song name and artist if recognized/lyric match, or a creative estimated title.
2. songIdentificationType: 'recognized', 'lyric_match', or 'estimate'.
3. lyrics: Precisely transcribed lyrics in Suno.ai structure using bracket tags like [Intro], [Verse], [Chorus], [Bridge], [Guitar Solo], [Vocal Outro].
4. bpm: Estimated BPM (single integer).
5. styles: Array of detected styles/moods.
6. singers: Array of objects with properties { name, gender, estimatedAge, estimatedNationality }.
7. genres: Array of music genres.
8. instruments: Array of objects with { name, percentage } where percentage is an integer between 1 and 100 representing the approximate mix presence of each detected musical instrument.
9. tags: Array of descriptive instruments and production tags.
10. rating: Object evaluating the music:
    - overallScore: Number from 0.0 to 10.0 representing overall musical quality score.
    - vocalsScore: Integer 0 to 100 for vocal quality and pitch tuning.
    - rhythmScore: Integer 0 to 100 for rhythm, timing, and tempo consistency.
    - productionScore: Integer 0 to 100 for mix balance, clarity, and audio quality.
    - compositionScore: Integer 0 to 100 for song structure and melody.
    - strengths: Array of 2 to 4 positive key strengths of the track in ${targetLangName}.
    - improvements: Array of 2 to 4 suggestions of what can be improved in ${targetLangName}.
    - potentialIssues: Array of 1 to 3 detected issues or things that might be wrong (e.g. background noise, off-key singing, clipping, timing drift, harsh frequencies) in ${targetLangName}.
    - feedback: A concise 2-3 sentence expert feedback paragraph in ${targetLangName}.
11. similarSongs: Array of objects with { name, similarity } where similarity is an integer between 1 and 100.
12. summary: A gorgeous 1-2 sentence summary of the musical analysis in ${targetLangName}.`;

      if (provider === "openrouter") {
        const openrouterKey = (req.headers["x-openrouter-api-key"] as string) || req.body?.apiKey || clientApiKey;
        if (!openrouterKey || openrouterKey.trim() === "") {
          return res.status(401).json({
            error: "Chave API do OpenRouter ausente ou inválida.",
            details: "Por favor, insira sua chave API do OpenRouter nas Configurações.",
          });
        }

        const cleanMimeType = (mimeType || "audio/mp3").split(";")[0].trim();
        let audioFormat = "mp3";
        if (cleanMimeType.includes("wav")) audioFormat = "wav";
        else if (cleanMimeType.includes("webm")) audioFormat = "webm";
        else if (cleanMimeType.includes("m4a") || cleanMimeType.includes("mp4")) audioFormat = "m4a";
        else if (cleanMimeType.includes("ogg")) audioFormat = "ogg";
        else if (cleanMimeType.includes("flac")) audioFormat = "flac";

        const targetModelToUse = targetModel || "google/gemini-2.5-flash";

        const openrouterPayload = {
          model: targetModelToUse,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `${prompt}\n\nRespond strictly with valid raw JSON object conforming to the specification, with no markdown formatting or extra text wrappers.`
                },
                {
                  type: "input_audio",
                  input_audio: {
                    data: cleanBase64,
                    format: audioFormat
                  }
                }
              ]
            }
          ],
          response_format: { type: "json_object" }
        };

        let orRes;
        try {
          orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${openrouterKey.trim()}`,
              "HTTP-Referer": "http://localhost:3000",
              "X-Title": "Music Analyzer",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(openrouterPayload),
          });
        } catch (fetchErr: any) {
          console.error("==================================================");
          console.error("[OPENROUTER CONNECTION ERROR DETAILS]:", fetchErr.message || fetchErr);
          console.error("==================================================");
          throw new Error(`Falha de conexão com a API do OpenRouter: ${fetchErr.message || "Servidor inacessível"}`);
        }

        if (!orRes.ok) {
          const rawErrText = await orRes.text().catch(() => "");
          console.error("==================================================");
          console.error("[OPENROUTER API RESPONSE ERROR DETAILS]:");
          console.error("HTTP Status Code:", orRes.status);
          console.error("Raw Error Body:\n", rawErrText);
          console.error("==================================================");
          throw new Error(`Erro na API do OpenRouter (HTTP ${orRes.status}): ${rawErrText || "Sem corpo de erro retornado."}`);
        }

        const orData = await orRes.json();
        const rawText = orData.choices?.[0]?.message?.content || "";
        const cleanedText = rawText.replace(/^```json/i, "").replace(/```$/, "").trim();
        const result = JSON.parse(cleanedText);

        const enriched = await enrichAnalysisResult(result);
        return res.json(enriched);
      } else if (provider === "ollama") {
        // Execute analysis via Ollama API
        const targetOllamaUrl = ollamaUrl.replace(/\/$/, "");
        const ollamaPayload = {
          model: targetModel,
          prompt: `${prompt}\n\nRespond strictly with valid raw JSON object conforming to the specification, with no markdown formatting or extra text wrappers.`,
          images: [cleanBase64], // Ollama accepts base64 files/images/audio in images field
          stream: false,
          format: "json",
        };

        let ollamaRes;
        try {
          ollamaRes = await fetch(`${targetOllamaUrl}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(ollamaPayload),
          });
        } catch (fetchErr: any) {
          console.error("==================================================");
          console.error("[OLLAMA CONNECTION ERROR DETAILS]:");
          console.error("URL:", `${targetOllamaUrl}/api/generate`);
          console.error("Model:", targetModel);
          console.error("Message:", fetchErr.message || fetchErr);
          if (fetchErr.stack) console.error("Stack Trace:\n", fetchErr.stack);
          console.error("==================================================");
          throw new Error(`Falha de conexão com o servidor Ollama (${targetOllamaUrl}): ${fetchErr.message || "Servidor inacessível"}`);
        }

        if (!ollamaRes.ok) {
          const rawErrText = await ollamaRes.text().catch(() => "");
          console.error("==================================================");
          console.error("[OLLAMA API RESPONSE ERROR DETAILS]:");
          console.error("HTTP Status Code:", ollamaRes.status);
          console.error("HTTP Status Text:", ollamaRes.statusText);
          console.error("Target URL:", `${targetOllamaUrl}/api/generate`);
          console.error("Raw Error Body:\n", rawErrText);
          console.error("==================================================");
          throw new Error(`Erro na API do Ollama (HTTP ${ollamaRes.status} ${ollamaRes.statusText}): ${rawErrText || "Sem corpo de erro retornado."}`);
        }

        const ollamaData = await ollamaRes.json();
        const responseText = ollamaData.response || ollamaData.text || "";
        const result = JSON.parse(responseText.trim());
        const enriched = await enrichAnalysisResult(result);
        return res.json(enriched);
      } else {
        // Execute analysis via Google Gemini API
        let ai;
        try {
          ai = getGeminiClient(clientApiKey);
        } catch (err: any) {
          console.error("[GEMINI AUTH ERROR DETAILS]:", err.message);
          return res.status(401).json({
            error: "Chave API do Gemini ausente ou inválida.",
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

        let response;
        try {
          response = await ai.models.generateContent({
            model: targetModel,
            contents: [audioPart, prompt],
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  songName: { type: Type.STRING },
                  songIdentificationType: { type: Type.STRING, enum: ["recognized", "lyric_match", "estimate"] },
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
                  rating: {
                    type: Type.OBJECT,
                    properties: {
                      overallScore: { type: Type.NUMBER },
                      vocalsScore: { type: Type.INTEGER },
                      rhythmScore: { type: Type.INTEGER },
                      productionScore: { type: Type.INTEGER },
                      compositionScore: { type: Type.INTEGER },
                      strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                      improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
                      potentialIssues: { type: Type.ARRAY, items: { type: Type.STRING } },
                      feedback: { type: Type.STRING },
                    },
                    required: ["overallScore", "vocalsScore", "rhythmScore", "productionScore", "compositionScore", "strengths", "improvements", "potentialIssues", "feedback"]
                  },
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
                required: ["songName", "songIdentificationType", "lyrics", "bpm", "styles", "singers", "genres", "instruments", "tags", "rating", "similarSongs", "summary"]
              }
            }
          });
        } catch (geminiApiErr: any) {
          console.error("==================================================");
          console.error("[GEMINI API CALL ERROR DETAILS]:");
          console.error("Target Model:", targetModel);
          console.error("Error Message:", geminiApiErr.message || geminiApiErr);
          console.error("Status / Code:", geminiApiErr.status || geminiApiErr.code || "N/A");
          if (geminiApiErr.stack) console.error("Stack Trace:\n", geminiApiErr.stack);
          try {
            console.error("Full Serialized Error:\n", JSON.stringify(geminiApiErr, Object.getOwnPropertyNames(geminiApiErr), 2));
          } catch (_) {}
          console.error("==================================================");
          throw geminiApiErr;
        }

        const responseText = response.text;
        if (!responseText) throw new Error("Resposta vazia recebida do Gemini.");
        const result = JSON.parse(responseText.trim());

        const enriched = await enrichAnalysisResult(result);
        return res.json(enriched);
      }
    } catch (error: any) {
      console.error("==================================================");
      console.error("[MUSIC ANALYZER API SERVER ERROR CATCH]:");
      console.error("Error Message:", error.message || error);
      console.error("Provider:", req.body?.provider || "gemini");
      console.error("Model:", req.body?.selectedModel || req.headers["x-gemini-model"]);
      if (error.stack) console.error("Stack Trace:\n", error.stack);
      console.error("==================================================");
      return res.status(500).json({
        error: "Falha ao analisar o arquivo de áudio.",
        details: error.message || String(error),
        stack: error.stack || null,
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
