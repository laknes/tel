import { GoogleGenAI } from "@google/genai";

export const generateProductDescription = async (
  productName: string,
  categoryName: string,
  price: number
): Promise<string> => {
  if (!process.env.API_KEY) {
    return "کلید API یافت نشد. لطفاً تنظیمات محیطی را بررسی کنید.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      شما یک دستیار فروش حرفه ای هستید.
      یک توضیحات محصول جذاب و کوتاه (حداکثر 300 کاراکتر) به زبان فارسی برای محصول زیر بنویسید:
      نام محصول: ${productName}
      دسته بندی: ${categoryName}
      قیمت: ${price} تومان
      
      توضیحات باید مشتری را ترغیب به خرید کند. از ایموجی های مرتبط استفاده کنید.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "خطا در تولید توضیحات.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "خطا در ارتباط با هوش مصنوعی.";
  }
};