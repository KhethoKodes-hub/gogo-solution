import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import puppeteer, { Browser } from 'puppeteer';

@Injectable()
export class PdfGenerationService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfGenerationService.name);
  private browserPromise: Promise<Browser> | null = null;

  constructor(private readonly config: ConfigService) {}

  async renderHtmlToPdf(html: string): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'load' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', bottom: '10mm', left: '10mm', right: '10mm' },
      });
      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }

  private getBrowser(): Promise<Browser> {
    if (this.browserPromise === null) {
      const noSandbox = (this.config.get<string>('PDF_NO_SANDBOX', 'true') ?? 'true') === 'true';
      this.browserPromise = puppeteer
        .launch({
          headless: true,
          args: noSandbox ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
        })
        .catch((error) => {
          this.browserPromise = null;
          throw error;
        });
    }
    return this.browserPromise;
  }

  async onModuleDestroy() {
    if (this.browserPromise === null) {
      return;
    }
    try {
      const browser = await this.browserPromise;
      await browser.close();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to close Puppeteer browser cleanly: ${message}`);
    } finally {
      this.browserPromise = null;
    }
  }
}
