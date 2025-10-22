// FIX: Removed LiveSession and VideosOperation as they are no longer exported types. Using 'any' instead.
import { GoogleGenAI, Modality, Type, GenerateContentResponse, Chat, LiveServerMessage, Blob, FunctionDeclaration, VideoGenerationReferenceImage, VideoGenerationReferenceType } from "@google/genai";
import { AdCreative, BrandKit } from './types';

// FIX: Removed conflicting global type declaration for `window.aistudio`.
// It is assumed to be provided by the environment, and the local declaration was causing errors.
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

// Ensure process.env.API_KEY is handled, but assume it is set in the environment.
const getApiKey = (): string => {
    const key = process.env.API_KEY;
    if (!key) {
        console.warn("API_KEY environment variable not set.");
        return "MISSING_API_KEY";
    }
    return key;
};

const getAiClient = () => new GoogleGenAI({ apiKey: getApiKey() });

const hasBrandInfo = (brandKit?: BrandKit): boolean => {
    return !!(brandKit && (brandKit.name || brandKit.description));
}

// --- Text & Chat Generation ---
export const startChatSession = (): Chat => {
    const ai = getAiClient();
    return ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
         systemInstruction: 'You are Nita, a friendly and helpful AD Assistant. Help the user brainstorm ideas for their ad campaigns via text chat.',
      }
    });
};

export const sendChatMessage = async (chat: Chat, message: string): Promise<GenerateContentResponse> => {
    return await chat.sendMessage({ message });
};


export const generateAdCopy = async (productInfo: string, brandKit?: BrandKit): Promise<GenerateContentResponse> => {
    const ai = getAiClient();
    
    let brandContext = "";
    if (hasBrandInfo(brandKit)) {
        brandContext = `The ad is for the brand "${brandKit!.name}", which is described as "${brandKit!.description}". Their website is ${brandKit!.website}. The copy must align with this brand identity.`;
    }

    const prompt = `
        Generate a set of ad copy for a product with the following description: "${productInfo}".
        ${brandContext}
        Provide copy for Instagram (short, punchy, with emojis), Facebook (more detailed, story-like), and TikTok (trendy, with popular hashtags).
    `;
    
    return await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    instagram: { type: Type.STRING },
                    facebook: { type: Type.STRING },
                    tiktok: { type: Type.STRING }
                },
                required: ["instagram", "facebook", "tiktok"]
            },
            thinkingConfig: { thinkingBudget: 32768 }
        }
    });
};

export const generatePerformanceRecommendations = async (creative: AdCreative): Promise<GenerateContentResponse> => {
    const ai = getAiClient();
    const { type, copies, basePrompt, performance } = creative;

    if (!performance) {
        throw new Error("Performance data is missing for this creative.");
    }

    const performanceSummary = `
        - Impressions: ${performance.impressions}
        - Clicks: ${performance.clicks}
        - Conversions: ${performance.conversions}
        - Click-Through Rate (CTR): ${((performance.clicks / performance.impressions) * 100).toFixed(2)}%
    `;

    const creativeSummary = `
        - Type: ${type}
        - Description/Prompt: "${basePrompt}"
        - Ad Copy: ${copies.map(c => `\n  - ${c.platform}: "${c.text}"`).join('')}
    `;

    const prompt = `
        As an expert marketing analyst, review the following ad campaign data. Provide 2-3 concise, actionable recommendations for improvement based on its performance.
        Focus on suggesting specific changes to the ad copy, visual elements, or targeting strategy to increase clicks and conversions.
        
        Ad Creative Details:
        ${creativeSummary}

        Performance Metrics:
        ${performanceSummary}

        Return your recommendations as a JSON array of strings.
    `;

    return await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
            },
            thinkingConfig: { thinkingBudget: 32768 }
        }
    });
};

export const getOptimalPostingTimes = async (productDescription: string, platform: string): Promise<GenerateContentResponse> => {
    const ai = getAiClient();
    const prompt = `
        As a social media marketing expert, suggest the 3 optimal posting times for an ad on ${platform} about "${productDescription}".
        Consider typical user activity for that platform. Provide a brief, one-sentence reason for each suggestion.
        Return the response as a JSON array of objects, each with "time" (e.g., "9:00 AM") and "reason" properties.
    `;
    return await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        time: { type: Type.STRING },
                        reason: { type: Type.STRING }
                    },
                    required: ["time", "reason"]
                }
            },
            thinkingConfig: { thinkingBudget: 32768 }
        }
    });
};

export const recycleAdCreative = async (creative: AdCreative): Promise<GenerateContentResponse> => {
    const ai = getAiClient();
    const creativeSummary = `
        - Original Visual Prompt: "${creative.basePrompt}"
        - Original Ad Copy: ${creative.copies.map(c => `\n  - ${c.platform}: "${c.text}"`).join('')}
    `;

    const prompt = `
        You are a creative director tasked with recycling a successful ad. Your goal is to create a fresh but familiar version of the ad.
        Do not just repeat the original. Slightly modify the copy and suggest a new visual that is a variation of the original.

        Original Ad Content:
        ${creativeSummary}

        Based on the original, provide the following in a JSON object:
        1. "copies": An object with new, slightly rephrased ad copy for "instagram", "facebook", and "tiktok". The new copy should keep the original's tone and core message but feel new.
        2. "visualPrompt": A string for a new ad image. This should be a creative variation of the original prompt (e.g., different angle, background, style, or context).
    `;

    return await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    copies: {
                        type: Type.OBJECT,
                        properties: {
                            instagram: { type: Type.STRING },
                            facebook: { type: Type.STRING },
                            tiktok: { type: Type.STRING }
                        },
                        required: ["instagram", "facebook", "tiktok"]
                    },
                    visualPrompt: { type: Type.STRING }
                },
                required: ["copies", "visualPrompt"]
            },
            thinkingConfig: { thinkingBudget: 32768 }
        }
    });
};


// --- Image Generation & Editing ---
export const generateImageFromScratch = async (prompt: string, brandKit?: BrandKit): Promise<string> => {
    const ai = getAiClient();
    
    let brandContext = "";
    if (hasBrandInfo(brandKit)) {
        brandContext = ` The visual style should align with the brand "${brandKit!.name}", which is "${brandKit!.description}". Where appropriate, incorporate the brand's primary color (${brandKit!.brandColors.primary}) and secondary color (${brandKit!.brandColors.secondary}).`;
    }

    const fullPrompt = `${prompt}.${brandContext}`;

    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: fullPrompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '1:1',
        },
    });
    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64ImageBytes}`;
};

export const editImageWithText = async (base64ImageData: string, mimeType: string, prompt: string, brandKit?: BrandKit): Promise<string> => {
    const ai = getAiClient();

    let brandContext = "";
    if (hasBrandInfo(brandKit)) {
        brandContext = ` The visual style of this edit should align with the brand "${brandKit!.name}", which is "${brandKit!.description}". Consider using the brand's primary color (${brandKit!.brandColors.primary}) or secondary color (${brandKit!.brandColors.secondary}) if it makes sense for the edit.`;
    }

    const fullPrompt = `${prompt}.${brandContext}`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: base64ImageData, mimeType: mimeType } },
                { text: fullPrompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });
    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    throw new Error("No image generated from edit");
};

// --- Video Generation ---
// FIX: The return type `VideosOperation` is no longer exported by the SDK. Changed to `any`.
export const generateVideoFromImage = async (
    base64ImageData: string, 
    mimeType: string, 
    prompt: string, 
    aspectRatio: '16:9' | '9:16',
    cameraMovement: string,
    visualStyle: string,
    mood: string,
    brandKit?: BrandKit
): Promise<any> => {
    const ai = getAiClient();

    let fullPrompt = prompt || "An engaging video ad for this product.";
    
    const advancedDetails = [];
    if (cameraMovement && cameraMovement !== 'none') advancedDetails.push(`The camera movement should be a '${cameraMovement}'.`);
    if (visualStyle && visualStyle !== 'none') advancedDetails.push(`The visual style should be '${visualStyle}'.`);
    if (mood) advancedDetails.push(`The mood and tone should be '${mood}'.`);
    
    if (hasBrandInfo(brandKit)) {
        advancedDetails.push(`The video must align with the brand "${brandKit!.name}" (${brandKit!.description}). The aesthetic should reflect the brand's colors: primary (${brandKit!.brandColors.primary}) and secondary (${brandKit!.brandColors.secondary}).`);
    }

    if (advancedDetails.length > 0) {
        fullPrompt += `\n\nVideo details: ${advancedDetails.join(' ')}`;
    }

    return await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: fullPrompt,
        image: {
            imageBytes: base64ImageData,
            mimeType: mimeType,
        },
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: aspectRatio,
        }
    });
};


// FIX: The type `VideosOperation` is no longer exported by the SDK. Changed to `any`.
export const checkVideoOperationStatus = async (operation: any): Promise<any> => {
    const ai = getAiClient();
    return await ai.operations.getVideosOperation({ operation });
};


// --- Live API Assistant ---

// Encoding/Decoding helpers
function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// FIX: Export decode function to be used in App.tsx for proper audio data handling.
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


export const createPcmBlob = (data: Float32Array): Blob => {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

export const connectToLiveAssistant = (callbacks: {
    onopen: () => void;
    onmessage: (message: LiveServerMessage) => Promise<void>;
    onerror: (e: ErrorEvent) => void;
    onclose: (e: CloseEvent) => void;
// FIX: The return type `LiveSession` is no longer exported by the SDK. Changed to `any`.
}): Promise<any> => {
    const ai = getAiClient();
    return ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: callbacks,
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            systemInstruction: 'You are Nita, a friendly and helpful AD Assistant. Help the user brainstorm ideas for their ad campaigns.',
            outputAudioTranscription: {},
            inputAudioTranscription: {},
        },
    });
};
