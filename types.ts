export enum AdType {
  IMAGE = 'image',
  VIDEO = 'video',
}

export interface AdPerformance {
  clicks: number;
  impressions: number;
  conversions: number;
}

export interface AdCreative {
  id: string;
  type: AdType;
  imageUrl?: string;
  videoUrl?: string;
  copies: { platform: string; text: string }[];
  basePrompt: string;
  baseImage: string;
  performance?: AdPerformance;
  recommendations?: string[];
}

export type View = 'dashboard' | 'create' | 'assistant' | 'calendar' | 'library' | 'profile' | 'analyzer';

export interface GeneratedCopy {
    platform: string;
    text: string;
}

export interface ScheduledPost {
  id: string;
  creativeId: string;
  platform: string;
  scheduledAt: string; // ISO string
}

export interface LibraryAsset {
  id: string; 
  url: string;
  type: 'image' | 'video';
  prompt: string; 
  createdAt: string; // ISO string
}

export type AssetLibrary = LibraryAsset[];

// Renamed from Transcription to be more generic for chat and voice
export interface ChatMessage {
    id: string;
    speaker: 'user' | 'ai';
    text: string;
    feedback?: 'like' | 'dislike';
}

export interface UserProfile {
    name: string;
    email: string;
}

export interface BrandKit {
    logoUrl: string | null;
    name: string;
    description: string;
    website: string;
    brandColors: {
        primary: string;
        secondary: string;
    }
}

export type SocialPlatform = 'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'x';

export type SocialConnections = Record<SocialPlatform, boolean>;

export interface ScriptAnalysis {
  overallScore: number;
  hookStrength: number;
  painPointClarity: number;
  ctaStrength: number;
  usage: {
    wordCount: number;
    readingTimeSeconds: number;
  };
  improvements: {
    before: string;
    after: string;
    suggestion: string;
  }[];
  annotatedScript: {
    text: string;
    annotation?: string | null;
  }[];
}

export interface AnalyzedScript {
  id: string;
  originalScript: string;
  analysis: ScriptAnalysis;
  createdAt: string; // ISO string
}
