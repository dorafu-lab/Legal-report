import { GoogleGenAI, Chat, GenerateContentResponse, Type } from "@google/genai";
import { Patent } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// System instruction to guide the AI to be a patent expert
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
    chatSession = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });
  }
  return chatSession;
};

export const sendMessageToGemini = async (message: string, contextPatents?: Patent[]): Promise<string> => {
  try {
    const chat = getChatSession();
    
    let fullMessage = message;
    
    // If context is provided (e.g., current filtered list or selected patent), inject it into the prompt
    if (contextPatents && contextPatents.length > 0) {
      const patentContextString = contextPatents.map(p => 
        `ID: ${p.id}, 名稱: ${p.name}, 專利權人: ${p.patentee}, 狀態: ${p.status}, 國家: ${p.country}, 發明人: ${p.inventor}, 類型: ${p.type}, 年費到期日: ${p.annuityDate}`
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
    const prompt = `
    請針對以下專利進行簡單的維護風險評估與建議 (請用繁體中文回答):
    
    專利名稱: ${patent.name}
    專利權人: ${patent.patentee}
    申請國家: ${patent.country}
    專利類型: ${patent.type}
    發明人: ${patent.inventor}
    狀態: ${patent.status}
    申請日: ${patent.appDate}
    年費有效年次: ${patent.annuityYear}
    年費有效日期: ${patent.annuityDate}

    請分析重點:
    1. 剩餘壽命價值
    2. 是否接近年費繳納期限
    3. 基於專利類型的一般性建議
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return response.text || "無法生成分析報告。";
    } catch (e) {
        console.error(e);
        return "分析服務暫時無法使用。";
    }
}

// Reusable config for JSON schema response
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
  },
};

export const parsePatentFromText = async (text: string): Promise<Partial<Patent> | null> => {
  const prompt = `
  Analyze the provided text and extract patent information into a JSON object.
  The input text might be messy or unstructured. Try to find the following fields.
  
  Mapping Rules:
  - status: Must be mapped to one of ['存續中', '已屆期', '審查中']. Default to '審查中' if unsure.
  - type: Must be mapped to one of ['發明', '新型', '設計']. Default to '發明' if unsure.
  - country: Format as "Code (Name)", e.g., "TW (台灣)".
  - dates: Format all dates as YYYY-MM-DD.
  - duration: Try to infer or find the patent duration range.
  - annuityYear: Extract numeric value only.
  - inventor: Extract the names of inventors or creators (e.g. from "發明人", "創作人", "Inventor", "Creator").
  - patentee: Extract the name of the patent owner or assignee (e.g. from "專利權人", "申請人", "Assignee", "Applicant").

  Text to Parse:
  """
  ${text}
  """
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: PATENT_SCHEMA_CONFIG,
    });

    if (response.text) {
      return JSON.parse(response.text) as Partial<Patent>;
    }
    return null;
  } catch (error) {
    console.error("Gemini Parse Text Error:", error);
    return null;
  }
};

export const parsePatentFromFile = async (base64Data: string, mimeType: string = 'application/pdf'): Promise<Partial<Patent> | null> => {
  const prompt = `
  Analyze the attached patent document (likely a gazette or certificate) and extract patent information into a JSON object.
  
  Mapping Rules:
  - status: Must be mapped to one of ['存續中', '已屆期', '審查中']. Default to '審查中' if unsure.
  - type: Must be mapped to one of ['發明', '新型', '設計']. Default to '發明' if unsure.
  - country: Format as "Code (Name)", e.g., "TW (台灣)".
  - dates: Format all dates as YYYY-MM-DD.
  - duration: Try to infer or find the patent duration range.
  - annuityYear: Extract numeric value only.
  - inventor: Extract the names of inventors or creators.
  - patentee: Extract the name of the patent owner or assignee (e.g. "專利權人", "Assignee").
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          { text: prompt }
        ]
      },
      config: PATENT_SCHEMA_CONFIG,
    });

    if (response.text) {
      return JSON.parse(response.text) as Partial<Patent>;
    }
    return null;
  } catch (error) {
    console.error("Gemini Parse File Error:", error);
    return null;
  }
};