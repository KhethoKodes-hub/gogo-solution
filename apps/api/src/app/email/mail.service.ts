import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

type RenderedEmail = {
  subject: string;
  text: string;
  html: string;
};

export type MailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendDualEmail(input: {
    ackTo?: string;
    notifyTo?: string;
    replyTo?: string;
    ack: RenderedEmail;
    notify: RenderedEmail;
    failMessage: string;
    ackAttachments?: MailAttachment[];
    notifyAttachments?: MailAttachment[];
  }) {
    const host = this.config.get<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT') ?? '587');
    const secure = (this.config.get<string>('SMTP_SECURE') ?? 'false') === 'true';
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    const from = this.config.get<string>('MAIL_FROM') ?? 'noreply@gogoshuttles.local';

    if (!host || !user || !pass) {
      this.logger.error('SMTP mode configured without required env vars');
      throw new InternalServerErrorException('Mail service is not configured');
    }

    const notifyTo = input.notifyTo || this.config.get<string>('CONTACT_NOTIFICATION_EMAIL');
    if (!notifyTo) {
      this.logger.error('No notification email configured');
      throw new InternalServerErrorException('Mail service is not configured');
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    const tasks: Array<Promise<unknown>> = [];

    if (input.ackTo) {
      tasks.push(
        transporter.sendMail({
          from,
          to: input.ackTo,
          replyTo: input.replyTo,
          subject: input.ack.subject,
          text: input.ack.text,
          html: input.ack.html,
          ...(input.ackAttachments?.length ? { attachments: input.ackAttachments } : {}),
        })
      );
    }

    tasks.push(
      transporter.sendMail({
        from,
        to: notifyTo,
        replyTo: input.replyTo,
        subject: input.notify.subject,
        text: input.notify.text,
        html: input.notify.html,
        ...(input.notifyAttachments?.length ? { attachments: input.notifyAttachments } : {}),
      })
    );

    const results = await Promise.allSettled(tasks);
    const hasRejection = results.some((result) => result.status === 'rejected');
    if (hasRejection) {
      this.logger.error('SMTP send failure', JSON.stringify(results));
      throw new InternalServerErrorException(input.failMessage);
    }
  }
}
