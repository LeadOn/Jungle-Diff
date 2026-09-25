<script setup lang="ts">
defineProps<{
  retrying?: boolean
}>()

defineEmits<{
  (e: 'retry'): void
}>()
</script>

<template>
  <div role="alert" class="flex flex-wrap items-center gap-5 rounded-[26px] border border-brand-red/30 bg-surface-base p-[26px] shadow-card">
    <img src="~/assets/img/JungleDiff_Logo.png" alt="" class="size-20 object-contain grayscale-[0.4]">
    <div class="min-w-60 flex-1">
      <h2 class="m-0 text-[26px] font-bold tracking-[-0.03em]">Invocateur introuvable.</h2>
      <p class="m-0 mt-1.5 text-pretty text-[14.5px] leading-normal text-text-sec">
        Impossible de charger ce profil : l'API GameOn n'a pas répondu ou ce joueur n'existe pas dans le crew.
      </p>
    </div>
    <button
      type="button"
      :disabled="retrying"
      class="inline-flex h-[46px] cursor-pointer items-center gap-[9px] rounded-full bg-inverse px-[22px] text-[15px] font-bold text-inverse-text transition-transform duration-[250ms] ease-spring hover:scale-105 disabled:cursor-wait"
      @click="$emit('retry')"
    >
      <Icon name="lucide:refresh-cw" class="size-[15px]" :class="{ 'animate-spin': retrying }" />
      Réessayer
    </button>
  </div>
</template>
