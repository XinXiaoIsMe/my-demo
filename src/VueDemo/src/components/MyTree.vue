<template>
  <!-- 透传el-tree的所有属性、方法、插槽 -->
  <el-tree v-bind="$attrs" ref="elTree">
    <template v-for="(_, name) in $slots" :key="name" #[name]="scopedValue">
      <slot :name="name" v-bind="scopedValue" />
    </template>
  </el-tree>
</template>

<script lang="ts" setup>
import { ElTree } from 'element-plus';

type ElTreeType = InstanceType<typeof ElTree>

const elTreeRef = useTemplateRef<ElTreeType>('elTree')

defineExpose({
  getInputExpose
})

/**
 * 获取el-input导出的属性和方法
 * @param name 属性名或者方法名
 * @returns el-input导出的属性和方法
 */
function getInputExpose<K extends keyof ElTreeType>(name: K): ElTreeType[K] | undefined {
  if (!elTreeRef.value) return
  return elTreeRef.value[name].bind(elTreeRef.value)
}
</script>
