
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AdCreative, AdType, View, GeneratedCopy, ScheduledPost, AssetLibrary, LibraryAsset, ChatMessage, UserProfile, BrandKit, SocialConnections, SocialPlatform } from './types';
// FIX: Import the 'decode' function for correct audio data processing.
import { 
    generateAdCopy, 
    generateImageFromScratch, 
    editImageWithText,
    generateVideoFromImage,
    checkVideoOperationStatus,
    connectToLiveAssistant,
    createPcmBlob,
    decodeAudioData,
    decode,
    generatePerformanceRecommendations,
    getOptimalPostingTimes,
    recycleAdCreative,
    startChatSession,
    sendChatMessage
} from './services/geminiService';
// FIX: Removed LiveSession and VideosOperation as they are no longer exported types.
import { LiveServerMessage, Chat } from '@google/genai';

// --- Helper Functions ---
const fileToBase64 = (file: File): Promise<{base64: string, mimeType: string, url: string}> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const [mimeString, base64] = result.split(',');
            const mimeType = mimeString.split(':')[1].split(';')[0];
            resolve({ base64, mimeType, url: result });
        };
        reader.onerror = error => reject(error);
    });
};


const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
}

// --- SVG Icons ---
const PlusIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className || "w-6 h-6"}><path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" /></svg>
);
const DashboardIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
);
const LibraryIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>
);
const CalendarIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18M-4.5 12h22.5" /></svg>
);
const AssistantIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a.75.75 0 00.75-.75V6.108c0-.72.58-1.308 1.308-1.308h1.506c.72 0 1.308.58 1.308 1.308v11.942a.75.75 0 00.75.75h.318a.75.75 0 00.75-.75v-3.468a.75.75 0 00-.75-.75h-1.318a.75.75 0 00-.75.75v1.468a.75.75 0 01-.75.75h-3.182a.75.75 0 01-.75-.75v-1.468a.75.75 0 00-.75-.75H8.25a.75.75 0 00-.75.75v3.468a.75.75 0 00.75.75h.318a.75.75 0 00.75-.75v-3.468a.75.75 0 01.75-.75h1.532a.75.75 0 01.75.75v11.942a.75.75 0 00.75.75zM4.5 9.75a.75.75 0 01.75-.75h13.5a.75.75 0 010 1.5H5.25a.75.75 0 01-.75-.75z" /></svg>
);
const DownloadIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-5 h-5"}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
);
const ClipboardIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a2.25 2.25 0 01-2.25 2.25h-1.5a2.25 2.25 0 01-2.25-2.25V4.5A2.25 2.25 0 019 2.25h3c1.03 0 1.9.693 2.166 1.638m7.332 0c.055.194.084.4.084.612v0a2.25 2.25 0 01-2.25 2.25h-1.5a2.25 2.25 0 01-2.25-2.25V4.5A2.25 2.25 0 019 2.25h3c1.03 0 1.9.693 2.166 1.638m-3.466 9.312a.75.75 0 01-.75.75h-3a.75.75 0 010-1.5h3a.75.75 0 01.75.75z" /></svg>
);
const ClockIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const ZoomInIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
    </svg>
);
const BrainIcon: React.FC<{className?: string}> = ({className="w-5 h-5"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.502L16.5 21.75l-.398-1.248a3.375 3.375 0 00-2.456-2.456L12.75 18l1.248-.398a3.375 3.375 0 002.456-2.456L16.5 14.25l.398 1.248a3.375 3.375 0 002.456 2.456L20.25 18l-1.248.398a3.375 3.375 0 00-2.456 2.456z" /></svg>
);
const SyncIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001a7.5 7.5 0 01-1.946 4.992l-.001.001c-.04.04-.08.079-.12.118a7.5 7.5 0 01-11.284 0l-.001-.001a7.5 7.5 0 01-1.946-4.992v.001H9.023m-3.008 0A7.5 7.5 0 0112 3.75v.001a7.5 7.5 0 016.992 5.598" />
    </svg>
);
const RecycleIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.181-3.183m-3.181-4.991v4.99" />
    </svg>
);
const CheckCircleIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const ThumbsUpIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}><path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.422 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H6.633a1.875 1.875 0 01-1.875-1.875V11.625c0-1.036.84-1.875 1.875-1.875z" /></svg>
);
const ThumbsDownIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}><path strokeLinecap="round" strokeLinejoin="round" d="M7.867 14.25c-.806 0-1.533.422-2.031 1.08a9.041 9.041 0 00-2.861 2.4c-.723.384-1.35.956-1.653 1.715a4.498 4.498 0 01-.322 1.672V21a.75.75 0 00.75.75c.75 0 1.453-.342 1.956-.872a9.034 9.034 0 002.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 01.322-1.672V19.5a2.25 2.25 0 00-2.25-2.25c-1.152 0-2.243.26-3.218.723-.558.266-1.282-.107-1.282-.725V14.25h-3.126c-1.026 0-1.945-.694-2.054-1.715A12.134 12.134 0 011.5 12c0-4.636 2.005-8.723 5.064-11.499.388-.482.987-.729 1.605-.729H10.52c.483 0 .964.078 1.423.23l3.114 1.04a4.5 4.5 0 011.423.23h1.294a1.875 1.875 0 011.875 1.875v1.125c0 1.036-.84 1.875-1.875 1.875z" /></svg>
);
const MicrophoneIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5a6 6 0 00-12 0v1.5a6 6 0 006 6z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 4.142-3.358 7.5-7.5 7.5s-7.5-3.358-7.5-7.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 14.25v4.5" /></svg>
);
const SendIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
);
const NitaIcon: React.FC<{className?: string}> = ({className}) => (
  <svg className={className || "w-10 h-10"} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2ZM12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4Z" />
    <circle cx="9" cy="12" r="1.5" />
    <circle cx="15" cy="12" r="1.5" />
    <path d="M9 16C9.85038 16 10.6327 15.4954 10.9575 15H13.0425C13.3673 15.4954 14.1496 16 15 16C15.9328 16 16.5 15.2447 16.5 15H7.5C7.5 15.2447 8.06719 16 9 16Z" />
  </svg>
);
const UserProfileIcon: React.FC<{className?: string}> = ({className}) => (
  <svg className={className || "w-10 h-10"} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2ZM12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4Z" />
    <path d="M12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7Z" />
    <path d="M12 14C9.23858 14 7 16.2386 7 19H17C17 16.2386 14.7614 14 12 14Z" />
  </svg>
);
// --- NEW SOCIAL MEDIA ICONS ---
const FacebookIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className || "w-6 h-6"} fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
);
const InstagramIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className || "w-6 h-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01M12 2.02c-2.84 0-3.18.01-4.28.06-1.1.05-1.86.22-2.52.48a4.8 4.8 0 00-1.73 1.16 4.8 4.8 0 00-1.16 1.73c-.26.66-.43 1.42-.48 2.52-.05 1.1-.06 1.44-.06 4.28s.01 3.18.06 4.28c.05 1.1.22 1.86.48 2.52a4.8 4.8 0 001.16 1.73 4.8 4.8 0 001.73 1.16c.66.26 1.42.43 2.52.48 1.1.05 1.44.06 4.28.06s3.18-.01 4.28-.06c1.1-.05 1.86-.22 2.52-.48a4.8 4.8 0 001.73-1.16 4.8 4.8 0 001.16-1.73c.26-.66.43-1.42.48-2.52.05-1.1.06-1.44.06-4.28s-.01-3.18-.06-4.28c-.05-1.1-.22-1.86-.48-2.52a4.8 4.8 0 00-1.16-1.73 4.8 4.8 0 00-1.73-1.16c-.66-.26-1.42-.43-2.52-.48C15.18 2.03 14.84 2.02 12 2.02z"/></svg>
);
const TikTokIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className || "w-6 h-6"} fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-2.43.03-4.63-1.22-5.9-3.21-1.27-1.99-1.95-4.24-1.8-6.42.12-1.63.78-3.19 1.8-4.31 1.05-1.14 2.45-1.84 3.99-1.92.01-3.09-.01-6.18 0-9.26 1.23-.04 2.38-.01 3.53-.02z"/></svg>
);
const YouTubeIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className || "w-6 h-6"} fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
);
const XIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className || "w-6 h-6"} fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
);
const Spinner: React.FC = () => (
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
);
const SmallSpinner: React.FC = () => (
    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
);


// --- Sub Components ---

const Header: React.FC<{ setView: (view: View) => void; currentView: View }> = ({ setView, currentView }) => {
    const navItemClass = (view: View) => `flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-colors duration-200 ${currentView === view ? 'bg-blue-600 text-white' : 'hover:bg-slate-700'}`;
    return (
        <header className="bg-slate-800/80 backdrop-blur-sm text-white p-4 flex justify-between items-center shadow-lg sticky top-0 z-50 border-b border-slate-700">
            <h1 className="text-2xl font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-300">VidiAds</h1>
            <nav className="flex items-center space-x-2">
                <div className={navItemClass('dashboard')} onClick={() => setView('dashboard')}>
                    <DashboardIcon />
                    <span className="hidden sm:inline">Dashboard</span>
                </div>
                 <div className={navItemClass('library')} onClick={() => setView('library')}>
                    <LibraryIcon />
                    <span className="hidden sm:inline">Library</span>
                </div>
                 <div className={navItemClass('calendar')} onClick={() => setView('calendar')}>
                    <CalendarIcon />
                    <span className="hidden sm:inline">Calendar</span>
                </div>
                <button onClick={() => setView('create')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 transition-transform duration-200 hover:scale-105">
                    <PlusIcon />
                    <span className="hidden md:inline">Create Ad</span>
                </button>
                <div className={navItemClass('profile')} onClick={() => setView('profile')}>
                    <UserProfileIcon className="w-6 h-6" />
                </div>
            </nav>
        </header>
    );
};

interface AdCardProps {
    creative: AdCreative;
    onAnalyze: (id: string) => void;
    onSchedule: (creative: AdCreative) => void;
    onSync: (id: string) => void;
    onRecycle: (id: string) => void;
    isAnalyzing: boolean;
    isSyncing: boolean;
    isRecycling: boolean;
}
const AdCard: React.FC<AdCardProps> = ({ creative, onAnalyze, onSchedule, onSync, onRecycle, isAnalyzing, isSyncing, isRecycling }) => {
    const [showCopied, setShowCopied] = useState(false);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
    };
    
    const handleDownload = (url: string | undefined, filename: string) => {
        if (!url) return;
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    const isActionInProgress = isAnalyzing || isSyncing || isRecycling;

    return (
        <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden flex flex-col justify-between border border-slate-700 transition-transform hover:-translate-y-1">
            <div>
                {creative.type === AdType.IMAGE && creative.imageUrl && (
                    <img src={creative.imageUrl} alt={creative.basePrompt} className="w-full h-56 object-cover" />
                )}
                {creative.type === AdType.VIDEO && creative.videoUrl && (
                    <video src={creative.videoUrl} controls className="w-full h-56 object-cover bg-black"></video>
                )}
                <div className="p-4">
                    <p className="text-slate-400 text-sm mb-3 truncate" title={creative.basePrompt}>Prompt: {creative.basePrompt}</p>
                    <div className="space-y-3">
                        {creative.copies.map((copy, index) => (
                            <div key={index} className="bg-slate-700/50 p-3 rounded-lg">
                                <h4 className="font-semibold text-blue-400 capitalize">{copy.platform}</h4>
                                <p className="text-slate-300 text-sm mt-1">{copy.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="p-4 space-y-4">
                {creative.performance && (
                    <div className="bg-slate-900/70 p-3 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold text-slate-300 text-sm">Performance</h4>
                            <button onClick={() => onSync(creative.id)} disabled={isActionInProgress} className="text-slate-400 hover:text-white disabled:text-slate-600 disabled:cursor-not-allowed transition-colors" title="Sync performance data">
                               {isSyncing ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-400"></div> : <SyncIcon className="w-4 h-4" />}
                            </button>
                        </div>
                        <div className="flex justify-between text-xs text-slate-400">
                            <span><strong className="text-white">{creative.performance.impressions.toLocaleString()}</strong> Impr.</span>
                            <span><strong className="text-white">{creative.performance.clicks.toLocaleString()}</strong> Clicks</span>
                             <span><strong className="text-white">{((creative.performance.clicks / creative.performance.impressions) * 100).toFixed(2)}%</strong> CTR</span>
                        </div>
                    </div>
                )}
                
                 {creative.recommendations ? (
                    <div className="bg-slate-900/70 p-3 rounded-lg">
                        <h4 className="font-semibold text-teal-400 text-sm mb-2 flex items-center space-x-2"><BrainIcon /> <span>AI Recommendations</span></h4>
                        <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                            {creative.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                        </ul>
                    </div>
                 ) : (
                    <button onClick={() => onAnalyze(creative.id)} disabled={isActionInProgress} className="w-full flex items-center justify-center space-x-2 text-sm bg-teal-600 hover:bg-teal-700 disabled:bg-teal-800 disabled:cursor-not-allowed py-2 px-3 rounded-lg transition-colors">
                       {isAnalyzing ? <SmallSpinner /> : <BrainIcon />}
                       <span>{isAnalyzing ? 'Analyzing...' : 'Analyze Performance'}</span>
                    </button>
                 )}


                <div className="border-t border-slate-700 pt-4 flex items-center justify-between gap-2">
                     <button
                        onClick={() => onSchedule(creative)}
                        disabled={isActionInProgress}
                        className="flex-1 flex items-center justify-center space-x-2 text-sm bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:cursor-not-allowed py-2 px-3 rounded-lg transition-colors"
                    >
                        <ClockIcon />
                        <span>Schedule</span>
                    </button>
                     <button
                        onClick={() => onRecycle(creative.id)}
                        disabled={isActionInProgress}
                        className="flex-1 flex items-center justify-center space-x-2 text-sm bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-800 disabled:cursor-not-allowed py-2 px-3 rounded-lg transition-colors"
                    >
                        {isRecycling ? <SmallSpinner /> : <RecycleIcon />}
                        <span>{isRecycling ? 'Recycling' : 'Recycle'}</span>
                    </button>
                    <button
                        onClick={() => handleDownload(creative.imageUrl || creative.videoUrl, `vidiad-${creative.id}.${creative.type === 'image' ? 'jpg' : 'mp4'}`)}
                        className="flex-1 flex items-center justify-center space-x-2 text-sm bg-blue-600 hover:bg-blue-700 py-2 px-3 rounded-lg transition-colors"
                    >
                        <DownloadIcon />
                        <span>Download</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

const Dashboard: React.FC<{ creatives: AdCreative[], setCreatives: React.Dispatch<React.SetStateAction<AdCreative[]>>, onSchedule: (creative: AdCreative) => void }> = ({ creatives, setCreatives, onSchedule }) => {
    const [analyzingId, setAnalyzingId] = useState<string | null>(null);
    const [syncingId, setSyncingId] = useState<string | null>(null);
    const [recyclingId, setRecyclingId] = useState<string | null>(null);

    const handleAnalyzeCreative = async (creativeId: string) => {
        setAnalyzingId(creativeId);
        try {
            const creativeToAnalyze = creatives.find(c => c.id === creativeId);
            if (!creativeToAnalyze) throw new Error("Creative not found");

            const response = await generatePerformanceRecommendations(creativeToAnalyze);
            const recommendations = JSON.parse(response.text) as string[];

            const newCreatives = creatives.map(c => 
                c.id === creativeId ? { ...c, recommendations: recommendations } : c
            );
            setCreatives(newCreatives);

        } catch (error) {
            console.error("Failed to analyze performance:", error);
            alert("Could not retrieve AI recommendations. Please try again.");
        } finally {
            setAnalyzingId(null);
        }
    };

    const handleSyncPerformance = (creativeId: string) => {
        setSyncingId(creativeId);
        // Simulate an API call to fetch fresh data
        setTimeout(() => {
            setCreatives(prevCreatives => prevCreatives.map(c => {
                if (c.id === creativeId) {
                    const oldPerformance = c.performance || { impressions: 10000, clicks: 200, conversions: 10 };
                    // Simulate an increase in numbers as if the campaign has been running longer
                    const newPerformance = {
                        impressions: oldPerformance.impressions + Math.floor(Math.random() * 5000) + 1000,
                        clicks: oldPerformance.clicks + Math.floor(Math.random() * 200) + 50,
                        conversions: oldPerformance.conversions + Math.floor(Math.random() * 10) + 2,
                    };
                    return { ...c, performance: newPerformance };
                }
                return c;
            }));
            setSyncingId(null);
        }, 1500);
    };

    const handleRecycleCreative = async (creativeId: string) => {
        setRecyclingId(creativeId);
        try {
            const creativeToRecycle = creatives.find(c => c.id === creativeId);
            if (!creativeToRecycle) throw new Error("Creative not found");

            // 1. Get recycled content suggestions from AI
            const response = await recycleAdCreative(creativeToRecycle);
            const recycledData = JSON.parse(response.text) as {
                copies: { instagram: string; facebook: string; tiktok: string; };
                visualPrompt: string;
            };

            // 2. Generate the new visual based on the recycled prompt
            const newImageUrl = await generateImageFromScratch(recycledData.visualPrompt);

            // 3. Create a new ad creative object
            const newCopies: GeneratedCopy[] = [
                { platform: 'instagram', text: recycledData.copies.instagram },
                { platform: 'facebook', text: recycledData.copies.facebook },
                { platform: 'tiktok', text: recycledData.copies.tiktok },
            ];
            
            const newCreative: AdCreative = {
                id: `recycled-${new Date().toISOString()}`,
                type: AdType.IMAGE,
                imageUrl: newImageUrl,
                copies: newCopies,
                basePrompt: recycledData.visualPrompt,
                baseImage: creativeToRecycle.baseImage,
                performance: { // Start with fresh mock data
                    impressions: Math.floor(Math.random() * 1000) + 500,
                    clicks: Math.floor(Math.random() * 50) + 10,
                    conversions: Math.floor(Math.random() * 5) + 1,
                },
            };

            // 4. Add the new creative to the state
            setCreatives(prev => [newCreative, ...prev]);

        } catch (error) {
            console.error("Failed to recycle creative:", error);
            alert("Could not recycle the ad creative. Please try again.");
        } finally {
            setRecyclingId(null);
        }
    };

    return (
        <div className="p-8">
            <h2 className="text-3xl font-bold mb-6 text-white">Your Ad Dashboard</h2>
            {creatives.length === 0 ? (
                <div className="text-center py-20 bg-slate-800 rounded-xl">
                    <p className="text-slate-400">You haven't created any ads yet.</p>
                    <p className="text-slate-500 mt-2">Click "Create Ad" to get started!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {creatives.map(creative => (
                        <AdCard 
                            key={creative.id} 
                            creative={creative} 
                            onAnalyze={handleAnalyzeCreative} 
                            onSchedule={onSchedule}
                            onSync={handleSyncPerformance}
                            onRecycle={handleRecycleCreative}
                            isAnalyzing={analyzingId === creative.id}
                            isSyncing={syncingId === creative.id}
                            isRecycling={recyclingId === creative.id}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const PreviewModal: React.FC<{
    asset: { url: string; type: 'image' | 'video' };
    onClose: () => void;
}> = ({ asset, onClose }) => {
    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = asset.url;
        const fileExtension = asset.type === 'image' ? 'jpg' : 'mp4';
        const fileName = `vidiad-preview-${new Date().getTime()}.${fileExtension}`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-800 rounded-xl shadow-2xl max-w-4xl max-h-[90vh] w-full flex flex-col border border-slate-700" onClick={e => e.stopPropagation()}>
                <div className="p-4 flex-grow overflow-auto flex justify-center items-center">
                    {asset.type === 'image' ? (
                        <img src={asset.url} alt="Preview" className="max-w-full max-h-[70vh] object-contain"/>
                    ) : (
                        <video src={asset.url} controls autoPlay className="max-w-full max-h-[70vh] object-contain"></video>
                    )}
                </div>
                <div className="p-4 bg-slate-900 border-t border-slate-700 flex justify-end items-center space-x-4">
                    <button
                        onClick={handleDownload}
                        className="flex items-center space-x-2 text-sm bg-blue-600 hover:bg-blue-700 py-2 px-4 rounded-lg transition-colors text-white"
                    >
                        <DownloadIcon />
                        <span>Download</span>
                    </button>
                    <button onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg">Close</button>
                </div>
            </div>
        </div>
    );
};

const AdCreator: React.FC<{ 
    addCreative: (creative: AdCreative) => void, 
    addAssetsToLibrary: (assets: LibraryAsset | LibraryAsset[]) => void,
    setView: (view: View) => void,
    brandKit: BrandKit
}> = ({ addCreative, addAssetsToLibrary, setView, brandKit }) => {
    const [step, setStep] = useState(1);
    const [productImage, setProductImage] = useState<{file: File, url: string, base64: string, mimeType: string} | null>(null);
    const [description, setDescription] = useState('');
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [copies, setCopies] = useState<GeneratedCopy[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [previewAsset, setPreviewAsset] = useState<{url: string, type: 'image' | 'video'} | null>(null);
    const [justSaved, setJustSaved] = useState(false);

    // New state for advanced video controls
    const [cameraMovement, setCameraMovement] = useState('none');
    const [visualStyle, setVisualStyle] = useState('none');
    const [mood, setMood] = useState('');

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const { base64, mimeType, url } = await fileToBase64(file);
            setProductImage({ file, url, base64, mimeType });
            addAssetsToLibrary({
                id: url,
                url: url,
                type: 'image',
                prompt: `Initial upload: ${file.name}`,
                createdAt: new Date().toISOString(),
            });
        }
    };
    
    const handleGenerateImages = async (prompt: string, type: 'edit' | 'scratch') => {
        setIsLoading(true);
        setLoadingMessage(type === 'edit' ? 'Applying edit...' : 'Generating new image...');
        try {
            if (type === 'edit' && !productImage) {
                alert("Please upload a product image to edit.");
                setIsLoading(false);
                return;
            }
            if (!prompt) {
                alert("Please enter a prompt.");
                setIsLoading(false);
                return;
            }

            let resultImage: string;
            if (type === 'edit' && productImage) {
                resultImage = await editImageWithText(productImage.base64, productImage.mimeType, prompt, brandKit);
            } else {
                resultImage = await generateImageFromScratch(prompt, brandKit);
            }
            setGeneratedImages(prev => [...prev, resultImage]);
            addAssetsToLibrary({
                id: resultImage,
                url: resultImage,
                type: 'image',
                prompt: prompt,
                createdAt: new Date().toISOString(),
            });
        } catch (error) {
            console.error("Error generating image:", error);
            alert("Failed to generate image. Check the console for details.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleVirtualPhotography = async () => {
        const userPrompt = promptRef.current?.value;
        if (!productImage) {
            alert("Please upload a product image first.");
            return;
        }
        if (!userPrompt) {
            alert("Please provide a prompt describing the scene for the virtual photograph.");
            return;
        }

        setIsLoading(true);
        setLoadingMessage('Creating virtual photograph...');
        try {
            const fullPrompt = `Create a high-quality, realistic lifestyle or studio photograph. Take the product from the uploaded image and place it seamlessly into the scene described as: "${userPrompt}". The product is: "${description}". Ensure the final image has natural lighting, shadows, and perspective, making it look professional.`;

            const resultImage = await editImageWithText(productImage.base64, productImage.mimeType, fullPrompt, brandKit);
            setGeneratedImages(prev => [...prev, resultImage]);
            addAssetsToLibrary({
                id: resultImage,
                url: resultImage,
                type: 'image',
                prompt: fullPrompt,
                createdAt: new Date().toISOString(),
            });
        } catch (error) {
            console.error("Error generating virtual photograph:", error);
            alert("Failed to generate virtual photograph. Check the console for details.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateVideo = async (prompt: string, aspectRatio: '16:9' | '9:16') => {
        if (!selectedImage) {
            alert("Please select an image first.");
            return;
        }
        
        let keyIsSelected = window.aistudio && await window.aistudio.hasSelectedApiKey();
        if (!keyIsSelected) {
            try {
                await window.aistudio.openSelectKey();
            } catch (e) {
                alert("An error occurred while trying to select an API key.");
                return;
            }
        }

        setIsLoading(true);
        setVideoUrl(null); 
        const messages = ["Warming up the video engine...", "Animating your product...", "Adding final touches...", "This can take a few minutes..."];
        let messageIndex = 0;
        const interval = setInterval(() => {
            setLoadingMessage(messages[messageIndex % messages.length]);
            messageIndex++;
        }, 4000);
        setLoadingMessage(messages[0]);

        try {
            const base64Data = selectedImage.split(',')[1];
            const mimeType = selectedImage.match(/data:(.*);/)?.[1] || 'image/jpeg';
            let operation = await generateVideoFromImage(base64Data, mimeType, prompt, aspectRatio, cameraMovement, visualStyle, mood, brandKit);

            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                operation = await checkVideoOperationStatus(operation);
            }
            
            clearInterval(interval);

            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (downloadLink) {
                const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                if (videoResponse.ok) {
                    const videoBlob = await videoResponse.blob();
                    const newVideoUrl = URL.createObjectURL(videoBlob);
                    setVideoUrl(newVideoUrl);
                    addAssetsToLibrary({
                        id: newVideoUrl,
                        url: newVideoUrl,
                        type: 'video',
                        prompt: prompt,
                        createdAt: new Date().toISOString(),
                    });
                } else {
                    const errorText = await videoResponse.text();
                    console.error("Video download failed:", videoResponse.status, errorText);
                    if (videoResponse.status === 404) {
                        throw new Error("Requested entity was not found.");
                    }
                    throw new Error(`Failed to download the generated video. Status: ${videoResponse.status}`);
                }
            } else {
                throw new Error('Video generation did not return a valid link.');
            }
        } catch (error) {
            console.error("Error generating video:", error);
            const errorMessage = (error as Error).message;
            if (errorMessage.includes("Requested entity was not found")) {
                alert("API Key not found or invalid. This can happen if the key is incorrect or if the 'Generative AI API' is not enabled on the associated Google Cloud project. You will be prompted to select a valid key.");
                try {
                    if (window.aistudio) {
                        await window.aistudio.openSelectKey();
                        alert("A new API key has been selected. Please try generating the video again.");
                    } else {
                        throw new Error("AI Studio context is not available.");
                    }
                } catch (e) {
                     alert("An error occurred while trying to select a new API key. Please refresh and try again.");
                }
            } else {
                alert(`Failed to generate video: ${errorMessage}`);
            }
        } finally {
            setIsLoading(false);
            clearInterval(interval);
        }
    };

    const handleGenerateCopy = async () => {
        setStep(step + 1); // Move to next step immediately
        setIsLoading(true);
        setLoadingMessage('Generating compelling ad copy...');
        try {
            const response = await generateAdCopy(description, brandKit);
            const jsonResponse = JSON.parse(response.text);
            const generatedCopies: GeneratedCopy[] = [
                { platform: 'instagram', text: jsonResponse.instagram },
                { platform: 'facebook', text: jsonResponse.facebook },
                { platform: 'tiktok', text: jsonResponse.tiktok },
            ];
            setCopies(generatedCopies);
        } catch (error) {
            console.error("Error generating copy:", error);
            alert("Failed to generate ad copy.");
            setStep(step - 1); // Go back if it fails
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveAd = () => {
        const mockPerformance = {
            impressions: Math.floor(Math.random() * 40000) + 10000,
            clicks: Math.floor(Math.random() * 1000) + 200,
            conversions: Math.floor(Math.random() * 50) + 10,
        };

        const creative: AdCreative = {
            id: new Date().toISOString(),
            type: videoUrl ? AdType.VIDEO : AdType.IMAGE,
            imageUrl: videoUrl ? undefined : selectedImage || undefined,
            videoUrl: videoUrl || undefined,
            copies: copies,
            basePrompt: description,
            baseImage: productImage?.url || '',
            performance: mockPerformance,
        };
        addCreative(creative);
        
        setView('dashboard');
    };

    const handleSaveImageToLibrary = () => {
        if (!selectedImage) return;
        // Asset is already saved when generated, this button now provides feedback
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2500);
    };
    
    const promptRef = useRef<HTMLInputElement>(null);
    const videoPromptRef = useRef<HTMLInputElement>(null);

    const ImageCard: React.FC<{imgUrl: string, label?: string}> = ({ imgUrl, label }) => (
        <div className="relative group rounded-xl overflow-hidden border-4 border-transparent focus-within:border-blue-500 hover:border-slate-700 transition-colors">
            <img src={imgUrl} alt={label || 'Generated image'} className="w-full h-48 object-cover"/>
            
            {label && <div className="absolute bottom-0 left-0 right-0 text-center bg-black bg-opacity-60 text-xs py-1 text-white">{label}</div>}

            {selectedImage === imgUrl && (
                <div className="absolute inset-0 bg-black bg-opacity-60 flex justify-center items-center pointer-events-none">
                    <CheckCircleIcon className="w-16 h-16 text-white" />
                </div>
            )}

            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-70 transition-opacity flex justify-center items-center space-x-4">
                <button 
                    onClick={() => setPreviewAsset({ url: imgUrl, type: 'image' })} 
                    className="opacity-0 group-hover:opacity-100 p-2 bg-slate-700 rounded-full text-white hover:bg-slate-600 transition-all duration-300"
                    title="Preview Image"
                >
                    <ZoomInIcon className="w-6 h-6" />
                </button>
                <button 
                    onClick={() => setSelectedImage(imgUrl)} 
                    className="opacity-0 group-hover:opacity-100 p-2 bg-blue-600 rounded-full text-white hover:bg-blue-500 transition-all duration-300"
                    title="Select Image"
                >
                    <CheckCircleIcon className="w-6 h-6" />
                </button>
            </div>
        </div>
    );

    return (
        <div className="p-8 text-white relative">
            {isLoading && (
                <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col justify-center items-center z-50">
                    <Spinner />
                    <p className="mt-4 text-lg">{loadingMessage}</p>
                </div>
            )}
            {previewAsset && <PreviewModal asset={previewAsset} onClose={() => setPreviewAsset(null)} />}
            
            <h2 className="text-3xl font-bold mb-6">Create New Ad Campaign</h2>

            {/* Step 1: Upload and Describe */}
            {step === 1 && (
                <div className="space-y-6 max-w-2xl mx-auto">
                    <div>
                        <label className="block mb-2 font-semibold text-slate-300">1. Upload Product Image</label>
                        <div className="flex items-center space-x-4">
                            <input type="file" accept="image/png, image/jpeg" onChange={handleImageUpload} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-200 file:text-blue-700 hover:file:bg-slate-300 cursor-pointer" />
                            {productImage && <img src={productImage.url} alt="Product preview" className="w-24 h-24 object-cover rounded-xl"/>}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="description" className="block mb-2 font-semibold text-slate-300">2. Describe Your Product & Ad Goals</label>
                        <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={5} className="w-full bg-slate-700 p-3 rounded-xl border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder='e.g., "Eco-friendly coffee cup for young adults. Tone: playful and fun. Key selling points: reusable, stylish, keeps drinks hot." '></textarea>
                    </div>
                    <button onClick={() => { if(productImage && description) setStep(2); else alert("Please upload an image and provide a description."); }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg">Next: Generate Visuals</button>
                </div>
            )}

            {/* Step 2: Image Generation */}
            {step === 2 && (
                <div className="space-y-6">
                    <h3 className="text-2xl font-semibold">Generate Ad Images</h3>
                    <p className="text-slate-400 max-w-3xl">Use a prompt to edit your image, generate a new one, or create a professional virtual photograph. Hover over an image to Preview or Select it.</p>
                    <div className="bg-slate-800 p-4 rounded-xl space-y-3 border border-slate-700">
                        <input ref={promptRef} type="text" className="w-full bg-slate-700 p-3 rounded-lg border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Describe the scene or edit... e.g., 'on a marble countertop next to a plant'"/>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={handleVirtualPhotography} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg min-w-[180px]">
                                Virtual Photography
                            </button>
                            <button onClick={() => handleGenerateImages(promptRef.current?.value || '', 'edit')} className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg min-w-[180px]">Simple Edit</button>
                            <button onClick={() => handleGenerateImages(promptRef.current?.value || '', 'scratch')} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg min-w-[180px]">Generate from Scratch</button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {productImage && (
                            <ImageCard imgUrl={productImage.url} label="Original" />
                        )}
                        {generatedImages.map((img, i) => (
                             <ImageCard key={i} imgUrl={img} />
                        ))}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-slate-700">
                        <button onClick={() => setStep(1)} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg">Back</button>
                        
                        <div className="flex items-center gap-4">
                            {selectedImage && (
                                <button 
                                    onClick={handleSaveImageToLibrary} 
                                    className={`font-bold py-2 px-4 rounded-lg transition-colors ${justSaved ? 'bg-green-500 text-white' : 'bg-teal-600 hover:bg-teal-700 text-white'}`}
                                >
                                    {justSaved ? 'Saved!' : 'Save Selected Image'}
                                </button>
                            )}
                            <button 
                                onClick={() => setStep(3)} 
                                disabled={!selectedImage}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-500 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg"
                            >
                                Next: Generate Video
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Step 3: Video Generation */}
            {step === 3 && (
                <div className="space-y-6">
                    <h3 className="text-2xl font-semibold">Generate Video Ad</h3>
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        {selectedImage && <img src={selectedImage} alt="Selected visual" className="w-full md:w-64 h-auto object-cover rounded-xl"/>}
                        <div className="flex-grow space-y-4 w-full">
                             <input ref={videoPromptRef} type="text" className="w-full bg-slate-700 p-3 rounded-xl border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Video prompt, e.g., 'An exciting unboxing of this product'"/>
                             
                             <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                <details>
                                    <summary className="font-semibold cursor-pointer text-slate-300">Advanced Options</summary>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1">Camera Movement</label>
                                            <select value={cameraMovement} onChange={e => setCameraMovement(e.target.value)} className="w-full bg-slate-700 p-2 rounded-lg border border-slate-600">
                                                <option value="none">None</option>
                                                <option value="slow zoom in">Slow Zoom In</option>
                                                <option value="slow zoom out">Slow Zoom Out</option>
                                                <option value="pan left">Pan Left</option>
                                                <option value="pan right">Pan Right</option>
                                                <option value="crane shot">Crane Shot</option>
                                                <option value="dolly shot">Dolly Shot</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1">Visual Style</label>
                                            <select value={visualStyle} onChange={e => setVisualStyle(e.target.value)} className="w-full bg-slate-700 p-2 rounded-lg border border-slate-600">
                                                 <option value="none">Default</option>
                                                 <option value="cinematic">Cinematic</option>
                                                 <option value="hyper-realistic">Hyper-realistic</option>
                                                 <option value="stop motion">Stop Motion</option>
                                                 <option value="vintage film">Vintage Film</option>
                                                 <option value="anime">Anime</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-slate-300 mb-1">Mood & Tone</label>
                                             <input type="text" value={mood} onChange={e => setMood(e.target.value)} placeholder="e.g., Energetic and upbeat" className="w-full bg-slate-700 p-2 rounded-lg border border-slate-600"/>
                                        </div>
                                    </div>
                                </details>
                             </div>

                             <div className="flex gap-4">
                                <button disabled={isLoading} onClick={() => handleGenerateVideo(videoPromptRef.current?.value || description, '16:9')} className="disabled:bg-slate-500 flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg">Generate Landscape Video (16:9)</button>
                                <button disabled={isLoading} onClick={() => handleGenerateVideo(videoPromptRef.current?.value || description, '9:16')} className="disabled:bg-slate-500 flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg">Generate Portrait Video (9:16)</button>
                             </div>
                        </div>
                    </div>
                    
                    {videoUrl && (
                        <div className="mt-6 p-4 bg-slate-800 rounded-xl border border-slate-700">
                            <h4 className="text-xl font-semibold mb-4">Generated Video Preview</h4>
                            <video key={videoUrl} src={videoUrl} controls className="w-full max-w-md mx-auto rounded-lg bg-black"></video>
                            <div className="text-center mt-4">
                                <button onClick={() => setPreviewAsset({ url: videoUrl, type: 'video' })} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg">
                                    Open Full Preview & Download
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-4">
                        <button onClick={() => setStep(2)} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg">Back</button>
                        <button onClick={handleGenerateCopy} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg">
                           {videoUrl ? "Use this Video & Generate Copy" : "Use Selected Image & Generate Copy"}
                        </button>
                    </div>
                </div>
            )}

             {/* Step 4: Copy Generation */}
             {step === 4 && (
                <div className="space-y-6">
                    <h3 className="text-2xl font-semibold">Review Your Ad Campaign</h3>
                    <div className="flex flex-col lg:flex-row gap-8">
                        <div className="lg:w-1/2">
                            <h4 className="font-bold mb-2">Visual</h4>
                            {videoUrl ? <video src={videoUrl} controls className="w-full rounded-xl bg-black"></video> : selectedImage && <img src={selectedImage} alt="Final Ad Visual" className="w-full rounded-xl" />}
                        </div>
                        <div className="lg:w-1/2 space-y-4">
                            <h4 className="font-bold mb-2">Copy</h4>
                            {copies.length > 0 ? copies.map((c, i) => (
                                <div key={i} className="bg-slate-700 p-3 rounded-xl">
                                    <h5 className="font-semibold text-blue-400 capitalize">{c.platform}</h5>
                                    <p className="text-slate-300 text-sm mt-1">{c.text}</p>
                                </div>
                            )) : <p className="text-slate-400">Generating copy...</p>}
                        </div>
                    </div>
                    <div className="flex justify-between items-center pt-4">
                        <button onClick={() => videoUrl ? setStep(3) : setStep(2)} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg">Back</button>
                        <button onClick={handleSaveAd} disabled={copies.length === 0} className="bg-green-600 hover:bg-green-700 disabled:bg-slate-500 text-white font-bold py-3 px-8 rounded-lg transition-colors text-lg">Save Ad Campaign</button>
                    </div>
                </div>
             )}
        </div>
    );
};

const AIAssistant: React.FC = () => {
    const [mode, setMode] = useState<'chat' | 'voice'>('chat');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isAiTyping, setIsAiTyping] = useState(false);
    const [chatSession, setChatSession] = useState<Chat | null>(null);

    const [isSessionActive, setIsSessionActive] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState('');
    // FIX: The type `LiveSession` is no longer exported by the SDK. Changed to `any`.
    const sessionPromise = useRef<Promise<any> | null>(null);
    const inputAudioContext = useRef<AudioContext | null>(null);
    const outputAudioContext = useRef<AudioContext | null>(null);
    const scriptProcessor = useRef<ScriptProcessorNode | null>(null);
    const mediaStream = useRef<MediaStream | null>(null);
    const nextStartTime = useRef(0);
    const sources = useRef(new Set<AudioBufferSourceNode>());
    
    const currentInputTranscription = useRef('');
    const currentOutputTranscription = useRef('');
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Initialize chat session
        const session = startChatSession();
        setChatSession(session);
        // Add initial welcome message
        setMessages([{
            id: `ai-welcome-${Date.now()}`,
            speaker: 'ai',
            text: "Hello! I'm Nita, your AD Assistant. How can I help you brainstorm your next campaign today? You can type a message or start a live voice conversation."
        }]);
    }, []);

    useEffect(() => {
        // Scroll to bottom when new messages are added
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);


    const handleSendChatMessage = async () => {
        if (!chatInput.trim() || !chatSession || isAiTyping) return;

        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            speaker: 'user',
            text: chatInput.trim()
        };
        setMessages(prev => [...prev, userMessage]);
        setChatInput('');
        setIsAiTyping(true);

        try {
            const response = await sendChatMessage(chatSession, userMessage.text);
            const aiMessage: ChatMessage = {
                id: `ai-${Date.now()}`,
                speaker: 'ai',
                text: response.text
            };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error("Chat error:", error);
            const errorMessage: ChatMessage = {
                 id: `ai-error-${Date.now()}`,
                 speaker: 'ai',
                 text: "Sorry, I encountered an error. Please try again."
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsAiTyping(false);
        }
    };


    const handleFeedback = (id: string, feedback: 'like' | 'dislike') => {
        setMessages(prev => prev.map(t => t.id === id ? { ...t, feedback } : t));
        setFeedbackMessage('Thanks for your feedback!');
        setTimeout(() => setFeedbackMessage(''), 2000);
    };

    const startVoiceSession = async () => {
        setMode('voice');
        try {
            mediaStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            setIsSessionActive(true);
            
            inputAudioContext.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContext.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });

            sessionPromise.current = connectToLiveAssistant({
                onopen: () => {
                    console.log('Session opened');
                    const source = inputAudioContext.current!.createMediaStreamSource(mediaStream.current!);
                    scriptProcessor.current = inputAudioContext.current!.createScriptProcessor(4096, 1, 1);
                    scriptProcessor.current.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob = createPcmBlob(inputData);
                        if (sessionPromise.current) {
                           sessionPromise.current.then((session) => {
                             session.sendRealtimeInput({ media: pcmBlob });
                           });
                        }
                    };
                    source.connect(scriptProcessor.current);
                    scriptProcessor.current.connect(inputAudioContext.current!.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                    // Handle Transcription
                    if (message.serverContent?.outputTranscription) {
                        currentOutputTranscription.current += message.serverContent.outputTranscription.text;
                    } else if (message.serverContent?.inputTranscription) {
                        currentInputTranscription.current += message.serverContent.inputTranscription.text;
                    }
                    if (message.serverContent?.turnComplete) {
                        const finalUserInput = currentInputTranscription.current.trim();
                        const finalModelOutput = currentOutputTranscription.current.trim();
                        
                        setMessages(prev => {
                            const newMessages = [...prev];
                            if (finalUserInput) newMessages.push({ id: `user-${Date.now()}`, speaker: 'user', text: finalUserInput });
                            if (finalModelOutput) newMessages.push({ id: `ai-${Date.now()}`, speaker: 'ai', text: finalModelOutput });
                            return newMessages;
                        });

                        currentInputTranscription.current = '';
                        currentOutputTranscription.current = '';
                    }

                    // Handle Audio
                    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                    if (base64Audio && outputAudioContext.current) {
                        const oac = outputAudioContext.current;
                        nextStartTime.current = Math.max(nextStartTime.current, oac.currentTime);
                        const audioBuffer = await decodeAudioData(decode(base64Audio), oac, 24000, 1);
                        const source = oac.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(oac.destination);
                        source.addEventListener('ended', () => { sources.current.delete(source); });
                        source.start(nextStartTime.current);
                        nextStartTime.current += audioBuffer.duration;
                        sources.current.add(source);
                    }
                },
                onerror: (e) => { console.error('Session error:', e); stopVoiceSession(); },
                onclose: () => { console.log('Session closed'); stopVoiceSession(false); },
            });

        } catch (error) {
            console.error('Failed to start session:', error);
            alert('Could not access microphone.');
            setIsSessionActive(false);
            setMode('chat');
        }
    };
    
    const stopVoiceSession = useCallback((closeRemote = true) => {
        if(closeRemote && sessionPromise.current) {
            sessionPromise.current.then(session => session.close());
        }
        
        scriptProcessor.current?.disconnect();
        scriptProcessor.current = null;
        
        mediaStream.current?.getTracks().forEach(track => track.stop());
        mediaStream.current = null;
        
        if (inputAudioContext.current && inputAudioContext.current.state !== 'closed') {
            inputAudioContext.current.close().catch(e => console.error("Error closing input audio context:", e));
        }
        if (outputAudioContext.current && outputAudioContext.current.state !== 'closed') {
            outputAudioContext.current.close().catch(e => console.error("Error closing output audio context:", e));
        }

        setIsSessionActive(false);
        sessionPromise.current = null;
        setMode('chat');
    }, []);

    useEffect(() => {
        return () => {
            if(isSessionActive) stopVoiceSession();
        };
    }, [isSessionActive, stopVoiceSession]);

    return (
        <div className="p-8 flex flex-col items-center h-[calc(100vh-80px)]">
            <h2 className="text-3xl font-bold text-white mb-2">AD Assistant</h2>
            <p className="text-slate-400 mb-6">Brainstorm your next ad campaign via chat or a live voice conversation.</p>
            
            <div className="w-full max-w-2xl h-full bg-slate-800 rounded-xl shadow-xl flex flex-col border border-slate-700">
                <div ref={chatContainerRef} className="flex-grow p-4 overflow-y-auto space-y-4">
                    {messages.map((t) => (
                        <div key={t.id} className={`flex items-start gap-3 ${t.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {t.speaker === 'ai' && <NitaIcon className="w-8 h-8 text-blue-400 flex-shrink-0 mt-1" />}
                            
                            <div className={`flex flex-col max-w-md ${t.speaker === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`p-3 rounded-2xl ${t.speaker === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-700 text-white rounded-bl-none'}`}>
                                    <p className="text-sm">{t.text}</p>
                                </div>
                                {t.speaker === 'ai' && t.id.startsWith('ai-') && !t.id.startsWith('ai-welcome') && (
                                     <div className="flex items-center space-x-1 mt-1">
                                         <button onClick={() => handleFeedback(t.id, 'like')} disabled={!!t.feedback} className={`p-1 rounded-full transition-colors ${t.feedback === 'like' ? 'bg-green-500 text-white' : 'text-slate-500 hover:bg-slate-600 disabled:text-slate-600'}`}><ThumbsUpIcon className="w-4 h-4" /></button>
                                         <button onClick={() => handleFeedback(t.id, 'dislike')} disabled={!!t.feedback} className={`p-1 rounded-full transition-colors ${t.feedback === 'dislike' ? 'bg-red-500 text-white' : 'text-slate-500 hover:bg-slate-600 disabled:text-slate-600'}`}><ThumbsDownIcon className="w-4 h-4" /></button>
                                     </div>
                                 )}
                            </div>

                            {t.speaker === 'user' && <UserProfileIcon className="w-8 h-8 text-slate-500 flex-shrink-0 mt-1" />}
                        </div>
                    ))}
                     {isAiTyping && 
                        <div className="flex items-start gap-3 justify-start">
                            <NitaIcon className="w-8 h-8 text-blue-400 flex-shrink-0" />
                            <div className="p-3 rounded-2xl bg-slate-700 rounded-bl-none">
                                <div className="flex items-center space-x-1">
                                    <span className="w-2 h-2 bg-white rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                                    <span className="w-2 h-2 bg-white rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                </div>
                            </div>
                        </div>
                     }
                     {mode === 'voice' && isSessionActive && 
                        <div className="flex items-start gap-3 justify-start opacity-70">
                            <NitaIcon className="w-8 h-8 text-blue-400 flex-shrink-0 animate-pulse" />
                            <div className="p-3 rounded-2xl bg-slate-700 rounded-bl-none">
                                <p className="text-sm italic">Nita is listening...</p>
                            </div>
                        </div>
                     }
                </div>

                {feedbackMessage && <div className="text-center text-sm text-green-400 py-1">{feedbackMessage}</div>}

                <div className="p-4 border-t border-slate-700">
                    {mode === 'chat' ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !isAiTyping && handleSendChatMessage()}
                                placeholder="Type your message to Nita..."
                                className="flex-grow bg-slate-700 p-3 rounded-lg border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none text-white"
                                disabled={isAiTyping}
                            />
                            <button onClick={handleSendChatMessage} disabled={!chatInput.trim() || isAiTyping} className="p-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white disabled:bg-blue-800 disabled:cursor-not-allowed">
                               {isAiTyping ? <SmallSpinner /> : <SendIcon className="w-6 h-6"/>}
                            </button>
                            <button onClick={startVoiceSession} className="flex items-center gap-2 py-3 px-4 bg-green-600 hover:bg-green-700 rounded-lg text-white">
                                <MicrophoneIcon className="w-6 h-6"/>
                                <span className="hidden sm:inline">Voice Chat</span>
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => stopVoiceSession()} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors">End Conversation</button>
                    )}
                </div>
            </div>
        </div>
    );
};

const CalendarView: React.FC<{ posts: ScheduledPost[], creatives: AdCreative[] }> = ({ posts, creatives }) => {
    const groupedPosts = posts
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
        .reduce((acc, post) => {
            const date = formatDate(post.scheduledAt);
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(post);
            return acc;
        }, {} as Record<string, ScheduledPost[]>);

    return (
        <div className="p-8">
            <h2 className="text-3xl font-bold mb-6 text-white">Content Calendar</h2>
            {posts.length === 0 ? (
                 <div className="text-center py-20 bg-slate-800 rounded-xl">
                    <p className="text-slate-400">You haven't scheduled any posts yet.</p>
                    <p className="text-slate-500 mt-2">Go to the dashboard to schedule an ad.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {Object.entries(groupedPosts).map(([date, postsOnDate]) => (
                        <div key={date}>
                            <h3 className="text-xl font-semibold text-blue-400 mb-4 pb-2 border-b border-slate-700">{date}</h3>
                            <div className="space-y-4">
                                {postsOnDate.map(post => {
                                    const creative = creatives.find(c => c.id === post.creativeId);
                                    if (!creative) return null;
                                    return (
                                        <div key={post.id} className="bg-slate-800 rounded-xl p-4 flex items-center gap-4 border border-slate-700">
                                            <div className="flex-shrink-0">
                                                <img src={creative.imageUrl || creative.videoUrl} alt="Ad creative" className="w-20 h-20 object-cover rounded-md" />
                                            </div>
                                            <div className="flex-grow">
                                                <p className="font-bold text-lg text-white">{formatTime(post.scheduledAt)}</p>
                                                <p className="text-sm text-slate-400 capitalize">{post.platform}</p>
                                                <p className="text-sm text-slate-300 mt-1 truncate">{creative.copies[0]?.text}</p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

interface ScheduleModalProps {
    creative: AdCreative;
    onClose: () => void;
    onSchedule: (post: ScheduledPost) => void;
}
const ScheduleModal: React.FC<ScheduleModalProps> = ({ creative, onClose, onSchedule }) => {
    const today = new Date().toISOString().split('T')[0];
    const [date, setDate] = useState(today);
    const [time, setTime] = useState('09:00');
    const [platform, setPlatform] = useState('instagram');
    const [suggestions, setSuggestions] = useState<{ time: string; reason: string }[]>([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

    const handleGetSuggestions = async () => {
        setIsLoadingSuggestions(true);
        try {
            const response = await getOptimalPostingTimes(creative.basePrompt, platform);
            setSuggestions(JSON.parse(response.text) as { time: string; reason: string }[]);
        } catch (error) {
            console.error("Failed to get suggestions:", error);
            alert("Could not fetch AI suggestions.");
        } finally {
            setIsLoadingSuggestions(false);
        }
    };
    
    const handleUseSuggestion = (suggestedTime: string) => {
        const [hourMinute, period] = suggestedTime.split(' ');
        let [hours, minutes] = hourMinute.split(':').map(Number);
        if (period === 'PM' && hours < 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        setTime(formattedTime);
    };

    const handleSubmit = () => {
        const scheduledAt = new Date(`${date}T${time}`).toISOString();
        onSchedule({
            id: new Date().toISOString(),
            creativeId: creative.id,
            platform,
            scheduledAt,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-700" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-700">
                    <h3 className="text-xl font-bold text-white">Schedule Ad</h3>
                    <p className="text-sm text-slate-400">Schedule your ad for the optimal time.</p>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Platform</label>
                        <select value={platform} onChange={e => setPlatform(e.target.value)} className="w-full bg-slate-700 p-2 rounded-lg border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                            <option value="instagram">Instagram</option>
                            <option value="facebook">Facebook</option>
                            <option value="tiktok">TikTok</option>
                        </select>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-300 mb-1">Date</label>
                            <input type="date" value={date} min={today} onChange={e => setDate(e.target.value)} className="w-full bg-slate-700 p-2 rounded-lg border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
                        </div>
                         <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-300 mb-1">Time</label>
                            <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full bg-slate-700 p-2 rounded-lg border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
                        </div>
                    </div>
                    <div>
                        <button onClick={handleGetSuggestions} disabled={isLoadingSuggestions} className="w-full flex items-center justify-center space-x-2 text-sm bg-teal-600 hover:bg-teal-700 disabled:bg-teal-800 disabled:cursor-not-allowed py-2 px-3 rounded-lg transition-colors">
                            {isLoadingSuggestions ? <SmallSpinner /> : <BrainIcon />}
                            <span>{isLoadingSuggestions ? 'Getting Suggestions...' : 'Get AI Suggestions'}</span>
                        </button>
                    </div>
                    {suggestions.length > 0 && (
                        <div className="space-y-2 pt-2">
                            <h4 className="text-sm font-semibold text-slate-300">Suggestions:</h4>
                            {suggestions.map((s, i) => (
                                <div key={i} className="bg-slate-700 p-2 rounded-lg flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-white">{s.time}</p>
                                        <p className="text-xs text-slate-400">{s.reason}</p>
                                    </div>
                                    <button onClick={() => handleUseSuggestion(s.time)} className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded-lg">Use</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                 <div className="p-4 bg-slate-900 border-t border-slate-700 flex justify-end items-center space-x-4">
                    <button onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
                    <button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">Schedule Post</button>
                </div>
            </div>
        </div>
    );
};

const AdLibrary: React.FC<{ creatives: AdCreative[], assets: AssetLibrary }> = ({ creatives, assets }) => {
    type Filter = 'all' | 'images' | 'videos' | 'copy';
    const [filter, setFilter] = useState<Filter>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // FIX: Refactored to combine allCopies and filteredCopies logic into a single useMemo hook.
    // This simplifies the dependency chain and can help avoid potential TypeScript inference issues.
    const filteredCopies = useMemo(() => {
        const allUniqueCopies = Array.from(new Set(creatives.flatMap(c => c.copies.map(copy => copy.text))));
        if (!searchQuery) {
            return allUniqueCopies;
        }
        const lowercasedQuery = searchQuery.toLowerCase();
        return allUniqueCopies.filter(copy => copy.toLowerCase().includes(lowercasedQuery));
    }, [creatives, searchQuery]);

    const filteredAssets = useMemo(() => {
        if (!searchQuery) return assets;
        const lowercasedQuery = searchQuery.toLowerCase();
        return assets.filter(asset =>
            asset.prompt.toLowerCase().includes(lowercasedQuery)
        );
    }, [assets, searchQuery]);

    const images = useMemo(() => filteredAssets.filter(a => a.type === 'image'), [filteredAssets]);
    const videos = useMemo(() => filteredAssets.filter(a => a.type === 'video'), [filteredAssets]);


    const handleDownload = (url: string) => {
        const link = document.createElement('a');
        link.href = url;
        const extension = url.includes('video') ? 'mp4' : 'jpg';
        link.download = `vidiads-asset-${Date.now()}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filterButtonClass = (f: Filter) => `px-4 py-2 rounded-lg font-semibold transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`;

    return (
        <div className="p-8">
            <h2 className="text-3xl font-bold mb-6 text-white">Asset Library</h2>
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                 <div className="flex space-x-2">
                    <button onClick={() => setFilter('all')} className={filterButtonClass('all')}>All</button>
                    <button onClick={() => setFilter('images')} className={filterButtonClass('images')}>Images</button>
                    <button onClick={() => setFilter('videos')} className={filterButtonClass('videos')}>Videos</button>
                    <button onClick={() => setFilter('copy')} className={filterButtonClass('copy')}>Ad Copy</button>
                </div>
                 <div className="relative w-full md:w-1/3">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by prompt or copy..."
                        className="w-full bg-slate-700 p-2 pl-10 rounded-lg border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                </div>
            </div>

            {((filter === 'all' || filter === 'images') && images.length > 0) && (
                <div className="mb-8">
                    <h3 className="text-2xl font-semibold text-white mb-4">Images</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {images.map((asset) => (
                            <div key={asset.id} className="relative group rounded-lg overflow-hidden">
                                <img src={asset.url} alt={asset.prompt} className="w-full h-40 object-cover" />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-70 transition-opacity flex justify-center items-center">
                                    <button onClick={() => handleDownload(asset.url)} className="opacity-0 group-hover:opacity-100 p-2 bg-blue-600 rounded-full text-white">
                                        <DownloadIcon className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {((filter === 'all' || filter === 'videos') && videos.length > 0) && (
                <div className="mb-8">
                    <h3 className="text-2xl font-semibold text-white mb-4">Videos</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {videos.map((asset) => (
                            <div key={asset.id} className="relative group rounded-lg overflow-hidden">
                                <video src={asset.url} controls className="w-full h-56 object-cover bg-black" />
                                <div className="absolute top-2 right-2">
                                     <button onClick={() => handleDownload(asset.url)} className="opacity-0 group-hover:opacity-100 p-2 bg-blue-600 rounded-full text-white transition-opacity">
                                        <DownloadIcon className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {((filter === 'all' || filter === 'copy') && filteredCopies.length > 0) && (
                 <div className="mb-8">
                    <h3 className="text-2xl font-semibold text-white mb-4">Ad Copy</h3>
                    <div className="space-y-3">
                        {filteredCopies.map((text, i) => (
                            <div key={i} className="bg-slate-800 p-3 rounded-lg flex justify-between items-center border border-slate-700">
                                <p className="text-slate-300 text-sm">{text}</p>
                                <button onClick={() => navigator.clipboard.writeText(text)} className="p-2 text-slate-400 hover:text-white"><ClipboardIcon/></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {(filter === 'all' && assets.length === 0) && (
                 <div className="text-center py-20 bg-slate-800 rounded-xl">
                    <p className="text-slate-400">Your asset library is empty.</p>
                    <p className="text-slate-500 mt-2">Create a new ad to start adding assets.</p>
                </div>
            )}
        </div>
    );
};

const UserProfilePage: React.FC<{
    profile: UserProfile;
    setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
    brandKit: BrandKit;
    setBrandKit: React.Dispatch<React.SetStateAction<BrandKit>>;
    socialConnections: SocialConnections;
    setSocialConnections: React.Dispatch<React.SetStateAction<SocialConnections>>;
}> = ({ profile, setProfile, brandKit, setBrandKit, socialConnections, setSocialConnections }) => {

    const [feedback, setFeedback] = useState('');
    const [currentProfile, setCurrentProfile] = useState(profile);
    const [currentBrandKit, setCurrentBrandKit] = useState(brandKit);
    const [connectingSocial, setConnectingSocial] = useState<SocialPlatform | null>(null);

    // FIX: Add useEffect to sync local state with props from parent.
    // This ensures that when the parent state updates after saving, the form reflects the changes.
    useEffect(() => {
        setCurrentProfile(profile);
    }, [profile]);

    useEffect(() => {
        setCurrentBrandKit(brandKit);
    }, [brandKit]);

    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCurrentProfile(prev => ({ ...prev, [name]: value }));
    };

    const handleBrandKitChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setCurrentBrandKit(prev => ({...prev, [name]: value }));
    };

    const handleBrandKitColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCurrentBrandKit(prev => ({
            ...prev,
            brandColors: { ...prev.brandColors, [name]: value }
        }));
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const { url } = await fileToBase64(file);
            setCurrentBrandKit(prev => ({ ...prev, logoUrl: url }));
        }
    };
    
    const showFeedback = (message: string) => {
        setFeedback(message);
        setTimeout(() => setFeedback(''), 3000);
    }

    const handleSaveProfile = () => {
        setProfile(currentProfile);
        showFeedback('Profile updated successfully!');
    };

    const handleSaveBrandKit = () => {
        setBrandKit(currentBrandKit);
        showFeedback('Brand Kit saved successfully!');
    };

    const handleSocialConnect = (platform: SocialPlatform) => {
        setConnectingSocial(platform);
        // Simulate API call
        setTimeout(() => {
            setSocialConnections(prev => ({...prev, [platform]: true }));
            setConnectingSocial(null);
        }, 1500);
    };

    const socialPlatforms: { id: SocialPlatform; name: string; icon: React.FC<{className?: string}> }[] = [
        { id: 'facebook', name: 'Facebook', icon: FacebookIcon },
        { id: 'instagram', name: 'Instagram', icon: InstagramIcon },
        { id: 'tiktok', name: 'TikTok', icon: TikTokIcon },
        { id: 'youtube', name: 'YouTube', icon: YouTubeIcon },
        { id: 'x', name: 'X (Twitter)', icon: XIcon },
    ];


    return (
        <div className="p-8 max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-white">User Profile & Settings</h2>
            
            {feedback && <div className="bg-green-600 text-white p-3 rounded-lg mb-6 text-center">{feedback}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Account & Socials */}
                <div className="lg:col-span-1 space-y-8">
                    {/* Account Settings */}
                    <div className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700">
                        <h3 className="text-xl font-semibold mb-4 text-white">Account Settings</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                                <input type="text" name="name" value={currentProfile.name} onChange={handleProfileChange} className="w-full bg-slate-700 p-2 rounded-lg border border-slate-600 text-white"/>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                                <input type="email" name="email" value={currentProfile.email} onChange={handleProfileChange} className="w-full bg-slate-700 p-2 rounded-lg border border-slate-600 text-white"/>
                            </div>
                            <button onClick={handleSaveProfile} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Update Profile</button>
                        </div>
                    </div>
                     {/* Social Media Connections */}
                    <div className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700">
                         <h3 className="text-xl font-semibold mb-4 text-white">Social Media Connections</h3>
                         <div className="space-y-3">
                            {socialPlatforms.map(p => (
                                <div key={p.id} className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <p.icon className="w-6 h-6 text-slate-300"/>
                                        <span className="font-medium text-white">{p.name}</span>
                                    </div>
                                    {socialConnections[p.id] ? (
                                        <span className="flex items-center text-sm text-green-400"><CheckCircleIcon className="w-5 h-5 mr-1"/> Connected</span>
                                    ) : (
                                        <button onClick={() => handleSocialConnect(p.id)} disabled={connectingSocial === p.id} className="text-sm bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 text-white font-bold py-1 px-3 rounded-lg">
                                            {connectingSocial === p.id ? 'Connecting...' : 'Connect'}
                                        </button>
                                    )}
                                </div>
                            ))}
                         </div>
                    </div>
                </div>

                {/* Right Column: Brand Kit */}
                <div className="lg:col-span-2 bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700">
                     <h3 className="text-xl font-semibold mb-4 text-white">Brand Kit</h3>
                     <p className="text-sm text-slate-400 mb-6">Provide your brand details here to help the AI generate more personalized and on-brand content for your ads.</p>
                     <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Brand Name</label>
                                <input type="text" name="name" value={currentBrandKit.name} onChange={handleBrandKitChange} className="w-full bg-slate-700 p-2 rounded-lg border border-slate-600 text-white"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Website</label>
                                <input type="text" name="website" placeholder="https://example.com" value={currentBrandKit.website} onChange={handleBrandKitChange} className="w-full bg-slate-700 p-2 rounded-lg border border-slate-600 text-white"/>
                            </div>
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-slate-300 mb-1">Brand Description</label>
                           <textarea name="description" value={currentBrandKit.description} onChange={handleBrandKitChange} rows={3} className="w-full bg-slate-700 p-2 rounded-lg border border-slate-600 text-white" placeholder="e.g., We sell sustainable, handcrafted goods for the modern home."></textarea>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                            <div>
                               <label className="block text-sm font-medium text-slate-300 mb-1">Brand Logo</label>
                               <div className="flex items-center gap-4">
                                    {currentBrandKit.logoUrl ? (
                                        <img src={currentBrandKit.logoUrl} alt="Brand Logo" className="w-20 h-20 object-contain bg-white p-1 rounded-md"/>
                                    ) : (
                                        <div className="w-20 h-20 bg-slate-700 rounded-md flex items-center justify-center text-slate-400 text-xs">No Logo</div>
                                    )}
                                   <input type="file" accept="image/*" onChange={handleLogoUpload} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-600 file:text-white hover:file:bg-slate-500 cursor-pointer" />
                               </div>
                            </div>
                             <div>
                               <label className="block text-sm font-medium text-slate-300 mb-1">Brand Colors</label>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium text-slate-400">Primary</label>
                                        <input type="color" name="primary" value={currentBrandKit.brandColors.primary} onChange={handleBrandKitColorChange} className="w-full h-10 p-0 bg-transparent rounded-lg border-none cursor-pointer"/>
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium text-slate-400">Secondary</label>
                                        <input type="color" name="secondary" value={currentBrandKit.brandColors.secondary} onChange={handleBrandKitColorChange} className="w-full h-10 p-0 bg-transparent rounded-lg border-none cursor-pointer"/>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button onClick={handleSaveBrandKit} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-lg mt-4">Save Brand Kit</button>
                     </div>
                </div>
            </div>
        </div>
    );
};


// --- Main App Component ---

const App: React.FC = () => {
    const [view, setView] = useState<View>('dashboard');
    const [adCreatives, setAdCreatives] = useState<AdCreative[]>([]);
    const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
    const [schedulingCreative, setSchedulingCreative] = useState<AdCreative | null>(null);
    const [assetLibrary, setAssetLibrary] = useState<AssetLibrary>([]);
    const [userProfile, setUserProfile] = useState<UserProfile>({
        name: 'Jane Doe',
        email: 'jane.doe@example.com'
    });
    const [brandKit, setBrandKit] = useState<BrandKit>({
        logoUrl: null,
        name: '',
        description: '',
        website: '',
        brandColors: { primary: '#6366F1', secondary: '#14B8A6' }
    });
    const [socialConnections, setSocialConnections] = useState<SocialConnections>({
        facebook: false,
        instagram: false,
        tiktok: false,
        youtube: false,
        x: false
    });

    const addCreative = (creative: AdCreative) => {
        setAdCreatives(prev => [creative, ...prev]);
    };
    
    const addAssetsToLibrary = useCallback((newAssets: LibraryAsset | LibraryAsset[]) => {
        const assetsToAdd = Array.isArray(newAssets) ? newAssets : [newAssets];
        setAssetLibrary(prevLibrary => {
            const existingUrls = new Set(prevLibrary.map(a => a.url));
            const uniqueNewAssets = assetsToAdd.filter(a => !existingUrls.has(a.url));
            if (uniqueNewAssets.length === 0) return prevLibrary;
            return [...prevLibrary, ...uniqueNewAssets].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        });
    }, []);

    const handleScheduleCreative = (creative: AdCreative) => {
        setSchedulingCreative(creative);
    };
    
    const addScheduledPost = (post: ScheduledPost) => {
        setScheduledPosts(prev => [...prev, post]);
    };

    const renderView = () => {
        switch (view) {
            case 'dashboard':
                return <Dashboard creatives={adCreatives} setCreatives={setAdCreatives} onSchedule={handleScheduleCreative} />;
            case 'create':
                return <AdCreator addCreative={addCreative} addAssetsToLibrary={addAssetsToLibrary} setView={setView} brandKit={brandKit} />;
            case 'assistant':
                return <AIAssistant />;
            case 'calendar':
                return <CalendarView posts={scheduledPosts} creatives={adCreatives} />;
            case 'library':
                return <AdLibrary creatives={adCreatives} assets={assetLibrary} />;
            case 'profile':
                return <UserProfilePage 
                            profile={userProfile} 
                            setProfile={setUserProfile} 
                            brandKit={brandKit} 
                            setBrandKit={setBrandKit}
                            socialConnections={socialConnections}
                            setSocialConnections={setSocialConnections}
                        />;
            default:
                return <Dashboard creatives={adCreatives} setCreatives={setAdCreatives} onSchedule={handleScheduleCreative}/>;
        }
    };

    return (
        <div className="bg-slate-900 min-h-screen text-slate-200 font-sans">
            <Header setView={setView} currentView={view} />
            <main>
                {renderView()}
            </main>
             {view !== 'assistant' && (
                <button 
                    onClick={() => setView('assistant')} 
                    className="fixed bottom-8 right-8 bg-blue-600 hover:bg-blue-700 text-white font-bold p-4 rounded-full shadow-lg z-40 transition-transform transform hover:scale-110"
                    title="Open AD Assistant"
                >
                    <AssistantIcon />
                </button>
            )}
            {schedulingCreative && (
                <ScheduleModal
                    creative={schedulingCreative}
                    onClose={() => setSchedulingCreative(null)}
                    onSchedule={addScheduledPost}
                />
            )}
        </div>
    );
};

export default App;
