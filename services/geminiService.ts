
import { GoogleGenAI, Type, Modality } from "@google/genai";

// Fix: Direct initialization using process.env.API_KEY per guidelines
// Ensure fresh creation for each call to pick up the most recent key if changed via select UI
const getAiClient = () => {
  if (!process.env.API_KEY) {
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateMagicCaption = async (userPrompt: string): Promise<string> => {
  const ai = getAiClient();
  if (!ai) {
    return "🚀 Experiencing Africa! #HappyAfrica (API Key Missing)";
  }

  try {
    // Upgraded to Gemini 3.0 Pro for better creative reasoning
    const model = 'gemini-3-pro-preview';
    
    // System instruction to define persona and handle errors
    const systemInstruction = `You are a social media expert for a TikTok-like app called "Happy Africa".
    Your goal is to generate catchy, short, and engaging video captions.
    If the user input seems to describe a technical error (like "Internal Error" or "Supabase Error"), politely suggest checking the system logs or regenerating the schema.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: `Generate a caption based on this input: "${userPrompt}". 
      Requirements:
      - Include 3-4 relevant hashtags.
      - Keep it under 150 characters.
      - Do not include quotes around the output.`,
      config: {
        systemInstruction: systemInstruction,
        // Fix: Budget for creative thinking to ensure high quality captions must be inside thinkingConfig
        thinkingConfig: { thinkingBudget: 1024 }
      }
    });

    return response.text ? response.text.trim() : "Just sharing good vibes! ✨ #HappyAfrica";
  } catch (error) {
    console.error("Error generating caption:", error);
    return "Just sharing good vibes! ✨ #HappyAfrica";
  }
};

export const suggestHashtags = async (caption: string): Promise<string[]> => {
  const ai = getAiClient();
  if (!ai) return ['#africa', '#trending', '#viral'];

  try {
    // Fix: Using correct model for basic text task
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate 5 trending, relevant hashtags for a video with this description: "${caption}". Return a JSON array of strings (e.g. ["#dance", "#fun"]).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  } catch (e) {
    return ['#africa', '#trending', '#viral', '#happyafrica'];
  }
};

export interface TrendingSong {
  id: string;
  title: string;
  artist: string;
  duration: string;
  genre?: string;
  audioUrl?: string; // Playable URL
}

// RELIABLE AUDIO SOURCES (hosted examples for demo purposes)
const AUDIO_LIBRARY = {
  // Simulating Bongo Flava (Rhythmic, Melodic)
  bongo1: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", 
  bongo2: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3",
  // Simulating Amapiano (Deep House/Log Drum vibes)
  amapiano: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
  // Simulating Afrobeats (Upbeat, Pop)
  afrobeat1: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3",
  afrobeat2: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
  // General Pop
  pop: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3"
};

const SAMPLE_LIST = Object.values(AUDIO_LIBRARY);

export const getTrendingMusic = async (): Promise<TrendingSong[]> => {
  const ai = getAiClient();
  
  // FALLBACK DATA: Real Bongo Flava & East African Hits
  const FALLBACK_HITS: TrendingSong[] = [
    { id: 'b1', title: 'Yatapita', artist: 'Diamond Platnumz', duration: '0:45', genre: 'Bongo Flava', audioUrl: AUDIO_LIBRARY.bongo1 },
    { id: 'b2', title: 'Single Again', artist: 'Harmonize', duration: '0:30', genre: 'Bongo Flava', audioUrl: AUDIO_LIBRARY.bongo2 },
    { id: 'b3', title: 'Sukari', artist: 'Zuchu', duration: '0:40', genre: 'Bongo Flava', audioUrl: AUDIO_LIBRARY.afrobeat1 },
    { id: 'b4', title: 'Mahaba', artist: 'Ali Kiba', duration: '0:50', genre: 'Bongo Flava', audioUrl: AUDIO_LIBRARY.bongo1 },
    { id: 'b5', title: 'Nitongoze', artist: 'Rayvanny ft. Diamond Platnumz', duration: '0:35', genre: 'Bongo Flava', audioUrl: AUDIO_LIBRARY.bongo2 },
    { id: 'b6', title: 'Mi Amor', artist: 'Marioo ft. Jovial', duration: '0:45', genre: 'Bongo Flava', audioUrl: AUDIO_LIBRARY.afrobeat2 },
    { id: 'b7', title: 'Enjoy', artist: 'Jux ft. Diamond Platnumz', duration: '0:40', genre: 'Bongo Flava', audioUrl: AUDIO_LIBRARY.pop },
    { id: 'b8', title: 'Nimekuzoea', artist: 'Nandy', duration: '0:30', genre: 'Bongo Flava', audioUrl: AUDIO_LIBRARY.bongo1 },
    { id: 'b9', title: 'Amelowa', artist: 'Mbosso', duration: '0:55', genre: 'Bongo Flava', audioUrl: AUDIO_LIBRARY.bongo2 },
    { id: 'b10', title: 'Puuh', artist: 'Billnass ft. Jay Melody', duration: '0:35', genre: 'Bongo Flava', audioUrl: AUDIO_LIBRARY.afrobeat1 },
    { id: 'f1', title: 'Water', artist: 'Tyla', duration: '0:30', genre: 'Amapiano', audioUrl: AUDIO_LIBRARY.amapiano },
    { id: 'f2', title: 'Unavailable', artist: 'Davido', duration: '0:45', genre: 'Afrobeats', audioUrl: AUDIO_LIBRARY.afrobeat2 },
    { id: 'f3', title: 'Kwangwaru', artist: 'Harmonize ft. Diamond Platnumz', duration: '0:50', genre: 'Bongo Flava', audioUrl: AUDIO_LIBRARY.bongo1 },
    { id: 'f4', title: 'Tetema', artist: 'Rayvanny ft. Diamond Platnumz', duration: '0:40', genre: 'Bongo Flava', audioUrl: AUDIO_LIBRARY.afrobeat2 }
  ];

  if (!ai) return FALLBACK_HITS;

  try {
    // Use Gemini 3.0 Pro for robust JSON generation
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: "List 15 currently trending East African Bongo Flava songs, along with popular Afrobeats and Amapiano hits. Return a strictly valid JSON array.",
      config: {
        responseMimeType: "application/json",
        // Fix: Allocate budget for structured thinking inside thinkingConfig to avoid JSON errors
        thinkingConfig: { thinkingBudget: 2048 }, 
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              artist: { type: Type.STRING },
              duration: { type: Type.STRING },
              genre: { type: Type.STRING },
            },
            required: ['id', 'title', 'artist', 'duration']
          }
        }
      }
    });

    const text = response.text;
    if (!text) return FALLBACK_HITS;
    
    // Clean Markdown code blocks if present (e.g. ```json ... ```)
    const cleanText = text.replace(/```json\n?|```/g, '').trim();
    
    const parsed = JSON.parse(cleanText);
    
    // Add fake audio URLs to AI data since it can't return real MP3s
    return parsed.map((song: any, index: number) => ({
       ...song,
       audioUrl: SAMPLE_LIST[index % SAMPLE_LIST.length]
    }));

  } catch (error) {
    console.error("Error fetching trending music:", error);
    return FALLBACK_HITS;
  }
};

export interface AIResponse {
    text: string;
    sources?: Array<{ title: string; url: string }>;
}

export const askDiscoveryAssistant = async (query: string): Promise<AIResponse> => {
    const ai = getAiClient();
    if (!ai) return { text: "I can't connect to the internet right now to check trends. 🔌" };

    try {
        // Fix: Use correct model for real-time info task
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: query,
            config: {
                tools: [{ googleSearch: {} }],
                systemInstruction: "You are the 'Happy Africa Trend Bot'. You know everything about African music, dance, fashion, and pop culture. Keep answers concise, fun, and use emojis. If listing items, use bullet points."
            }
        });

        // Extract grounding metadata (sources)
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const sources = groundingChunks
            .map((chunk: any) => chunk.web ? { title: chunk.web.title, url: chunk.web.uri } : null)
            .filter((s: any) => s !== null);

        return {
            text: response.text || "Sorry, I couldn't find that.",
            sources: sources
        };

    } catch (e) {
        console.error("Discovery Assistant Error:", e);
        return { text: "Oops, something went wrong while searching the vibe. 🛑" };
    }
};

// --- MAPS GROUNDING ---
export const exploreLocation = async (placeName: string, coords?: { latitude: number, longitude: number }): Promise<AIResponse> => {
    const ai = getAiClient();
    if (!ai) return { text: "Maps are currently unavailable." };

    try {
        // Fix: Use correct series model for Maps Grounding (Gemini 2.5 Flash is recommended)
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Tell me interesting facts about "${placeName}" relevant to a tourist or social media creator.`,
            config: {
                tools: [{ googleMaps: {} }],
                toolConfig: coords ? {
                    retrievalConfig: {
                        latLng: {
                            latitude: coords.latitude,
                            longitude: coords.longitude
                        }
                    }
                } : undefined
            }
        });

        // Extract grounding metadata (sources) - Including maps URIs as per guidelines
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const sources = groundingChunks
            .map((chunk: any) => {
              if (chunk.maps) return { title: chunk.maps.title || "View on Maps", url: chunk.maps.uri };
              if (chunk.web) return { title: chunk.web.title, url: chunk.web.uri };
              return null;
            })
            .filter((s: any) => s !== null);

        return {
            text: response.text || `Exploring ${placeName}...`,
            sources: sources
        };
    } catch (e) {
        console.error("Maps Grounding Error:", e);
        return { text: `Here is some info about ${placeName}: It's a vibrant place worth visiting!` };
    }
};

export const translateText = async (text: string, targetLang = 'English'): Promise<string> => {
    const ai = getAiClient();
    if (!ai) return "[Translation unavailable]";

    try {
        // Fix: Correct model for basic task
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Translate the following text to ${targetLang}. Only return the translated text, nothing else.\n\nText: "${text}"`
        });
        return response.text?.trim() || "[Translation failed]";
    } catch (e) {
        console.error("Translation Error:", e);
        return "[Translation Error]";
    }
};

export const checkContentSafety = async (text: string): Promise<{ safe: boolean; reason?: string }> => {
    const ai = getAiClient();
    if (!ai) return { safe: true }; // Allow if AI offline

    try {
        // Fix: Correct model for analysis task
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Analyze the following video caption for safety compliance (Hate speech, Harassment, Sexually Explicit, Dangerous Content). 
            Caption: "${text}"
            Return JSON: { "safe": boolean, "reason": string (optional) }`,
            config: {
                responseMimeType: "application/json"
            }
        });
        
        const result = JSON.parse(response.text || '{}');
        return { safe: result.safe, reason: result.reason };
    } catch (e) {
        console.error("Safety Check Error:", e);
        return { safe: true }; // Fail open
    }
};

export const generateAISticker = async (prompt: string): Promise<string | null> => {
    const ai = getAiClient();
    if (!ai) return null;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', 
            contents: {
                parts: [
                    { text: `Generate a high-quality sticker, transparent background if possible, art style: ${prompt}` }
                ]
            }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        return null;
    } catch (e) {
        console.error("Sticker Gen Error:", e);
        return null;
    }
};

export const generateAIBackground = async (prompt: string): Promise<string | null> => {
    const ai = getAiClient();
    if (!ai) return null;

    try {
        // Upgrade to 'gemini-3-pro-image-preview' for high-quality backgrounds
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview', 
            contents: {
                parts: [
                    { text: `Generate a photorealistic or artistic background image for a video. Scene: ${prompt}. Aspect ratio 9:16.` }
                ]
            },
            config: {
                imageConfig: {
                    aspectRatio: "9:16",
                    imageSize: "1K"
                }
            }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        return null;
    } catch (e) {
        console.error("BG Gen Error:", e);
        return null;
    }
};

export const generateSmartReplies = async (context: string): Promise<string[]> => {
    const ai = getAiClient();
    if (!ai) return ["Cool!", "Interesting", "Tell me more"];

    try {
        // Fix: Correct model for text generation
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Generate 3 short, casual, distinct smart replies to this message: "${context}". Return a JSON array of strings.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });
        return JSON.parse(response.text || '[]');
    } catch (e) {
        return ["Cool!", "Interesting", "Tell me more"];
    }
};

export const generateTextToSpeech = async (text: string, voiceName: string = 'Kore'): Promise<ArrayBuffer | null> => {
    const ai = getAiClient();
    if (!ai) return null;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                // Fix: Modalites must be exactly one Modality.AUDIO element
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName }
                    }
                }
            }
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            // Convert base64 to ArrayBuffer
            const binaryString = atob(base64Audio);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes.buffer;
        }
        return null;
    } catch (e) {
        console.error("TTS Error:", e);
        return null;
    }
};

export const generateVideoCaptions = async (videoBlob: Blob): Promise<{ text: string, start: number, end: number }[]> => {
  const ai = getAiClient();
  if (!ai) return [];

  try {
    // Convert Blob to Base64
    const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
        };
        reader.readAsDataURL(videoBlob);
    });

    // Fix: Using correct model for transcription task
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
            { inlineData: { mimeType: videoBlob.type || 'video/mp4', data: base64Data } },
            { text: "Transcribe the audio in this video. Return a strictly valid JSON array of objects. Each object must have: 'text' (the spoken words), 'start' (start time in seconds as number), 'end' (end time in seconds as number). Ensure timestamps are accurate." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    text: { type: Type.STRING },
                    start: { type: Type.NUMBER },
                    end: { type: Type.NUMBER }
                },
                required: ['text', 'start', 'end']
            }
        }
      }
    });

    const json = JSON.parse(response.text || '[]');
    return json;
  } catch (e) {
    console.error("Caption Gen Error:", e);
    return [];
  }
};
