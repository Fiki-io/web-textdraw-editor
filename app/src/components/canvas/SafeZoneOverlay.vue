<template>
  <div v-if="visible" class="safe-zones">
    <!-- Safe Area Boundary (TV Title/Action Safe Margins) -->
    <div class="zone safe" :style="safeStyle">
      <span class="label">SAFE ZONE (640x480)</span>
    </div>
    <!-- Chat Area Zone -->
    <div class="zone chat" :style="chatStyle">
      <span class="label">SAMP CHAT</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { CW, CH } from '../../constants/canvas'

const props = defineProps({
  visible: { type: Boolean, default: false },
  zoom:    { type: Number, default: 1 },
})

const z = computed(() => props.zoom)

const safeStyle = computed(() => ({
  top:    `${24  * z.value}px`,
  left:   `${24  * z.value}px`,
  width:  `${(CW - 48) * z.value}px`,
  height: `${(CH - 48) * z.value}px`,
}))

const chatStyle = computed(() => ({
  top:    `${20 * z.value}px`,
  left:   `${24 * z.value}px`,
  width:  `${320 * z.value}px`,
  height: `${120 * z.value}px`,
}))
</script>

<style scoped>
.safe-zones {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
}
.zone {
  position: absolute;
  box-sizing: border-box;
}
.label {
  font-family: 'Tahoma', sans-serif;
  font-size: 8px;
  font-weight: 700;
  padding: 2px 4px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 2px;
  display: inline-block;
  user-select: none;
}
.safe {
  border: 1px solid rgba(255, 80, 80, 0.4);
}
.safe .label {
  color: rgba(255, 80, 80, 0.85);
}
.chat {
  border: 1px dashed rgba(137, 180, 250, 0.35);
  background: rgba(137, 180, 250, 0.03);
}
.chat .label {
  color: rgba(137, 180, 250, 0.7);
}
</style>
