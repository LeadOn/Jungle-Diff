<script setup lang="ts">
defineProps<{
  message?: string
  retry?: () => void
}>()
</script>

<template>
  <div class="flex items-start gap-4 rounded-2xl border border-brand-red/20 bg-brand-red/10 p-6">
    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-red/15 text-brand-red">
      <Icon name="lucide:triangle-alert" class="text-lg" style="stroke-width: 2.5px;" />
    </div>
    <div class="min-w-0 flex-1">
      <h3 class="m-0 mb-1 text-lg font-bold text-text-main">Chargement impossible</h3>
      <p class="m-0 text-sm font-medium leading-relaxed text-text-sec">
        {{ message || "Une erreur inattendue s'est produite." }}
      </p>
      <button
        v-if="retry"
        type="button"
        class="mt-4 inline-flex h-[34px] items-center gap-2 rounded-full bg-brand-red/15 px-4 text-[13px] font-bold text-brand-red transition-opacity hover:opacity-80"
        @click="retry"
      >
        <Icon name="lucide:rotate-cw" class="h-4 w-4" />
        Réessayer
      </button>
    </div>
  </div>
</template>
