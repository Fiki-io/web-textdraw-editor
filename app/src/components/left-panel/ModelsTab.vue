<template>
  <div class="models-tab">
    <div class="header-section">
      <div class="section-title">3D Models (Font 5)</div>
      
      <!-- Search Input -->
      <div class="search-wrap">
        <input
          v-model="searchQuery"
          class="xp-input search-input"
          placeholder="Search name or Model ID..."
        />
        <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''">✕</button>
      </div>

      <!-- Category Filter Tabs -->
      <div class="category-tabs">
        <button
          v-for="cat in MODEL_CATEGORIES"
          :key="cat"
          class="cat-tab"
          :class="{ active: selectedCategory === cat }"
          @click="selectedCategory = cat"
        >
          {{ cat }}
        </button>
      </div>

      <!-- Quick Custom ID Adder -->
      <div class="custom-id-row">
        <span class="custom-label">Custom ID:</span>
        <input
          v-model.number="customId"
          type="number"
          class="xp-input id-input"
          placeholder="e.g. 2880"
          @keyup.enter="insertCustomModel"
        />
        <button class="xp-btn add-id-btn" @click="insertCustomModel">Insert</button>
      </div>
    </div>

    <!-- Models Grid -->
    <div class="models-list">
      <div
        v-for="m in filteredModels"
        :key="m.id"
        class="model-card"
        :title="`${m.name} [ID: ${m.id}] - ${m.desc}`"
        @click="insertModel(m)"
      >
        <div class="model-thumb">
          <img
            :src="getModelImageUrl(m.id)"
            class="thumb-img"
            :alt="m.name"
            loading="lazy"
            @error="onImgError($event, m.id)"
          />
        </div>
        <div class="model-info">
          <div class="model-name">{{ m.name }}</div>
          <div class="model-id">ID: {{ m.id }}</div>
        </div>
      </div>

      <div v-if="!filteredModels.length" class="empty-state">
        No models found matching "{{ searchQuery }}"
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { COMMON_MODELS, MODEL_CATEGORIES, getModelImageUrl, getModelFallbackUrls, getModelInfo } from '../../constants/models'

const emit = defineEmits(['insert-model'])

const searchQuery = ref('')
const selectedCategory = ref('All')
const customId = ref(null)

const filteredModels = computed(() => {
  let list = COMMON_MODELS
  if (selectedCategory.value !== 'All') {
    list = list.filter(m => m.category === selectedCategory.value)
  }
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return list

  return list.filter(m =>
    m.name.toLowerCase().includes(q) ||
    m.desc.toLowerCase().includes(q) ||
    String(m.id).includes(q)
  )
})

function onImgError(event, modelId) {
  const fallbacks = getModelFallbackUrls(modelId)
  if (fallbacks.length > 1 && !event.target.dataset.triedFallback) {
    event.target.dataset.triedFallback = '1'
    event.target.src = fallbacks[1]
  } else {
    event.target.style.display = 'none'
  }
}

function insertModel(model) {
  emit('insert-model', model)
}

function insertCustomModel() {
  if (customId.value === null || isNaN(customId.value) || customId.value < 0) return
  const info = getModelInfo(customId.value)
  emit('insert-model', info)
  customId.value = null
}
</script>

<style scoped>
.models-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg1);
  overflow: hidden;
  box-sizing: border-box;
}

.header-section {
  padding: 8px 8px 4px 8px;
  border-bottom: 1px solid var(--border2);
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}

.section-title {
  font-family: Tahoma, sans-serif;
  font-size: 9px;
  font-weight: 700;
  color: var(--text2);
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  padding-right: 20px;
  font-size: 10px;
}

.clear-btn {
  position: absolute;
  right: 4px;
  background: none;
  border: none;
  color: var(--text2);
  font-size: 10px;
  cursor: pointer;
  padding: 2px 4px;
}
.clear-btn:hover {
  color: var(--text0);
}

.category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}

.cat-tab {
  background: var(--bg2);
  border: 1px solid var(--border2);
  color: var(--text1);
  font-family: Tahoma, sans-serif;
  font-size: 9px;
  padding: 2px 5px;
  border-radius: 2px;
  cursor: pointer;
  user-select: none;
  transition: all 0.1s;
}
.cat-tab:hover {
  background: var(--bg3);
  color: var(--text0);
}
.cat-tab.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.custom-id-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
}

.custom-label {
  font-family: Tahoma, sans-serif;
  font-size: 9px;
  color: var(--text2);
  white-space: nowrap;
}

.id-input {
  flex: 1;
  font-size: 10px;
  padding: 2px 4px;
}

.add-id-btn {
  padding: 2px 6px;
  font-size: 9px;
  flex-shrink: 0;
}

/* ── Models List & Grid ── */
.models-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 6px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 5px;
  align-content: start;
}

.model-card {
  background: var(--bg2);
  border: 1px solid var(--border2);
  border-radius: 3px;
  padding: 4px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  user-select: none;
  transition: all 0.1s ease;
}

.model-card:hover {
  background: var(--bg3);
  border-color: var(--accent);
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}

.model-card:active {
  transform: translateY(0);
}

.model-thumb {
  width: 100%;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.25);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 4px;
}

.thumb-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
}

.model-info {
  width: 100%;
  overflow: hidden;
}

.model-name {
  font-family: Tahoma, sans-serif;
  font-size: 9px;
  font-weight: 700;
  color: var(--text0);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.model-id {
  font-family: monospace;
  font-size: 8px;
  color: var(--accent);
  margin-top: 1px;
}

.empty-state {
  grid-column: 1 / -1;
  padding: 16px 8px;
  text-align: center;
  font-family: Tahoma, sans-serif;
  font-size: 10px;
  color: var(--text2);
}

.xp-input {
  font-family: Tahoma, sans-serif;
  color: var(--text0);
  background: var(--bg0);
  border: 1px solid var(--border2);
  box-sizing: border-box;
  outline: none;
  padding: 3px 6px;
}
.xp-input:focus {
  border-color: var(--accent);
}

.xp-btn {
  font-family: Tahoma, sans-serif;
  color: var(--text1);
  background: var(--bg3);
  border: 1px solid var(--border2);
  cursor: pointer;
  user-select: none;
  transition: all 0.1s;
}
.xp-btn:hover {
  background: var(--bg2);
  border-color: var(--accent);
  color: var(--text0);
}
</style>
