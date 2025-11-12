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
import { ref, reactive, onMounted, computed } from 'vue'
import axios from 'axios'

const DEFAULT_CONFIG = window.DEFAULT_CONFIG || {}
const data = reactive([
	{
		icon: 'set-up',
		title: '配置案例',
		list: [],
	},
	{
		icon: 'office-building',
		title: '模型',
		list: [],
	},
	{
		title: '组件',
		icon: 'connection',
		list: [],
	},
])

const active = ref(data[0].title)
const showList = ref(data[0].list)
// 获取模型信息
async function getModel() {
	axios
		.post(`${window.DEFAULT_CONFIG.API_URL}/api/Scene/GetSceneModel`, {
			token: '11',
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

				// 更新 showList 如果当前激活的是新添加的项
				if (active.value === '我的库') {
					showList.value = res.data.data.mylist
				}
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

async function clickLeft(v, point) {
	if (!window.threeEditor) return
	if (active.value === '配置案例') {
		window.currentOnlineSceneName = v.split('/').pop().replace('.json', '')
		loadScene(v)
	} else if (active.value === '模型') loadModel(v, point)
	else if (active.value === '组件') {
		const { scene, transformControls } = threeEditor
		const design = ThreeEditor.__DESIGNS__.find((d) => d.label === v)
		const mesh = await design.create(null, threeEditor, threeEditor)
		if (!mesh) return
		mesh.isDesignMesh = true
		mesh.designType = design.name
		scene.add(mesh)
		if (point) mesh.position.copy(point)
		const { maxView, target } = window.threeEditor.getObjectViews(mesh)
		//检测是否存在maxView
		if (maxView.x) {
			window.threeEditor.createGsapAnimation(window.threeEditor.camera.position, maxView)
			window.threeEditor.createGsapAnimation(window.threeEditor.controls.target, target)
		}
		transformControls.attach(mesh)
	} else {
		window.threeEditor.setModelFromInfo({
			type: 'GLTF',
			url: window.DEFAULT_CONFIG.BASE_URL + v.modelurl,
		})
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
	overflow: auto;

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
</style>
