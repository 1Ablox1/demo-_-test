<script setup lang="ts">
/**
 * Product booking icon (clock + document).
 * Source PNG is dark line art — tone="light" forces white for navy/teal chrome.
 */
withDefaults(
  defineProps<{
    size?: number | string
    /** light = white glyph (sidebar / primary buttons); dark = ink on pale surfaces */
    tone?: 'light' | 'dark'
    strokeWidth?: number | string
  }>(),
  {
    size: 16,
    tone: 'light',
  },
)
</script>

<template>
  <img
    src="/assets/icon-booking.png"
    alt=""
    aria-hidden="true"
    class="booking-icon shrink-0 object-contain"
    :class="tone === 'dark' ? 'booking-icon--dark' : 'booking-icon--light'"
    :style="{ width: `${size}px`, height: `${size}px` }"
  />
</template>

<style scoped>
/* Force white silhouette on dark/teal backgrounds */
.booking-icon--light {
  filter: brightness(0) invert(1);
  opacity: 1;
}
/* Keep as dark ink on white cards */
.booking-icon--dark {
  filter: brightness(0);
  opacity: 0.9;
}
</style>
