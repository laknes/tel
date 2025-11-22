
import { Product, TelegramConfig, BotInfo, VerifiedUser, Category } from '../types';
import { StorageService } from './storage'; // Import storage to save users automatically

const BASE_URL = 'https://api.telegram.org/bot';
const UPDATE_ID_KEY = 'teleshop_last_update_id';

// Helper to convert Base64 to Blob for uploading
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
    if (data.ok) {
      return data.result as BotInfo;
    }
    return null;
  } catch (error) {
    console.error('Failed to get bot info:', error);
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
    if (data.ok) {
      return { title: data.result.title || 'بدون نام' };
    }
    return null;
  } catch (error) {
    console.error('Failed to get chat info:', error);
    return null;
  }
};

export const sendContactRequest = async (token: string, chatId: string): Promise<{ success: boolean; message: string }> => {
    try {
        const keyboard = {
            keyboard: [
                [{
                    text: "📱 تایید شماره تلفن",
                    request_contact: true
                }]
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
            input_field_placeholder: "جهت احراز هویت کلیک کنید"
        };

        const response = await fetch(`${BASE_URL}${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: "👋 سلام کاربر گرامی،\n\nلطفاً جهت احراز هویت و تکمیل ثبت نام، روی دکمه زیر کلیک کنید تا شماره تلفن شما تایید شود.",
                reply_markup: keyboard
            })
        });

        const data = await response.json();
        if (data.ok) {
            return { success: true, message: "درخواست شماره تلفن ارسال شد." };
        } else {
            return { success: false, message: `خطا: ${data.description}` };
        }

    } catch (error) {
        return { success: false, message: "خطای شبکه در ارسال درخواست." };
    }
};

export const checkUpdatesForContacts = async (token: string): Promise<VerifiedUser[]> => {
    // This is now largely redundant as processSearchQueries handles contacts too, 
    // but kept for the manual button in Settings.
    try {
        const response = await fetch(`${BASE_URL}${token}/getUpdates?limit=100`);
        const data = await response.json();
        
        const verifiedUsers: VerifiedUser[] = [];

        if (data.ok && Array.isArray(data.result)) {
            for (const update of data.result) {
                if (update.message && update.message.contact) {
                    const contact = update.message.contact;
                    const user = update.message.from;
                    
                    if (contact.user_id === user.id) {
                        verifiedUsers.push({
                            userId: user.id,
                            firstName: user.first_name,
                            lastName: user.last_name,
                            username: user.username,
                            phoneNumber: contact.phone_number,
                            verifiedAt: Date.now()
                        });
                    }
                }
            }
        }
        return verifiedUsers;
    } catch (error) {
        console.error("Error checking updates", error);
        return [];
    }
};

// --- Generic Message Sender ---
export const sendTextMessage = async (
  token: string, 
  chatId: string | number, 
  text: string,
  replyMarkup?: any
): Promise<boolean> => {
    try {
        const body: any = {
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown'
        };
        if (replyMarkup) {
            body.reply_markup = replyMarkup;
        }

        const response = await fetch(`${BASE_URL}${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        return data.ok;
    } catch (error) {
        console.error("Failed to send text message", error);
        return false;
    }
};

// --- Inline Query Answer ---
export const answerInlineQuery = async (token: string, queryId: string, results: any[]) => {
  try {
    await fetch(`${BASE_URL}${token}/answerInlineQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inline_query_id: queryId,
        results: results,
        cache_time: 2 // Low cache for real-time updates
      })
    });
  } catch (error) {
    console.error("Failed to answer inline query", error);
  }
};

// --- Search & Bot Logic (The Core Loop) ---
export const processSearchQueries = async (
  token: string, 
  products: Product[],
  categories: Category[]
): Promise<{ processed: number; message: string }> => {
  try {
    // Use a simple increment for offset to try and catch latest messages.
    // In a real server we'd strictly manage offset. Here we try to be robust.
    const storedOffset = Number(localStorage.getItem(UPDATE_ID_KEY) || 0);
    const offset = storedOffset + 1;
    
    const response = await fetch(`${BASE_URL}${token}/getUpdates?offset=${offset}&limit=50&timeout=0`);
    const data = await response.json();

    if (!data.ok || !Array.isArray(data.result) || data.result.length === 0) {
      return { processed: 0, message: "..." };
    }

    let processedCount = 0;
    let lastUpdateId = storedOffset;

    // Main Menu Keyboard (Persistent)
    const mainMenuKeyboard = {
        keyboard: [
            [{ text: "🛍 محصولات" }, { text: "🔍 جستجو" }],
            [{ text: "📞 ارتباط با ما" }, { text: "ℹ️ راهنما" }]
        ],
        resize_keyboard: true,
        is_persistent: true
    };

    // Contact Request Keyboard
    const contactKeyboard = {
        keyboard: [
            [{
                text: "📱 تایید شماره تلفن (الزامی)",
                request_contact: true
            }]
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
        input_field_placeholder: "برای استفاده کلیک کنید"
    };

    const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'عمومی';

    for (const update of data.result) {
      // Ensure we track the highest update_id processed
      if (update.update_id > lastUpdateId) {
          lastUpdateId = update.update_id;
      }
      
      // 1. Handle Inline Queries (Search Bar)
      if (update.inline_query) {
        const query = update.inline_query.query.toLowerCase().trim();
        const queryId = update.inline_query.id;

        const filtered = products.filter(p => 
            p.name.toLowerCase().includes(query) || 
            (p.productCode && p.productCode.toLowerCase().includes(query)) ||
            getCategoryName(p.category).toLowerCase().includes(query)
        ).slice(0, 20);

        const results = filtered.map(p => ({
            type: 'article',
            id: p.id,
            title: p.name,
            description: `کد: ${p.productCode || '-'} | ${p.price.toLocaleString()} تومان`,
            thumb_url: p.imageUrl || 'https://via.placeholder.com/100',
            input_message_content: {
                message_text: `🛍 *${p.name}*\n🔢 کد: ${p.productCode}\n\n📂 دسته: ${getCategoryName(p.category)}\n💵 قیمت: ${p.price.toLocaleString()} تومان\n\n📝 ${p.description}`,
                parse_mode: 'Markdown'
            },
            reply_markup: {
                inline_keyboard: [[
                    { text: "🛒 سفارش", url: "https://t.me/Share" } // Placeholder link
                ]]
            }
        }));

        await answerInlineQuery(token, queryId, results);
        processedCount++;
        continue;
      }

      // 2. Handle Messages
      if (update.message) {
        const chatId = update.message.chat.id;
        
        // A. Handle CONTACT Updates (User clicked the phone button)
        if (update.message.contact) {
             const contact = update.message.contact;
             const user = update.message.from;
             
             // Verify it's the user's own contact
             if (contact.user_id === user.id) {
                 const newUser: VerifiedUser = {
                    userId: user.id,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    username: user.username,
                    phoneNumber: contact.phone_number,
                    verifiedAt: Date.now()
                 };
                 StorageService.saveVerifiedUser(newUser);
                 
                 await sendTextMessage(
                     token, 
                     chatId, 
                     `✅ *هویت شما تایید شد!*\n\n${user.first_name} عزیز، خوش آمدید.\nاکنون می‌توانید از منوی زیر استفاده کنید.`, 
                     mainMenuKeyboard
                 );
                 processedCount++;
             }
             continue;
        }

        // B. Handle Text Messages
        if (update.message.text) {
            const text = update.message.text.toLowerCase().trim();
            const userFirstName = update.message.from?.first_name || 'کاربر';

            // START COMMAND - Force Verification
            if (text === '/start') {
                await sendTextMessage(
                    token, 
                    chatId, 
                    `👋 سلام ${userFirstName} عزیز!\n\nبرای استفاده از امکانات ربات و ثبت سفارش، لطفاً ابتدا شماره تماس خود را تایید کنید.`, 
                    contactKeyboard
                );
                processedCount++;
            }
            
            else if (text === '🔍 جستجو' || text === '/search') {
                await sendTextMessage(
                    token, 
                    chatId, 
                    "🔎 برای جستجو، نام یا کد محصول را بنویسید:\n\nمثال: `ساعت`",
                    mainMenuKeyboard
                );
                processedCount++;
            }
            else if (text === '/products' || text === 'محصولات' || text === '🛍 محصولات' || text === 'لیست') {
                if (products.length === 0) {
                    await sendTextMessage(token, chatId, "😔 محصولی موجود نیست.", mainMenuKeyboard);
                } else {
                    const recentProducts = [...products].sort((a, b) => b.createdAt - a.createdAt).slice(0, 20);
                    let replyText = `🛍 *لیست محصولات فروشگاه:*\n➖➖➖➖➖➖➖➖➖➖\n\n`;
                    recentProducts.forEach((p, idx) => {
                        replyText += `${idx + 1}. 🔸 *${p.name}* (کد: ${p.productCode})\n   💰 ${p.price.toLocaleString()} تومان\n\n`;
                    });
                    await sendTextMessage(token, chatId, replyText, mainMenuKeyboard);
                }
                processedCount++;
            }
            else if (text === '/help' || text === 'راهنما' || text === 'ℹ️ راهنما') {
                await sendTextMessage(token, chatId, `ℹ️ *راهنما*\n\nدستورات:\n🛍 محصولات: مشاهده لیست\n🔍 جستجو: یافتن کالا\n📞 ارتباط با ما: اطلاعات تماس`, mainMenuKeyboard);
                processedCount++;
            }
            else if (text === '📞 ارتباط با ما' || text === '/contact') {
                const config = await StorageService.getTelegramConfig();
                const contactMsg = config?.contactMessage || "📞 راه های ارتباطی:\n\n🆔 پشتیبانی: @admin\n📱 تلفن: 09120000000";
                await sendTextMessage(token, chatId, contactMsg, mainMenuKeyboard);
                processedCount++;
            }
            // Fallback Search (Treat any other text as a search query if verified)
            else if (text.length > 2 && !text.startsWith('/')) {
                 const results = products.filter(p => 
                    p.name.toLowerCase().includes(text) ||
                    (p.productCode && p.productCode.toLowerCase().includes(text))
                );
                
                if (results.length > 0) {
                    let replyText = `🔎 نتایج جستجو برای "${text}":\n\n`;
                    results.slice(0, 10).forEach((p, idx) => {
                        replyText += `${idx + 1}. *${p.name}* (کد: ${p.productCode})\n💵 ${p.price.toLocaleString()} تومان\n\n`;
                    });
                    await sendTextMessage(token, chatId, replyText, mainMenuKeyboard);
                } else {
                    await sendTextMessage(token, chatId, `❌ محصولی با نام "${text}" یافت نشد.`, mainMenuKeyboard);
                }
                processedCount++;
            }
        }
      }
    }

    // Save offset
    if (lastUpdateId > 0) {
        localStorage.setItem(UPDATE_ID_KEY, lastUpdateId.toString());
    }

    return { processed: processedCount, message: `${processedCount} processed` };

  } catch (error) {
    // Silent fail for interval
    return { processed: 0, message: "error" };
  }
};

export const sendProductToTelegram = async (
  product: Product, 
  categoryName: string, 
  config: TelegramConfig
): Promise<{ success: boolean; message: string }> => {
  
  if (!config.botToken || !config.chatId) {
    return { success: false, message: "تنظیمات ربات تلگرام کامل نیست." };
  }

  try {
    const formData = new FormData();
    formData.append('chat_id', config.chatId);
    formData.append('parse_mode', 'Markdown');

    const caption = `
🛍 *${product.name}*
🔢 *کد:* ${product.productCode || '---'}

📂 *دسته:* ${categoryName}
💵 *قیمت:* ${product.price.toLocaleString()} تومان

📝 *توضیحات:*
${product.description}
    `.trim();

    if (config.supportId) {
      const cleanUsername = config.supportId.replace('@', '');
      const buttonText = config.buttonText || '🛒 ثبت سفارش';
      
      // INLINE KEYBOARD (Glass Buttons)
      const replyMarkup = {
        inline_keyboard: [
          [
            { text: buttonText, url: `https://t.me/${cleanUsername}` }
          ]
        ]
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
      endpoint = 'sendMessage';
      formData.append('text', caption);
    }

    const response = await fetch(`${BASE_URL}${config.botToken}/${endpoint}`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (data.ok) {
      return { success: true, message: "محصول با موفقیت به کانال تلگرام ارسال شد!" };
    } else {
      return { success: false, message: `خطا تلگرام: ${data.description}` };
    }

  } catch (error) {
    return { 
      success: false, 
      message: "خطا در ارسال." 
    };
  }
};
