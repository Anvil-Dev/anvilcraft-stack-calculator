<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watchEffect } from 'vue'
import { IconMoon, IconSun } from '@arco-design/web-vue/es/icon'

const storageKey = 'anvilcraft-stack-calculator:theme'
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
const systemDark = ref(systemTheme.matches)
const preference = ref<string | null>(null)
try {
  preference.value = localStorage.getItem(storageKey)
} catch {
  // Storage can be disabled in embedded or private browsing contexts.
}
const dark = computed(() => preference.value === 'dark' || (preference.value !== 'light' && systemDark.value))

function syncSystemTheme(event: MediaQueryListEvent): void {
  systemDark.value = event.matches
}
systemTheme.addEventListener('change', syncSystemTheme)
onBeforeUnmount(() => systemTheme.removeEventListener('change', syncSystemTheme))

watchEffect(() => {
  const theme = dark.value ? 'dark' : 'light'
  document.body.setAttribute('arco-theme', theme)
  document.documentElement.style.colorScheme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(document.body).getPropertyValue('--panel-bg').trim())
})

function toggleTheme(): void {
  preference.value = dark.value ? 'light' : 'dark'
  try {
    localStorage.setItem(storageKey, preference.value)
  } catch {
    // The selected theme still applies for this visit.
  }
}
</script>

<template>
  <a-tooltip :content="dark ? '切换到浅色模式' : '切换到深色模式'">
    <a-button class="theme-toggle" shape="circle" aria-label="深色模式" :aria-pressed="dark" @click="toggleTheme">
      <template #icon><IconSun v-if="dark" /><IconMoon v-else /></template>
    </a-button>
  </a-tooltip>
</template>
