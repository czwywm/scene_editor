<template>
	<div v-show="!namePreviewScene" class="layout">
		<div class="header" v-show="!previewScene">
			<div class="header-box">
				<div class="header-left">
					<!-- Left header content -->
				</div>
				<div class="title">
					<!-- Title content -->
				</div>
				<div class="header-right">
					<el-button class="btn-add" link icon="Document" @click="exportTemplateJson">导出</el-button>
					<el-button @click="pict" icon="camera"></el-button>
					<el-button @click="openPanel">控制板</el-button>
					<!-- <el-button @click="saveScene">保存</el-button> -->
				</div>
			</div>
		</div>
		<div class="main-container">
			<div class="side-panel left-panel" :class="{ collapsed: leftCollapsed }">
				<div style="height: 100%; width: 100%" v-show="!leftCollapsed">
					<LeftPanel />
				</div>
				<div class="panel-toggle" @click="leftCollapsed = !leftCollapsed">
					<el-icon>
						<component :is="leftCollapsed ? 'ArrowRight' : 'ArrowLeft'" />
					</el-icon>
				</div>
			</div>
			<div class="side-panel right-panel" :class="{ collapsed: rightCollapsed }">
				<div style="height: 100%; width: 100%" v-show="!rightCollapsed">
					<RightPanel ref="rightPanel" />
				</div>
				<div class="panel-toggle" @click="rightCollapsed = !rightCollapsed">
					<el-icon>
						<component :is="rightCollapsed ? 'ArrowLeft' : 'ArrowRight'" />
					</el-icon>
				</div>
			</div>
		</div>
		<Editor @emitThreeEditor="emitThreeEditor" class="editor" />
	</div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Editor from './ThreeEditor.vue'
import LeftPanel from './LeftPanel.vue'
import RightPanel from './RightPanel.vue'

const route = useRoute()
const router = useRouter()
const previewScene = ref(false)
const leftCollapsed = ref(false)
const rightCollapsed = ref(false)
let namePreviewScene = false

watch(previewScene, (val) => {
	leftCollapsed.value = val
	rightCollapsed.value = val
})

if (route.query.sceneName) {
	namePreviewScene = true
}

const emitThreeEditor = (threeEditor) => {
	window.threeEditor = threeEditor
}

const openPanel = () => {
	threeEditor.openControlPanel()
}
const exportTemplateJson = () => {
	if (!threeEditor) return ElMessage.error('没有可导出的场景')
	const blob = new Blob([JSON.stringify(threeEditor.saveSceneEditor())], { type: 'application/json' })
	const link = document.createElement('a')
	link.href = URL.createObjectURL(blob)
	// link.download = (dataCores.sceneName || '场景') + '.json'
	link.download = '场景.json'
	link.click()
}
const pict = () => {
	const base64 = threeEditor.getSceneEditorImage(['image/png', '0.8'])
	const link = document.createElement('a')
	link.href = base64
	// link.download = (dataCores.sceneName || '场景') + '.png'
	link.download = '场景.png'
	link.click()
}
</script>

<style lang="less" scoped>
.editor {
	position: absolute;
	top: 0;
}

.layout {
	background-color: #1f1f1f;
	height: 100vh;
	width: 100vw;
	color: #e5eaf3;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.header {
	background-color: #181818;
	height: 50px;
	border-bottom: 1px solid #404040;
	z-index: 10;

	&-box {
		height: 100%;
		padding: 0 20px;
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
	}

	&-left {
		display: flex;
		align-items: center;
	}

	.title {
		color: #e5eaf3;
		font-size: 18px;
		text-align: center;
		display: flex;
		align-items: center;
		height: 100%;
	}

	&-right {
		display: flex;
		justify-content: flex-end;
	}
}

.main-container {
	flex: 1;
	display: flex;
	position: relative;
}

.side-panel {
	position: absolute;
	height: 100%;
	background-color: #252525;
	transition: all 0.3s ease;
	z-index: 5;

	.panel-toggle {
		width: 16px;
		height: 60px;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: #333;
		cursor: pointer;
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		border-radius: 3px;
		z-index: 2;

		&:hover {
			background-color: #444;
		}
	}
}

.left-panel {
	left: 0;
	width: 280px;
	border-right: 1px solid #404040;

	.panel-toggle {
		right: -16px;
	}

	&.collapsed {
		width: 0;
	}
}

.right-panel {
	right: 0;
	width: 280px;
	border-left: 1px solid #404040;

	.panel-toggle {
		left: -16px;
	}

	&.collapsed {
		width: 0;
	}
}
</style>
