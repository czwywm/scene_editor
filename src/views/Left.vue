<template>
	<div class="left">
		<div class="nav-menu">
			<div class="menu-item" v-for="item in data" :key="item.title" @click="setActive(item)">
				<el-button
					:class="{
						'active-icon': active == item.title,
						'normal-icon': active != item.title,
					}"
					link
					:icon="item.icon"
					:title="item.title"
				/>
				<span :class="{ 'active-text': active == item.title }">{{ item.title }}</span>
			</div>
		</div>
		<div class="content-panel">
			<!-- 多层结构渲染 -->
			<template v-if="hasNestedStructure">
				<div class="collapse-container">
					<el-collapse>
						<el-collapse-item v-for="category in showList" :key="category.tid" :name="category.tid" :title="category.typename">
							<div class="category-content">
								<div class="back" v-for="(item, key) in getCategoryItems(category)" :key="key">
									<div class="item" draggable="true" @dragend="(e) => dragAdd(e, item)">
										<el-image :src="DEFAULT_CONFIG.BASE_URL + item.imgurl" :preview-src-list="[DEFAULT_CONFIG.BASE_URL + item.imgurl]" fit="cover" :hide-on-click-modal="true" />
										<el-link @click="clickLeft(item)">
											{{ getItemDisplayName(item) }}
										</el-link>
									</div>
								</div>
							</div>
						</el-collapse-item>
					</el-collapse>
				</div>
			</template>

			<!-- 单层结构渲染 -->
			<template v-else>
				<div class="build">
					<div class="back" v-for="(i, key) in showList" :key="key">
						<div class="item" draggable="true" @dragend="(e) => dragAdd(e, i)">
							<el-link @click="clickLeft(i)">
								{{ getItemDisplayName(i) }}
							</el-link>
						</div>
					</div>
				</div>
			</template>
		</div>
	</div>
</template>
<script setup>
import { ref, reactive, onMounted, computed, inject } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import * as THREE from 'three'
import { ElMessage } from 'element-plus'
import { ThreeEditor } from '../components/three-editor-cores-main/lib/main.js'

const DEFAULT_CONFIG = window.DEFAULT_CONFIG || {}
const route = useRoute()

const listJ = window.editorJsons.map((v) => (__isProduction__ ? '/threejs-editor/' + v : '/' + v))

// 导入外置组件
const components = Object.values(
	import.meta.glob('./compoents/*.js', {
		eager: true,
		import: 'default',
	}),
)

// 加载组件到ThreeEditor.__DESIGNS__
ThreeEditor.__DESIGNS__.unshift(...components)

// 提取组件标签名
const editor_components = components.map((v) => v.label || v.name)

const data = reactive([
	{
		icon: 'set-up',
		title: '配置案例',
		list: listJ,
	},
	{
		icon: 'office-building',
		title: '模型',
		list: window.models,
	},
	{
		title: '组件',
		icon: 'connection',
		list: editor_components,
	},
])
const active = ref('')
const showList = ref([])
// 从父组件获取加载进度状态
const loadingProgress = inject('loadingProgress', ref(0))

// 获取模型信息
async function getModel() {
	axios
		.post(`${window.DEFAULT_CONFIG.API_URL}/api/Scene/GetSceneModel`, {
			token: route.query.token,
		})
		.then((res) => {
			if (res.data.resultCode === '0000') {
				data.push(
					{
						title: '公共库',
						icon: 'office-building',
						list: res.data.data.tlist,
					},
					{
						title: '我的库',
						icon: 'star',
						list: res.data.data.mylist,
					},
				)
				active.value = data[0].title
				showList.value = data[0].list
			}
		})
}

const setActive = (item) => {
	active.value = item.title
	showList.value = item.list
}

// 判断是否为嵌套结构
const hasNestedStructure = computed(() => {
	const list = showList.value
	if (!Array.isArray(list) || list.length === 0) return false

	// 检查是否有嵌套的 child 数组
	return list.some((item) => item && Array.isArray(item.modellist) && item.modellist.length > 0)
})

// 获取分类下的项目
function getCategoryItems(category) {
	if (category.modellist && Array.isArray(category.modellist)) {
		return category.modellist
	}
	return [] // 如果没有子项，返回空数组
}

// 获取项目显示名称
function getItemDisplayName(item) {
	// 如果是模型库数据
	if (item?.modelname) {
		return item.modelname
	}
	// 如果是文件路径
	if (typeof item === 'string') {
		return item.split('/').pop()
	}
	// 默认返回
	return '-'
}

const loadScene = (v) => {
	// 重置加载进度
	loadingProgress.value = 0

	fetch(v)
		.then((res) => {
			console.log('res', res)
			// 检查响应是否成功
			if (!res.ok) {
				throw new Error(`HTTP错误! 状态码: ${res.status}`)
			}
			return res.json()
		})
		.then((res) => {
			threeEditor?.resetEditorStorage(res)
			ElMessage.success('场景加载成功')
		})
		.catch((error) => {
			console.error('场景加载失败:', error)
			ElMessage.error('场景加载失败: ' + error.message)
		})
}

async function clickLeft(v, point) {
	if (active.value === '配置案例') {
		console.log('v', v)
		// 检查是否有正在加载的内容
		if (loadingProgress.value !== 0) {
			ElMessage.warning('请先完成当前加载')
			return
		}
		loadScene(v)
	} else if (active.value === '模型') {
		if (loadingProgress.value !== 0) {
			ElMessage.warning('请先完成当前加载')
			return
		}
		// 重置加载进度
		loadingProgress.value = 0
		let a = v.split('/')
		a = a[a.length - 1].split('.')
		let modelInfo = {
			type: a[1],
			name: a[0],
			url: v,
			point: point || { x: 0, y: 0, z: 0 },
		}

		// 获取加载服务并监听进度
		const { loaderService } = threeEditor.setModelFromInfo(modelInfo)

		// 监听加载进度
		loaderService.progress = (progress, xhr) => {
			loadingProgress.value = Math.round(progress * 100)
		}

		// 监听加载完成
		loaderService.complete = () => {
			loadingProgress.value = 0
		}
	} else if (active.value === '组件') {
		const design = ThreeEditor.__DESIGNS__.find((d) => d.label === v)
		if (!design) return
		const mesh = await design.create(null, threeEditor.viewer)
		if (!mesh) return
		mesh.isDesignMesh = true
		mesh.designType = design.name
		threeEditor.viewer.scene.add(mesh)
		if (point) mesh.position.copy(point)
		const { maxView, target } = threeEditor.getObjectViews(mesh)
		//检测是否存在maxView
		if (maxView && maxView.x) {
			threeEditor.createGsapAnimation(threeEditor.viewer.camera.position, maxView)
			threeEditor.createGsapAnimation(threeEditor.viewer.controls.target, target)
		}
		threeEditor.viewer.transformControls.attach(mesh)
	} else {
		let modelInfo = {
			type: 'gltf',
			name: v.modelname,
			url: window.DEFAULT_CONFIG.BASE_URL + v.modelurl,
			point: point || { x: 0, y: 0, z: 0 },
		}
		threeEditor.setModelFromInfo(modelInfo)
	}
}
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
const dragAdd = (e, v) => {
	e.preventDefault()
	const { clientX, clientY } = e
	mouse.x = (clientX / window.innerWidth) * 2 - 1
	mouse.y = -(clientY / window.innerHeight) * 2 + 1
	raycaster.setFromCamera(mouse, threeEditor.viewer.camera)
	const intersects = raycaster.intersectObjects(threeEditor.viewer.scene.children, true)
	if (intersects.length > 0) {
		const intersect = intersects[0]
		const { point } = intersect
		clickLeft(v, point)
	}
}

onMounted(() => {
	getModel()
})
</script>
<style lang="less" scoped>
.left {
	width: 280px;
	height: calc(100% - 50px);
	background-color: #181818;
	position: fixed;
	top: 50px;
	left: 0;
	z-index: 100;
	display: flex;
}

.nav-menu {
	width: 60px;
	height: 100%;
	display: flex;
	flex-direction: column;
	border-right: 1px solid #4a4a4a;
	box-sizing: border-box;
}

.menu-item {
	height: 62px;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	font-size: 12px;
	cursor: pointer;
	border-bottom: 1px solid #3e3e3e;
	user-select: none;
	transition: all 0.2s ease;

	&:hover {
		background-color: #252525;
	}

	.normal-icon {
		font-size: 24px;
		transition: all 0.2s;
	}

	.active-icon {
		font-size: 28px;
		color: rgb(182, 211, 244);
		font-weight: 800;
		transition: all 0.2s;
	}

	.active-text {
		color: rgb(182, 211, 244);
		font-weight: bold;
	}
}

.content-panel {
	flex: 1;
	overflow: auto;
}

.collapse-container {
	width: 100%;
	height: 100%;
	overflow-y: auto;

	:deep(.el-collapse) {
		border: none;
		background-color: transparent;
	}

	:deep(.el-collapse-item) {
		margin: 6px;

		.el-collapse-item__header {
			width: 100%;
			background-color: #2a2a2a;
			border: 1px solid #4a4a4a;
			border-radius: 4px;
			color: #fff;
			font-size: 13px;
			font-weight: bold;
			padding: 0 12px;
			height: 36px;
			line-height: 36px;

			&:hover {
				background-color: #353535;
			}
		}

		.el-collapse-item__content {
			padding: 8px 0;
		}

		.el-collapse-item__wrap {
			border: none;
		}
	}

	.category-content {
		padding: 4px;
		box-sizing: border-box;
		display: grid;
		grid-auto-rows: 80px;
		grid-template-columns: repeat(2, 1fr);
		justify-items: center;

		.back {
			height: 90px;
			width: 90px;
			border-radius: 6px;
			border: 1px solid #676768;
			display: flex;
			padding: 5px;
			box-sizing: border-box;
		}

		.item {
			border: 1px solid #3d3d3d;
			border-radius: 3px;
			height: 100%;
			width: 100%;
			word-wrap: break-word;
			word-break: break-all;
			font-size: 12px;
			display: flex;
			overflow-wrap: break-word;
			text-align: center;
			justify-content: center;
			align-content: center;
			justify-items: center;
			align-items: center;
			padding: 4px;
			box-sizing: border-box;
			flex-direction: column;
		}
	}
}

.build {
	padding: 4px;
	box-sizing: border-box;
	display: grid;
	grid-auto-rows: 80px;
	grid-template-columns: repeat(2, 1fr);
	overflow-y: auto;
	height: 100%;
	justify-items: center;
	width: 100%;

	.back {
		height: 70px;
		width: 90px;
		border-radius: 6px;
		border: 1px solid #676768;
		display: flex;
		padding: 5px;
		box-sizing: border-box;
	}

	.item {
		border: 1px solid #3d3d3d;
		border-radius: 3px;
		height: 100%;
		width: 100%;
		word-wrap: break-word;
		word-break: break-all;
		font-size: 12px;
		display: flex;
		overflow-wrap: break-word;
		text-align: center;
		justify-content: center;
		align-content: center;
		justify-items: center;
		align-items: center;
		padding: 4px;
		box-sizing: border-box;
	}
}
</style>
