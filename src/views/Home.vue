<template>
	<div v-show="!namePreviewScene" class="layout">
		<div class="header" v-show="!previewScene">
			<div class="header-box">
				<div class="header-left">
					<el-button class="btn-add" link icon="Upload" @click="imgVisible = true">导入图片</el-button>
					<el-dialog v-model="imgVisible" title="上传图片" width="500">
						<el-upload class="upload-demo" drag :action="DEFAULT_CONFIG.BASE_URL + 'api/common/1.0/uploadFile'" :before-upload="beforeUpload" :on-success="handleSuccess" :on-remove="handleRemove" :limit="1" :show-file-list="true" :data="{ dir: `${DEFAULT_CONFIG.BASE_NAME}/file` }">
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
		<Editor @emitThreeEditor="emitThreeEditor" class="editor" />
	</div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as THREE from 'three'
import Editor from './ThreeEditor.vue'
import LeftPanel from './Left.vue'
import RightPanel from './Right.vue'

const DEFAULT_CONFIG = window.DEFAULT_CONFIG || {}
const route = useRoute()
const router = useRouter()
const previewScene = ref(false)
const leftCollapsed = ref(false)
const rightCollapsed = ref(false)
const imgVisible = ref(false)
const imageUrl = ref(null)
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

const beforeUpload = (rawFile) => {
	if (rawFile.type !== 'image/jpeg' && rawFile.type !== 'image/png' && rawFile.type !== 'image/jpg') {
		ElMessage.error('请上传JPG/JPEG/PNG格式的文件!')
		return false
	} else if (rawFile.size / 1024 / 1024 > 2) {
		ElMessage.error('文件大小不能超过2MB!')
		return false
	}
	return true
}

const handleSuccess = (response, uploadFile) => {
	imageUrl.value = response.url || uploadFile.response?.url
	ElMessage.success('图片上传成功')
}

const handleRemove = () => {
	imageUrl.value = null
}

const openPanel = () => {
	threeEditor.openControlPanel()
}

const exportTemplateJson = () => {
	if (!threeEditor) return ElMessage.error('没有可导出的场景')
	// const blob = new Blob([JSON.stringify(threeEditor.saveSceneEditor())], { type: 'application/json' })
	// const link = document.createElement('a')
	// link.href = URL.createObjectURL(blob)
	// // link.download = (dataCores.sceneName || '场景') + '.json'
	// link.download = '场景.json'
	// link.click()
}

const pict = () => {
	const base64 = threeEditor.getSceneEditorImage(['image/png', '0.8'])
	const link = document.createElement('a')
	link.href = base64
	// link.download = (dataCores.sceneName || '场景') + '.png'
	link.download = '场景.png'
	link.click()
}

const saveScene = () => {
	try {
		threeEditor.saveSceneEditor()
		ElMessage.success('场景保存成功')
	} catch (error) {
		return ElMessage.error(error.message || '场景验证失败，无法保存')
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
