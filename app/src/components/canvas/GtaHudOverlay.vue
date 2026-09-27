<template>
  <div v-if="visible" class="gta-hud-overlay" :style="overlayStyle">
    <!-- TOP-RIGHT: WEAPON / TINJU & STATUS BARS & MONEY -->
    <div class="hud-top-right" :style="topRightStyle">
      <!-- WEAPON ICON BOX (TINJU / FIST) -->
      <div class="weapon-box" :style="weaponBoxStyle" title="GTA SA Weapon HUD (Fist/Tinju)">
        <!-- Fist (Tinju) SVG Icon -->
        <svg viewBox="0 0 100 90" class="fist-svg" fill="currentColor">
          <!-- Clenched GTA SA-style fist silhouette -->
          <path d="M22,54 C20,48 22,40 28,36 C32,33 37,34 40,36 C42,32 46,28 52,28 C56,28 60,30 63,33 C66,29 71,28 76,29 C81,30 85,34 85,39 C85,41 85,43 84,45 C87,46 90,50 90,55 C90,62 84,68 76,70 L58,72 C50,73 40,74 34,70 C28,66 23,61 22,54 Z"
            fill="#ffffff" stroke="#111111" stroke-width="3" stroke-linejoin="round" />
          <!-- Thumb folded across fingers -->
          <path d="M27,51 C31,48 40,49 48,53 C52,55 58,58 56,64 C54,68 47,69 41,67 C35,65 28,62 26,56 Z"
            fill="#e5e5e5" stroke="#111111" stroke-width="2.5" />
          <!-- Knuckle contours -->
          <path d="M43,37 C45,43 45,49 44,53" stroke="#222222" stroke-width="2.5" stroke-linecap="round" fill="none" />
          <path d="M63,34 C64,41 64,48 62,54" stroke="#222222" stroke-width="2.5" stroke-linecap="round" fill="none" />
          <path d="M78,38 C79,43 78,50 75,55" stroke="#222222" stroke-width="2.5" stroke-linecap="round" fill="none" />
          <path d="M38,65 C45,67 56,66 68,64" stroke="#333333" stroke-width="2" stroke-linecap="round" fill="none" />
        </svg>
      </div>

      <!-- STATUS BARS & CLOCK & MONEY WRAPPER -->
      <div class="status-column" :style="statusColStyle">
        <!-- Clock -->
        <div class="hud-clock" :style="clockStyle">
          {{ clockTime }}
        </div>

        <!-- Armour Bar (White) -->
        <div class="bar-container armour-bg" :style="barStyle">
          <div class="bar-fill armour-fill" :style="{ width: armour + '%' }" />
        </div>

        <!-- Health Bar (Red) -->
        <div class="bar-container health-bg" :style="barStyle">
          <div class="bar-fill health-fill" :style="{ width: health + '%' }" />
        </div>

        <!-- Money Counter (Uang - Classic GTA San Andreas green pricedown) -->
        <div class="hud-money" :style="moneyStyle" title="GTA SA Money HUD">
          ${{ formattedMoney }}
        </div>
      </div>
    </div>

    <!-- BOTTOM-LEFT: MINIMAP / RADAR (MAP DI BAWAH) -->
    <div class="hud-radar" :style="radarStyle" title="GTA SA Radar / Minimap">
      <!-- Outer radar ring border -->
      <div class="radar-disc" :style="radarDiscStyle">
        <!-- Stylized San Andreas Map roads/terrain -->
        <svg viewBox="0 0 100 100" class="radar-map-svg">
          <defs>
            <clipPath id="radarClip">
              <circle cx="50" cy="50" r="47" />
            </clipPath>
          </defs>
          <g clip-path="url(#radarClip)">
            <!-- Ocean background -->
            <rect x="0" y="0" width="100" height="100" fill="#203545" />
            <!-- Island / Landmass shape -->
            <path d="M12,10 Q35,8 55,15 Q75,22 88,40 Q94,62 82,85 Q65,95 40,92 Q18,88 10,70 Q6,45 12,10 Z" fill="#2d3b2e" />
            <path d="M45,20 Q65,25 75,45 Q78,65 65,80 Q45,85 30,78 Q22,60 25,40 Z" fill="#364738" />

            <!-- River / Waterway -->
            <path d="M10,48 Q35,52 50,45 T95,50" fill="none" stroke="#203545" stroke-width="4" />

            <!-- Main streets / avenues grid (Los Santos stylized) -->
            <path d="M20,25 L85,25 M20,40 L85,40 M20,60 L85,60 M20,78 L80,78" fill="none" stroke="#5a6857" stroke-width="1.8" />
            <path d="M30,15 L30,85 M50,15 L50,90 M70,20 L70,85 M82,30 L82,75" fill="none" stroke="#5a6857" stroke-width="1.8" />
            <!-- Freeways -->
            <path d="M15,30 Q45,20 85,35 Q90,65 75,85" fill="none" stroke="#758273" stroke-width="2.5" />

            <!-- Radar cross-grid lines (subtle) -->
            <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(255,255,255,0.08)" stroke-width="0.8" stroke-dasharray="2 2" />
            <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.08)" stroke-width="0.8" stroke-dasharray="2 2" />
          </g>

          <!-- Outer Radar Ring border -->
          <circle cx="50" cy="50" r="47.5" fill="none" stroke="#000000" stroke-width="5" />
          <circle cx="50" cy="50" r="49" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1" />

          <!-- North Compass Indicator (N) at Top -->
          <g transform="translate(50, 8)">
            <polygon points="0,-4 3,3 -3,3" fill="#e03030" stroke="#000" stroke-width="0.6" />
            <text x="0" y="9" text-anchor="middle" font-family="'Tahoma', sans-serif" font-weight="900" font-size="7" fill="#ffffff" stroke="#000" stroke-width="0.8" paint-order="stroke fill">N</text>
          </g>

          <!-- Player Center Blip (White Triangle pointing up) -->
          <g transform="translate(50, 50)">
            <!-- Drop shadow triangle -->
            <polygon points="0,-7 5,6 0,3 -5,6" fill="#000000" transform="translate(0, 1)" />
            <!-- White player arrow blip -->
            <polygon points="0,-7 5,6 0,3 -5,6" fill="#ffffff" stroke="#111111" stroke-width="0.8" />
          </g>
        </svg>

        <!-- Radar location label -->
        <div class="radar-tag" :style="radarTagStyle">
          LOS SANTOS
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: true },
  zoom: { type: Number, default: 1 },
  opacity: { type: Number, default: 90 },
  money: { type: [Number, String], default: 35000 },
  clockTime: { type: String, default: '12:00' },
  health: { type: Number, default: 100 },
  armour: { type: Number, default: 75 },
  widescreen: { type: Boolean, default: false },
})

const z = computed(() => props.zoom)

const formattedMoney = computed(() => {
  const num = parseInt(props.money, 10) || 0
  return num.toString().padStart(8, '0')
})

const overlayStyle = computed(() => ({
  opacity: props.opacity / 100,
}))

// Position GTA SA Top-Right HUD (X ~546 in 640x480 resolution)
const topRightStyle = computed(() => ({
  top: `${20 * z.value}px`,
  right: `${24 * z.value}px`,
  gap: `${8 * z.value}px`,
}))

const weaponBoxStyle = computed(() => ({
  width: `${60 * z.value}px`,
  height: `${56 * z.value}px`,
  borderRadius: `${3 * z.value}px`,
}))

const statusColStyle = computed(() => ({
  gap: `${3 * z.value}px`,
}))

const clockStyle = computed(() => ({
  fontSize: `${13 * z.value}px`,
  lineHeight: `${14 * z.value}px`,
  height: `${15 * z.value}px`,
}))

const barStyle = computed(() => ({
  width: `${62 * z.value}px`,
  height: `${8 * z.value}px`,
  borderWidth: `${1 * Math.max(1, Math.round(z.value))}px`,
}))

const moneyStyle = computed(() => ({
  fontSize: `${18 * z.value}px`,
  lineHeight: `${20 * z.value}px`,
  marginTop: `${2 * z.value}px`,
}))

// Position GTA SA Radar Minimap (X ~42, Y ~342 in 640x480 resolution)
const radarStyle = computed(() => ({
  left: `${40 * z.value}px`,
  bottom: `${28 * z.value}px`,
}))

const radarDiscStyle = computed(() => ({
  width: `${100 * z.value}px`,
  height: `${100 * z.value}px`,
}))

const radarTagStyle = computed(() => ({
  fontSize: `${7.5 * z.value}px`,
  bottom: `${-14 * z.value}px`,
  letterSpacing: `${1 * z.value}px`,
}))
</script>

<style scoped>
.gta-hud-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 4;
  user-select: none;
  transition: opacity 0.15s ease;
}

/* TOP-RIGHT CONTAINER */
.hud-top-right {
  position: absolute;
  display: flex;
  flex-direction: row-reverse;
  align-items: flex-start;
}

/* WEAPON BOX (TINJU / FIST) */
.weapon-box {
  background: rgba(0, 0, 0, 0.45);
  border: 1.5px solid rgba(0, 0, 0, 0.85);
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  overflow: hidden;
}

.fist-svg {
  width: 82%;
  height: 82%;
  filter: drop-shadow(0 2px 2px rgba(0,0,0,0.8));
}

/* STATUS COLUMN */
.status-column {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

/* CLOCK */
.hud-clock {
  font-family: 'GTASABold', 'Pricedown', 'Impact', sans-serif;
  color: #ededed;
  text-shadow:
    1px 1px 0 #000,
    -1px -1px 0 #000,
    1px -1px 0 #000,
    -1px 1px 0 #000,
    0 2px 3px rgba(0,0,0,0.9);
  letter-spacing: 0.5px;
}

/* HEALTH & ARMOUR BARS */
.bar-container {
  background: #000000;
  border-style: solid;
  border-color: #000000;
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
}

.armour-bg {
  background: #2a2a2a;
}
.health-bg {
  background: #380808;
}

.bar-fill {
  height: 100%;
  transition: width 0.1s linear;
}

.armour-fill {
  background: #dfdfdf;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.7);
}

.health-fill {
  background: #b91c1c;
  box-shadow: inset 0 1px 0 rgba(255,100,100,0.6);
}

/* MONEY (UANG) */
.hud-money {
  font-family: 'GTASABold', 'Pricedown', 'Impact', sans-serif;
  color: #4ca144;
  text-align: right;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-shadow:
    1.5px 1.5px 0 #000,
    -1px -1px 0 #000,
    1px -1px 0 #000,
    -1px 1px 0 #000,
    0 2px 4px rgba(0, 0, 0, 0.9);
}

/* RADAR (MINIMAP DI BAWAH) */
.hud-radar {
  position: absolute;
}

.radar-disc {
  position: relative;
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.7);
}

.radar-map-svg {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
}

.radar-tag {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'GTASAClear', 'BankGothicMediumBT', 'Tahoma', sans-serif;
  font-weight: 700;
  color: #e6e6e6;
  text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 0 1px 3px rgba(0,0,0,0.9);
  white-space: nowrap;
}
</style>
