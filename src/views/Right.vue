<template>
	<div class="right">
		<div class="helper-controls">
			<div class="control-group">
				<div class="group-header">
					<span class="group-title">场景选项</span>
					<div class="divider"></div>
				</div>
			</div>
			<div class="control-options">
				<div class="pixel-ratio">
					<el-icon style="color: #a8d4fd; font-size: 14px">
						<ScaleToOriginal />
					</el-icon>
					<span style="color: #e5eaf3">像素比</span>
					<el-input-number v-model="pixelRatio" :min="0.5" :max="3" :step="0.5" size="small"></el-input-number>
				</div>
				<el-checkbox v-model="showGrid" @change="toggleGrid">
					<div class="option-label">
						<el-icon>
							<Grid />
						</el-icon>
						<span>显示网格</span>
					</div>
				</el-checkbox>
				<el-checkbox v-model="showAxes" @change="toggleAxes">
					<div class="option-label">
						<el-icon>
							<ScaleToOriginal />
						</el-icon>
						<span>显示坐标轴</span>
					</div>
				</el-checkbox>
			</div>
		</div>
	</div>
</template>
<script setup>
import { computed, reactive, ref, watch } from 'vue'

const pixelRatio = ref(1)
const showGrid = ref(true)
const showAxes = ref(true)

if (localStorage.getItem('new_threeEditor_pixelRatio')) pixelRatio.value = parseFloat(localStorage.getItem('new_threeEditor_pixelRatio'))
watch(pixelRatio, (val) => {
	localStorage.setItem('new_threeEditor_pixelRatio', val)
	setTimeout(() => {
		window.location.reload()
	}, 500)
})

const toggleGrid = (val) => {
	threeEditor.setOperateOption('grid', val)
}

const toggleAxes = (val) => {
	threeEditor.setOperateOption('axes', val)
}
</script>
<style lang="less" scoped>
.right {
	width: 280px;
	height: calc(100% - 50px);
	background-color: #181818;
	position: fixed;
	top: 50px;
	right: 0;
	z-index: 100;
	display: flex;
}

.helper-controls {
	margin-top: 10px;
	width: 100%;
	padding: 0 10px;
	box-sizing: border-box;
}

.control-group {
	padding: 0px;
}

.group-header {
	margin-bottom: 12px;
	display: flex;
	flex-direction: column;
}

.group-title {
	font-size: 12px;
	font-weight: 500;
	color: #a8d4fd;
	margin-bottom: 8px;
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.divider {
	height: 1px;
	background: linear-gradient(90deg, rgba(168, 212, 253, 0.3), transparent);
	width: 100%;
}

.control-options {
	display: flex;
	flex-wrap: wrap;
	gap: 15px;
}

.pixel-ratio {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 12px;
}

.option-label {
	display: flex;
	align-items: center;
	gap: 6px;
}

.option-label .el-icon {
	color: #a8d4fd;
}

:deep(.el-checkbox) {
	.el-checkbox__label {
		color: #e7efff;
		font-size: 14px;
	}
}
</style>
