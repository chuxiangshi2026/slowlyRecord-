<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    @closed="handleClosed"
    title="地图浏览诗词库"
    width="720px"
    :close-on-click-modal="false"
    class="library-map-dialog"
  >
    <div class="library-map-wrapper">
      <div class="library-map-toolbar">
        <el-radio-group v-model="mapFilter" size="small">
          <el-radio-button label="all">全部</el-radio-button>
          <el-radio-button label="selected">仅看已选</el-radio-button>
        </el-radio-group>
        <span class="map-count" v-if="poemsWithGeo.length > 0">
          共 {{ poemsWithGeo.length }} 首有地点，已选 {{ localSelectedIds.length }} 首
        </span>
      </div>
      <div ref="mapContainer" class="library-map-container"></div>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleConfirm">
        确认选择 ({{ localSelectedIds.length }})
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { parseLocation } from '@/utils/poetry-location';
import type { PoetryItem } from '@/utils/poetry-service';

interface Props {
  modelValue: boolean;
  poems: PoetryItem[];
  selectedIds: string[];
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'update:selectedIds', ids: string[]): void;
  (e: 'confirm', ids: string[]): void;
}>();

const mapContainer = ref<HTMLDivElement>();
let map: L.Map | null = null;
let markerLayer: L.LayerGroup | null = null;

const mapFilter = ref<'all' | 'selected'>('all');
const localSelectedIds = ref<string[]>([...props.selectedIds]);

watch(() => props.selectedIds, (val) => {
  localSelectedIds.value = [...val];
});

// 解析所有诗词的坐标
const poemsWithGeo = computed(() => {
  const result: (PoetryItem & { geo: { lat: number; lng: number; name: string } })[] = [];
  for (const poem of props.poems) {
    if (!poem.location) continue;
    const coord = parseLocation(poem.location);
    if (coord) {
      result.push({ ...poem, geo: { lat: coord.lat, lng: coord.lng, name: coord.name } });
    }
  }
  return result;
});

// 按坐标聚合
const clusterGroups = computed(() => {
  const map_ = new Map<string, (PoetryItem & { geo: { lat: number; lng: number; name: string } })[]>();
  const displayPoems = mapFilter.value === 'selected'
    ? poemsWithGeo.value.filter(p => localSelectedIds.value.includes(p.id))
    : poemsWithGeo.value;

  for (const poem of displayPoems) {
    const key = `${poem.geo.lng.toFixed(2)},${poem.geo.lat.toFixed(2)}`;
    if (!map_.has(key)) {
      map_.set(key, []);
    }
    map_.get(key)!.push(poem);
  }
  return Array.from(map_.entries());
});

function initMap() {
  if (!mapContainer.value) return;

  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });

  map = L.map(mapContainer.value).setView([35.0, 105.0], 4);

  L.tileLayer(
    'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
    {
      maxZoom: 18,
      minZoom: 3,
      attribution: '&copy; 高德地图',
      subdomains: '1234',
    }
  ).addTo(map);

  markerLayer = L.layerGroup().addTo(map);
  renderMarkers();
}

function getDynastyColor(dynasty?: string): string {
  const colorMap: Record<string, string> = {
    '先秦': '#8B4513', 'xianqin': '#8B4513',
    '两汉': '#CD853F', 'han': '#CD853F',
    '魏晋': '#9370DB', '魏晋南北朝': '#9370DB', 'weijin': '#9370DB',
    '隋': '#6B8E23', 'sui': '#6B8E23',
    '唐': '#DC143C', 'tang': '#DC143C',
    '宋': '#4169E1', 'song': '#4169E1',
    '元': '#2E8B57', 'yuan': '#2E8B57',
    '明': '#FF8C00', 'ming': '#FF8C00',
    '清': '#800080', 'qing': '#800080',
    '近现代': '#C0C0C0', '现代': '#C0C0C0', 'xiandai': '#C0C0C0',
  };
  return colorMap[dynasty || ''] || '#409EFF';
}

function renderMarkers() {
  if (!markerLayer || !map) return;
  markerLayer.clearLayers();

  const groups = clusterGroups.value;
  if (groups.length === 0) return;

  for (const [_, group] of groups) {
    const first = group[0];
    const allSelected = group.every(p => localSelectedIds.value.includes(p.id));
    const someSelected = group.some(p => localSelectedIds.value.includes(p.id));
    const color = getDynastyColor(first.dynasty);

    const customIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div class="marker-pin" style="background:${color};opacity:${allSelected ? 1 : 0.6};border:${someSelected && !allSelected ? '3px solid #ffd700' : 'none'}">${group.length > 1 ? group.length : ''}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
    });

    const marker = L.marker([first.geo.lat, first.geo.lng], { icon: customIcon });

    const popupContent = group.map((poem) => {
      const isChecked = localSelectedIds.value.includes(poem.id);
      return `<div class="popup-item" data-id="${poem.id}" style="cursor:pointer;padding:6px 0;border-bottom:1px solid #eee;display:flex;align-items:center;gap:6px">
        <input type="checkbox" ${isChecked ? 'checked' : ''} style="pointer-events:none">
        <div style="flex:1">
          <strong>${poem.title}</strong>
          <span style="color:#666;font-size:12px"> — ${poem.author || '佚名'}</span>
          <div style="font-size:11px;color:#999">${poem.location}</div>
        </div>
      </div>`;
    }).join('');

    marker.bindPopup(`<div class="poetry-popup">${popupContent}</div>`, { maxWidth: 280 });
    marker.on('popupopen', () => {
      nextTick(() => {
        const items = document.querySelectorAll('.popup-item');
        items.forEach(item => {
          item.addEventListener('click', () => {
            const id = item.getAttribute('data-id');
            if (id) {
              toggleSelection(id);
              // 更新popup中的checkbox状态
              const checkbox = item.querySelector('input[type="checkbox"]') as HTMLInputElement;
              if (checkbox) {
                checkbox.checked = localSelectedIds.value.includes(id);
              }
              // 重新渲染标记样式
              renderMarkers();
            }
          });
        });
      });
    });

    markerLayer.addLayer(marker);
  }

  // 调整视野
  const allGeo = poemsWithGeo.value;
  const displayGeo = mapFilter.value === 'selected'
    ? allGeo.filter(p => localSelectedIds.value.includes(p.id))
    : allGeo;
  if (displayGeo.length > 0) {
    const bounds = L.latLngBounds(displayGeo.map(a => [a.geo.lat, a.geo.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
  }
}

function toggleSelection(id: string) {
  const idx = localSelectedIds.value.indexOf(id);
  if (idx > -1) {
    localSelectedIds.value.splice(idx, 1);
  } else {
    localSelectedIds.value.push(id);
  }
  emit('update:selectedIds', [...localSelectedIds.value]);
}

function handleClose() {
  // 恢复为传入的选中状态
  localSelectedIds.value = [...props.selectedIds];
  emit('update:modelValue', false);
}

function handleConfirm() {
  emit('confirm', [...localSelectedIds.value]);
  emit('update:modelValue', false);
}

function handleClosed() {
  // 对话框完全关闭后销毁地图，确保下次重新初始化
  if (map) {
    map.remove();
    map = null;
    markerLayer = null;
  }
}

watch(() => props.modelValue, (visible) => {
  if (visible) {
    localSelectedIds.value = [...props.selectedIds];
    nextTick(() => {
      // 如果地图已存在，先销毁再重建，避免黑屏
      if (map) {
        map.remove();
        map = null;
        markerLayer = null;
      }
      initMap();
    });
  }
});

watch(() => props.poems, () => {
  nextTick(() => {
    renderMarkers();
  });
});

watch(mapFilter, () => {
  renderMarkers();
});

onUnmounted(() => {
  map?.remove();
  map = null;
});
</script>

<style scoped lang="scss">
.library-map-wrapper {
  display: flex;
  flex-direction: column;
  height: 400px;
}

.library-map-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
}

.library-map-container {
  flex: 1;
  min-height: 300px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--utools-border-color);
}

.map-count {
  font-size: 13px;
  color: var(--utools-text-secondary);
}
</style>

<style lang="scss">
.library-map-dialog .el-dialog__body {
  padding-top: 10px;
  padding-bottom: 10px;
}

.custom-marker {
  .marker-pin {
    width: 30px;
    height: 30px;
    border-radius: 50% 50% 50% 0;
    background: #409eff;
    position: absolute;
    transform: rotate(-45deg);
    left: 50%;
    top: 50%;
    margin: -15px 0 0 -15px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 12px;
    font-weight: bold;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  }
}

.poetry-popup {
  max-height: 240px;
  overflow-y: auto;
  min-width: 200px;
}

.leaflet-popup-content-wrapper {
  border-radius: 8px;
}

.leaflet-popup-content {
  margin: 8px 12px;
}
</style>
