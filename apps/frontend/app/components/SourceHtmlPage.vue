<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Swiper from 'swiper';
import { Autoplay, EffectFade, Navigation, Pagination } from 'swiper/modules';

const props = defineProps<{
  sourceHtml: string;
}>();

const routeMap: Record<string, string> = {
  'index.html': '/',
  'about.html': '/about',
  'company.html': '/company',
  'services-transportation.html': '/services-transportation',
  'projects.html': '/projects',
  'gallery.html': '/gallery',
  'gallery2.html': '/gallery2',
  'quote.html': '/quote',
  'contact.html': '/contact',
};

function extractBody(html: string) {
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return match ? match[1] : html;
}

function extractTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].trim() : '';
}

function extractInlineStyles(html: string) {
  const matches = html.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi);
  return matches ? matches.join('\n') : '';
}

function extractInlineScriptBodies(html: string) {
  const matches = [...html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  return matches
    .map((match) => (match[1] || '').trim())
    .filter((scriptBody) => scriptBody.length > 0);
}

function rewriteAssetPaths(html: string) {
  let output = html;

  output = output.replace(/https?:\/\/(?:www\.)?gogoshuttles\.co\.za\/assets\//gi, '/assets/');

  output = output.replace(
    /\b(src|href|poster|data-background|data-bg-image)=(['"])assets\//gi,
    '$1=$2/assets/'
  );
  output = output.replace(/url\((['"]?)assets\//gi, 'url($1/assets/');

  return output;
}

function rewriteInternalLinks(html: string) {
  let output = html.replace(
    /\b(href|action)=(['"])(?:(?:https?:\/\/(?:www\.)?gogoshuttles\.co\.za\/)|\/|\.\/)?([a-z0-9-]+\.html)([#?][^'"]*)?\2/gi,
    (full, attr: string, quote: string, htmlFile: string, suffix: string | undefined) => {
      const mappedRoute = routeMap[htmlFile.toLowerCase()];
      if (!mappedRoute) {
        return full;
      }
      return `${attr}=${quote}${mappedRoute}${suffix || ''}${quote}`;
    }
  );

  output = rewriteAssetPaths(output);

  // Inline SVGs for icons whose webfont weights are not bundled (fa-sharp-solid-900 missing).
  const svgChevronUp = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M201.4 137.4c12.5-12.5 32.8-12.5 45.3 0l160 160c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L224 205.3 86.6 342.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l160-160z"/></svg>';
  const svgQuoteRight = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M448 296c0 66.3-53.7 120-120 120h-8c-17.7 0-32-14.3-32-32s14.3-32 32-32h8c30.9 0 56-25.1 56-56v-8H320c-35.3 0-64-28.7-64-64V160c0-35.3 28.7-64 64-64h64c35.3 0 64 28.7 64 64v136zm-256 0c0 66.3-53.7 120-120 120H64c-17.7 0-32-14.3-32-32s14.3-32 32-32h8c30.9 0 56-25.1 56-56v-8H64c-35.3 0-64-28.7-64-64V160c0-35.3 28.7-64 64-64h64c35.3 0 64 28.7 64 64v136z"/></svg>';
  const svgStarFilled = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M316.9 18C311.6 7 300.4 0 288.1 0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329l-24.6 145.7c-2 12 3 24.2 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3s14.9-19.3 12.9-31.3L438.5 329l104.2-103.1c8.6-8.5 11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z"/></svg>';

  output = output.replace(
    /<button\b([^>]*class="[^"]*scroll-to-top[^"]*"[^>]*)>\s*<i\b[^>]*><\/i>\s*<\/button>/gi,
    `<button$1>${svgChevronUp}</button>`
  );
  output = output.replace(
    /<i\b[^>]*\bfa-quote-right\b[^>]*><\/i>/gi,
    svgQuoteRight
  );
  output = output.replace(
    /<i\b[^>]*\bfa-star\b[^>]*><\/i>/gi,
    svgStarFilled
  );

  output = output.replace(
    /<div class="map-wrapper">[\s\S]*?<\/div>/i,
    `<div class="map-wrapper"><iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3584.1693885951404!2d28.084255092635654!3d-26.06072001828775!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1e9573c97bdb016f%3A0x3176b611654b5bbe!2sGo%20Go%20Shuttles!5e0!3m2!1sen!2sza!4v1785619757261!5m2!1sen!2sza" width="100%" height="400" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`
  );

  // Scripts are loaded globally from nuxt.config.ts in source order.
  output = output.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

  return output;
}

const extractedTitle = computed(() => extractTitle(props.sourceHtml));
const renderedBody = computed(() => rewriteInternalLinks(extractBody(props.sourceHtml)));
const inlineStyles = computed(() => rewriteAssetPaths(extractInlineStyles(props.sourceHtml)));
const renderedHtml = computed(() => `${inlineStyles.value}\n${renderedBody.value}`);
const inlineScriptBodies = computed(() => extractInlineScriptBodies(props.sourceHtml));
const runtimeConfig = useRuntimeConfig();
const managedFormsEnabled = computed(() => Boolean(runtimeConfig.public.enableManagedForms));
const toast = useUiToast();

type FormFieldElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
type ValidationRule = {
  selector: string;
  label: string;
  required?: boolean;
  pattern?: RegExp;
  message?: string;
  validate?: (value: string, form: HTMLFormElement) => string | null;
};

const injectedScripts = ref<HTMLScriptElement[]>([]);
const mainSwiper = ref<Swiper | null>(null);
const projectSwiper = ref<Swiper | null>(null);
const testimonialSwiper = ref<Swiper | null>(null);
const formListeners: Array<{ form: HTMLFormElement; handler: EventListener }> = [];
const validationListeners: Array<{ field: FormFieldElement; type: string; handler: EventListener }> = [];
const scrollListeners: Array<{ target: Window | HTMLElement; type: string; handler: EventListenerOrEventListenerObject }> = [];
const clickListeners: Array<{ target: HTMLElement; handler: EventListenerOrEventListenerObject }> = [];
let preloaderCleanupTimer: ReturnType<typeof setTimeout> | null = null;

function clearInjectedScripts() {
  for (const scriptEl of injectedScripts.value) {
    scriptEl.remove();
  }
  injectedScripts.value = [];
}

function clearFormListeners() {
  while (formListeners.length > 0) {
    const entry = formListeners.pop();
    if (!entry) {
      continue;
    }
    entry.form.removeEventListener('submit', entry.handler, true);
  }

  while (validationListeners.length > 0) {
    const entry = validationListeners.pop();
    if (!entry) {
      continue;
    }
    entry.field.removeEventListener(entry.type, entry.handler);
  }
}

function clearBackToTopListeners() {
  while (scrollListeners.length > 0) {
    const entry = scrollListeners.pop();
    if (!entry) {
      continue;
    }
    entry.target.removeEventListener(entry.type, entry.handler);
  }

  while (clickListeners.length > 0) {
    const entry = clickListeners.pop();
    if (!entry) {
      continue;
    }
    entry.target.removeEventListener('click', entry.handler);
  }
}

function attachBackToTopHandler() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  clearBackToTopListeners();

  const scrollTopButton = document.getElementById('scroll-top') as HTMLButtonElement | null;
  const scrollContainer = document.getElementById('scrollup') as HTMLElement | null;
  if (!scrollTopButton || !scrollContainer) {
    return;
  }

  const syncState = () => {
    const topPos = window.scrollY || document.documentElement.scrollTop || 0;
    if (topPos > 100) {
      scrollContainer.classList.remove('hide');
      scrollContainer.classList.add('show');
    } else {
      scrollContainer.classList.remove('show');
      scrollContainer.classList.add('hide');
    }
  };

  const onScroll: EventListener = () => {
    syncState();
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  scrollListeners.push({ target: window, type: 'scroll', handler: onScroll });

  const onClick: EventListener = (event) => {
    event.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };
  scrollTopButton.addEventListener('click', onClick);
  clickListeners.push({ target: scrollTopButton, handler: onClick });

  syncState();
}

function getApiUrl(path: string) {
  const base = String(runtimeConfig.public.apiBaseUrl || '').replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

function getFieldValue(
  form: ParentNode,
  selector: string
) {
  const field = form.querySelector<FormFieldElement>(selector);
  return (field?.value ?? '').trim();
}

function setFormMessage(
  container: HTMLElement | null,
  type: 'success' | 'error',
  message: string
) {
  if (!container) {
    return;
  }

  container.textContent = message;
  container.classList.remove('alert-success', 'alert-danger', 'success', 'error', 'd-none');
  container.classList.add('alert');

  if (type === 'success') {
    container.classList.add('alert-success', 'success');
  } else {
    container.classList.add('alert-danger', 'error');
  }
}

function isVisibleField(field: FormFieldElement) {
  const owner = field as HTMLElement;
  if (owner.offsetParent !== null) {
    return true;
  }

  const style = window.getComputedStyle(owner);
  return style.position === 'fixed';
}

function markFieldInvalid(field: FormFieldElement, invalid: boolean) {
  if (invalid) {
    field.style.borderColor = '#e31837';
    field.setAttribute('aria-invalid', 'true');
    return;
  }
  field.style.borderColor = '';
  field.removeAttribute('aria-invalid');
}

function getFieldErrorElement(field: FormFieldElement) {
  const wrapper =
    field.closest<HTMLElement>('.qf-field, .form-field, .mc-fields, .form-group, label') ||
    field.parentElement;
  if (!wrapper) {
    return null;
  }

  const key = field.id || field.getAttribute('name') || 'field';
  const selector = `.field-error[data-field-key="${CSS.escape(key)}"]`;
  const existing = wrapper.querySelector<HTMLElement>(selector);
  if (existing) {
    return existing;
  }

  const errorEl = document.createElement('small');
  errorEl.className = 'field-error';
  errorEl.dataset.fieldKey = key;
  wrapper.appendChild(errorEl);
  return errorEl;
}

function setFieldError(field: FormFieldElement, message: string | null) {
  markFieldInvalid(field, Boolean(message));
  const errorEl = getFieldErrorElement(field);
  if (!errorEl) {
    return;
  }

  errorEl.textContent = message || '';
  errorEl.style.display = message ? 'block' : 'none';
}

function validateFieldRule(form: HTMLFormElement, rule: ValidationRule) {
  const field = form.querySelector<FormFieldElement>(rule.selector);
  if (!field) {
    return true;
  }

  if (field.disabled || !isVisibleField(field)) {
    setFieldError(field, null);
    return true;
  }

  const value = (field.value || '').trim();
  let message: string | null = null;

  if (rule.required && value.length === 0) {
    message = `${rule.label} is required.`;
  } else if (!message && rule.pattern && value.length > 0 && !rule.pattern.test(value)) {
    message = rule.message || `Please enter a valid ${rule.label.toLowerCase()}.`;
  } else if (!message && rule.validate) {
    message = rule.validate(value, form);
  }

  setFieldError(field, message);
  return !message;
}

function validateFormRules(form: HTMLFormElement, rules: ValidationRule[]) {
  let valid = true;
  let firstInvalidField: FormFieldElement | null = null;

  for (const rule of rules) {
    const ruleValid = validateFieldRule(form, rule);
    if (!ruleValid) {
      valid = false;
      if (!firstInvalidField) {
        firstInvalidField = form.querySelector<FormFieldElement>(rule.selector);
      }
    }
  }

  firstInvalidField?.focus();
  return valid;
}

function attachLiveValidation(form: HTMLFormElement, rules: ValidationRule[]) {
  for (const rule of rules) {
    const field = form.querySelector<FormFieldElement>(rule.selector);
    if (!field) {
      continue;
    }

    const handler: EventListener = () => {
      validateFieldRule(form, rule);
    };

    field.addEventListener('input', handler);
    field.addEventListener('change', handler);
    field.addEventListener('blur', handler);

    validationListeners.push(
      { field, type: 'input', handler },
      { field, type: 'change', handler },
      { field, type: 'blur', handler }
    );
  }
}

function validateRequiredFields(form: HTMLFormElement) {
  const requiredFields = form.querySelectorAll<FormFieldElement>('[required]');
  let valid = true;

  for (const field of requiredFields) {
    if (field.disabled || !isVisibleField(field)) {
      markFieldInvalid(field, false);
      continue;
    }

    const value = (field.value || '').trim();
    const invalid = value.length === 0;
    markFieldInvalid(field, invalid);
    if (invalid) {
      valid = false;
    }
  }

  return valid;
}

function readErrorMessage(error: unknown) {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const fetchError = error as { data?: { message?: string | string[] } };
  const message = fetchError.data?.message;
  if (Array.isArray(message) && message.length > 0) {
    return message[0];
  }
  if (typeof message === 'string' && message.trim().length > 0) {
    return message;
  }

  return null;
}

function isValidEmailAddress(value: string) {
  const normalized = value.trim();
  const atIndex = normalized.indexOf('@');
  if (atIndex <= 0 || atIndex !== normalized.lastIndexOf('@')) {
    return false;
  }

  const domain = normalized.slice(atIndex + 1);
  if (domain.length < 3 || domain.startsWith('.') || domain.endsWith('.')) {
    return false;
  }

  return domain.includes('.');
}

function getFormMessageElement(form: HTMLFormElement, id: string) {
  const scopedMessageEl = form.querySelector<HTMLElement>(`#${id}`);
  if (scopedMessageEl) {
    return scopedMessageEl;
  }
  return document.getElementById(id);
}

type ManagedSubmitResponse = {
  ok?: boolean;
  message?: string;
  nextPath?: string;
};

async function submitManagedForm<TPayload>(input: {
  form: HTMLFormElement;
  messageEl: HTMLElement | null;
  endpoint: string;
  busyMessage: string;
  successMessage: string;
  errorMessage: string;
  toastSuccess?: string;
  payloadFactory: (activeForm: HTMLFormElement) => TPayload;
  validate?: (activeForm: HTMLFormElement) => boolean;
  onSuccess?: (response: ManagedSubmitResponse, activeForm: HTMLFormElement) => void;
}) {
  const {
    form,
    messageEl,
    endpoint,
    busyMessage,
    successMessage,
    errorMessage,
    toastSuccess,
    payloadFactory,
    validate,
    onSuccess,
  } = input;

  const valid = validate ? validate(form) : validateRequiredFields(form);
  if (!valid) {
    const message = 'Please fix the highlighted fields and try again.';
    setFormMessage(messageEl, 'error', message);
    toast.warning(message);
    return;
  }

  setFormMessage(messageEl, 'success', busyMessage);
  setSubmitState(form, true);

  try {
    const response = await postJson(endpoint, payloadFactory(form));
    const successText = response.message || successMessage;
    setFormMessage(messageEl, 'success', successText);
    toast.success(toastSuccess || successText);
    form.reset();
    onSuccess?.(response, form);
  } catch (error) {
    const failureText = readErrorMessage(error) || errorMessage;
    setFormMessage(messageEl, 'error', failureText);
    toast.error(failureText);
  } finally {
    setSubmitState(form, false);
  }
}

async function postJson<TPayload>(path: string, payload: TPayload) {
  return await $fetch<ManagedSubmitResponse>(getApiUrl(path), {
    method: 'POST',
    body: payload,
  });
}

function bindManagedSubmit(
  form: HTMLFormElement,
  onSubmit: (form: HTMLFormElement, event: SubmitEvent) => Promise<void>
) {
  const handler: EventListener = async (rawEvent) => {
    const event = rawEvent as SubmitEvent;
    event.preventDefault();
    event.stopImmediatePropagation();
    await onSubmit(form, event);
  };

  form.addEventListener('submit', handler, true);
  formListeners.push({ form, handler });
}

function setSubmitState(form: HTMLFormElement, submitting: boolean) {
  const submitButton =
    form.querySelector<HTMLButtonElement>('button[type="submit"]') ||
    form.querySelector<HTMLButtonElement>('.default-btn');
  if (!submitButton) {
    return;
  }

  submitButton.disabled = submitting;
  if (submitting) {
    submitButton.dataset.prevLabel = submitButton.textContent || '';
    submitButton.textContent = 'Sending...';
    return;
  }

  if (submitButton.dataset.prevLabel) {
    submitButton.textContent = submitButton.dataset.prevLabel;
    delete submitButton.dataset.prevLabel;
  }
}

function attachContactFormHandler() {
  const form = document.getElementById('ajax_contact') as HTMLFormElement | null;
  if (!form) {
    return;
  }

  const rules: ValidationRule[] = [
    {
      selector: '#firstname',
      label: 'First name',
      required: true,
      validate: (value) => (value.length < 2 ? 'First name must be at least 2 characters.' : null),
    },
    {
      selector: '#lastname',
      label: 'Last name',
      required: true,
      validate: (value) => (value.length < 2 ? 'Last name must be at least 2 characters.' : null),
    },
    {
      selector: '#email',
      label: 'Email address',
      required: true,
      validate: (value) => (isValidEmailAddress(value) ? null : 'Please enter a valid email address.'),
    },
    {
      selector: '#phone',
      label: 'Phone number',
      required: true,
      pattern: /^[+0-9()\-\s]{7,25}$/,
      message: 'Please enter a valid phone number.',
    },
    {
      selector: '#message',
      label: 'Message',
      required: true,
      validate: (value) => (value.length < 10 ? 'Message must be at least 10 characters.' : null),
    },
  ];

  attachLiveValidation(form, rules);

  bindManagedSubmit(form, async (activeForm) => {
    const messageEl = getFormMessageElement(activeForm, 'form-messages');

    await submitManagedForm({
      form: activeForm,
      messageEl,
      endpoint: '/contact/submit',
      busyMessage: 'Sending your message...',
      successMessage: 'Thank you. Your request has been received.',
      errorMessage: 'We could not send your message right now. Please try again shortly.',
      validate: (payloadForm) => validateFormRules(payloadForm, rules),
      payloadFactory: (payloadForm) => {
        const firstName = getFieldValue(payloadForm, '#firstname');
        const lastName = getFieldValue(payloadForm, '#lastname');
        const name = `${firstName} ${lastName}`.trim();

        return {
          name,
          email: getFieldValue(payloadForm, '#email'),
          phone: getFieldValue(payloadForm, '#phone'),
          message: getFieldValue(payloadForm, '#message'),
          subject: getFieldValue(payloadForm, 'input[name="_subject"]') || 'GO-GO Shuttles - New Contact Message',
        };
      },
    });
  });
}

function collectQuotePayload(form: HTMLFormElement) {
  const passengersRaw = getFieldValue(form, '#q-passengers');
  const passengers = passengersRaw ? Number.parseInt(passengersRaw, 10) : undefined;

  return {
    name: getFieldValue(form, '#q-full-name') || undefined,
    email: getFieldValue(form, '#q-email') || undefined,
    phone: getFieldValue(form, '#q-phone') || undefined,
    tripType: getFieldValue(form, '#q-trip-type') || 'return',
    pickupDate: getFieldValue(form, '#q-pickup-date'),
    pickupTime: getFieldValue(form, '#q-pickup-time'),
    returnDate: getFieldValue(form, '#q-return-date') || undefined,
    returnTime: getFieldValue(form, '#q-return-time') || undefined,
    collectionAddress: getFieldValue(form, '#q-collection'),
    destinationAddress: getFieldValue(form, '#q-destination'),
    passengers: Number.isFinite(passengers) ? passengers : undefined,
    serviceType: getFieldValue(form, '#q-service-type') || undefined,
    additionalDetails: getFieldValue(form, '#q-message') || undefined,
  };
}

function attachQuoteFormHandler(formId: string) {
  const form = document.getElementById(formId) as HTMLFormElement | null;
  if (!form) {
    return;
  }

  const rules: ValidationRule[] = [
    { selector: '#q-pickup-date', label: 'Pickup date', required: true },
    { selector: '#q-pickup-time', label: 'Pickup time', required: true },
    {
      selector: '#q-return-date',
      label: 'Return date',
      validate: (value, activeForm) => {
        const tripType = getFieldValue(activeForm, '#q-trip-type') || 'return';
        if (tripType === 'return' && value.length === 0) {
          return 'Return date is required for return trips.';
        }
        return null;
      },
    },
    {
      selector: '#q-return-time',
      label: 'Return time',
      validate: (value, activeForm) => {
        const tripType = getFieldValue(activeForm, '#q-trip-type') || 'return';
        if (tripType === 'return' && value.length === 0) {
          return 'Return time is required for return trips.';
        }
        return null;
      },
    },
    {
      selector: '#q-collection',
      label: 'Collection address',
      required: true,
      validate: (value) => (value.length < 5 ? 'Collection address must be at least 5 characters.' : null),
    },
    {
      selector: '#q-destination',
      label: 'Destination address',
      required: true,
      validate: (value) => (value.length < 5 ? 'Destination address must be at least 5 characters.' : null),
    },
    {
      selector: '#q-full-name',
      label: 'Full name',
      required: true,
      validate: (value) => (value.length < 2 ? 'Full name must be at least 2 characters.' : null),
    },
    {
      selector: '#q-phone',
      label: 'Phone number',
      required: true,
      pattern: /^[+0-9()\-\s]{7,25}$/,
      message: 'Please enter a valid phone number.',
    },
    {
      selector: '#q-email',
      label: 'Email address',
      required: true,
      validate: (value) => (isValidEmailAddress(value) ? null : 'Please enter a valid email address.'),
    },
    {
      selector: '#q-passengers',
      label: 'Number of passengers',
      required: true,
      validate: (value) => {
        const count = Number.parseInt(value, 10);
        if (!Number.isFinite(count) || count < 1) {
          return 'Number of passengers must be at least 1.';
        }
        return null;
      },
    },
    { selector: '#q-service-type', label: 'Service type', required: true },
  ];

  attachLiveValidation(form, rules);

  bindManagedSubmit(form, async (activeForm) => {
    const messageEl = getFormMessageElement(activeForm, 'q-form-messages');

    await submitManagedForm({
      form: activeForm,
      messageEl,
      endpoint: '/contact/quote',
      busyMessage: 'Sending your quote request...',
      successMessage: 'Thank you. Your quote request has been received.',
      errorMessage: 'We could not send your quote request right now. Please try again shortly.',
      toastSuccess: 'Quote request sent successfully.',
      validate: (payloadForm) => validateFormRules(payloadForm, rules),
      payloadFactory: collectQuotePayload,
    });
  });
}

function attachNewsletterFormHandler() {
  const form = document.getElementById('ajax_mc_form') as HTMLFormElement | null;
  if (!form) {
    return;
  }

  const rules: ValidationRule[] = [
    {
      selector: '#mc_email',
      label: 'Email address',
      required: true,
      validate: (value) => (isValidEmailAddress(value) ? null : 'Please enter a valid email address.'),
    },
  ];

  attachLiveValidation(form, rules);

  bindManagedSubmit(form, async (activeForm) => {
    const messageEl = getFormMessageElement(activeForm, 'mc-form-messages');
    await submitManagedForm({
      form: activeForm,
      messageEl,
      endpoint: '/contact/newsletter',
      busyMessage: 'Subscribing you now...',
      successMessage: 'You have been subscribed successfully.',
      errorMessage: 'We could not process your subscription right now. Please try again shortly.',
      validate: (payloadForm) => validateFormRules(payloadForm, rules),
      payloadFactory: (payloadForm) => ({
        email: getFieldValue(payloadForm, '#mc_email'),
        name: getFieldValue(payloadForm, '#mc_name') || undefined,
      }),
    });
  });
}

function attachManagedFormHandlers() {
  if (!managedFormsEnabled.value) {
    clearFormListeners();
    return;
  }

  if (typeof document === 'undefined') {
    return;
  }

  clearFormListeners();
  attachContactFormHandler();
  attachQuoteFormHandler('ajax_quote_form');
  attachQuoteFormHandler('gogo-quote-form');
  attachNewsletterFormHandler();
}

function runInlineScripts() {
  if (typeof document === 'undefined') {
    return;
  }

  clearInjectedScripts();

  for (const scriptBody of inlineScriptBodies.value) {
    const scriptEl = document.createElement('script');
    scriptEl.type = 'text/javascript';
    scriptEl.text = scriptBody;
    document.body.appendChild(scriptEl);
    injectedScripts.value.push(scriptEl);
  }
}

function clearPreloaderCleanupTimer() {
  if (preloaderCleanupTimer) {
    clearTimeout(preloaderCleanupTimer);
    preloaderCleanupTimer = null;
  }
}

function dismissStuckPreloader() {
  if (typeof document === 'undefined') {
    return;
  }

  const preloader = document.getElementById('preloader-wrap');
  if (!preloader) {
    return;
  }

  preloader.style.pointerEvents = 'none';
  preloader.style.transition = 'opacity 300ms ease';
  preloader.style.opacity = '0';

  setTimeout(() => {
    preloader.remove();
  }, 350);
}

function runSlideAnimations(slideEl: Element | null) {
  if (!slideEl) {
    return;
  }

  const elements = slideEl.querySelectorAll<HTMLElement>('[data-animation]');
  for (const element of elements) {
    const animationDelay = element.dataset.delay || '0s';
    const animationDuration = element.dataset.duration || '1s';
    const animationName = element.dataset.animation;

    element.style.animationDelay = animationDelay;
    element.style.webkitAnimationDelay = animationDelay;
    element.style.animationDuration = animationDuration;

    if (!animationName) {
      continue;
    }

    element.classList.add('animated', animationName);

    const handleAnimationEnd = () => {
      element.classList.remove('animated');
      for (const token of animationName.split(/\s+/)) {
        if (token) {
          element.classList.remove(token);
        }
      }
      element.removeEventListener('animationend', handleAnimationEnd);
      element.removeEventListener('webkitAnimationEnd', handleAnimationEnd);
      element.removeEventListener('oanimationend', handleAnimationEnd);
      element.removeEventListener('MSAnimationEnd', handleAnimationEnd);
    };

    element.addEventListener('animationend', handleAnimationEnd, { once: true });
    element.addEventListener('webkitAnimationEnd', handleAnimationEnd, { once: true });
    element.addEventListener('oanimationend', handleAnimationEnd, { once: true });
    element.addEventListener('MSAnimationEnd', handleAnimationEnd, { once: true });
  }
}

function getMaxSlidesPerView(options: ConstructorParameters<typeof Swiper>[1]) {
  let maxSlides = typeof options.slidesPerView === 'number' ? options.slidesPerView : 1;
  const breakpoints = options.breakpoints as Record<string, { slidesPerView?: number }> | undefined;
  if (!breakpoints) {
    return maxSlides;
  }

  for (const point of Object.keys(breakpoints)) {
    const value = breakpoints[point];
    if (value && typeof value.slidesPerView === 'number' && value.slidesPerView > maxSlides) {
      maxSlides = value.slidesPerView;
    }
  }

  return maxSlides;
}

function ensureSlider(
  selector: string,
  swiperRef: { value: Swiper | null },
  options: ConstructorParameters<typeof Swiper>[1],
  shouldAutoplay: boolean
) {
  const element = document.querySelector(selector) as (Element & { swiper?: Swiper }) | null;
  if (!element) {
    if (swiperRef.value) {
      swiperRef.value.destroy(true, true);
      swiperRef.value = null;
    }
    return;
  }

  if (element.swiper) {
    swiperRef.value = element.swiper;
    if (shouldAutoplay && element.swiper.autoplay && !element.swiper.autoplay.running) {
      element.swiper.autoplay.start();
    }
    return;
  }

  const slideCount = element.querySelectorAll('.swiper-slide').length;
  const maxSlidesPerView = getMaxSlidesPerView(options);
  const normalizedOptions: ConstructorParameters<typeof Swiper>[1] = {
    ...options,
    loop:
      options.loop === true
        ? slideCount > maxSlidesPerView
        : options.loop,
  };

  try {
    swiperRef.value = new Swiper(selector, normalizedOptions);
    if (shouldAutoplay && swiperRef.value.autoplay && !swiperRef.value.autoplay.running) {
      swiperRef.value.autoplay.start();
    }
  } catch {
    swiperRef.value = null;
  }
}

function ensureManagedSliders() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  ensureSlider(
    '.main-slider',
    mainSwiper,
    {
      modules: [Autoplay, EffectFade, Pagination],
      speed: 1500,
      autoplay: {
        delay: 5000,
        disableOnInteraction: false,
      },
      mousewheel: false,
      loop: true,
      effect: 'fade',
      initialSlide: 2,
      pagination: {
        el: '.slider-pagination',
        clickable: true,
      },
      on: {
        init(swiper) {
          runSlideAnimations(swiper.slides[swiper.activeIndex] || null);
        },
        slideChangeTransitionStart(swiper) {
          runSlideAnimations(swiper.slides[swiper.activeIndex] || null);
        },
        resize(swiper) {
          swiper.update();
        },
      },
    },
    true
  );

  ensureSlider(
    '.project-carousel',
    projectSwiper,
    {
      modules: [Navigation, Pagination],
      slidesPerView: 3,
      spaceBetween: 20,
      slidesPerGroup: 1,
      loop: true,
      autoplay: false,
      speed: 400,
      pagination: {
        el: '.project-carousel .carousel-pagination',
        clickable: true,
      },
      navigation: {
        nextEl: '.project-section .swiper-next',
        prevEl: '.project-section .swiper-prev',
      },
      breakpoints: {
        320: {
          slidesPerView: 1,
          slidesPerGroup: 1,
          spaceBetween: 25,
        },
        767: {
          slidesPerView: 2,
          slidesPerGroup: 1,
          spaceBetween: 30,
        },
        1024: {
          slidesPerView: 4,
          slidesPerGroup: 1,
        },
      },
    },
    false
  );

  ensureSlider(
    '.testimonial-carousel',
    testimonialSwiper,
    {
      modules: [Autoplay, Navigation, Pagination],
      slidesPerView: 2,
      spaceBetween: 20,
      slidesPerGroup: 1,
      loop: true,
      autoplay: {
        delay: 4500,
        disableOnInteraction: false,
      },
      speed: 500,
      pagination: {
        el: '.testimonial-carousel .carousel-pagination',
        clickable: true,
      },
      navigation: {
        nextEl: '.testi-nav .swiper-next',
        prevEl: '.testi-nav .swiper-prev',
      },
      breakpoints: {
        320: {
          slidesPerView: 1,
          slidesPerGroup: 1,
          spaceBetween: 25,
        },
        767: {
          slidesPerView: 1,
          slidesPerGroup: 1,
          spaceBetween: 30,
        },
        1024: {
          slidesPerView: 2,
          slidesPerGroup: 1,
        },
      },
    },
    true
  );
}

function runPostRenderBoot() {
  clearPreloaderCleanupTimer();
  runInlineScripts();
  setTimeout(() => {
    dismissStuckPreloader();
    ensureManagedSliders();
    attachBackToTopHandler();
    attachManagedFormHandlers();
  }, 0);

  preloaderCleanupTimer = setTimeout(() => {
    dismissStuckPreloader();
  }, 2500);
}

useHead(() => ({
  title: extractedTitle.value || undefined,
}));

onMounted(() => {
  runPostRenderBoot();
});

watch(() => props.sourceHtml, () => {
  runPostRenderBoot();
});

onBeforeUnmount(() => {
  if (mainSwiper.value) {
    mainSwiper.value.destroy(true, true);
    mainSwiper.value = null;
  }
  if (projectSwiper.value) {
    projectSwiper.value.destroy(true, true);
    projectSwiper.value = null;
  }
  if (testimonialSwiper.value) {
    testimonialSwiper.value.destroy(true, true);
    testimonialSwiper.value = null;
  }
  clearPreloaderCleanupTimer();
  clearBackToTopListeners();
  clearFormListeners();
  clearInjectedScripts();
});
</script>

<template>
  <main v-html="renderedHtml" />
</template>

<style scoped>
:deep(.field-error) {
  display: none;
  margin-top: 6px;
  color: #c1121f;
  font-size: 12px;
  line-height: 1.4;
}

:deep([aria-invalid='true']) {
  border-color: #e31837 !important;
  box-shadow: 0 0 0 2px rgba(227, 24, 55, 0.12);
}
</style>
