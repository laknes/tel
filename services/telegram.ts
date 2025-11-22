import { Product, TelegramConfig, BotInfo } from '../types';

const BASE_URL = 'https://api.telegram.org/bot';

// Helper to convert Base64 to Blob
const dataURItoBlob = (dataURI: string) => {
  const byteString = atob(dataURI.split(',')[1]);
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
};

export const getBotInfo = async (token: string): Promise<BotInfo | null> => {
  try {
    const response = await fetch(`${BASE_URL}${token}/getMe`);
    const data = await response.json();
    return data.ok ? (data.result as BotInfo) : null;
  } catch (error) {
    return null;
  }
};

export const getChannelInfo = async (token: string, chatId: string): Promise<{ title: string } | null> => {
  try {
    const response = await fetch(`${BASE_URL}${token}/getChat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId })
    });
    const data = await response.json();
    return data.ok ? { title: data.result.title || 'بدون نام' } : null;
  } catch (error) {
    return null;
  }
};

// --- Generic Message Sender ---
export const sendTextMessage = async (
  token: string, 
  chatId: string | number, 
  text: string
): Promise<boolean> => {
    try {
        const response = await fetch(`${BASE_URL}${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'Markdown' })
        });
        const data = await response.json();
        return data.ok;
    } catch (error) {
        return false;
    }
};

// Only Manual Contact Request button used in Settings needs this client-side helper
export const sendContactRequest = async (token: string, chatId: string): Promise<{ success: boolean; message: string }> => {
    try {
        const keyboard = {
            keyboard: [[{ text: "📱 تایید شماره تلفن", request_contact: true }]],
            resize_keyboard: true, one_time_keyboard: true
        };
        const response = await fetch(`${BASE_URL}${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: "جهت احراز هویت کلیک کنید:", reply_markup: keyboard })
        });
        const data = await response.json();
        return data.ok ? { success: true, message: "ارسال شد." } : { success: false, message: `خطا: ${data.description}` };
    } catch (error) {
        return { success: false, message: "خطای شبکه." };
    }
};

// Use this for manual updates check in Settings
export const checkUpdatesForContacts = async (token: string): Promise<any[]> => {
    try {
        const response = await fetch(`${BASE_URL}${token}/getUpdates?limit=50`);
        const data = await response.json();
        const users = [];
        if (data.ok && Array.isArray(data.result)) {
            for (const update of data.result) {
                if (update.message?.contact?.user_id === update.message?.from?.id) {
                     const u = update.message.from;
                     const ph = update.message.contact.phone_number;
                     users.push({ userId: u.id, firstName: u.first_name, lastName: u.last_name, username: u.username, phoneNumber: ph, verifiedAt: Date.now() });
                }
            }
        }
        return users;
    } catch { return []; }
};

export const sendProductToTelegram = async (
  product: Product, 
  categoryName: string, 
  config: TelegramConfig
): Promise<{ success: boolean; message: string }> => {
  
  if (!config.botToken || !config.chatId) return { success: false, message: "تنظیمات ربات کامل نیست." };

  try {
    const formData = new FormData();
    formData.append('chat_id', config.chatId);
    formData.append('parse_mode', 'Markdown');

    const caption = `
🛍 *${product.name}*
🔢 *کد:* ${product.productCode || '---'}

📂 *دسته:* ${categoryName}
💵 *قیمت:* ${Number(product.price).toLocaleString()} تومان

📝 *توضیحات:*
${product.description}
    `.trim();

    if (config.supportId) {
      const cleanUsername = config.supportId.replace('@', '');
      const buttonText = config.buttonText || '🛒 ثبت سفارش';
      const replyMarkup = {
        inline_keyboard: [[{ text: buttonText, url: `https://t.me/${cleanUsername}` }]]
      };
      formData.append('reply_markup', JSON.stringify(replyMarkup));
    }

    let endpoint = 'sendMessage';
    if (product.imageUrl) {
      endpoint = 'sendPhoto';
      formData.append('caption', caption);
      if (product.imageUrl.startsWith('data:')) {
        const blob = dataURItoBlob(product.imageUrl);
        formData.append('photo', blob, 'product.jpg');
      } else {
        formData.append('photo', product.imageUrl);
      }
    } else {
      formData.append('text', caption);
    }

    const response = await fetch(`${BASE_URL}${config.botToken}/${endpoint}`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    return data.ok ? { success: true, message: "ارسال شد!" } : { success: false, message: `خطا: ${data.description}` };

  } catch (error) {
    return { success: false, message: "خطا در ارسال." };
  }
};