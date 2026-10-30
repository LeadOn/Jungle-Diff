<script setup lang="ts">
defineProps<{
  retrying?: boolean
}>()

defineEmits<{
  (e: 'retry'): void
}>()
</script>

<template>
  <UiErrorState
    title="Invocateur introuvable."
    description="Impossible de charger ce profil : l'API GameOn n'a pas répondu ou ce joueur n'existe pas dans le crew."
  >
    <template #actions>
      <UiButton
        variant="primary"
        :busy="retrying"
        :disabled="retrying"
        @click="$emit('retry')"
      >
        <Icon name="lucide:refresh-cw" class="size-4" :class="{ 'animate-spin': retrying }" />
        Réessayer
      </UiButton>
    </template>
  </UiErrorState>
</template>
