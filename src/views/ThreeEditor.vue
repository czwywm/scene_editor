<template>
	<!-- 3D场景容器 -->
	<div ref="threeBox" class="three-box"></div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import * as THREE from 'three'
import { ThreeEditor } from '../components/three-editor-cores-main/lib/main.js'
import tamplateJson from './template.json'

const route = useRoute()

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
				// 清空进度列表，避免旧条目影响新场景
				threeEditor.progressList = []
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

// 获取机房房间场景信息
async function getRoomScene() {
	if (!route.query.sid) {
		ElMessage.error('无场景ID')
		return null
	}

	try {
		const response = await axios.post(`${window.DEFAULT_CONFIG.API_URL}/api/Scene/GetSceneInfo`, {
			token: route.query.token,
			sid: route.query.sid,
		})

		if (response.data.resultCode === '0000') {
			return {
				sceneContent: JSON.parse(response.data.data.scenecontent),
				scene: JSON.parse(response.data.data.scene),
			}
		} else {
			console.warn('获取房间场景数据失败:', response.data.message)
			return null
		}
	} catch (error) {
		console.error('获取房间场景数据出错:', error)
		return null
	}
}

// 初始化场景
const createScene = async () => {
	// 将sceneData变量定义在try块外部，扩大作用域
	let sceneData = null
	try {
		// 优先获取房间场景数据
		sceneData = await getRoomScene()

		// 尝试从localStorage获取场景参数，如果不存在则使用默认模板
		let sceneParams = null
		let modelParams = null
		let skyParams = null

		// 优先使用房间场景数据
		if (sceneData && sceneData.sceneContent) {
			// 如果有房间场景数据，使用它
			if (sceneData.sceneContent.sceneParams) sceneParams = sceneData.sceneContent.sceneParams
			if (sceneData.sceneContent.modelParams || sceneData.sceneContent.meshListParams) {
				modelParams = sceneData.sceneContent.modelParams || sceneData.sceneContent.meshListParams
			}
			if (sceneData.sceneContent.skyParams) skyParams = sceneData.sceneContent.skyParams
		}

		// 如果没有房间场景数据，使用localStorage中的保存数据
		if (!sceneData) {
			const savedSceneData = localStorage.getItem(dataCores.sceneName + '-newEditor')

			if (savedSceneData) {
				// 如果有保存的特定场景数据，使用它
				const parsedSceneData = JSON.parse(savedSceneData)
				sceneParams = parsedSceneData.sceneParams || null
				modelParams = parsedSceneData.modelParams || parsedSceneData.meshListParams || null
				skyParams = parsedSceneData.skyParams || null
				console.log('加载特定场景数据:', dataCores.sceneName)
			}
		}

		// 如果所有参数都不存在，使用模板数据
		if (!sceneParams && !modelParams && !skyParams) {
			sceneParams = tamplateJson.sceneParams || null
			modelParams = tamplateJson.modelParams || tamplateJson.meshListParams || null
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
			meshListParams: modelParams,
			skyParams: skyParams,
			saveEditorCallBack: (sceneParams, modelParams) => {
				// 同时保存到特定场景存储
				const sceneData = {
					sceneParams,
					modelParams,
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
		//在此处添加场景初始化完成后的操作，如果sceneData.scene存在，则在场景中加载sceneData.scene
		if (sceneData && sceneData.scene) {
			// 将sceneData.scene传递给父组件HomeView.vue
			emits('update:importedSceneData', sceneData.scene)
		}

		// 设置事件监听
		setupEventListeners()
		// 监听模型添加事件
		setupModelAddListener()
		// 场景初始化完成后，收集设备ID
		collectDeviceIds()
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
			// if (e.params.name !== '机房') return

			const { raycaster, getIntersects } = threeEditor.getRawSceneEvent()
			raycaster.far = 100

			let mesh_group = null
			let timer = null
			// 鼠标悬停相关变量
			let hoverTimer = null
			let currentHoverMesh = null
			let tooltipElement = null

			// 创建浮框元素
			const createTooltip = () => {
				const tooltip = document.createElement('div')
				tooltip.className = 'model-tooltip'
				tooltip.style.cssText = `
					position: absolute;
					background: rgba(0, 0, 0, 0.8);
					color: white;
					padding: 10px 15px;
					border-radius: 4px;
					font-size: 12px;
					line-height: 1.5;
					pointer-events: none;
					z-index: 1000;
					user-select: none;
					min-width: 150px;
					white-space: nowrap;
				`
				return tooltip
			}

			// 显示浮框
			const showTooltip = (mesh, modelName, deviceName, event) => {
				if (!tooltipElement) {
					tooltipElement = createTooltip()
					document.body.appendChild(tooltipElement)
				}

				tooltipElement.innerHTML = `
					<div><strong>模型名称：</strong>${modelName}</div>
					<div><strong>绑定设备：</strong>${deviceName}</div>
				`
				tooltipElement.style.display = 'block'

				// 获取模型在屏幕上的位置
				const position = new THREE.Vector3()
				mesh.getWorldPosition(position)
				position.project(threeEditor.viewer.camera)

				// 转换为屏幕坐标
				const widthHalf = window.innerWidth / 2
				const heightHalf = window.innerHeight / 2
				const screenX = position.x * widthHalf + widthHalf
				const screenY = -(position.y * heightHalf) + heightHalf

				// 定位到模型右上角
				tooltipElement.style.left = `${screenX + 10}px`
				tooltipElement.style.top = `${screenY - 10}px`
			}

			// 隐藏浮框
			const hideTooltip = () => {
				if (tooltipElement) {
					tooltipElement.style.display = 'none'
				}
				if (hoverTimer) {
					clearTimeout(hoverTimer)
					hoverTimer = null
				}
				currentHoverMesh = null
			}

			threeBox.value.addEventListener('mousemove', (e) => {
				if (controlsIsActived) return
				if (timer) return

				timer = setTimeout(() => (timer = null), 20)
				const intersects = getIntersects(e, m.children)
				const i = intersects.find((i) => i.object.text !== 'TransformControls' && i.object.isMesh)

				if (!i) {
					hideTooltip()
					mesh_group?.meshRevertMaterial?.()
					threeEditor.setOutlinePass([])
					return
				}

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

				// 检测鼠标悬停显示设备信息
				if (mesh_group !== currentHoverMesh) {
					// 模型改变，重置悬停计时器
					hideTooltip()
					currentHoverMesh = mesh_group
				}
				// 检查模型是否有设备信息
				let deviceInfo = null
				let deviceName = null
				let modelName = mesh_group.name

				if (m && m.rootInfo && m.rootInfo.name) {
					modelName = m.rootInfo.name
				}
				if (m.deviceInfo && Array.isArray(m.deviceInfo) && m.deviceInfo.length > 0) {
					deviceInfo = m.deviceInfo
					deviceName = m.deviceInfo[0].name
				}
				if (deviceInfo && deviceInfo.length > 0 && !hoverTimer) {
					hoverTimer = setTimeout(() => {
						showTooltip(mesh_group, modelName, deviceName, e)
					}, 500)
				}
			})

			// 鼠标移出时隐藏浮框
			threeBox.value.addEventListener('mouseleave', hideTooltip)

			// 点击时隐藏浮框
			threeBox.value.addEventListener('click', hideTooltip)
			// 模型加载完成后，收集设备ID
			collectDeviceIds()
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

// 监听模型添加事件
const setupModelAddListener = () => {
	// 如果threeEditor有模型添加事件，监听它
	if (threeEditor && threeEditor.onModelAdd) {
		threeEditor.onModelAdd = () => {
			collectDeviceIds()
		}
	}
}

// 收集场景中所有模型的设备ID
const collectDeviceIds = () => {
	const boundDeviceIds = []

	// 1. 从tempStorage.modelList中获取模型
	const modelList = threeEditor.viewer.scene.tempStorage?.modelList
	if (modelList && Array.isArray(modelList)) {
		modelList.forEach((model) => {
			// 收集已绑定的设备ID，使用tid+id组合保证唯一性
			if (model.deviceInfo && Array.isArray(model.deviceInfo)) {
				model.deviceInfo.forEach((device) => {
					if (device.tid && device.id) {
						const uniqueId = `${device.tid}-${device.id}`
						if (!boundDeviceIds.includes(uniqueId)) {
							boundDeviceIds.push(uniqueId)
						}
					}
				})
			}
		})
	}

	// 2. 检查threeEditor中是否有modelParams（可能的存储位置1）

	// 检查threeEditor.viewer.sceneParams.modelParams
	if (threeEditor.viewer.sceneParams && threeEditor.viewer.sceneParams.modelParams) {
		const modelParams = threeEditor.viewer.sceneParams.modelParams
		// console.log('sceneParams.modelParams', modelParams)
		if (Array.isArray(modelParams)) {
			modelParams.forEach((modelParam) => {
				// 检查rootInfo中是否有deviceInfo
				if (modelParam.rootInfo && modelParam.rootInfo.deviceInfo && Array.isArray(modelParam.rootInfo.deviceInfo)) {
					modelParam.rootInfo.deviceInfo.forEach((device) => {
						if (device.tid && device.id) {
							const uniqueId = `${device.tid}-${device.id}`
							if (!boundDeviceIds.includes(uniqueId)) {
								boundDeviceIds.push(uniqueId)
							}
						}
					})
				}
				// 检查group中是否有deviceInfo
				if (modelParam.group && modelParam.group.deviceInfo && Array.isArray(modelParam.group.deviceInfo)) {
					modelParam.group.deviceInfo.forEach((device) => {
						if (device.tid && device.id) {
							const uniqueId = `${device.tid}-${device.id}`
							if (!boundDeviceIds.includes(uniqueId)) {
								boundDeviceIds.push(uniqueId)
							}
						}
					})
				}
			})
		}
	}

	// 3. 检查threeEditor.viewer.modelParams（可能的存储位置2）
	if (threeEditor.viewer.modelParams) {
		const modelParams = threeEditor.viewer.modelParams
		// console.log('viewer.modelParams', modelParams)
		if (Array.isArray(modelParams)) {
			modelParams.forEach((modelParam) => {
				// 检查rootInfo中是否有deviceInfo
				if (modelParam.rootInfo && modelParam.rootInfo.deviceInfo && Array.isArray(modelParam.rootInfo.deviceInfo)) {
					modelParam.rootInfo.deviceInfo.forEach((device) => {
						if (device.tid && device.id) {
							const uniqueId = `${device.tid}-${device.id}`
							if (!boundDeviceIds.includes(uniqueId)) {
								boundDeviceIds.push(uniqueId)
							}
						}
					})
				}
				// 检查group中是否有deviceInfo
				if (modelParam.group && modelParam.group.deviceInfo && Array.isArray(modelParam.group.deviceInfo)) {
					modelParam.group.deviceInfo.forEach((device) => {
						if (device.tid && device.id) {
							const uniqueId = `${device.tid}-${device.id}`
							if (!boundDeviceIds.includes(uniqueId)) {
								boundDeviceIds.push(uniqueId)
							}
						}
					})
				}
			})
		}
	}

	// 4. 检查threeEditor.progressList中是否有模型数据
	if (threeEditor.progressList && Array.isArray(threeEditor.progressList)) {
		// console.log('progressList', threeEditor.progressList)
		threeEditor.progressList.forEach((progressItem) => {
			// 检查progressItem中是否有deviceInfo相关数据
			if (progressItem.params && progressItem.params.deviceInfo && Array.isArray(progressItem.params.deviceInfo)) {
				progressItem.params.deviceInfo.forEach((device) => {
					if (device.tid && device.id) {
						const uniqueId = `${device.tid}-${device.id}`
						if (!boundDeviceIds.includes(uniqueId)) {
							boundDeviceIds.push(uniqueId)
						}
					}
				})
			}
		})
	}

	// 5. 同时遍历场景中的所有模型，确保获取到所有模型
	const traverseModels = (object) => {
		// 检查当前对象是否有deviceInfo
		if (object.deviceInfo && Array.isArray(object.deviceInfo)) {
			object.deviceInfo.forEach((device) => {
				if (device.tid && device.id) {
					const uniqueId = `${device.tid}-${device.id}`
					if (!boundDeviceIds.includes(uniqueId)) {
						boundDeviceIds.push(uniqueId)
					}
				}
			})
		}

		// 检查当前对象的userData中是否有deviceInfo
		if (object.userData && object.userData.deviceInfo && Array.isArray(object.userData.deviceInfo)) {
			object.userData.deviceInfo.forEach((device) => {
				if (device.tid && device.id) {
					const uniqueId = `${device.tid}-${device.id}`
					if (!boundDeviceIds.includes(uniqueId)) {
						boundDeviceIds.push(uniqueId)
					}
				}
			})
		}

		// 递归遍历子物体
		if (object.children && object.children.length > 0) {
			object.children.forEach((child) => {
				traverseModels(child)
			})
		}
	}

	// 从场景根节点开始遍历
	traverseModels(threeEditor.viewer.scene)
	// console.log('boundDeviceIds', boundDeviceIds)
	// 发送设备ID给父组件
	emits('update:boundDeviceIds', boundDeviceIds)
}

// 窗口大小变化处理
const handleResize = () => {
	if (threeEditor) {
		threeEditor.viewer.renderSceneResize()
	}
}

// 组件挂载
onMounted(() => {
	ThreeEditor.dracoPath = './draco/'
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
