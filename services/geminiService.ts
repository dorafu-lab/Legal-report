import { GoogleGenAI, Chat, GenerateContentResponse, Type } from "@google/genai";
import { Patent } from "../types";

// Helper to get API Key safely
const getApiKey = () => process.env.API_KEY || "";

// Lazy initialization of AI to prevent top-level crashes if API Key is missing
let aiInstance: GoogleGenAI | null = null;
const getAI = () => {
  if (!aiInstance) {
    const key = getApiKey();
    aiInstance = new GoogleGenAI({ apiKey: key });
  }
  return aiInstance;
};

const SYSTEM_INSTRUCTION = `
You are an expert Patent Attorney and Intellectual Property Consultant assistant. 
Your role is to help users manage their patent portfolio.
You analyze patent data, suggest strategies for annuity payments, and explain technical patent terms in Traditional Chinese (zh-TW).
Always be professional, concise, and helpful.
If asked about a specific patent, refer to the provided details.
`;

let chatSession: Chat | null = null;

export const getChatSession = (): Chat => {
  if (!chatSession) {
    const ai = getAI();
    chatSession = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });
  }
  return chatSession;
};

export const sendMessageToGemini = async (message: string, contextPatents?: Patent[]): Promise<string> => {
  if (!getApiKey()) return "尚未設定 API Key，無法使用 AI 功能。";
  
  try {
    const chat = getChatSession();
    let fullMessage = message;
    
    if (contextPatents && contextPatents.length > 0) {
      const patentContextString = contextPatents.map(p => 
        `ID: ${p.id}, 名稱: ${p.name}, 狀態: ${p.status}, 國家: ${p.country}, 年費到期日: ${p.annuityDate}`
      ).join('\n');
      
      fullMessage = `Here is the context of the patents I am currently viewing:\n${patentContextString}\n\nUser Question: ${message}`;
    }

    const response: GenerateContentResponse = await chat.sendMessage({ message: fullMessage });
    return response.text || "抱歉，我現在無法回答您的問題。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "發生錯誤，請檢查您的網路連線或 API Key 設定。";
  }
};

export const analyzePatentRisk = async (patent: Patent): Promise<string> => {
    if (!getApiKey()) return "尚未設定 API Key。";
    
    const prompt = `請針對以下專利進行維護風險評估 (繁體中文): 專利名稱: ${patent.name}, 狀態: ${patent.status}, 年費到期日: ${patent.annuityDate}`;

    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });
        return response.text || "無法生成分析報告。";
    } catch (e) {
        console.error(e);
        return "分析服務暫時無法使用。";
    }
}

const PATENT_SCHEMA_CONFIG = {
  responseMimeType: "application/json",
  responseSchema: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      patentee: { type: Type.STRING },
      country: { type: Type.STRING },
      status: { type: Type.STRING },
      type: { type: Type.STRING },
      appNumber: { type: Type.STRING },
      pubNumber: { type: Type.STRING },
      appDate: { type: Type.STRING },
      pubDate: { type: Type.STRING },
      duration: { type: Type.STRING },
      annuityDate: { type: Type.STRING },
      annuityYear: { type: Type.NUMBER },
      inventor: { type: Type.STRING },
      abstract: { type: Type.STRING },
    },
    required: ["name"]
  },
};

export const parsePatentFromText = async (text: string): Promise<Partial<Patent> | null> => {
  if (!getApiKey()) return null;
  const prompt = `Analyze patent information into JSON: ${text}`;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: PATENT_SCHEMA_CONFIG,
    });

    return response.text ? JSON.parse(response.text) : null;
  } catch (error) {
    console.error("Gemini Parse Text Error:", error);
    return null;
  }
};

export const parsePatentFromFile = async (base64Data: string, mimeType: string = 'application/pdf'): Promise<Partial<Patent> | null> => {
  if (!getApiKey()) return null;
  const prompt = `Extract patent info into JSON from this file.`;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: prompt }
        ]
      },
      config: PATENT_SCHEMA_CONFIG,
    });

    return response.text ? JSON.parse(response.text) : null;
  } catch (error) {
    console.error("Gemini Parse File Error:", error);
    return null;
  }
};