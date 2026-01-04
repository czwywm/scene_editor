<template>
	<div v-show="!namePreviewScene" class="layout" @contextmenu.prevent="handleContextMenu" @touchmove.prevent="handleTouchMove" @mousedown="handleMouseDown">
		<!-- 模型加载进度条 -->
		<div v-if="loadingProgress > 0 && loadingProgress < 100" class="loading-progress">
			<el-progress :percentage="loadingProgress" :stroke-width="8" :color="'#409EFF'" />
		</div>
		<div class="header" v-show="!previewScene">
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
					<el-button class="btn-add" link icon="plus" @click="sceneVisible = true">新建场景</el-button>
					<el-button class="btn-add" link icon="Upload" @click="importSceneVisible = true">导入场景</el-button>
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
					<el-button class="btn-add" link icon="Upload" @click="imgVisible = true">导入图片</el-button>
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
				</div>
				<div class="title">
					<!-- Title content -->
				</div>
				<div class="header-right">
					<el-button class="btn-add" link icon="Document" @click="exportTemplateJson">导出</el-button>
					<el-button @click="pict" icon="camera"></el-button>
					<el-button @click="openPanel">控制板</el-button>
					<el-button @click="saveScene">保存</el-button>
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

		<Editor @emitThreeEditor="emitThreeEditor" :dataCores="dataCores" class="editor" />
	</div>
</template>

<script setup>
import { ref, watch, reactive, provide } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as THREE from 'three'
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

// 提供加载进度状态给子组件
provide('loadingProgress', loadingProgress)
const dataCores = reactive({
	sceneName: localStorage.getItem('new_sceneName') || '三维测试',
	options: JSON.parse(localStorage.getItem('new_sceneList')) || [{ name: '三维测试' }],
})

const emitThreeEditor = (threeEditor) => {
	window.threeEditor = threeEditor
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
		// 调试：验证数据源
		console.log('=== 数据源 ===')
		console.log('使用数据集:', isUsingDataset)
		if (sourceData.models && Array.isArray(sourceData.models)) {
			sourceData.models.forEach((model, index) => {
				console.log(`模型${index + 1}: ${model.name}`)
				console.log('modelType:', model.modelType)
				console.log('drawingPoints数量:', model.drawingPoints?.length)
			})
		}

		// 转换数据为系统可识别的格式
		const sceneData = JSON.parse(JSON.stringify(sourceData))

		// 调试：验证JSON序列化后的geometry
		console.log('\n=== JSON序列化后的数据 ===')
		if (sceneData.models && Array.isArray(sceneData.models)) {
			sceneData.models.forEach((model, index) => {
				console.log(`模型${index + 1}: ${model.name}`)
				console.log('geometry存在:', !!model.geometry)
				if (model.geometry) {
					console.log('geometry.attributes存在:', !!model.geometry.attributes)
					if (model.geometry.attributes) {
						console.log('position.array长度:', model.geometry.attributes.position?.array?.length)
					}
				}
			})
		}

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
					point: model.position, // 位置信息
					scale: model.scale, // 缩放信息
					rotation: model.rotation, // 旋转信息
				}

				// 调试：验证映射后的rootInfo
				console.log(`\n=== 映射后的模型${model.id} ===`)
				console.log('rootInfo.geometry存在:', !!rootInfo.geometry)
				if (rootInfo.geometry) {
					console.log('rootInfo.geometry.attributes存在:', !!rootInfo.geometry.attributes)
					if (rootInfo.geometry.attributes) {
						console.log('rootInfo.position.array长度:', rootInfo.geometry.attributes.position?.array?.length)
					}
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
			if (sceneData.models && Array.isArray(sceneData.models)) {
				sceneData.models.forEach((model) => {
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

					// 检查是否包含drawingPoints，如果有则视为自定义几何体
					if (drawingPoints && Array.isArray(drawingPoints)) {
						// 自定义几何体类型
						window.threeEditor.setModelFromInfo({
							type: 'custom',
							name: model.name,
							position: model.position || { x: 0, y: 0, z: 0 },
							geometryType: model.geometryType || 'Polygon',
							drawingPoints: drawingPoints,
							modelType: modelType,
							material: model.material,
							userData: model.userData,
						})
					} else {
						// 传统模型类型
						window.threeEditor.setModelFromInfo({
							type: model.type || 'gltf',
							url: model.url,
							name: model.name,
							point: model.position || { x: 0, y: 0, z: 0 },
						})
					}
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

const saveScene = () => {
	if (!window.threeEditor) return ElMessage.error('没有可保存的场景')
	try {
		if (dataCores.options.find((item) => item.name === dataCores.sceneName)) localStorage.setItem(dataCores.sceneName + '-newEditor', JSON.stringify(window.threeEditor.saveSceneEditor()))
		window.threeEditor.saveSceneEditor()
		ElMessage.success('场景保存成功')
		saveLocal()
	} catch (error) {
		return ElMessage.error(error.message || '场景验证失败，无法保存')
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
}
const handleTouchMove = (e) => {
	e.preventDefault()
	console.log('触摸滑动被阻止')
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
</style>
