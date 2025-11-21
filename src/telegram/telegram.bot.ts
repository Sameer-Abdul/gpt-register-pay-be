import { Telegraf } from 'telegraf';
import { TelegramService } from './telegram.service';

export class TelegramBot {
  private bot: Telegraf;

  constructor(token: string, private telegramService: TelegramService) {
    this.bot = new Telegraf(token);
    this.setupCommands();
  }

  private setupCommands() {
    // Start command
    this.bot.command('start', async (ctx) => {
      const message = await this.telegramService.handleStart(ctx.chat.id);
      await ctx.reply(message, { parse_mode: 'Markdown' });
    });

    // Handle both /link[phone] and /link [phone] formats
    this.bot.hears(/^\/link(\d+)$/i, async (ctx) => {
      const phone = ctx.match[1];
      await this.handlePhoneLink(ctx, phone);
    });

    // Legacy /link [phone] format
    this.bot.command('link', async (ctx) => {
      const args = ctx.message.text.split(' ').slice(1);
      if (args.length === 0) {
        await ctx.reply('❌ Please provide a phone number. Example: /link9876543210', { parse_mode: 'Markdown' });
        return;
      }
      await this.handlePhoneLink(ctx, args[0]);
    });

    // Error handling
    this.bot.catch((error) => {
      console.error('Telegram bot error:', error);
    });
  }

  async sendMessage(chatId: string, text: string, options?: any) {
    await this.bot.telegram.sendMessage(chatId, text, options);
  }

  private async handlePhoneLink(ctx: any, phone: string) {
    try {
      const message = await this.telegramService.handleLinkCommand(ctx.chat.id, phone);
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error in handlePhoneLink:', error);
      await ctx.reply('❌ An error occurred while processing your request. Please try again later.', { parse_mode: 'Markdown' });
    }
  }

  async launch() {
  try {
    // Retry 3 times (Render cold start fix)
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await this.bot.telegram.getMe();
        console.log("🤖 Telegram bot connected successfully", res);
        break;
      } catch (err) {
        console.warn(`⚠️ Telegram API attempt ${attempt} failed:`, err.message);
        if (attempt === 3) throw err;
        await new Promise(res => setTimeout(res, 3000));
      }
    }

    // Start the bot
    this.bot.launch();
    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));

  } catch (error) {
    console.warn('⚠️ Telegram bot could not connect to the API. Bot will not be available.');
    console.debug('Telegram API error:', error.message);
  }
}

}
