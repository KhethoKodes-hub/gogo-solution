<script setup lang="ts">
const config = useRuntimeConfig();

type RouteItem = {
  id: number;
  start: string;
  end: string;
};

const routes = ref<RouteItem[]>([]);
const capacities = ref<string[]>([]);
const loading = ref(false);
const payLoading = ref(false);
const feedback = ref('');
const error = ref('');
const paymentError = ref('');
const latestBookingId = ref('');
const phonePattern = /^[+0-9()\-\s]{7,25}$/;

const form = reactive({
  rout_id: 0,
  shuttle_id: undefined as number | undefined,
  route_start: '',
  route_end: '',
  bus_capacity: '',
  booking_date: '',
  booking_time: '',
  price: '',
  contact_name: '',
  contact_person_no: '',
  customer_id: 1,
  customer_info: 'demo@gogoshuttles.local',
});

const purchaseOrder = ref<File | null>(null);

const fieldErrors = reactive({
  rout_id: '',
  bus_capacity: '',
  booking_date: '',
  booking_time: '',
  contact_name: '',
  contact_person_no: '',
  price: '',
});

const touched = reactive({
  rout_id: false,
  bus_capacity: false,
  booking_date: false,
  booking_time: false,
  contact_name: false,
  contact_person_no: false,
  price: false,
});

type BookingFieldKey = keyof typeof fieldErrors;

onMounted(async () => {
  await loadRoutes();
});

async function loadRoutes() {
  const data = await $fetch<RouteItem[]>(`${config.public.apiBaseUrl}/routes`);
  routes.value = data;
}

async function onRouteChange() {
  const selected = routes.value.find((r) => r.id === Number(form.rout_id));
  form.route_start = selected?.start ?? '';
  form.route_end = selected?.end ?? '';
  form.bus_capacity = '';
  form.price = '';

  const res = await $fetch<{ type: string; capacities: string[]; msg?: string }>(
    `${config.public.apiBaseUrl}/routes/${form.rout_id}/capacities`
  );
  capacities.value = res.capacities ?? [];
  validateField('rout_id');
  validateField('bus_capacity');
}

async function onCapacityChange() {
  if (!form.rout_id || !form.bus_capacity) {
    validateField('bus_capacity');
    return;
  }
  const res = await $fetch<{ error: string; msg: string; price?: number }>(
    `${config.public.apiBaseUrl}/routes/pricing?routeId=${form.rout_id}&capacity=${encodeURIComponent(form.bus_capacity)}`
  );

  if (res.error === '0' && typeof res.price === 'number') {
    form.price = String(res.price);
    error.value = '';
    validateField('price');
  } else {
    form.price = '';
    error.value = res.msg || 'Unable to fetch price';
    validateField('price');
  }
}

function onFilePicked(event: Event) {
  const input = event.target as HTMLInputElement;
  purchaseOrder.value = input.files?.[0] ?? null;
}

function setTouched(field: BookingFieldKey) {
  touched[field] = true;
}

const fieldValidators: Record<BookingFieldKey, () => string> = {
  rout_id: () => (!form.rout_id || form.rout_id < 1 ? 'Please select a route.' : ''),
  bus_capacity: () => (!form.bus_capacity.trim() ? 'Please select a capacity.' : ''),
  booking_date: () => (!form.booking_date.trim() ? 'Booking date is required.' : ''),
  booking_time: () => (!form.booking_time.trim() ? 'Booking time is required.' : ''),
  contact_name: () => {
    const value = form.contact_name.trim();
    if (!value) {
      return 'Contact name is required.';
    }
    if (value.length < 2) {
      return 'Contact name must be at least 2 characters.';
    }
    return '';
  },
  contact_person_no: () => {
    const value = form.contact_person_no.trim();
    if (!value) {
      return 'Contact number is required.';
    }
    if (!phonePattern.test(value)) {
      return 'Please enter a valid contact number.';
    }
    return '';
  },
  price: () => {
    const value = Number.parseFloat(form.price);
    if (!form.price.trim()) {
      return 'Price is required. Select route and capacity to calculate it.';
    }
    if (!Number.isFinite(value) || value <= 0) {
      return 'Price must be a valid amount.';
    }
    return '';
  },
};

function validateField(field: BookingFieldKey) {
  const message = fieldValidators[field]();
  fieldErrors[field] = message;
  return message.length === 0;
}

function validateForm() {
  const keys = Object.keys(fieldErrors) as BookingFieldKey[];
  let valid = true;

  for (const key of keys) {
    touched[key] = true;
    const fieldValid = validateField(key);
    if (!fieldValid) {
      valid = false;
    }
  }

  return valid;
}

function onFieldInput(field: BookingFieldKey) {
  if (!touched[field]) {
    return;
  }
  validateField(field);
}

async function submitBooking() {
  if (!validateForm()) {
    error.value = 'Please fix the highlighted fields and try again.';
    return;
  }

  loading.value = true;
  feedback.value = '';
  error.value = '';
  paymentError.value = '';

  try {
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        body.append(key, String(value));
      }
    });

    if (purchaseOrder.value) {
      body.append('purchase_order', purchaseOrder.value);
    }

    const res = await $fetch<{ msg: string; booking_id: string }>(`${config.public.apiBaseUrl}/bookings`, {
      method: 'POST',
      body,
    });

    feedback.value = `${res.msg} (${res.booking_id})`;
    latestBookingId.value = res.booking_id;
  } catch (e: unknown) {
    const fetchError = e as { data?: { message?: string | string[] } };
    const backendMessage = Array.isArray(fetchError?.data?.message)
      ? fetchError.data?.message[0]
      : fetchError?.data?.message;
    let message = 'Unable to submit booking.';
    if (typeof backendMessage === 'string' && backendMessage.trim().length > 0) {
      message = backendMessage;
    } else if (e instanceof Error) {
      message = e.message;
    }
    error.value = message;
  } finally {
    loading.value = false;
  }
}

async function payNowWithPayfast() {
  if (!latestBookingId.value) {
    paymentError.value = 'Create a booking first before starting payment.';
    return;
  }

  payLoading.value = true;
  paymentError.value = '';

  try {
    const encoded = encodeURIComponent(latestBookingId.value);
    const res = await $fetch<{ processUrl: string; formFields: Record<string, string> }>(
      `${config.public.apiBaseUrl}/bookings/${encoded}/payfast/initiate`,
      { method: 'POST' }
    );

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = res.processUrl;
    form.style.display = 'none';

    Object.entries(res.formFields).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unable to initialize PayFast payment.';
    paymentError.value = message;
  } finally {
    payLoading.value = false;
  }
}
</script>

<template>
  <section class="page">
    <h1>Book a Trip</h1>

    <form class="form" @submit.prevent="submitBooking">
      <label>
        Route
        <select
          v-model.number="form.rout_id"
          required
          :class="{ invalid: touched.rout_id && fieldErrors.rout_id }"
          @change="onRouteChange"
          @blur="setTouched('rout_id'); validateField('rout_id')"
        >
          <option :value="0" disabled>Select route</option>
          <option v-for="r in routes" :key="r.id" :value="r.id">{{ r.start }} to {{ r.end }}</option>
        </select>
        <small v-if="touched.rout_id && fieldErrors.rout_id" class="field-error">{{ fieldErrors.rout_id }}</small>
      </label>

      <label>
        Capacity
        <select
          v-model="form.bus_capacity"
          required
          :class="{ invalid: touched.bus_capacity && fieldErrors.bus_capacity }"
          @change="onCapacityChange"
          @blur="setTouched('bus_capacity'); validateField('bus_capacity')"
        >
          <option value="" disabled>Select capacity</option>
          <option v-for="cap in capacities" :key="cap" :value="cap">{{ cap }}</option>
        </select>
        <small v-if="touched.bus_capacity && fieldErrors.bus_capacity" class="field-error">{{ fieldErrors.bus_capacity }}</small>
      </label>

      <label>
        Date
        <input
          v-model="form.booking_date"
          type="date"
          required
          :class="{ invalid: touched.booking_date && fieldErrors.booking_date }"
          @input="onFieldInput('booking_date')"
          @blur="setTouched('booking_date'); validateField('booking_date')"
        />
        <small v-if="touched.booking_date && fieldErrors.booking_date" class="field-error">{{ fieldErrors.booking_date }}</small>
      </label>

      <label>
        Time
        <input
          v-model="form.booking_time"
          type="time"
          required
          :class="{ invalid: touched.booking_time && fieldErrors.booking_time }"
          @input="onFieldInput('booking_time')"
          @blur="setTouched('booking_time'); validateField('booking_time')"
        />
        <small v-if="touched.booking_time && fieldErrors.booking_time" class="field-error">{{ fieldErrors.booking_time }}</small>
      </label>

      <label>
        Contact Name
        <input
          v-model="form.contact_name"
          type="text"
          :class="{ invalid: touched.contact_name && fieldErrors.contact_name }"
          @input="onFieldInput('contact_name')"
          @blur="setTouched('contact_name'); validateField('contact_name')"
        />
        <small v-if="touched.contact_name && fieldErrors.contact_name" class="field-error">{{ fieldErrors.contact_name }}</small>
      </label>

      <label>
        Contact Number
        <input
          v-model="form.contact_person_no"
          type="text"
          :class="{ invalid: touched.contact_person_no && fieldErrors.contact_person_no }"
          @input="onFieldInput('contact_person_no')"
          @blur="setTouched('contact_person_no'); validateField('contact_person_no')"
        />
        <small v-if="touched.contact_person_no && fieldErrors.contact_person_no" class="field-error">{{ fieldErrors.contact_person_no }}</small>
      </label>

      <label>
        Purchase Order
        <input type="file" @change="onFilePicked" />
      </label>

      <label>
        Price
        <input
          v-model="form.price"
          type="text"
          readonly
          required
          :class="{ invalid: touched.price && fieldErrors.price }"
          @blur="setTouched('price'); validateField('price')"
        />
        <small v-if="touched.price && fieldErrors.price" class="field-error">{{ fieldErrors.price }}</small>
      </label>

      <button type="submit" :disabled="loading || !form.price">{{ loading ? 'Submitting...' : 'Submit booking' }}</button>

      <p v-if="feedback" class="ok">{{ feedback }}</p>
      <p v-if="error" class="err">{{ error }}</p>

      <div v-if="latestBookingId" class="payment-box">
        <p class="payment-title">Pay online (optional)</p>
        <p class="payment-copy">Booking reference: <strong>{{ latestBookingId }}</strong></p>
        <button type="button" class="payfast" :disabled="payLoading" @click="payNowWithPayfast">
          {{ payLoading ? 'Redirecting to PayFast...' : 'Pay with PayFast (Sandbox)' }}
        </button>
        <p class="payment-copy small">Prefer manual settlement? EFT remains available as a fallback through your operations process.</p>
        <p v-if="paymentError" class="err">{{ paymentError }}</p>
      </div>
    </form>
  </section>
</template>

<style scoped>
.page {
  max-width: 1080px;
  margin: 2rem auto;
  padding: 0 1rem;
}

.form {
  display: grid;
  gap: 1rem;
  max-width: 560px;
}

label {
  display: grid;
  gap: 0.35rem;
}

input,
select,
button {
  font: inherit;
  padding: 0.65rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}

.invalid {
  border-color: #e31837;
  box-shadow: 0 0 0 2px rgba(227, 24, 55, 0.12);
}

.field-error {
  margin-top: 0.25rem;
  color: #b91c1c;
  font-size: 0.82rem;
  line-height: 1.35;
}

button {
  cursor: pointer;
  border-color: #111827;
  background: #111827;
  color: #fff;
}

.payment-box {
  border: 1px solid #d9e2f0;
  border-radius: 8px;
  padding: 0.9rem;
  background: #f7faff;
}

.payment-title {
  margin: 0 0 0.25rem;
  font-weight: 700;
}

.payment-copy {
  margin: 0.15rem 0 0.5rem;
  color: #1f2937;
}

.payment-copy.small {
  font-size: 0.92rem;
  color: #334155;
}

.payfast {
  width: 100%;
  background: #142355;
  border-color: #142355;
}

.ok {
  color: #15803d;
}

.err {
  color: #b91c1c;
}
</style>
