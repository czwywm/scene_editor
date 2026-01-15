<template>
	<div v-show="!namePreviewScene" class="layout" @contextmenu.prevent="handleContextMenu" @touchmove.prevent="handleTouchMove" @mousedown="handleMouseDown">
		<!-- 模型加载进度条 -->
		<div v-if="loadingProgress > 0 && loadingProgress < 100" class="loading-progress">
			<el-progress :percentage="loadingProgress" :stroke-width="8" :color="'#409EFF'" />
		</div>
		<div class="header">
			<div class="header-box">
				<div class="header-left">
					<el-select v-model="dataCores.sceneName" class="m-2" placeholder="场景" style="width: 200px">
						<el-option v-for="item in dataCores.options" :key="item.name" :label="item.name" :value="item.name" style="color: rgb(255, 255, 255)">
							<div style="width: 100%; display: flex; justify-content: space-between">
								<span>{{ item.name }}</span>
								<span>
									<el-popconfirm title="确定删除？" @confirm="delScene(item)">
										<template #reference>
											<el-icon style="color: aliceblue">
												<Close />
											</el-icon>
										</template>
									</el-popconfirm>
								</span>
							</div>
						</el-option>
					</el-select>
					<!-- <el-button class="btn-add" link icon="plus" @click="sceneVisible = true">新建场景</el-button>
					<el-button class="btn-add" link icon="Upload" @click="importSceneVisible = true">导入场景</el-button>
					<el-button class="btn-add" link icon="Upload" @click="imgVisible = true">导入图片</el-button> -->
					<el-dialog v-model="sceneVisible" title="命名场景" width="500">
						<el-input v-model="inputSceneName" placeholder="请输入场景名称" />
						<template #footer>
							<div class="dialog-footer">
								<el-button @click="sceneVisible = false">取消</el-button>
								<el-button type="primary" @click="createEditor">确认</el-button>
							</div>
						</template>
					</el-dialog>
					<el-dialog v-model="importSceneVisible" title="导入场景" width="500">
						<el-input v-model="importSceneName" placeholder="请输入导入场景的名称" />
						<el-upload class="upload-demo" drag action="" :http-request="handleImportScene" :before-upload="beforeUploadScene" :show-file-list="true" :limit="1">
							<div class="upload-area">
								<div class="upload-placeholder">
									<el-icon class="el-icon--upload"><upload-filled /></el-icon>
									<div class="el-upload__text">
										将场景JSON文件拖拽到此处或者
										<em>点击上传</em>
									</div>
								</div>
							</div>
							<template #tip>
								<div class="el-upload__tip">支持JSON格式文件，且不超过2MB</div>
							</template>
						</el-upload>
						<template #footer>
							<div class="dialog-footer">
								<el-button @click="importSceneVisible = false">取消</el-button>
								<el-button type="primary" @click="confirmImportScene" :disabled="!importedSceneData">确认导入</el-button>
							</div>
						</template>
					</el-dialog>
					<el-dialog v-model="imgVisible" title="上传图片" width="500">
						<el-upload class="upload-demo" drag :action="DEFAULT_CONFIG.BASE_URL + 'api/common/1.0/uploadFile'" :before-upload="beforeUploadImage" :on-success="handleImageSuccess" :on-remove="handleImageRemove" :limit="1" :show-file-list="true" :data="{ dir: `${DEFAULT_CONFIG.BASE_NAME}/file` }">
							<div class="upload-area">
								<img v-if="imageUrl" :src="DEFAULT_CONFIG.BASE_URL + imageUrl" class="avatar cover-image" />
								<div v-else class="upload-placeholder">
									<el-icon class="el-icon--upload"><upload-filled /></el-icon>
									<div class="el-upload__text">
										将文件拖拽到此处或者
										<em>点击上传</em>
									</div>
								</div>
							</div>
							<template #tip>
								<div class="el-upload__tip">支持 jpg/jpeg/png 格式文件，且不超过 2MB</div>
							</template>
						</el-upload>
						<template #footer>
							<div class="dialog-footer">
								<el-button @click="imgVisible = false">取消</el-button>
								<el-button type="primary" @click="loadImgUrl" :disabled="!imageUrl">确认</el-button>
							</div>
						</template>
					</el-dialog>
					<!-- 绑定设备对话框 -->
					<el-dialog v-model="bindDeviceVisible" title="绑定设备" width="500">
						<el-form label-position="top">
							<el-form-item label="设备类型">
								<el-tree-select v-model="selectedDeviceType" :data="deviceTypes" :props="treeSelectProps" placeholder="请选择设备类型" @change="handleDeviceTypeChange" />
							</el-form-item>
							<el-form-item label="设备">
								<el-select v-model="selectedDevice" placeholder="请选择设备">
									<el-option v-for="device in filteredDevices" :key="device.id" :label="device.name" :value="device.id" :disabled="boundDeviceIds.includes(`${selectedDeviceType}-${device.id}`)" />
								</el-select>
							</el-form-item>
						</el-form>
						<template #footer>
							<div class="dialog-footer">
								<el-button @click="bindDeviceVisible = false">取消</el-button>
								<el-button type="primary" @click="confirmBindDevice">确认绑定</el-button>
							</div>
						</template>
					</el-dialog>
				</div>
				<div class="title">
					<!-- Title content -->
				</div>
				<div class="header-right">
					<el-switch inactive-text="预览" v-model="previewScene" active-color="#a8d4fd" />
					<el-button class="btn-add" link icon="Document" @click="exportTemplateJson">导出</el-button>
					<el-button @click="pict" icon="camera"></el-button>
					<el-button @click="openPanel">控制板</el-button>
					<el-button @click="saveScene">保存</el-button>
				</div>
			</div>
		</div>

		<!-- 旋转缩放快捷键工具栏 -->
		<div class="transform-toolbar" v-if="!previewScene && isObjectSelected">
			<div class="toolbar-content">
				<el-radio-group v-model="transformMode" size="small" @change="onTransformModeChange">
					<el-radio-button label="translate" value="translate" :disabled="!isObjectSelected">
						<el-icon><Position /></el-icon>
						位移
					</el-radio-button>
					<el-radio-button label="rotate" value="rotate" :disabled="!isObjectSelected">
						<el-icon><RefreshRight /></el-icon>
						旋转
					</el-radio-button>
					<el-radio-button label="scale" value="scale" :disabled="!isObjectSelected">
						<el-icon><ZoomIn /></el-icon>
						缩放
					</el-radio-button>
				</el-radio-group>
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

		<Editor @emitThreeEditor="emitThreeEditor" @update:boundDeviceIds="handleUpdateBoundDeviceIds" @update:importedSceneData="handleUpdateImportedSceneData" :dataCores="dataCores" class="editor" />
		<!-- 右键菜单 -->
		<div v-if="showContextMenu" class="context-menu" :style="{ left: contextMenuPosition.x + 'px', top: contextMenuPosition.y + 'px' }">
			<div class="context-menu-item" @click="handleContextMenuSelect">选中</div>
			<div class="context-menu-item" @click="handleContextMenuBindDevice">绑定设备</div>
			<div class="context-menu-item" @click="handleContextMenuDelete">删除</div>
		</div>
	</div>
</template>

<script setup>
import { ref, watch, reactive, computed, provide, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as THREE from 'three'
import axios from 'axios'
import Editor from './ThreeEditor.vue'
import LeftPanel from './Left.vue'
import RightPanel from './Right.vue'

const DEFAULT_CONFIG = window.DEFAULT_CONFIG || {}
const route = useRoute()
const previewScene = ref(false)
const leftCollapsed = ref(false)
const rightCollapsed = ref(false)
const imgVisible = ref(false)
const imageUrl = ref(null)
const sceneVisible = ref(false)
const importSceneVisible = ref(false)
const importSceneName = ref('')
const importedSceneData = ref(null)
const inputSceneName = ref('')
const isRightMouseDown = ref(false)
const loadingProgress = ref(0)
let namePreviewScene = false

// 旋转缩放快捷键相关状态
const transformMode = ref('translate')
const isObjectSelected = ref(false)

// 右键菜单相关状态
const showContextMenu = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
let lastRightClickEvent = null

// 绑定设备相关状态
const bindDeviceVisible = ref(false)
const deviceTypes = ref([])
const devices = ref([])
const selectedDeviceType = ref('')
const selectedDevice = ref(null)
const treeSelectProps = {
	label: 'label',
	value: 'value',
	children: 'children',
}
// 已绑定的设备ID数组，用于防止重复绑定
const boundDeviceIds = ref([])
const filteredDevices = computed(() => {
	if (!selectedDeviceType.value) return []
	// 返回所有设备，不进行过滤
	return devices.value
})

// 接收从ThreeEditor组件传递过来的设备ID
const handleUpdateBoundDeviceIds = (deviceIds) => {
	boundDeviceIds.value = deviceIds
}

// 直接在当前场景中生成从ThreeEditor组件传递过来的importedSceneData
const generateInCurrentScene = (sceneData) => {
	try {
		const processedSceneData = JSON.parse(JSON.stringify(sceneData))
		if (processedSceneData.models && Array.isArray(processedSceneData.models)) {
			processedSceneData.modelParams = processedSceneData.models.map((model) => {
				const group = {
					name: model.name,
					visible: model.visible,
					renderOrder: 0,
					castShadow: model.castShadow || false,
					receiveShadow: model.receiveShadow || false,
					position: model.position,
					rotation: model.rotation,
					scale: model.scale,
					transformAnimationList: null,
					isSsr: false,
					globalConfig: {
						useGlobalConfig: false,
						isSaveChildren: true,
						isSaveMaterials: true,
						mesh: {
							castShadow: model.castShadow || false,
							receiveShadow: model.receiveShadow || false,
						},
						material: {
							envMap: false,
							envMapIntensity: 1,
							reflectivity: 0.98,
							isGlobalMap: true,
						},
						geometry: {},
					},
					animationPlayParams: null,
				}
				// 获取drawingPoints（支持顶层或userData中的属性）
				let drawingPoints = model.drawingPoints
				if (!drawingPoints && model.userData && model.userData.drawingPoints) {
					drawingPoints = model.userData.drawingPoints
				}
				// 获取modelType（支持顶层或userData中的属性）
				let modelType = model.modelType
				if (!modelType && model.userData && model.userData.modelType) {
					modelType = model.userData.modelType
				}
				const rootInfo = {
					id: model.id,
					name: model.name,
					type: 'custom', // 为自定义几何体设置一个类型标识
					geometryType: model.geometryType || 'Polygon',
					isRoom: model.isRoom,
					geometry: model.geometry, // 包含几何体数据
					material: model.material,
					userData: model.userData,
					drawingPoints: drawingPoints, // 添加drawingPoints
					modelType: modelType, // 添加modelType
					// 为了兼容loadModel函数的参数要求，添加必要的字段
					url: '', // 自定义几何体不需要URL
					point: model.position || { x: 0, y: 0, z: 0 }, // 位置信息
					scale: model.scale, // 缩放信息
					rotation: model.rotation, // 旋转信息
				}

				return { group, rootInfo }
			})
		}

		// 生成并渲染场景
		if (window.threeEditor) {
			// 保存drawtime参数到当前场景，以便后续对比
			const drawtimeToSave = processedSceneData.drawtime
			if (window.threeEditor.viewer.scene) {
				window.threeEditor.viewer.scene.drawtime = drawtimeToSave
			}
			if (window.threeEditor.viewer.sceneParams) {
				window.threeEditor.viewer.sceneParams.drawtime = drawtimeToSave
			} else {
				window.threeEditor.viewer.sceneParams = { drawtime: drawtimeToSave }
			}

			// 将drawtime持久化存储到localStorage中，以便刷新页面后仍然可以获取到
			const sceneKey = dataCores.sceneName + '-drawtime'
			localStorage.setItem(sceneKey, JSON.stringify(drawtimeToSave))

			// 加载场景参数
			if (processedSceneData.scene) {
				if (processedSceneData.scene.backgroundUrls) {
					window.threeEditor.setSky(processedSceneData.scene.backgroundUrls)
				}
				if (processedSceneData.scene.envBackgroundUrls) {
					window.threeEditor.setGlobalEnvBackground(processedSceneData.scene.envBackgroundUrls)
				}
			}

			// // 加载模型到当前场景
			if (processedSceneData.modelParams && Array.isArray(processedSceneData.modelParams)) {
				processedSceneData.modelParams.forEach((modelParam) => {
					window.threeEditor.setModelFromInfo(modelParam.rootInfo)
				})
			}

			ElMessage.success('场景数据已成功加载到当前场景')
		} else {
			ElMessage.error('ThreeEditor实例未准备好')
		}
	} catch (error) {
		console.error('直接生成场景失败:', error)
		ElMessage.error('直接生成场景失败: ' + error.message)
	}
}

// 接收从ThreeEditor组件传递过来的importedSceneData
const handleUpdateImportedSceneData = (sceneData) => {
	importedSceneData.value = sceneData
	// 1. 确认importedSceneData.value是否有值
	if (importedSceneData.value) {
		const newDrawtime = importedSceneData.value.drawtime
		// 2. 检查现有场景的drawtime参数
		let currentDrawtime = null
		if (window.threeEditor && window.threeEditor.viewer) {
			if (window.threeEditor.viewer.scene && window.threeEditor.viewer.scene.drawtime) {
				currentDrawtime = window.threeEditor.viewer.scene.drawtime
			} else if (window.threeEditor.viewer.sceneParams && window.threeEditor.viewer.sceneParams.drawtime) {
				currentDrawtime = window.threeEditor.viewer.sceneParams.drawtime
			}
		}
		// 如果从threeEditor实例中没有获取到drawtime，尝试从localStorage中获取
		if (!currentDrawtime) {
			const sceneKey = dataCores.sceneName + '-drawtime'
			const savedDrawtime = localStorage.getItem(sceneKey)
			if (savedDrawtime) {
				currentDrawtime = JSON.parse(savedDrawtime)
				// 将从localStorage获取的drawtime保存到threeEditor实例中，以便后续使用
				if (window.threeEditor && window.threeEditor.viewer) {
					if (window.threeEditor.viewer.scene) {
						window.threeEditor.viewer.scene.drawtime = currentDrawtime
					}
					if (window.threeEditor.viewer.sceneParams) {
						window.threeEditor.viewer.sceneParams.drawtime = currentDrawtime
					} else {
						window.threeEditor.viewer.sceneParams = { drawtime: currentDrawtime }
					}
				}
			}
		}
		// 3. 对比drawtime参数
		if (newDrawtime && currentDrawtime && newDrawtime === currentDrawtime) {
			console.log('drawtime一致，不重新生成场景')
			return // 一致则不调用generateInCurrentScene
		}
		// 4. drawtime不一致，删除所有modelParams里rootInfo中isRoom参数为true的模型
		if (window.threeEditor && window.threeEditor.viewer) {
			let modelParams = null
			// if (window.threeEditor.viewer.modelParams) {
			// 	modelParams = window.threeEditor.viewer.modelParams
			// } else if (window.threeEditor.viewer.sceneParams && window.threeEditor.viewer.sceneParams.modelParams) {
			// 	modelParams = window.threeEditor.viewer.sceneParams.modelParams
			// }
			if (window.threeEditor && window.threeEditor.progressList) {
				modelParams = window.threeEditor.progressList
			}
			// 如果找到modelParams，遍历并删除isRoom为true的模型
			if (modelParams && Array.isArray(modelParams)) {
				modelParams.forEach((modelParam, index) => {
					if (modelParam.rootInfo && modelParam.rootInfo.isRoom === true) {
						// 调用删除模型的方法，如果存在的话
						if (window.threeEditor && window.threeEditor.removeModel) {
							window.threeEditor.removeModel(modelParam)
						} else {
							// 或者从modelParams数组中移除
							modelParams.splice(index, 1)
						}
					}
				})
			}
			// 另外，直接从场景中删除isRoom为true的模型
			if (window.threeEditor.viewer.scene && window.threeEditor.viewer.scene.children) {
				// 从后向前遍历，避免删除元素后索引错乱
				for (let i = window.threeEditor.viewer.scene.children.length - 1; i >= 0; i--) {
					const child = window.threeEditor.viewer.scene.children[i]
					// 检查模型的rootInfo或直接检查isRoom属性
					if ((child.rootInfo && child.rootInfo.isRoom === true) || child.isRoom === true) {
						window.threeEditor.viewer.scene.remove(child)
					}
				}
			}
		}

		// 调用generateInCurrentScene生成新场景
		generateInCurrentScene(importedSceneData.value)
	}
}

// 从API获取设备类型
const fetchDeviceTypes = async () => {
	try {
		const response = await axios.post(`${DEFAULT_CONFIG.API_URL}/api/Model/GetModelType`, {
			token: route.query.token,
			pagenum: 1,
			pagesize: 100,
		})
		if (response.data && response.data.resultCode === '0000') {
			const data = response.data.data.list || []
			const typeList = Array.isArray(data) ? data : []
			deviceTypes.value = typeList.map((type) => ({
				label: type.typename,
				value: type.tid,
				children: type.children || [],
			}))
		} else {
			console.error('获取设备类型失败，resultCode:', response.data?.resultCode)
			console.error('错误信息:', response.data?.resultMsg || response.data?.note)
			deviceTypes.value = []
		}
	} catch (error) {
		console.error('获取设备类型失败:', error)
		ElMessage.error('获取设备类型失败')
		deviceTypes.value = []
	}
}

// 从API获取设备
const fetchDevices = async (tid) => {
	try {
		const response = await axios.post(`${DEFAULT_CONFIG.API_URL}/api/Model/GetModelByModelType`, {
			token: route.query.token,
			tid,
		})
		if (response.data && response.data.resultCode === '0000') {
			const data = response.data.data || []
			const deviceList = Array.isArray(data) ? data : []
			devices.value = deviceList || []
		} else {
			console.error('获取设备失败，resultCode:', response.data?.resultCode)
			console.error('错误信息:', response.data?.resultMsg || response.data?.note)
			devices.value = []
		}
	} catch (error) {
		console.error('获取设备失败:', error)
		ElMessage.error('获取设备失败')
		devices.value = []
	}
}

// 提供加载进度状态给子组件
provide('loadingProgress', loadingProgress)
const dataCores = reactive({
	sceneName: route.query.scenename || localStorage.getItem('new_sceneName') || '三维测试',
	options: JSON.parse(localStorage.getItem('new_sceneList')) || [],
})

const emitThreeEditor = (threeEditor) => {
	window.threeEditor = threeEditor

	// 在ThreeEditor实例初始化完成后，从localStorage中恢复drawtime
	// 使用当前场景名称作为key的一部分，确保不同场景的drawtime独立存储
	const sceneKey = dataCores.sceneName + '-drawtime'
	const savedDrawtime = localStorage.getItem(sceneKey)
	if (savedDrawtime) {
		const drawtime = JSON.parse(savedDrawtime)
		// 将drawtime保存到scene对象中
		if (window.threeEditor.viewer.scene) {
			window.threeEditor.viewer.scene.drawtime = drawtime
		}
		// 同时保存到sceneParams对象中，作为备份
		if (window.threeEditor.viewer.sceneParams) {
			window.threeEditor.viewer.sceneParams.drawtime = drawtime
		} else {
			// 如果sceneParams不存在，创建一个并保存drawtime
			window.threeEditor.viewer.sceneParams = { drawtime: drawtime }
		}
		console.log('从localStorage恢复drawtime:', drawtime)
	}
}

watch(previewScene, (val) => {
	leftCollapsed.value = val
	rightCollapsed.value = val
})

if (route.query.sceneName) {
	namePreviewScene = true
}

const loadImgUrl = () => {
	if (!imageUrl.value) {
		ElMessage.warning('请先上传图片')
		return
	}

	const fullImageUrl = window.DEFAULT_CONFIG.BASE_URL + imageUrl.value

	createImagePlane(fullImageUrl)
	imgVisible.value = false
}

const createImagePlane = (imageUrl) => {
	if (!window.threeEditor) {
		ElMessage.error('编辑器未初始化')
		return
	}

	const { viewer } = window.threeEditor
	const textureLoader = new THREE.TextureLoader()

	textureLoader.load(
		imageUrl,
		(texture) => {
			// const aspectRatio = texture.width / texture.height
			// const width = 10
			// const height = width / aspectRatio

			const geometry = new THREE.PlaneGeometry(texture.width, texture.height)
			const material = new THREE.MeshBasicMaterial({
				map: texture,
				side: THREE.DoubleSide,
			})

			const plane = new THREE.Mesh(geometry, material)
			plane.rotation.x = -Math.PI / 2
			plane.name = 'uploaded_image_' + Date.now()
			viewer.scene.add(plane)

			ElMessage.success('图片加载成功')
		},
		undefined,
		(error) => {
			console.error('图片加载失败:', error)
			ElMessage.error('图片加载失败: ' + error.message)
		},
	)
}

// 图片上传处理函数
const beforeUploadImage = (rawFile) => {
	if (rawFile.type !== 'image/jpeg' && rawFile.type !== 'image/png' && rawFile.type !== 'image/jpg') {
		ElMessage.error('请上传JPG/JPEG/PNG格式的文件!')
		return false
	} else if (rawFile.size / 1024 / 1024 > 2) {
		ElMessage.error('文件大小不能超过2MB!')
		return false
	}
	return true
}

const handleImageSuccess = (response, uploadFile) => {
	imageUrl.value = response.url || uploadFile.response?.url
	ElMessage.success('图片上传成功')
}

const handleImageRemove = () => {
	imageUrl.value = null
}

// 场景数据验证函数：验证scene.json格式的数据是否符合要求
const validateSceneJsonData = (sceneData) => {
	try {
		if (!sceneData || typeof sceneData !== 'object') {
			throw new Error('场景数据必须是一个对象')
		}

		// 如果是模型数组，验证每个模型
		if (Array.isArray(sceneData)) {
			sceneData.forEach((model, index) => {
				validateModel(model, index + 1)
			})
		}
		// 如果是完整的scene.json格式，验证models数组
		else if (sceneData.models && Array.isArray(sceneData.models)) {
			sceneData.models.forEach((model, index) => {
				validateModel(model, index + 1)
			})
		}
		// 如果是单个模型对象，直接验证
		// 支持顶层属性或userData中的属性
		else if ((sceneData.drawingPoints && sceneData.modelType) || (sceneData.userData && sceneData.userData.drawingPoints && sceneData.userData.modelType)) {
			validateModel(sceneData, 1)
		} else {
			throw new Error('场景数据必须是模型数组、包含models数组的对象或单个模型对象')
		}

		return true
	} catch (error) {
		console.error('场景数据验证失败:', error)
		ElMessage.error('场景数据验证失败: ' + error.message)
		throw error
	}
}

// 验证单个模型
const validateModel = (model, index) => {
	if (!model) {
		throw new Error(`模型${index}不能为空`)
	}

	// 验证drawingPoints - 支持顶层或userData内部
	let drawingPoints = model.drawingPoints
	// 如果顶层没有drawingPoints，尝试从userData中获取
	if (!drawingPoints && model.userData && model.userData.drawingPoints) {
		drawingPoints = model.userData.drawingPoints
	}

	if (!drawingPoints || !Array.isArray(drawingPoints) || drawingPoints.length < 1) {
		throw new Error(`模型${index}缺少有效的drawingPoints`)
	}

	// 验证每个点的坐标
	drawingPoints.forEach((point, pointIndex) => {
		if (!point || typeof point.x !== 'number' || typeof point.y !== 'number' || typeof point.z !== 'number') {
			throw new Error(`模型${index}的第${pointIndex + 1}个点坐标无效`)
		}
	})

	// 验证modelType - 支持顶层或userData内部
	let modelType = model.modelType
	// 如果顶层没有modelType，尝试从userData中获取
	if (!modelType && model.userData && model.userData.modelType) {
		modelType = model.userData.modelType
	}

	// 只验证modelType存在即可，不限制具体取值
	// 当modelType不是ground也不是wall时，按立方体绘制
	if (!modelType) {
		throw new Error(`模型${index}必须指定有效的modelType`)
	}

	// 为wall类型确保wallParams存在
	if (modelType === 'wall' && model.userData) {
		model.userData.wallParams = model.userData.wallParams || {
			thickness: 0.2,
			height: 2.5,
		}
	}
}

// 场景导入处理函数
const beforeUploadScene = (rawFile) => {
	if (rawFile.type !== 'application/json' && !rawFile.name.endsWith('.json')) {
		ElMessage.error('请上传JSON格式的文件!')
		return false
	} else if (rawFile.size / 1024 / 1024 > 2) {
		ElMessage.error('文件大小不能超过2MB!')
		return false
	}
	return true
}

const handleImportScene = (file) => {
	const reader = new FileReader()
	reader.onload = (e) => {
		try {
			const sceneData = JSON.parse(e.target.result)
			importedSceneData.value = sceneData
			ElMessage.success('场景文件读取成功')
		} catch (error) {
			ElMessage.error('场景文件解析失败: ' + error.message)
			importedSceneData.value = null
		}
	}
	reader.readAsText(file.file)
}

// 点击事件处理函数，dataset参数可选：如果提供数据集（scene.json格式的数据），则使用数据集生成场景；否则使用导入的scene.json文件
// 注意：在模板中调用时，Vue会自动传递事件对象，所以我们需要检查第一个参数是否是事件对象
const confirmImportScene = (eventOrDataset = null) => {
	// 检查第一个参数是否是事件对象
	let dataset = eventOrDataset
	// 如果是事件对象，则忽略它
	if (dataset && dataset instanceof Event) {
		dataset = null
	}
	let sourceData = null
	let isUsingDataset = false

	// 如果提供了数据集（scene.json格式的数据），使用数据集作为数据源
	if (dataset) {
		try {
			// 直接使用传入的scene.json格式数据
			// 如果数据集是数组，说明是模型数组，需要包装成完整的scene.json格式
			if (Array.isArray(dataset)) {
				sourceData = {
					models: dataset,
				}
			}
			// 如果数据集是单个模型对象（包含drawingPoints和modelType，支持顶层或userData中的属性），包装成models数组
			else if ((dataset.drawingPoints && dataset.modelType) || (dataset.userData && dataset.userData.drawingPoints && dataset.userData.modelType)) {
				sourceData = {
					models: [dataset],
				}
			}
			// 否则认为是完整的scene.json格式
			else {
				sourceData = dataset
			}

			// 验证场景数据格式
			validateSceneJsonData(sourceData)
			isUsingDataset = true
		} catch (error) {
			ElMessage.error('数据集处理失败: ' + error.message)
			return
		}
	} else {
		// 否则使用原来的文件导入数据
		if (!importedSceneData.value) {
			ElMessage.error('请先选择有效的场景文件或提供数据集')
			return
		}

		// 处理上传的文件数据
		const fileData = importedSceneData.value

		// 如果是单个模型对象（包含drawingPoints和modelType，支持顶层或userData中的属性），包装成models数组
		if ((fileData.drawingPoints && fileData.modelType) || (fileData.userData && fileData.userData.drawingPoints && fileData.userData.modelType)) {
			sourceData = {
				models: [fileData],
			}
		} else {
			sourceData = fileData
		}

		// 验证场景数据格式
		validateSceneJsonData(sourceData)
	}

	if (!importSceneName.value.trim()) {
		ElMessage.error('请输入场景名称')
		return
	}

	if (dataCores.options.some((item) => item.name === importSceneName.value)) {
		ElMessage.error('场景名称已存在')
		return
	}

	try {
		// 转换数据为系统可识别的格式
		const sceneData = JSON.parse(JSON.stringify(sourceData))

		// 如果有models字段，将其转换为modelParams格式
		if (sceneData.models && Array.isArray(sceneData.models)) {
			// 创建modelParams数组
			sceneData.modelParams = sceneData.models.map((model) => {
				// 映射模型变换参数到group
				const group = {
					name: model.name,
					visible: model.visible,
					renderOrder: 0,
					castShadow: model.castShadow || false,
					receiveShadow: model.receiveShadow || false,
					position: model.position,
					rotation: model.rotation,
					scale: model.scale,
					transformAnimationList: null,
					isSsr: false,
					globalConfig: {
						useGlobalConfig: false,
						isSaveChildren: true,
						isSaveMaterials: true,
						mesh: {
							castShadow: model.castShadow || false,
							receiveShadow: model.receiveShadow || false,
						},
						material: {
							envMap: false,
							envMapIntensity: 1,
							reflectivity: 0.98,
							isGlobalMap: true,
						},
						geometry: {},
					},
					animationPlayParams: null,
				}

				// 映射模型元数据到rootInfo
				// 获取drawingPoints（支持顶层或userData中的属性）
				let drawingPoints = model.drawingPoints
				if (!drawingPoints && model.userData && model.userData.drawingPoints) {
					drawingPoints = model.userData.drawingPoints
				}

				// 获取modelType（支持顶层或userData中的属性）
				let modelType = model.modelType
				if (!modelType && model.userData && model.userData.modelType) {
					modelType = model.userData.modelType
				}

				const rootInfo = {
					id: model.id,
					name: model.name,
					type: 'custom', // 为自定义几何体设置一个类型标识
					geometryType: model.geometryType,
					geometry: model.geometry, // 包含几何体数据
					material: model.material,
					userData: model.userData,
					drawingPoints: drawingPoints, // 添加drawingPoints
					modelType: modelType, // 添加modelType
					// 为了兼容loadModel函数的参数要求，添加必要的字段
					url: '', // 自定义几何体不需要URL
					point: model.position || { x: 0, y: 0, z: 0 }, // 位置信息
					scale: model.scale, // 缩放信息
					rotation: model.rotation, // 旋转信息
				}

				return { group, rootInfo }
			})
		}

		// 将转换后的场景数据保存到localStorage
		localStorage.setItem(importSceneName.value + '-newEditor', JSON.stringify(sceneData))
		// 添加到场景列表
		dataCores.options.push({ name: importSceneName.value })
		// 保存场景列表到localStorage
		saveLocal()

		// 生成并渲染场景
		if (window.threeEditor) {
			// 清空现有场景
			while (window.threeEditor.viewer.scene.children.length > 0) {
				const child = window.threeEditor.viewer.scene.children[0]
				window.threeEditor.viewer.scene.remove(child)
			}

			// 重新加载场景参数
			if (sceneData.scene) {
				// 设置场景背景
				if (sceneData.scene.backgroundUrls) {
					window.threeEditor.setSky(sceneData.scene.backgroundUrls)
				}

				// 设置环境贴图
				if (sceneData.scene.envBackgroundUrls) {
					window.threeEditor.setGlobalEnvBackground(sceneData.scene.envBackgroundUrls)
				}
			}
			// 重新加载模型
			if (sceneData.modelParams && Array.isArray(sceneData.modelParams)) {
				// 清空已绑定设备ID数组
				boundDeviceIds.value = []
				sceneData.modelParams.forEach((modelParam) => {
					window.threeEditor.setModelFromInfo(modelParam.rootInfo)
				})
			}
		}

		ElMessage.success('场景导入成功: ' + importSceneName.value)
		// 关闭对话框
		importSceneVisible.value = false
		// 清空导入数据
		importedSceneData.value = null
		importSceneName.value = ''
	} catch (error) {
		ElMessage.error('场景导入失败: ' + error.message)
	}
}

const openPanel = () => {
	window.threeEditor.openControlPanel()
}

const exportTemplateJson = () => {
	if (!window.threeEditor) return ElMessage.error('没有可导出的场景')
	try {
		const sceneData = window.threeEditor.saveSceneEditor()
		const jsonString = JSON.stringify(sceneData, null, 2)
		const blob = new Blob([jsonString], { type: 'application/json' })
		const link = document.createElement('a')
		link.href = URL.createObjectURL(blob)
		link.download = (dataCores.sceneName || '场景') + '.json'
		link.click()
		setTimeout(() => URL.revokeObjectURL(link.href), 100)
		ElMessage.success('场景导出成功')
	} catch (error) {
		ElMessage.error('导出场景失败: ' + error.message)
	}
}

const pict = () => {
	if (!window.threeEditor) return ElMessage.error('没有可下载的场景')
	try {
		const base64 = window.threeEditor.getSceneEditorImage(['image/png', '0.8'])
		const link = document.createElement('a')
		link.href = base64
		link.download = (dataCores.sceneName || '场景') + '.png'
		link.click()
		ElMessage.success('下载成功')
	} catch (error) {
		ElMessage.error('下载场景失败: ' + error.message)
	}
}

// 保存场景
const saveScene = async () => {
	if (!window.threeEditor) return ElMessage.error('没有可保存的场景')
	try {
		// 获取场景内容
		const sceneContent = window.threeEditor.saveSceneEditor()

		// 保存到本地存储
		if (dataCores.options?.find((item) => item.name === dataCores.sceneName)) {
			localStorage.setItem(dataCores.sceneName + '-newEditor', JSON.stringify(sceneContent))
		}

		// 获取base64图片数据
		const base64 = window.threeEditor.getSceneEditorImage(['image/png', '1'])

		// 上传图片到服务器
		const uploadResponse = await axios.post(`${DEFAULT_CONFIG.API_URL}/api/Common/UploadBase64Pic`, {
			token: route.query.token,
			base64: base64.split(',')[1],
			dir: `${DEFAULT_CONFIG.BASE_NAME || ''}/scene`,
		})

		if (uploadResponse.data.resultCode !== '0000') {
			return ElMessage.error('图片上传失败: ' + uploadResponse.data.note)
		}

		const sceneUrl = uploadResponse.data.data

		// 保存场景信息到服务器
		const saveResponse = await axios.post(`${DEFAULT_CONFIG.API_URL}/api/Scene/SetScene`, {
			token: route.query.token,
			sid: route.query.sid,
			sceneContent: JSON.stringify(sceneContent),
			sceneUrl: DEFAULT_CONFIG.API_URL + sceneUrl,
			roomContent: '',
			roomUrl: '',
			networkLink: '',
		})

		if (saveResponse.data.resultCode !== '0000') {
			return ElMessage.error('场景保存失败: ' + saveResponse.data.resultMsg)
		}

		ElMessage.success('场景保存成功')
		saveLocal()
	} catch (error) {
		console.error('场景保存失败:', error)
		return ElMessage.error(error.message || '场景保存失败')
	}
}

const createEditor = () => {
	if (dataCores.options.some((item) => item.name === inputSceneName.value)) return ElMessage.error('场景名称已存在')
	dataCores.options.push({ name: inputSceneName.value })
	dataCores.sceneName = inputSceneName.value
	ElMessage.success(dataCores.sceneName + '添加成功')
	saveLocal()
	sceneVisible.value = false
}

const saveLocal = () => {
	localStorage.setItem('new_sceneList', JSON.stringify(dataCores.options))
	localStorage.setItem('new_sceneName', dataCores.sceneName)
}

const delScene = (item) => {
	const index = dataCores.options.findIndex((i) => i.name === item.name)
	if (index > -1) {
		dataCores.options.splice(index, 1)
		localStorage.removeItem(item.name + '-newEditor')
		saveLocal()
		if (dataCores.sceneName === item.name) dataCores.sceneName = dataCores.options[0]?.name || '三维测试'
	}
}

const handleContextMenu = (event) => {
	event.preventDefault()
	// 保存右键点击事件
	lastRightClickEvent = event
	// 显示右键菜单
	showContextMenu.value = true
	// 设置右键菜单位置
	contextMenuPosition.value = {
		x: event.clientX,
		y: event.clientY,
	}
}

// 点击其他区域关闭右键菜单
const closeContextMenu = () => {
	showContextMenu.value = false
}

// 在组件挂载时添加点击事件监听器
onMounted(() => {
	document.addEventListener('click', closeContextMenu)
})

// 在组件卸载时移除点击事件监听器
onUnmounted(() => {
	document.removeEventListener('click', closeContextMenu)
})

// 处理右键菜单中的"选中"选项
const handleContextMenuSelect = () => {
	// 关闭右键菜单
	showContextMenu.value = false
	// 如果有保存的右键点击事件，调用getSceneEvent方法
	if (lastRightClickEvent && window.threeEditor) {
		window.threeEditor.getSceneEvent(lastRightClickEvent)
	}
}

// 处理右键菜单中的"绑定设备"选项
const handleContextMenuBindDevice = async () => {
	// 关闭右键菜单
	showContextMenu.value = false
	// 如果threeEditor不存在，直接返回
	if (!window.threeEditor) return

	const { viewer } = window.threeEditor
	const { handler } = viewer

	// 如果没有当前信息，尝试先获取点击信息
	if (!handler.currentInfo && lastRightClickEvent) {
		window.threeEditor.getSceneEvent(lastRightClickEvent)
	}

	// 重置选择
	selectedDeviceType.value = ''
	selectedDevice.value = null
	// 获取设备类型
	await fetchDeviceTypes()
	// 打开绑定设备对话框
	bindDeviceVisible.value = true
}

// 处理设备类型变化
const handleDeviceTypeChange = async () => {
	// 重置设备选择
	selectedDevice.value = null
	// 获取对应类型的设备
	if (selectedDeviceType.value) {
		await fetchDevices(selectedDeviceType.value)
	} else {
		devices.value = []
	}
}

// 确认绑定设备
const confirmBindDevice = () => {
	// 关闭对话框
	bindDeviceVisible.value = false
	// 如果没有选择设备，直接返回
	if (!selectedDevice.value || !window.threeEditor) return

	const { viewer } = window.threeEditor
	const { handler } = viewer
	const { currentModel, currentRootModel } = handler.currentInfo || {}

	// 获取当前选中的模型
	let targetModel = null
	if (handler.mode === '选择') {
		targetModel = currentModel
	} else if (handler.mode === '根选择') {
		targetModel = currentRootModel
	} else if (handler.mode === '变换') {
		targetModel = handler.isTransformChildren ? currentModel : currentRootModel
	}

	if (!targetModel) return

	// 获取根模型
	let rootModel = targetModel
	while (rootModel.parent && !rootModel.rootInfo && rootModel.parent !== viewer.scene) {
		rootModel = rootModel.parent
	}

	// 查找当前选择的设备类型信息
	const getDeviceTypeInfo = (deviceTypes, tid) => {
		for (const type of deviceTypes) {
			if (type.value === tid) {
				return type
			}
			if (type.children && type.children.length > 0) {
				const found = getDeviceTypeInfo(type.children, tid)
				if (found) {
					return found
				}
			}
		}
		return null
	}
	const deviceTypeInfo = getDeviceTypeInfo(deviceTypes.value, selectedDeviceType.value)

	// 保存设备信息到模型数据中，包含设备类型信息
	if (!rootModel.deviceInfo) {
		rootModel.deviceInfo = []
	}

	// 构建完整的设备信息
	const deviceInfo = {
		id: selectedDevice.value,
		name: devices.value.map((e) => {
			if (e.id === selectedDevice.value) return e.name
		})[0],
		tid: selectedDeviceType.value,
		typename: deviceTypeInfo ? deviceTypeInfo.label : '',
	}

	// 检查是否已绑定相同设备
	const existingIndex = rootModel.deviceInfo.findIndex((device) => device.id === selectedDevice.value)
	// 如果已存在相同ID的设备，先从boundDeviceIds中移除旧的设备
	if (existingIndex >= 0) {
		const oldDevice = rootModel.deviceInfo[existingIndex]
		const oldUniqueId = `${oldDevice.tid}-${oldDevice.id}`
		const oldIndex = boundDeviceIds.value.indexOf(oldUniqueId)
		if (oldIndex > -1) {
			boundDeviceIds.value.splice(oldIndex, 1)
		}
		// 更新已有的设备信息
		rootModel.deviceInfo[existingIndex] = deviceInfo
	} else {
		// 添加新的设备信息
		rootModel.deviceInfo.push(deviceInfo)
	}

	// 保存设备信息到group中，以便后续导出
	if (rootModel.group) {
		rootModel.group.deviceInfo = rootModel.deviceInfo
	}

	// 更新已绑定设备ID数组，使用tid+id组合保证唯一性
	const uniqueId = `${selectedDeviceType.value}-${selectedDevice.value}`
	if (!boundDeviceIds.value.includes(uniqueId)) {
		boundDeviceIds.value.push(uniqueId)
	}

	ElMessage.success('设备绑定成功')
}

// 处理右键菜单中的"删除"选项
const handleContextMenuDelete = () => {
	// 关闭右键菜单
	showContextMenu.value = false
	// 如果threeEditor不存在，直接返回
	if (!window.threeEditor) return

	const { viewer } = window.threeEditor
	const { handler, transformControls, modelControls } = viewer

	// 如果没有当前信息，尝试先获取点击信息
	if (!handler.currentInfo && lastRightClickEvent) {
		window.threeEditor.getSceneEvent(lastRightClickEvent)
	}

	const { currentModel, currentRootModel } = handler.currentInfo || {}

	// 如果没有选中的模型，直接返回
	if (!currentModel && !currentRootModel) return

	// 根据当前模式执行删除操作
	switch (handler.mode) {
		case '选择':
			if (currentModel) {
				// 如果是模型组的子物体，查找根模型
				let rootModel = currentModel
				while (rootModel.parent && !rootModel.rootInfo && rootModel.parent !== viewer.scene) {
					rootModel = rootModel.parent
				}

				// 如果找到根模型且有rootInfo，则处理GUI面板和数据列表
				if (rootModel && rootModel.rootInfo) {
					// 从已绑定设备ID数组中移除当前模型绑定的所有设备ID
					if (rootModel.deviceInfo && rootModel.deviceInfo.length > 0) {
						rootModel.deviceInfo.forEach((device) => {
							if (device.tid && device.id) {
								const uniqueId = `${device.tid}-${device.id}`
								const deviceIndex = boundDeviceIds.value.indexOf(uniqueId)
								if (deviceIndex > -1) {
									boundDeviceIds.value.splice(deviceIndex, 1)
								}
							}
						})
					}
					// 从tempStorage.modelList中移除
					const modelList = viewer.scene.tempStorage?.modelList
					if (modelList) {
						const index = modelList.findIndex((m) => m === rootModel)
						if (index > -1) modelList.splice(index, 1)
					}

					// 移除对应的GUI面板
					if (modelControls?.rootFolder) {
						// 遍历所有文件夹，查找匹配的模型
						for (const folderKey in modelControls.rootFolder.__folders) {
							const folder = modelControls.rootFolder.__folders[folderKey]
							// 检查文件夹是否与当前模型关联
							if (folderKey.endsWith(rootModel.id)) {
								// 尝试多种方式移除文件夹
								try {
									// 方式1: 通过parent.removeFolder移除
									if (folder.parent && folder.parent.removeFolder) {
										folder.parent.removeFolder(folder)
									}
									// 方式2: 直接删除对象
									if (modelControls.rootFolder.__folders[folderKey]) {
										delete modelControls.rootFolder.__folders[folderKey]
									}
								} catch (e) {
									console.error('删除GUI文件夹失败:', e)
								}
								break
							}
						}
					}
				}

				currentModel.visible = false
			}
			break
		case '根选择':
			if (currentRootModel) {
				// 从tempStorage.modelList中移除
				const modelList = viewer.scene.tempStorage?.modelList
				if (modelList) {
					const index = modelList.findIndex((m) => m === currentRootModel)
					if (index > -1) modelList.splice(index, 1)
				}

				// 移除对应的GUI面板
				if (modelControls?.rootFolder) {
					// 遍历所有文件夹，查找匹配的模型
					for (const folderKey in modelControls.rootFolder.__folders) {
						const folder = modelControls.rootFolder.__folders[folderKey]
						// 检查文件夹是否与当前模型关联
						if (folderKey.endsWith(currentRootModel.id)) {
							// 尝试多种方式移除文件夹
							try {
								// 方式1: 通过parent.removeFolder移除
								if (folder.parent && folder.parent.removeFolder) {
									folder.parent.removeFolder(folder)
								}
								// 方式2: 直接删除对象
								if (modelControls.rootFolder.__folders[folderKey]) {
									delete modelControls.rootFolder.__folders[folderKey]
								}
							} catch (e) {
								console.error('删除GUI文件夹失败:', e)
							}
							break
						}
					}
				}

				transformControls.detach()
				currentRootModel.parent.remove(currentRootModel)
			}
			break
		case '变换':
			if (currentRootModel && !handler.isTransformChildren) {
				const removeModel = transformControls.object || currentRootModel

				// 从tempStorage.modelList中移除
				const modelList = viewer.scene.tempStorage?.modelList
				if (modelList) {
					const index = modelList.findIndex((m) => m === removeModel)
					if (index > -1) modelList.splice(index, 1)
				}

				// 移除对应的GUI面板
				if (modelControls?.rootFolder) {
					// 遍历所有文件夹，查找匹配的模型
					for (const folderKey in modelControls.rootFolder.__folders) {
						const folder = modelControls.rootFolder.__folders[folderKey]
						// 检查文件夹是否与当前模型关联
						if (folderKey.endsWith(removeModel.id)) {
							// 尝试多种方式移除文件夹
							try {
								// 方式1: 通过parent.removeFolder移除
								if (folder.parent && folder.parent.removeFolder) {
									folder.parent.removeFolder(folder)
								}
								// 方式2: 直接删除对象
								if (modelControls.rootFolder.__folders[folderKey]) {
									delete modelControls.rootFolder.__folders[folderKey]
								}
							} catch (e) {
								console.error('删除GUI文件夹失败:', e)
							}
							break
						}
					}
				}

				transformControls.detach()
				removeModel.parent?.remove(removeModel)
			} else if (currentModel && handler.isTransformChildren) {
				currentModel.visible = false
			}
			break
	}

	// 刷新GUI
	if (window.threeEditor?.viewer?.GUI) {
		window.threeEditor.viewer.GUI.updateDisplay?.()
		viewer.GUI.updateDisplay?.()
	}
}

const handleTouchMove = (e) => {
	e.preventDefault()
	console.error('触摸滑动被阻止')
}

const handleMouseDown = (e) => {
	if (e.button === 2) {
		// 右键
		isRightMouseDown.value = true
		e.preventDefault()

		const mouseMoveHandler = (moveEvent) => {
			if (isRightMouseDown.value) {
				moveEvent.preventDefault()
			}
		}

		const mouseUpHandler = () => {
			isRightMouseDown.value = false
			document.removeEventListener('mousemove', mouseMoveHandler, { passive: false })
			document.removeEventListener('mouseup', mouseUpHandler, { passive: false })
		}

		document.addEventListener('mousemove', mouseMoveHandler, { passive: false })
		document.addEventListener('mouseup', mouseUpHandler, { passive: false })
	}
}

// 旋转缩放快捷键相关方法
const onTransformModeChange = () => {
	if (window.threeEditor && window.threeEditor.viewer) {
		const transformControls = window.threeEditor.viewer.transformControls
		if (transformControls && transformControls.object) {
			transformControls.setMode(transformMode.value)
		}
	}
}

// 监听物体选择状态
const checkObjectSelected = () => {
	if (window.threeEditor && window.threeEditor.viewer) {
		const transformControls = window.threeEditor.viewer.transformControls
		isObjectSelected.value = !!transformControls.object
	}
}

// 定时检查物体选择状态
let checkSelectedTimer = null
onMounted(() => {
	checkSelectedTimer = setInterval(checkObjectSelected, 500)
})

// 清理定时器
const handleBeforeUnmount = () => {
	if (checkSelectedTimer) {
		clearInterval(checkSelectedTimer)
	}
}

// 监听编辑器初始化，添加transformControls事件监听
watch(
	() => window.threeEditor,
	(editor) => {
		if (editor && editor.viewer) {
			const transformControls = editor.viewer.transformControls
			if (transformControls) {
				transformControls.addEventListener('objectChange', checkObjectSelected)
				transformControls.addEventListener('attach', checkObjectSelected)
				transformControls.addEventListener('detach', checkObjectSelected)
			}
		}
	},
	{ deep: true },
)
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
	position: relative;

	.loading-progress {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 300px;
		z-index: 1000;
		background-color: rgba(0, 0, 0, 0.7);
		padding: 20px;
		border-radius: 8px;
	}
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

.btn-add {
	margin-left: 15px;
	color: #e5eaf3;
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

.center-panel {
	flex: 1;
	background-color: #1e1e1e;
	position: relative;
	width: 100%;
}

.top-toolbar {
	position: absolute;
	top: 20px;
	left: 50%;
	transform: translateX(-50%);
	z-index: 4;
	padding: 4px 10px;
	border-radius: 8px;
	border: 1px solid #404040;
	display: flex;
	align-items: center;
	gap: 12px;
	backdrop-filter: blur(5px);
	transition: all 0.3s ease;
	background-color: rgba(45, 45, 45, 0.95);

	.divider {
		width: 1px;
		height: 24px;
		background-color: #404040;
	}

	:deep(.el-checkbox__label) {
		color: #e5eaf3;
		font-size: 12px;
	}

	:deep(.el-radio-group) {
		display: flex;
	}

	:deep(.el-radio-button__inner) {
		display: flex;
		align-items: center;
		padding: 6px 10px;
		font-size: 12px;
		transition: all 0.2s ease;

		&:hover {
			background-color: #4a4a4a;
		}

		.el-icon {
			margin-right: 4px;
		}
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
/* 旋转缩放快捷键工具栏样式 */
.transform-toolbar {
	position: absolute;
	top: 60px;
	left: 50%;
	transform: translateX(-50%);
	z-index: 9;
	pointer-events: auto;

	.toolbar-content {
		padding: 4px 8px;
		border-radius: 8px;
		background-color: rgba(37, 37, 37, 0.95);
		border: 1px solid #404040;
		backdrop-filter: blur(5px);
		transition: all 0.3s ease;

		:deep(.el-radio-group) {
			display: flex;
		}

		:deep(.el-radio-button__inner) {
			display: flex;
			align-items: center;
			padding: 6px 12px;
			font-size: 12px;
			color: #e5eaf3;
			background-color: #2d2d2d;
			border-color: #404040;
			transition: all 0.2s ease;

			&:hover {
				background-color: #4a4a4a;
				color: #ffffff;
			}

			&.is-active {
				background-color: #409eff;
				border-color: #409eff;
				color: #ffffff;

				&:hover {
					background-color: #66b1ff;
					border-color: #66b1ff;
				}
			}

			&:disabled {
				background-color: #2d2d2d;
				color: #666;
				border-color: #404040;
			}

			.el-icon {
				margin-right: 4px;
				font-size: 14px;
			}
		}

		:deep(.el-radio-button__original-radio:disabled) {
			&:checked + .el-radio-button__inner {
				background-color: #2d2d2d;
				color: #666;
				border-color: #404040;
			}
		}
	}
}

/* 右键菜单样式 */
.context-menu {
	position: fixed;
	background-color: rgba(37, 37, 37, 0.95);
	border: 1px solid #404040;
	border-radius: 4px;
	z-index: 1000;
	min-width: 120px;
	box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
	backdrop-filter: blur(5px);
}

.context-menu-item {
	padding: 8px 12px;
	font-size: 12px;
	color: #e5eaf3;
	cursor: pointer;
	transition: all 0.2s ease;
	white-space: nowrap;
}

.context-menu-item:hover {
	background-color: #409eff;
	color: #ffffff;
}
</style>
