<script lang="ts" setup>
import { ElMessage } from 'element-plus';
import treeData from './data/tree.json'
import MyTree from './components/MyTree.vue';

interface Tree {
  id: string
  label: string
  children?: Tree[]
}

const myTreeRef = useTemplateRef('my-tree')
const inputValue = ref('')
const data = ref<Tree[]>([])

onMounted(() => {
  initTree()
})

function initTree() {
  setTimeout(() => {
    data.value = treeData
  }, 1000)
}

function addNode() {
  if (!inputValue.value || !myTreeRef.value) return

  // 给选中节点
  const curNode = myTreeRef.value.getInputExpose('getCurrentNode')?.() || myTreeRef.value.getInputExpose('getNode')?.('1').parent
  if (!curNode) return

  myTreeRef.value!.getInputExpose('append')?.({
    id: Date.now().toString(),
    label: inputValue.value
  }, curNode)
  inputValue.value = ''
  ElMessage.success('新增树节点成功！')
}

function handleNodeClick(data: Tree) {
  ElMessage.info(`选中了节点: ${data.label}`)
}
</script>

<template>
  <div>
    <div flex="~ gap-4 m-b-10px">
      <el-input v-model="inputValue" @change="addNode" />
      <el-button @click="addNode">ADD NODE</el-button>
    </div>
    <!-- 测试二次封装后的组件 -->
    <MyTree ref="my-tree" node-key="id" :data="data" @node-click="handleNodeClick">
      <!-- 测试插槽 -->
      <template #empty>
        <el-empty />
      </template>
    </MyTree>
  </div>
</template>
