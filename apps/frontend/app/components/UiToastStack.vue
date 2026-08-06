<script setup lang="ts">
import type { UiToastItem } from '../composables/useUiToast';

const { items, remove } = useUiToast();
const timers = new Map<number, ReturnType<typeof setTimeout>>();

watch(
  items,
  (nextItems) => {
    const visibleIds = new Set(nextItems.map((item) => item.id));

    for (const [id, timer] of timers.entries()) {
      if (!visibleIds.has(id)) {
        clearTimeout(timer);
        timers.delete(id);
      }
    }

    for (const item of nextItems) {
      if (timers.has(item.id)) {
        continue;
      }
      const timer = setTimeout(() => {
        remove(item.id);
        timers.delete(item.id);
      }, item.durationMs);
      timers.set(item.id, timer);
    }
  },
  { deep: true }
);

onBeforeUnmount(() => {
  for (const timer of timers.values()) {
    clearTimeout(timer);
  }
  timers.clear();
});

function dismiss(item: UiToastItem) {
  remove(item.id);
}
</script>

<template>
  <div class="ui-toast-stack" aria-live="polite" aria-atomic="true">
    <TransitionGroup name="ui-toast" tag="div">
      <div
        v-for="item in items"
        :key="item.id"
        class="ui-toast"
        :class="`ui-toast--${item.variant}`"
      >
        <output class="ui-toast__message" aria-live="polite">{{ item.message }}</output>
        <button class="ui-toast__close" type="button" aria-label="Dismiss" @click="dismiss(item)">
          ×
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.ui-toast-stack {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 99999;
  width: min(360px, calc(100vw - 24px));
}

.ui-toast {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  margin-bottom: 10px;
  color: #fff;
  box-shadow: 0 12px 24px rgba(4, 34, 62, 0.24);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.ui-toast--success {
  background: #1f7a45;
}

.ui-toast--warning {
  background: #b06f12;
}

.ui-toast--error {
  background: #a81f2d;
}

.ui-toast__message {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
}

.ui-toast__close {
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  opacity: 0.8;
}

.ui-toast__close:hover {
  opacity: 1;
}

.ui-toast-enter-active,
.ui-toast-leave-active {
  transition: all 0.18s ease;
}

.ui-toast-enter-from,
.ui-toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
