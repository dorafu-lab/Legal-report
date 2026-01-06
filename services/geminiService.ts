import { Patent, PatentStatus, PatentType } from "../types";

// 擴充 Window 介面以支援 Chrome 內建 AI (實驗性功能)
declare global {
  interface Window {
    ai?: {
      languageModel: {
        capabilities: () => Promise<{ available: string }>;
        create: (options?: { systemPrompt?: string }) => Promise<AILanguageModel>;
      };
    };
  }
}

interface AILanguageModel {
  prompt: (input: string) => Promise<string>;
  destroy: () => void;
}

const SYSTEM_INSTRUCTION = `
你是一位專業的專利代理人與智慧財產權顧問助手。
請協助解析專利資訊或回答相關問題。
`;

/**
 * 檢查瀏覽器是否支援原生 Gemini Nano (window.ai)
 */
const isNativeAIAvailable = async (): Promise<boolean> => {
  if (!window.ai || !window.ai.languageModel) return false;
  try {
    const capabilities = await window.ai.languageModel.capabilities();
    return capabilities.available === 'readily';
  } catch (e) {
    return false;
  }
};

/**
 * 發送訊息給 AI (原生或模擬)
 */
export const sendMessageToGemini = async (message: string, contextPatents?: Patent[]): Promise<string> => {
  try {
    // 1. 嘗試使用 Chrome 內建 AI
    if (await isNativeAIAvailable()) {
      const session = await window.ai!.languageModel.create({
        systemPrompt: SYSTEM_INSTRUCTION
      });
      
      let fullMessage = message;
      if (contextPatents && contextPatents.length > 0) {
        fullMessage = `Context: ${contextPatents.length} patents loaded. User Question: ${message}`;
      }
      
      const response = await session.prompt(fullMessage);
      session.destroy();
      return response;
    }
  } catch (error) {
    console.warn("Native AI failed, falling back to simulation.", error);
  }

  // 2. 模擬回應 (當沒有 API Key 也沒有原生 AI 時)
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve("（此為模擬回應：系統檢測到您未設定 API Key 且瀏覽器不支援原生 AI）\n\n根據您的專利資料，目前的專利組合主要集中在發明專利，且部分專利即將面臨年費繳納期限。建議您儘早檢視「期限提醒」區塊。");
    }, 1000);
  });
};

/**
 * 模擬解析專利資料 (Mock Generator)
 * 為了讓 Demo 能跑起來，我們根據輸入文字產生一個看起來真實的專利物件
 */
const generateMockPatentData = (text: string): Partial<Patent> => {
  const isInvention = text.includes("發明") || text.includes("Invention");
  const isUtility = text.includes("新型") || text.includes("Utility");
  
  // 產生隨機但合理的日期
  const today = new Date();
  const nextYear = new Date(today);
  nextYear.setFullYear(today.getFullYear() + 1);
  
  return {
    name: text.length > 10 ? text.substring(0, 15) + "..." : "智慧型專利分析系統",
    patentee: "創新科技有限公司",
    country: text.includes("US") ? "US (美國)" : "TW (台灣)",
    status: PatentStatus.Active,
    type: isUtility ? PatentType.Utility : (isInvention ? PatentType.Invention : PatentType.Design),
    appNumber: `112${Math.floor(Math.random() * 100000)}`,
    pubNumber: `I${Math.floor(Math.random() * 1000000)}`,
    appDate: "2023-01-15",
    pubDate: "2023-08-20",
    duration: "2023-01-15 ~ 2043-01-15",
    annuityDate: nextYear.toISOString().split('T')[0], // 預設明年到期
    annuityYear: 3,
    inventor: "王小明, 陳大文",
    abstract: text.substring(0, 100)
  };
};

/**
 * 解析純文字中的專利資訊
 */
export const parsePatentFromText = async (text: string): Promise<Partial<Patent> | null> => {
  try {
    // 1. 嘗試 Chrome 內建 AI
    if (await isNativeAIAvailable()) {
      const session = await window.ai!.languageModel.create({
        systemPrompt: "Extract patent info into JSON format. Keys: name, patentee, country, status, type, appNumber, pubNumber, appDate, pubDate, duration, annuityDate, annuityYear, inventor."
      });
      const response = await session.prompt(`Parse this text to JSON: ${text}`);
      session.destroy();
      
      // 嘗試尋找 JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }
  } catch (e) {
    console.log("Native AI parse failed or not available.");
  }

  // 2. 模擬成功解析 (確保 UI 不會報錯)
  console.log("Using Mock Parsing for Demo");
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(generateMockPatentData(text));
    }, 1500);
  });
};

/**
 * 解析檔案
 */
export const parsePatentFromFile = async (base64Data: string, mimeType: string = 'application/pdf'): Promise<Partial<Patent> | null> => {
  // 原生 AI 目前無法直接讀取 PDF Base64，直接使用模擬數據
  console.log("Simulating File Parsing");
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        name: "高效能 PDF 文件解析方法",
        patentee: "數位檔案股份有限公司",
        country: "JP (日本)",
        status: PatentStatus.Active,
        type: PatentType.Invention,
        appNumber: "JP-2023-001234",
        pubNumber: "JP-2024-005678",
        appDate: "2023-03-10",
        pubDate: "2024-03-10",
        duration: "20 年",
        annuityDate: "2025-03-10",
        annuityYear: 2,
        inventor: "田中 太郎",
        link: "https://www.jpo.go.jp/"
      });
    }, 2000); // 模擬處理時間
  });
};