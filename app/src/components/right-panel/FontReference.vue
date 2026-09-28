<template>
  <XpPanel title="GTA SA Font Reference">
    <div class="font-ref">
      <div class="font-rows">
        <div class="font-row" v-for="f in FONTS" :key="f.id">
          <span class="font-id">{{ f.id }}</span>
          <div class="font-info">
            <span class="font-name" :style="{ fontFamily: f.family }">{{ f.name }}</span>
            <span class="font-sample" :style="{ fontFamily: f.family }">THE QUICK BROWN FOX 123</span>
          </div>
        </div>
        <div class="font-row">
          <span class="font-id">4</span>
          <div class="font-info">
            <span class="font-name">Font 4 (Sprite)</span>
            <span class="font-sample">TXD Texture Sprite (e.g. hud:fist)</span>
          </div>
        </div>
        <div class="font-row">
          <span class="font-id">5</span>
          <div class="font-info">
            <span class="font-name">Font 5 (Model)</span>
            <span class="font-sample">3D Preview Model (vehicles, skins, items)</span>
          </div>
        </div>
      </div>
    </div>
  </XpPanel>
</template>

<script setup>
import XpPanel from '../shared/XpPanel.vue'
import { FONTS } from '../../constants/fonts'
</script>

<style scoped>
.font-ref { padding: 2px 0; }
.font-rows { display: flex; flex-direction: column; gap: 4px; }
.font-row {
  display: flex;
  gap: 8px;
  padding: 4px 6px;
  background: var(--bg0);
  border: 1px solid var(--border2);
  border-radius: 3px;
  align-items: flex-start;
}
.font-id {
  color: var(--accent);
  width: 14px;
  flex-shrink: 0;
  font-weight: 700;
  font-family: 'Tahoma', sans-serif;
  font-size: 11px;
}
.font-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}
.font-name {
  color: var(--text0);
  font-size: 11px;
  font-weight: 700;
}
.font-sample {
  color: var(--text2);
  font-size: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>