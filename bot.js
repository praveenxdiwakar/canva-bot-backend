import dotenv from 'dotenv';
import { Telegraf } from 'telegraf';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

// 1. Initialize Supabase and Telegram Bot
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const bot = new Telegraf(process.env.BOT_TOKEN);

const CHANNEL_ID = process.env.CHANNEL_ID;
const GROUP_ID = process.env.GROUP_ID;

console.log("🚀 Starting Canva Pro Auto-Detect Bot...");

// =========================================================================
// 🟢 1. HANDLE /start COMMAND (WHEN THEY FIRST OPEN THE BOT)
// =========================================================================
bot.start(async (ctx) => {
  const tgIdStr = String(ctx.from.id);
  const username = ctx.from.username || 'Unknown';

  try {
    await supabase.from('users').upsert({ 
      telegram_id: tgIdStr,
      username: username,
      is_bot_started: true 
    }, { onConflict: 'telegram_id' });

    ctx.reply("👋 Welcome to Canva Pro Mini App! Click the button below to open the app.", {
      reply_markup: {
        inline_keyboard: [[
          { text: "🎨 Open App", web_app: { url: "https://canva-pro-mini-web-app.vercel.app" } }
        ]]
      }
    });
    console.log(`✅ User ${tgIdStr} started the bot.`);
  } catch (error) {
    console.error(`❌ Error saving user ${tgIdStr}:`, error.message);
  }
});

// =========================================================================
// 🔴 2. DETECT IF USER BLOCKS OR UNBLOCKS THE BOT
// =========================================================================
bot.on('my_chat_member', async (ctx) => {
  const tgIdStr = String(ctx.from.id);
  const newStatus = ctx.update.my_chat_member.new_chat_member.status;
  
  const isStarted = newStatus !== 'kicked';

  try {
    await supabase.from('users').update({ is_bot_started: isStarted }).eq('telegram_id', tgIdStr);
    console.log(`🤖 User ${tgIdStr} bot status updated to: ${isStarted ? 'Started' : 'Blocked'}`);
  } catch (error) {
    console.error("❌ Supabase Error (my_chat_member):", error.message);
  }
});

// =========================================================================
// 🟡 3. DETECT IF USER JOINS OR LEAVES THE CHANNEL / GROUP
// =========================================================================
bot.on('chat_member', async (ctx) => {
  const chatId = String(ctx.chat.id);
  const tgIdStr = String(ctx.from.id);
  const newStatus = ctx.update.chat_member.new_chat_member.status;
  
  const activeStatuses = ['member', 'administrator', 'creator', 'restricted'];
  const isJoined = activeStatuses.includes(newStatus);

  try {
    if (chatId === CHANNEL_ID) {
      await supabase.from('users').update({ is_channel_joined: isJoined }).eq('telegram_id', tgIdStr);
      console.log(`📢 User ${tgIdStr} Channel status updated to: ${isJoined ? 'Joined' : 'Left'}`);
    } 
    else if (chatId === GROUP_ID) {
      await supabase.from('users').update({ is_group_joined: isJoined }).eq('telegram_id', tgIdStr);
      console.log(`👥 User ${tgIdStr} Group status updated to: ${isJoined ? 'Joined' : 'Left'}`);
    }
  } catch (error) {
    console.error("❌ Supabase Error (chat_member):", error.message);
  }
});

// =========================================================================
// LAUNCH BOT
// =========================================================================
bot.launch().then(() => {
  console.log("✅ Bot is actively listening to Telegram events!");
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
