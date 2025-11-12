<template>
	<!-- <div class="three-editor-container"> -->
	<!-- 3D场景容器 -->
	<div ref="threeBox" class="three-box"></div>

	<!-- 控制面板 -->
	<!-- <div class="panel">
		<button @click="handleButtonClick(0)">设置天空</button>
		<button @click="handleButtonClick(8)">存储天空</button>
		<button @click="handleButtonClick(11)">设置环境贴图</button>
		<button @click="handleButtonClick(1)">加载gltf</button>
		<button @click="handleButtonClick(2)">加载fbx</button>
		<button @click="handleButtonClick(3)">加载obj</button>
		<button @click="handleButtonClick(6)">设置GUI位置</button>
		<button @click="handleButtonClick(7)">gsap动画</button>
		<button @click="handleButtonClick(13)">刷新GUI</button>
		<button @click="handleButtonClick(14)">截图</button>
		<button @click="handleButtonClick(15)">设置变换</button>
		<button @click="handleButtonClick(16)">网格</button>
		<button @click="handleButtonClick(17)">性能</button>
		<button @click="handleButtonClick(18)">按键</button>
		<button @click="handleButtonClick(19)">坐标轴</button>
		<button @click="handleButtonClick(20)">播放模型动画</button>
		<button @click="handleButtonClick(21)">动画暂停</button>
		<button @click="handleButtonClick(22)">动画停止</button>
		<button @click="handleButtonClick(23)">移除模型动画</button>
		<button @click="handleButtonClick(24)">获取省会点</button>
		<button @click="handleButtonClick(27)">选择模式</button>
		<button @click="handleButtonClick(28)">获取曲线列表</button>
		<button @click="handleButtonClick(29)">曲线动画执行</button>
		<button @click="handleButtonClick(30)">执行自定义动画</button>
		<button @click="handleButtonClick(31)">场景切换</button>
		<button @click="handleButtonClick(32)">销毁场景</button>
		<button @click="handleButtonClick(9)">移除天空</button>
		<button @click="handleButtonClick(33)">加载</button>
		<button @click="handleButtonClick(34)">平面扫光</button>
		<button @click="handleButtonClick(35)">获取视图</button>
		<button @click="handleButtonClick(12)">保存</button>
		<button @click="handleButtonClick(40)">加载机柜gltf</button>
		<button @click="handleButtonClick(41)">加载图片</button>
	</div> -->
	<!-- <el-dialog v-model="imgVisible" title="上传图片" width="500" :draggable="true">
		<el-upload class="upload-demo" drag action="http://172.16.21.203:2061/api/common/1.0/uploadFile" :before-upload="beforeUpload" :on-success="handleSuccess" :on-remove="handleRemove" :limit="1" :show-file-list="true" :data="{ dir: `editor/file` }">
			<div class="upload-area">
				<img v-if="imageUrl" :src="'http://172.16.21.203:2061/' + imageUrl" class="avatar cover-image" />
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
	</el-dialog> -->
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { ThreeEditor, createOneHeatMap } from '../components/three-editor-cores-main/lib/main.js'
import * as THREE from 'three'
import axios from 'axios'
import { ElButton, ElMessage, ElIcon } from 'element-plus'

const threeBox = ref(null)
let threeEditor = null
const jigui_MODEL = ref(null)
const imgVisible = ref(false)
const imageUrl = ref(null)
const emits = defineEmits(['emitThreeEditor'])
// 数据配置
const HOST = 'https://z2586300277.github.io/3d-file-server/'
const data = [
	{
		name: '天空',
		type: 'SKY',
		getUrls: (k) => [1, 2, 3, 4, 5, 6].map((i) => HOST + 'files/sky/skyBox0/' + i + '.png'),
		getRandom: () => Math.floor(Math.random() * 10),
	},
	{ type: 'GLTF', url: HOST + 'files/model/Fox.glb' },
	{ type: 'FBX', url: HOST + 'models/fbx/shanghai.FBX' },
	{ type: 'OBJ', url: HOST + 'files/model/house/house.obj' },
]

async function getModel() {
	axios
		.post(`http://172.16.21.203:2062/api/Scene/GetSceneModel`, {
			token: '11',
		})
		.then((res) => {
			if (res.data.resultCode === '0000') {
				jigui_MODEL.value = res.data.data.tlist[0].modellist[0].modelurl
				threeEditor.setModelFromInfo({
					type: 'GLTF',
					url: 'http://172.16.21.203:2061' + jigui_MODEL.value,
				})
			}
		})
}

function loadImgUrl() {
	if (!imageUrl.value) {
		ElMessage.warning('请先上传图片')
		return
	}

	const fullImageUrl = 'http://172.16.21.203:2061' + imageUrl.value

	createImagePlane(fullImageUrl)
	imgVisible.value = false
}

function createImagePlane(imageUrl) {
	if (!threeEditor) {
		ElMessage.error('编辑器未初始化')
		return
	}

	const { viewer } = threeEditor
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

function beforeUpload(rawFile) {
	if (rawFile.type !== 'image/jpeg' && rawFile.type !== 'image/png' && rawFile.type !== 'image/jpg') {
		ElMessage.error('请上传JPG/JPEG/PNG格式的文件!')
		return false
	} else if (rawFile.size / 1024 / 1024 > 2) {
		ElMessage.error('文件大小不能超过2MB!')
		return false
	}
	return true
}
function handleSuccess(response, uploadFile) {
	imageUrl.value = response.url || uploadFile.response?.url
	ElMessage.success('图片上传成功')
}
function handleRemove() {
	imageUrl.value = null
}

// 获取天空URL
const skyUrls = () => data[0].getUrls(data[0])

// 初始化场景
const createScene = () => {
	try {
		threeEditor = new ThreeEditor({
			threeBoxRef: threeBox.value,
			rendererParams: {
				fps: null,
				pixelRatio: window.devicePixelRatio * 1.5,
				webglRenderParams: { antialias: true, alpha: true, logarithmicDepthBuffer: true },
				userPermissions: { autoPlace: true, proxy: false },
			},
			sceneParams: JSON.parse(localStorage.getItem('sceneParams')),
			meshListParams: JSON.parse(localStorage.getItem('meshListParams')),
			skyParams: JSON.parse(localStorage.getItem('skyParams')),
			saveEditorCallBack: (sceneParams, meshListParams) => {
				localStorage.setItem('sceneParams', JSON.stringify(sceneParams))
				localStorage.setItem('meshListParams', JSON.stringify(meshListParams))
			},
		})
	} catch (error) {
		console.log('初始化失败：', e)
	}

	emits('emitThreeEditor', threeEditor)
	// 设置事件监听
	setupEventListeners()
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

// 处理按钮点击
const handleButtonClick = (k) => {
	if (!threeEditor) return

	if (k === 0) threeEditor.setSky(skyUrls())
	else if ([1, 2, 3].includes(k)) threeEditor.setModelFromInfo(data[k]).loaderService.progress = (e) => console.log()
	else if (k === 6) threeEditor.setGUIDomPosition(document.querySelector('.panel'))
	else if (k === 7) threeEditor.setGsapAnimation()
	else if (k === 8) localStorage.setItem('skyParams', JSON.stringify(skyUrls()))
	else if (k === 9) threeEditor.viewer.scene.background = null
	else if (k === 11) threeEditor.setGlobalEnvBackground(skyUrls())
	else if (k === 12) threeEditor.saveSceneEditor()
	else if (k === 13) threeEditor.refreshGUI()
	else if (k === 14) {
		const base64 = threeEditor.getSceneEditorImage(['image/png', '0.8'])
		const link = document.createElement('a')
		link.href = base64
		link.download = 'myImage.png'
		link.click()
	} else if (k === 15) threeEditor.setTransformControlsProperty('mode', 'translate')
	else if (k === 16) threeEditor.setOperateOption('grid', Math.random() > 0.5 ? true : false)
	else if (k === 17) threeEditor.setOperateOption('stats', Math.random() > 0.5 ? true : false)
	else if (k === 18) threeEditor.setOperateOption('openKey', Math.random() > 0.5 ? true : false)
	else if (k === 19) threeEditor.setOperateOption('axes', Math.random() > 0.5 ? true : false)
	else if (k === 20) {
		const model = threeEditor.viewer.currentInfo?.currentRootModel
		const _actions = Math.random() > 0.5 ? [1, 3, 5, 7] : [2, 4, 6, 8]

		model.animationPlayParams.speed = 0.2
		model.animationPlayParams.actionIndexs.forEach((_, k, arr) => (arr[k] = _actions.includes(k)))

		const { mixer, actions } = threeEditor.setModelAnimationPlay(model)

		setTimeout(() => {
			actions.forEach((i) => i.stop())
		}, 2000)

		mixer.addEventListener('finished', (e) => console.log('mixer finished'))
	} else if (k === 21) playActions.forEach((i) => (i.paused = !i.paused))
	else if (k === 22) playActions.forEach((i) => i.stop())
	else if (k === 23) threeEditor.removeModelAnimation(threeEditor.viewer.currentInfo?.currentRootModel)
	else if (k === 24) {
		const { getTransformedVector } = threeEditor.viewer.currentInfo?.currentRootModel

		threeEditor.viewer.currentInfo?.currentRootModel.children.forEach((i) => {
			if (i.geoInfo?.properties?.centroidCoord3) {
				const dom = document.createElement('div')
				dom.style.color = '#fff'
				dom.innerText = i.geoInfo?.properties?.name

				const m = threeEditor.setCss2dDOM(dom, getTransformedVector(i.geoInfo?.properties.centroidCoord3))

				m.scale.multiplyScalar(1)
				dom.style.pointerEvents = 'none'
			}
		})
	} else if (k === 27) threeEditor.setSceneControlMode('选择')
	else if (k === 28) console.log(threeEditor.getSceneCurveList())
	else if (k === 29) {
		const { mesh, path } = threeEditor.getSceneCurveList()[0]
		const curveAnimate = threeEditor.setCurveAnimation(path, 1)
		const mesh1 = threeEditor.viewer.scene.getObjectByName('运动')

		curveAnimate.frameCallback = (p) => {
			mesh1.position.copy(threeEditor.pointSyncTransform(p, mesh))
			threeEditor.viewer.controls.target.copy(mesh1.position)
		}

		curveAnimate.start()
	} else if (k === 30) {
		const mesh = threeEditor.viewer.scene.getObjectByName('大楼')
		const { transformAnimationList } = mesh

		transformAnimationList.forEach((i, k) => {
			setTimeout(() => {
				threeEditor.setGsapMeshAction(mesh, i._transformInfo, i.transformInfo_, i.gsapParams)
			}, k * 2000)
		})
	} else if (k === 31) {
		const { camera, controls } = threeEditor.viewer
		const [end, start] = controls.viewAngleList

		setGsapAnimationLook(start).then(() => {
			threeEditor.setSceneFromClassify('场景2')
			threeEditor.setSky(skyUrls())
			setGsapAnimationLook(end)
		})

		function setGsapAnimationLook(viewAngle) {
			return Promise.all([
				new Promise((resolve) =>
					threeEditor.setGsapAnimation(camera.position, viewAngle.position, {
						duration: 2,
						onComplete: resolve,
					}),
				),
				new Promise((resolve) =>
					threeEditor.setGsapAnimation(controls.target, viewAngle.target, {
						duration: 2,
						onComplete: resolve,
					}),
				),
			])
		}
	} else if (k === 32) threeEditor.viewer.destroySceneRender()
	else if (k === 33) createScene()
	else if (k === 34) {
		const mesh = createOneHeatMap()
		threeEditor.viewer.scene.add(mesh)

		const { THREE } = threeEditor
		const arr = [
			[0, 0, 10],
			[0.2, 0.6, 5],
			[0.25, 0.7, 8],
			[0.33, 0.9, 5],
			[0.35, 0.8, 6],
			[0.017, 5.311, 6.0],
			[-0.45, 0.8, 4],
			[-0.2, -0.6, 5],
			[-0.25, -0.7, 8],
			[-0.33, -0.9, 8],
			[0.35, -0.45, 10],
			[-0.1, -0.8, 10],
			[0.33, -0.3, 5],
			[-0.35, 0.75, 6],
			[0.6, 0.4, 10],
			[-0.4, -0.8, 4],
			[0.7, -0.3, 6],
			[0.3, -0.8, 8],
		].map((i) => new THREE.Vector3(...i))

		mesh.uniforms.hasUv.value = true
		let k = 0

		setInterval(() => {
			k == arr.length ? (k = 1) : k++
			mesh.uniforms.Points.value = arr.slice(0, k)
			mesh.uniforms.PointsCount.value = k
			mesh.updateShaderProgram()
		}, 300)

		mesh.updateShaderProgram()
	} else if (k === 35) {
		const m = threeEditor.viewer.scene.getObjectByName('视图')
		const { camera, controls } = threeEditor.viewer
		const { frontView, target } = threeEditor.getObjectViews(m)

		return Promise.all([
			new Promise((resolve) =>
				threeEditor.setGsapAnimation(camera.position, frontView, {
					duration: 2,
					onComplete: resolve,
				}),
			),
			new Promise((resolve) =>
				threeEditor.setGsapAnimation(controls.target, target, {
					duration: 2,
					onComplete: resolve,
				}),
			),
		])
	} else if (k === 40) {
		getModel()
	} else if (k === 41) {
		imgVisible.value = true
	}
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
