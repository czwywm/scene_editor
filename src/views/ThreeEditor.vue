<template>
	<!-- 3D场景容器 -->
	<div ref="threeBox" class="three-box"></div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { ThreeEditor } from '../components/three-editor-cores-main/lib/main.js'
import tamplateJson from './template.json'

const threeBox = ref(null)
let threeEditor = null
const { dataCores } = defineProps(['dataCores'])
const emits = defineEmits(['emitThreeEditor'])

watch(
	() => dataCores.sceneName,
	(val) => {
		let savedParams = localStorage.getItem(val + '-newEditor')
		try {
			if (threeEditor && threeEditor.viewer) {
				// 先销毁场景渲染器
				threeEditor.viewer.destroySceneRender()
				// 再销毁控制面板管理器
				threeEditor.viewer.controlPanelManager.destroy()
				// 创建新场景
				createScene()
			} else {
				console.warn('threeEditor未初始化，无法重置场景')
			}
		} catch (error) {
			console.error('切换场景时出错:', error)
			// 如果出错，移除可能损坏的存储
			if (savedParams) {
				localStorage.removeItem(val + '-newEditor')
				console.warn('已移除可能损坏的场景存储')
			}
		}
	},
)
// 初始化场景
const createScene = () => {
	try {
		// 尝试从localStorage获取场景参数，如果不存在则使用默认模板
		let sceneParams = null
		let meshListParams = null
		let skyParams = null

		// 首先尝试获取特定场景的参数
		const savedSceneData = localStorage.getItem(dataCores.sceneName + '-newEditor')

		if (savedSceneData) {
			// 如果有保存的特定场景数据，使用它
			const sceneData = JSON.parse(savedSceneData)
			sceneParams = sceneData.sceneParams || null
			meshListParams = sceneData.meshListParams || null
			skyParams = sceneData.skyParams || null
			console.log('加载特定场景数据:', dataCores.sceneName)
		}

		// 如果所有参数都不存在，使用模板数据
		if (!sceneParams && !meshListParams && !skyParams) {
			sceneParams = tamplateJson.sceneParams || null
			meshListParams = tamplateJson.meshListParams || null
			skyParams = tamplateJson.skyParams || null
			// console.log('使用默认模板数据')
		}

		threeEditor = new ThreeEditor({
			threeBoxRef: threeBox.value,
			rendererParams: {
				fps: null,
				pixelRatio: window.devicePixelRatio * 1.5,
				webglRenderParams: { antialias: true, alpha: true, logarithmicDepthBuffer: true },
				userPermissions: { autoPlace: false, proxy: false },
			},
			sceneParams: sceneParams,
			meshListParams: meshListParams,
			skyParams: skyParams,
			saveEditorCallBack: (sceneParams, meshListParams) => {
				// 同时保存到特定场景存储
				const sceneData = {
					sceneParams,
					meshListParams,
					skyParams,
				}
				localStorage.setItem(dataCores.sceneName + '-newEditor', JSON.stringify(sceneData))
			},
		})
	} catch (error) {
		console.error('初始化场景失败:', error)
	}

	if (threeEditor) {
		emits('emitThreeEditor', threeEditor)
		// 设置事件监听
		setupEventListeners()
	}
}

// 设置事件监听
const setupEventListeners = () => {
	// 模型加载进度监听
	let controlsIsActived = false
	threeEditor.viewer.controls.addEventListener('start', () => (controlsIsActived = true))
	threeEditor.viewer.controls.addEventListener('end', () => (controlsIsActived = false))

	threeEditor.progressList.forEach((e) => {
		e.loaderService.complete = (m) => {
			if (e.params.name !== '机房') return

			const { raycaster, getIntersects } = threeEditor.getRawSceneEvent()
			raycaster.far = 100

			let mesh_group = null
			let timer = null

			threeBox.value.addEventListener('mousemove', (e) => {
				if (controlsIsActived) return
				if (timer) return

				timer = setTimeout(() => (timer = null), 20)
				const intersects = getIntersects(e, m.children)
				const i = intersects.find((i) => i.object.text !== 'TransformControls' && i.object.isMesh)

				if (!i) return

				mesh_group?.meshRevertMaterial?.()
				mesh_group = i.object.parent

				threeEditor.setOutlinePass([mesh_group])

				if (!mesh_group.isCloneMaterial) threeEditor.meshGroupCloneMaterial(mesh_group)

				threeEditor.changeMeshMaterial(mesh_group, {
					emissive: 'blue',
					emissiveIntensity: 0.2,
					transparent: true,
					opacity: 0.2,
					depthTest: true,
					depthWrite: false,
				})
			})
		}
	})

	// 地图浮动监听 材质 形状修改
	let currnetMeshName = null
	let meshs = []

	threeEditor.viewer.chartsMapControls.geoGroupAllLoadedCall = () => {}

	threeEditor.viewer.chartsMapControls.geoGroupLoadCall = (group) => {
		if (group.name !== '带事件') return

		const { getIntersects } = threeEditor.getRawSceneEvent()

		threeBox.value.addEventListener('mousemove', (e) => {
			const i = getIntersects(e, group.children).find((i) => i.object.text !== 'TransformControls' && i.object.isMesh)

			if (!i) {
				return meshs.forEach((i) => {
					i?.meshRevertMaterial()
					i?.meshRevertTransform()
				})
			}

			if (currnetMeshName === i.object.name) return
			currnetMeshName = i.object.name

			meshs.forEach((i) => {
				i?.meshRevertMaterial()
				i?.meshRevertTransform()
			})

			meshs = group.children.filter((j) => j.name === i.object.name)

			meshs.forEach((i) => {
				threeEditor.changeMeshTransform(i, { scale: { x: 1, y: 1, z: 5 } })
				threeEditor.changeMeshMaterial(i, { color: '#fff', opacity: 1 })
			})
		})
	}

	// 点击信息模式事件监听
	threeBox.value.addEventListener('dblclick', (e) => {
		threeEditor.getSceneEvent(e, (info) => {
			// threeEditor.setCss2dDOM(document.querySelector('.my-dom'), info.point).scale.set(0.01, 0.01, 0.01)

			if (info.mode === '点击信息') {
				const { camera, controls } = threeEditor.viewer
				const p = threeEditor.getDistanceScalePoint(camera.position, info.point, 0.9)

				threeEditor.setGsapAnimation(camera.position, p)
				threeEditor.setGsapAnimation(controls.target, info.point)
			}
		})
	})
}

// 窗口大小变化处理
const handleResize = () => {
	if (threeEditor) {
		threeEditor.viewer.renderSceneResize()
	}
}

// 组件挂载
onMounted(() => {
	ThreeEditor.dracoPath = '/draco/'
	createScene()
	window.addEventListener('resize', handleResize)
})

// 组件卸载
onUnmounted(() => {
	window.removeEventListener('resize', handleResize)
	if (threeEditor) {
		threeEditor.viewer.destroySceneRender()
	}
})
</script>

<style scoped lang="less">
.three-editor-container {
	position: relative;
	width: 100vw;
	height: 100vh;
	overflow: hidden;
}

.three-box {
	height: 100vh;
	width: 100vw;
}

.panel {
	position: absolute;
	display: grid;
	width: 25vw;
	grid-template-columns: repeat(auto-fill, 100px);
	top: 0;
	z-index: 1;
}

button {
	padding: 8px 12px;
	margin: 2px;
	border: none;
	background-color: rgba(0, 0, 0, 0.7);
	color: white;
	border-radius: 4px;
	cursor: pointer;
	font-size: 12px;
	transition: background-color 0.3s;
}

button:hover {
	background-color: rgba(0, 0, 0, 0.9);
}

:deep(.upload-demo) {
	.upload-area {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.cover-image {
		width: 100%;
		height: 180px;
		object-fit: contain;
		border-radius: 6px;
	}

	.upload-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: #8c939d;

		.el-icon--upload {
			font-size: 48px;
			margin-bottom: 12px;
		}

		.el-upload__text {
			font-size: 14px;

			em {
				color: #409eff;
				font-style: normal;
			}
		}
	}

	.el-upload-dragger {
		width: 100%;
		height: 180px;
		border: 1px dashed #d9d9d9;
		border-radius: 6px;
		cursor: pointer;
		position: relative;
		overflow: hidden;

		&:hover {
			border-color: #409eff;
		}
	}

	.el-upload__tip {
		margin-top: 12px;
		color: #8c939d;
		font-size: 12px;
		text-align: center;
	}
}
</style>
