<script setup lang="ts">
import AdminSectionHeader from '~/components/admin/AdminSectionHeader.vue'
import AdminResyncMatchCard from '~/components/admin/AdminResyncMatchCard.vue'
import AdminCustomImportCard from '~/components/admin/AdminCustomImportCard.vue'
import AdminRecomputeCard from '~/components/admin/AdminRecomputeCard.vue'

useSeoMeta({ title: 'Parties · Administration' })
</script>

<template>
  <section aria-labelledby="admin-games-title" class="animate-rise">
    <AdminSectionHeader
      heading-id="admin-games-title"
      title="Parties"
      description="Re-synchroniser, importer une personnalisée, recalculer les LP."
    />

    <div class="grid items-stretch gap-5 min-[73.75rem]:grid-cols-2">
      <AdminResyncMatchCard />
      <AdminCustomImportCard />
    </div>

    <AdminRecomputeCard class="mt-5" />
  </section>
</template>
