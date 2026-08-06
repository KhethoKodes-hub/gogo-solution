import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mjml2html from 'mjml';

type RenderedEmail = {
  subject: string;
  text: string;
  html: string;
};

type ContactInput = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

type QuoteInput = {
  name?: string;
  email?: string;
  phone?: string;
  tripType: string;
  pickupDate: string;
  pickupTime: string;
  returnDate?: string;
  returnTime?: string;
  collectionAddress: string;
  destinationAddress: string;
  passengers?: number;
  serviceType?: string;
  additionalDetails?: string;
  estimate?: string;
};

type NewsletterInput = {
  email: string;
  name?: string;
};

type BookingInput = {
  bookingId: string;
  status: string;
  routeStart: string;
  routeEnd: string;
  bookingDate: string;
  bookingTime: string;
  busCapacity: string;
  price: string;
  customerEmail: string;
  contactName?: string;
  contactPhone?: string;
  purchaseOrder?: string;
};

type ReceiptInput = {
  bookingId: string;
  contactName?: string;
  customerEmail: string;
  routeStart: string;
  routeEnd: string;
  bookingDate: string;
  bookingTime: string;
  busCapacity: string;
  amountPaid: string;
  paymentDate: string;
  paymentId?: string;
  paymentStatus: string;
};

const brand = {
  primary: '#df1119',
  navy: '#04223e',
  heading: '#000000',
  body: '#666666',
  white: '#ffffff',
  greyBg: '#f8f5f1',
  border: '#dddddd',
};

const brandLinks = {
  website: 'https://www.gogoshuttles.co.za',
  logo: 'https://www.gogoshuttles.co.za/assets/img/gogo-logo.png',
  facebook: 'https://www.facebook.com/GoGoShuttles1',
  instagram: 'https://www.instagram.com/go_go_shuttles/',
};

const defaultEftDetails = {
  beneficiary: 'GO-GO Shuttles (Pty) Ltd',
  bank: 'FNB',
  accountNumber: '62715804119',
  accountType: 'Cheque Account',
  branchCode: '250 655 (South Gate)',
  proofEmail: 'info@gogoshuttles.co.za',
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Injectable()
export class EmailTemplateService {
  constructor(private readonly config: ConfigService) {}

  private async renderMjml(mjml: string) {
    const { html, errors } = await mjml2html(mjml, {
      minify: true,
      validationLevel: 'soft',
    });

    if (Array.isArray(errors) && errors.length > 0) {
      throw new InternalServerErrorException('Failed to render email template');
    }

    return html;
  }

  private shell(content: string) {
    return `
<mjml>
  <mj-head>
    <mj-title>GO-GO Shuttles</mj-title>
    <mj-font name="DM Sans" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" />
    <mj-attributes>
      <mj-all font-family="DM Sans, Arial, sans-serif" />
      <mj-text color="${brand.body}" font-size="15px" line-height="1.6" />
      <mj-button background-color="${brand.primary}" color="${brand.white}" border-radius="6px" font-size="13px" font-weight="700" inner-padding="12px 20px" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="${brand.greyBg}">
    <mj-section background-color="${brand.white}" padding="0">
      <mj-column>
        <mj-text align="center" color="${brand.white}" background-color="${brand.navy}" padding="8px 16px" font-size="11px" font-weight="700" letter-spacing="1px" text-transform="uppercase">Travel With Experts</mj-text>
        <mj-image href="${brandLinks.website}" src="${brandLinks.logo}" alt="GO-GO Shuttles" width="180px" padding="18px 0 6px 0" />
      </mj-column>
    </mj-section>
    <mj-section background-color="${brand.white}" padding="22px 24px" border="1px solid ${brand.border}">
      <mj-column>
        ${content}
      </mj-column>
    </mj-section>
    <mj-section background-color="${brand.white}" padding="10px 24px 0" border-left="1px solid ${brand.border}" border-right="1px solid ${brand.border}">
      <mj-column>
        <mj-social mode="horizontal" icon-size="22px" align="center" padding="0">
          <mj-social-element name="facebook" href="${brandLinks.facebook}">Facebook</mj-social-element>
          <mj-social-element name="instagram" href="${brandLinks.instagram}">Instagram</mj-social-element>
        </mj-social>
      </mj-column>
    </mj-section>
    <mj-section background-color="${brand.white}" padding="10px 24px 14px" border-left="1px solid ${brand.border}" border-right="1px solid ${brand.border}" border-bottom="1px solid ${brand.border}">
      <mj-column>
        <mj-text align="center" color="${brand.heading}" font-size="12px" font-weight="700" padding="0">GO-GO Shuttles (Pty) Ltd</mj-text>
        <mj-text align="center" color="${brand.body}" font-size="12px" padding="4px 0 0">100 Western Service Rd, Woodmead, Sandton, 2148</mj-text>
        <mj-text align="center" color="${brand.body}" font-size="12px" padding="2px 0 0">011 568 5340 / 064 540 8024 | info@gogoshuttles.co.za</mj-text>
        <mj-text align="center" color="${brand.body}" font-size="12px" padding="2px 0 0">10 Years of Moving People Forward (2016-2026)</mj-text>
      </mj-column>
    </mj-section>
    <mj-section padding="10px 0 20px 0">
      <mj-column>
        <mj-text align="center" color="${brand.body}" font-size="11px" padding="0">Reliable staff, school and private shuttle transport across South Africa.</mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;
  }

  async buildContactAcknowledgement(input: ContactInput): Promise<RenderedEmail> {
    const safeName = escapeHtml(input.name);
    const safeMessage = escapeHtml(input.message);

    return {
      subject: 'We received your message - GO-GO Shuttles',
      text: `Hi ${input.name},\n\nThanks for contacting GO-GO Shuttles. We received your message and will respond shortly.\n\nYour message:\n${input.message}\n`,
      html: await this.renderMjml(
        this.shell(`
          <mj-text color="${brand.heading}" font-size="26px" font-weight="700">Message Received</mj-text>
          <mj-text>Hi ${safeName}, thanks for reaching out. Our team will contact you shortly.</mj-text>
          <mj-divider border-color="${brand.border}" padding="10px 0" />
          <mj-text color="${brand.heading}" font-size="13px" font-weight="700" text-transform="uppercase">Your Message</mj-text>
          <mj-text>${safeMessage}</mj-text>
        `)
      ),
    };
  }

  async buildContactNotification(input: ContactInput): Promise<RenderedEmail> {
    return {
      subject: `[Contact] ${input.subject} - ${input.name}`,
      text: `New contact submission\n\nName: ${input.name}\nEmail: ${input.email}\nPhone: ${input.phone}\nSubject: ${input.subject}\n\nMessage:\n${input.message}\n`,
      html: await this.renderMjml(
        this.shell(`
          <mj-text color="${brand.heading}" font-size="26px" font-weight="700">New Contact Submission</mj-text>
          <mj-text><strong>Name:</strong> ${escapeHtml(input.name)}<br/><strong>Email:</strong> ${escapeHtml(input.email)}<br/><strong>Phone:</strong> ${escapeHtml(input.phone)}<br/><strong>Subject:</strong> ${escapeHtml(input.subject)}</mj-text>
          <mj-divider border-color="${brand.border}" padding="10px 0" />
          <mj-text color="${brand.heading}" font-size="13px" font-weight="700" text-transform="uppercase">Message</mj-text>
          <mj-text>${escapeHtml(input.message)}</mj-text>
          <mj-button href="mailto:${escapeHtml(input.email)}">Reply To Client</mj-button>
        `)
      ),
    };
  }

  async buildQuoteAcknowledgement(input: QuoteInput): Promise<RenderedEmail> {
    const name = input.name ?? 'there';
    const details = this.quoteDetails(input);
    const eftDetails = this.getEftDetails();
    const quoteReference = input.name || input.email || 'Quote';

    return {
      subject: 'We received your quote request - GO-GO Shuttles',
      text: `Hi ${name},\n\nThanks for your quote request. Our team will respond shortly.\n\nRequest details:\n${details}\n\nEFT PAYMENT DETAILS\n${this.quotePaymentDetails(quoteReference)}\n`,
      html: await this.renderMjml(
        this.shell(`
          <mj-text color="${brand.heading}" font-size="26px" font-weight="700">Quote Request Received</mj-text>
          <mj-text>Hi ${escapeHtml(name)}, we received your quote request and our team will respond shortly.</mj-text>
          <mj-divider border-color="${brand.border}" padding="10px 0" />
          <mj-text color="${brand.heading}" font-size="13px" font-weight="700" text-transform="uppercase">Request Details</mj-text>
          <mj-text>${escapeHtml(details).replace(/\n/g, '<br/>')}</mj-text>
          <mj-divider border-color="${brand.border}" padding="12px 0" />
          <mj-text color="${brand.heading}" font-size="13px" font-weight="700" text-transform="uppercase">EFT Payment Details</mj-text>
          <mj-text>
            <strong>Beneficiary:</strong> ${escapeHtml(eftDetails.beneficiary)}<br/>
            <strong>Bank:</strong> ${escapeHtml(eftDetails.bank)}<br/>
            <strong>Account Number:</strong> ${escapeHtml(eftDetails.accountNumber)}<br/>
            <strong>Account Type:</strong> ${escapeHtml(eftDetails.accountType)}<br/>
            <strong>Branch Code:</strong> ${escapeHtml(eftDetails.branchCode)}<br/>
            <strong>Reference:</strong> ${escapeHtml(quoteReference)}<br/>
            <strong>Proof of Payment:</strong> ${escapeHtml(eftDetails.proofEmail)}
          </mj-text>
          <mj-text color="${brand.body}" font-size="13px">This is an estimate only. Please wait for our team to confirm final pricing before making payment.</mj-text>
        `)
      ),
    };
  }

  async buildQuoteNotification(input: QuoteInput): Promise<RenderedEmail> {
    const details = this.quoteDetails(input, true);

    return {
      subject: `[Quote Request] ${input.tripType} - ${input.name ?? input.email ?? 'Lead'}`,
      text: `New quote request\n\n${details}\n`,
      html: await this.renderMjml(
        this.shell(`
          <mj-text color="${brand.heading}" font-size="26px" font-weight="700">New Quote Request</mj-text>
          <mj-text>${escapeHtml(details).replace(/\n/g, '<br/>')}</mj-text>
        `)
      ),
    };
  }

  async buildNewsletterAcknowledgement(input: NewsletterInput): Promise<RenderedEmail> {
    const name = input.name ?? 'there';
    return {
      subject: 'Subscription confirmed - GO-GO Shuttles',
      text: `Hi ${name},\n\nYou are now subscribed to GO-GO Shuttles updates.\n`,
      html: await this.renderMjml(
        this.shell(`
          <mj-text color="${brand.heading}" font-size="26px" font-weight="700">Subscription Confirmed</mj-text>
          <mj-text>Hi ${escapeHtml(name)}, you are now subscribed to GO-GO Shuttles updates.</mj-text>
        `)
      ),
    };
  }

  async buildNewsletterNotification(input: NewsletterInput): Promise<RenderedEmail> {
    return {
      subject: `[Newsletter] New subscription - ${input.email}`,
      text: `New newsletter subscription\n\nName: ${input.name ?? 'Not provided'}\nEmail: ${input.email}\n`,
      html: await this.renderMjml(
        this.shell(`
          <mj-text color="${brand.heading}" font-size="26px" font-weight="700">New Newsletter Subscription</mj-text>
          <mj-text><strong>Name:</strong> ${escapeHtml(input.name ?? 'Not provided')}<br/><strong>Email:</strong> ${escapeHtml(input.email)}</mj-text>
        `)
      ),
    };
  }

  async buildBookingAcknowledgement(input: BookingInput): Promise<RenderedEmail> {
    const name = input.contactName || 'there';
    const details = this.bookingDetails(input);
    const paymentDetails = this.bookingPaymentDetails(input);
    const eftDetails = this.getEftDetails();

    return {
      subject: `Booking received - ${input.bookingId} | GO-GO Shuttles`,
      text: `Hi ${name},\n\nYour booking has been received with reference ${input.bookingId}.\n\n${details}\n\nEFT PAYMENT DETAILS\n${paymentDetails}\n`,
      html: await this.renderMjml(
        this.shell(`
          <mj-text color="${brand.heading}" font-size="26px" font-weight="700">Booking Received</mj-text>
          <mj-text>Hi ${escapeHtml(name)}, your booking has been logged successfully.</mj-text>
          <mj-text><strong>Reference:</strong> ${escapeHtml(input.bookingId)}<br/><strong>Status:</strong> ${escapeHtml(input.status)}</mj-text>
          <mj-divider border-color="${brand.border}" padding="10px 0" />
          <mj-text>${escapeHtml(details).replace(/\n/g, '<br/>')}</mj-text>
          <mj-divider border-color="${brand.border}" padding="12px 0" />
          <mj-text color="${brand.heading}" font-size="13px" font-weight="700" text-transform="uppercase">EFT Payment Details</mj-text>
          <mj-text>
            <strong>Beneficiary:</strong> ${escapeHtml(eftDetails.beneficiary)}<br/>
            <strong>Bank:</strong> ${escapeHtml(eftDetails.bank)}<br/>
            <strong>Account Number:</strong> ${escapeHtml(eftDetails.accountNumber)}<br/>
            <strong>Account Type:</strong> ${escapeHtml(eftDetails.accountType)}<br/>
            <strong>Branch Code:</strong> ${escapeHtml(eftDetails.branchCode)}<br/>
            <strong>Reference:</strong> ${escapeHtml(input.bookingId)}<br/>
            <strong>Proof of Payment:</strong> ${escapeHtml(eftDetails.proofEmail)}
          </mj-text>
          <mj-text color="${brand.body}" font-size="13px">Please use your booking reference when paying by EFT to avoid allocation delays.</mj-text>
        `)
      ),
    };
  }

  async buildBookingNotification(input: BookingInput): Promise<RenderedEmail> {
    const details = this.bookingDetails(input);
    const paymentDetails = this.bookingPaymentDetails(input);
    return {
      subject: `[Booking] ${input.bookingId} - ${input.status}`,
      text: `New booking created\n\n${details}\n\nEFT PAYMENT DETAILS\n${paymentDetails}\n`,
      html: await this.renderMjml(
        this.shell(`
          <mj-text color="${brand.heading}" font-size="26px" font-weight="700">New Booking Created</mj-text>
          <mj-text><strong>Reference:</strong> ${escapeHtml(input.bookingId)}<br/><strong>Status:</strong> ${escapeHtml(input.status)}</mj-text>
          <mj-divider border-color="${brand.border}" padding="10px 0" />
          <mj-text>${escapeHtml(details).replace(/\n/g, '<br/>')}</mj-text>
          <mj-divider border-color="${brand.border}" padding="12px 0" />
          <mj-text color="${brand.heading}" font-size="13px" font-weight="700" text-transform="uppercase">EFT Payment Details</mj-text>
          <mj-text>${escapeHtml(paymentDetails).replace(/\n/g, '<br/>')}</mj-text>
        `)
      ),
    };
  }

  private printShell(title: string, content: string) {
    return `
<mjml>
  <mj-head>
    <mj-title>${title}</mj-title>
    <mj-font name="DM Sans" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" />
    <mj-attributes>
      <mj-all font-family="DM Sans, Arial, sans-serif" />
      <mj-text color="${brand.body}" font-size="14px" line-height="1.6" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="${brand.white}" width="700px">
    <mj-section background-color="${brand.white}" padding="0 0 10px">
      <mj-column>
        <mj-image href="${brandLinks.website}" src="${brandLinks.logo}" alt="GO-GO Shuttles" width="160px" align="left" padding="0" />
      </mj-column>
    </mj-section>
    <mj-section background-color="${brand.white}" padding="10px 0">
      <mj-column>
        <mj-text color="${brand.heading}" font-size="28px" font-weight="700" padding="0 0 4px">${title}</mj-text>
        <mj-divider border-color="${brand.border}" padding="6px 0 16px" />
      </mj-column>
    </mj-section>
    <mj-section background-color="${brand.white}" padding="0">
      <mj-column>
        ${content}
      </mj-column>
    </mj-section>
    <mj-section padding="24px 0 0">
      <mj-column>
        <mj-divider border-color="${brand.border}" padding="0 0 10px" />
        <mj-text align="center" color="${brand.heading}" font-size="12px" font-weight="700" padding="0">GO-GO Shuttles (Pty) Ltd</mj-text>
        <mj-text align="center" color="${brand.body}" font-size="12px" padding="4px 0 0">100 Western Service Rd, Woodmead, Sandton, 2148</mj-text>
        <mj-text align="center" color="${brand.body}" font-size="12px" padding="2px 0 0">011 568 5340 / 064 540 8024 | info@gogoshuttles.co.za</mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;
  }

  async buildPaymentReceiptEmail(input: ReceiptInput): Promise<RenderedEmail> {
    const name = input.contactName || 'there';
    const details = this.receiptDetails(input);

    return {
      subject: `Payment Receipt - ${input.bookingId} | GO-GO Shuttles`,
      text: `Hi ${name},\n\nThank you for your payment. Your booking ${input.bookingId} is confirmed.\n\n${details}\n\nYour receipt is attached as a PDF.\n`,
      html: await this.renderMjml(
        this.shell(`
          <mj-text color="${brand.heading}" font-size="26px" font-weight="700">Payment Received</mj-text>
          <mj-text>Hi ${escapeHtml(name)}, thank you for your payment. Your booking is confirmed.</mj-text>
          <mj-divider border-color="${brand.border}" padding="10px 0" />
          <mj-text>${escapeHtml(details).replace(/\n/g, '<br/>')}</mj-text>
          <mj-text color="${brand.body}" font-size="13px">Your official receipt is attached to this email as a PDF.</mj-text>
        `)
      ),
    };
  }

  async buildPaymentReceiptPdfHtml(input: ReceiptInput): Promise<string> {
    const name = input.contactName || 'Customer';
    const details = this.receiptDetails(input);

    return this.renderMjml(
      this.printShell('Payment Receipt', `
        <mj-text><strong>Receipt For:</strong> ${escapeHtml(name)}<br/><strong>Customer Email:</strong> ${escapeHtml(input.customerEmail)}</mj-text>
        <mj-divider border-color="${brand.border}" padding="12px 0" />
        <mj-text>${escapeHtml(details).replace(/\n/g, '<br/>')}</mj-text>
        <mj-divider border-color="${brand.border}" padding="12px 0" />
        <mj-text color="${brand.primary}" font-size="16px" font-weight="700">Status: ${escapeHtml(input.paymentStatus)}</mj-text>
      `)
    );
  }

  async buildQuoteEstimatePdfHtml(input: QuoteInput): Promise<string> {
    const details = this.quoteDetails(input, true);
    const quoteReference = input.name || input.email || 'Quote';

    return this.renderMjml(
      this.printShell('Quote Estimate', `
        <mj-text>${escapeHtml(details).replace(/\n/g, '<br/>')}</mj-text>
        <mj-divider border-color="${brand.border}" padding="12px 0" />
        <mj-text color="${brand.heading}" font-size="13px" font-weight="700" text-transform="uppercase">EFT Payment Details</mj-text>
        <mj-text>${escapeHtml(this.quotePaymentDetails(quoteReference)).replace(/\n/g, '<br/>')}</mj-text>
        <mj-divider border-color="${brand.border}" padding="12px 0" />
        <mj-text color="${brand.body}" font-size="12px">This is an estimate only and is subject to final confirmation from our team.</mj-text>
      `)
    );
  }

  private getEftDetails() {
    return {
      beneficiary: this.config.get<string>('EFT_BENEFICIARY', defaultEftDetails.beneficiary),
      bank: this.config.get<string>('EFT_BANK', defaultEftDetails.bank),
      accountNumber: this.config.get<string>('EFT_ACCOUNT_NUMBER', defaultEftDetails.accountNumber),
      accountType: this.config.get<string>('EFT_ACCOUNT_TYPE', defaultEftDetails.accountType),
      branchCode: this.config.get<string>('EFT_BRANCH_CODE', defaultEftDetails.branchCode),
      proofEmail: this.config.get<string>('EFT_PROOF_EMAIL', defaultEftDetails.proofEmail),
    };
  }

  private quoteDetails(input: QuoteInput, includeIdentity = false) {
    const lines = [
      includeIdentity ? `Name: ${input.name ?? 'Not provided'}` : '',
      includeIdentity ? `Email: ${input.email ?? 'Not provided'}` : '',
      includeIdentity ? `Phone: ${input.phone ?? 'Not provided'}` : '',
      `Trip Type: ${input.tripType}`,
      `Pickup: ${input.pickupDate} ${input.pickupTime}`,
      input.returnDate ? `Return: ${input.returnDate} ${input.returnTime ?? ''}`.trim() : '',
      `Collection: ${input.collectionAddress}`,
      `Destination: ${input.destinationAddress}`,
      input.passengers ? `Passengers: ${input.passengers}` : '',
      input.serviceType ? `Service Type: ${input.serviceType}` : '',
      `Estimate: ${input.estimate ?? 'Pending final confirmation from our team'}`,
      input.additionalDetails ? `Additional Details: ${input.additionalDetails}` : '',
    ];

    return lines.filter(Boolean).join('\n');
  }

  private quotePaymentDetails(reference: string) {
    const eftDetails = this.getEftDetails();
    const lines = [
      `Beneficiary: ${eftDetails.beneficiary}`,
      `Bank: ${eftDetails.bank}`,
      `Account Number: ${eftDetails.accountNumber}`,
      `Account Type: ${eftDetails.accountType}`,
      `Branch Code: ${eftDetails.branchCode}`,
      `Reference: ${reference}`,
      `Proof of Payment: ${eftDetails.proofEmail}`,
    ];

    return lines.join('\n');
  }

  private bookingDetails(input: BookingInput) {
    const lines = [
      `Booking Ref: ${input.bookingId}`,
      `Customer: ${input.contactName || input.customerEmail}`,
      `Email: ${input.customerEmail}`,
      input.contactPhone ? `Phone: ${input.contactPhone}` : '',
      `Route: ${input.routeStart} -> ${input.routeEnd}`,
      `Date: ${input.bookingDate}`,
      `Time: ${input.bookingTime}`,
      `Capacity: ${input.busCapacity}`,
      `Price: R ${input.price}`,
      input.purchaseOrder ? `Purchase Order: ${input.purchaseOrder}` : '',
      `Status: ${input.status}`,
    ];

    return lines.filter(Boolean).join('\n');
  }

  private bookingPaymentDetails(input: BookingInput) {
    const eftDetails = this.getEftDetails();
    const lines = [
      `Beneficiary: ${eftDetails.beneficiary}`,
      `Bank: ${eftDetails.bank}`,
      `Account Number: ${eftDetails.accountNumber}`,
      `Account Type: ${eftDetails.accountType}`,
      `Branch Code: ${eftDetails.branchCode}`,
      `Reference: ${input.bookingId}`,
      `Proof of Payment: ${eftDetails.proofEmail}`,
    ];

    return lines.join('\n');
  }

  private receiptDetails(input: ReceiptInput) {
    const lines = [
      `Booking Ref: ${input.bookingId}`,
      `Customer: ${input.contactName || input.customerEmail}`,
      `Email: ${input.customerEmail}`,
      `Route: ${input.routeStart} -> ${input.routeEnd}`,
      `Date: ${input.bookingDate}`,
      `Time: ${input.bookingTime}`,
      `Capacity: ${input.busCapacity}`,
      `Amount Paid: R ${input.amountPaid}`,
      `Payment Date: ${input.paymentDate}`,
      input.paymentId ? `Payment ID: ${input.paymentId}` : '',
      `Payment Status: ${input.paymentStatus}`,
    ];

    return lines.filter(Boolean).join('\n');
  }
}
