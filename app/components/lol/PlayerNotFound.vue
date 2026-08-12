<script setup lang="ts">
defineEmits<{
  (e: 'retry'): void
}>()
</script>

<template>
  <div class="p-6 rounded-2xl bg-brand-red/10 border border-brand-red/20 flex items-start gap-4">
    <div class="w-10 h-10 shrink-0 rounded-full bg-brand-red/15 text-brand-red flex items-center justify-center">
      <Icon name="lucide:circle-x" class="text-lg" style="stroke-width: 2.5px;" />
    </div>
    <div class="flex-1 min-w-0">
      <h3 class="m-0 mb-1 text-lg font-bold text-text-main">Invocateur introuvable</h3>
      <p class="m-0 mb-4 text-sm font-medium leading-relaxed text-text-sec">
        Impossible de charger ce profil : l'API GameOn n'a pas répondu ou ce joueur n'existe pas dans le crew.
      </p>
      <button
        class="inline-flex items-center gap-2 h-[34px] px-4 rounded-full bg-brand-red/15 text-brand-red font-bold text-[13px] transition-opacity hover:opacity-80"
        @click="$emit('retry')"
      >
        <Icon name="lucide:refresh-cw" class="text-xs" />
        Réessayer
      </button>
    </div>
  </div>
</template>
