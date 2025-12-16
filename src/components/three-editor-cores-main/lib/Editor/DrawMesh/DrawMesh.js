import { setUpdateFenceMesh } from './Fence.js'
import { setUpdateFaceMesh } from './Face.js'
import { setUpdateCurveLineMesh } from './CurveLine.js'
import { setUpdateLineMesh } from './Line.js'
import { setUpdateWallMesh } from './Wall.js'
import { getMeshStorage, setMeshPanel, setMeshStorage } from '../Group/Mesh.js'
import { getMaterialStorage, setMaterialPanel, setMaterialStorage } from '../Group/Mesh/Material.js'

/* 绘制面板 */
export function setDrawMeshPanel(drawControls, scene, transformControls, CommonFrameList, folder, params) {

	const meshFolder = folder.addFolder('相关控制')
	meshFolder.open()

	// 初始化绘制参数
	const draw_Params = params || {

		mode: drawControls.mode,

		materialType: drawControls.materialType,

		drawPointList: [],

		mesh: null

	}

	draw_Params.callback = function (v) {

		if (v === 'remove') {

			for (const f in meshFolder.__folders) {

				meshFolder.removeFolder(meshFolder.__folders[f])

			}

		}

		else {

			setMeshPanel(this.mesh, meshFolder.addFolder('变换配置'))

			const materialFolder = meshFolder.addFolder('材质配置')

			setMaterialPanel(scene, CommonFrameList, this.mesh.material, materialFolder)

			if (this.mode === '直线路径') {
				materialFolder.add(this.mesh.material, 'linewidth').name('线宽')
			}

		}

	}

	// 附加选项
	setAdditionalOptions(scene, draw_Params, folder, params)

	if (params) {

		draw_Params.drawPointList.forEach(i => setPointPanel(scene, draw_Params, i, folder))

		draw_Params.callback('set')

	}

	// 绘制事件
	function drawEventCall(point) {

		draw_Params.drawPointList.push(point)

		const folderChild = getFolderByMode(draw_Params.mode, folder)

		setMeshFromPoints(scene, draw_Params, folderChild)

		setPointPanel(scene, draw_Params, point, folder)
	}


	// 选中物体
	folder.add({ fn: () => draw_Params.mesh && transformControls.attach(draw_Params.mesh) }, 'fn').name('选中物体')

	folder.add({ fn: () => { drawControls.drawEventCall = drawEventCall } }, 'fn').name('操作当前组')

	folder.add({

		delete: () => {

			transformControls.detach()

			folder.parent.removeFolder(folder)

			draw_Params.mesh && scene.remove(draw_Params.mesh)

			drawControls.drawEventCall = null

		}

	}, 'delete').name('移除此组')

	drawControls.drawEventCall = drawEventCall
}

/* 根据模式获取对应的子文件夹 */
function getFolderByMode(mode, folder) {
	switch (mode) {
		case '直线路径':
			return folder.__folders['长度信息'] || folder.addFolder('长度信息')
		case '平面绘制':
			return folder.__folders['面积信息'] || folder.addFolder('面积信息')
		default:
			return null
	}
}

/* 平面绘制 - 更新面积显示   */
function updateAreaDisplay(folder, params) {
	const { areaData, drawPointList } = params;

	clearAreaDisplay(folder);

	if (drawPointList.length > 2 && areaData.isValid) {
		const areaController = folder.add(
			{ area: areaData.formattedRealArea },
			'area'
		).name('平面面积').listen();
		folder.__areaControllers.push(areaController);
	}

	function clearAreaDisplay(folder) {
		if (!folder) return;
		if (folder.__areaControllers) {
			folder.__areaControllers.forEach(controller => {
				try {
					folder.remove(controller);
				} catch (e) {
					console.log('移除面积显示器时出错:', e);
				}
			});
		}
		folder.__areaControllers = [];
	}
}

/* 直线路径 - 更新长度显示   */
function updateLengthDisplay(folder, params) {
	const { lineEdgeLengths: lengthData, scale } = params;

	clearLengthDisplay(folder);

	if (!folder || !lengthData.edges) return;

	if (lengthData.edges.length) {
		lengthData.edges.forEach((edge, index) => {
			const controller = folder.add(
				{ length: (edge.formattedLength * scale).toFixed(2) },
				'length'
			).name(`边 ${index + 1} 长度`).listen();
			folder.__lengthControllers.push(controller);
		});

		const totalController = folder.add(
			{ total: (lengthData.formattedTotalLength * scale).toFixed(2) },
			'total'
		).name('总长度').listen();
		folder.__lengthControllers.push(totalController);
	}

	function clearLengthDisplay(folder) {
		if (!folder) return;
		if (folder.__lengthControllers) {
			folder.__lengthControllers.forEach(controller => {
				try {
					folder.remove(controller);
				} catch (e) {
					console.log('移除长度显示器时出错:', e);
				}
			});
		}
		folder.__lengthControllers = [];
	}
}

/* 添加点面板  */
function setPointPanel(scene, draw_Params, point, folder) {

	const drawPointList = draw_Params.drawPointList

	const pointController = folder.add({

		fn: () => {

			const index = drawPointList.indexOf(point)

			drawPointList.splice(index, 1)

			const folderChild = getFolderByMode(draw_Params.mode, folder)

			setMeshFromPoints(scene, draw_Params, folderChild)

			folder.remove(pointController)

		}

	}, 'fn').name('移除点' + [point.x, point.y, point.z].map(i => i.toFixed(2)).join(','))

}

/*  附加选项 */
function setAdditionalOptions(scene, draw_Params, folder, params) {

	if (draw_Params.mode === '围栏物体') {

		if (!params) {

			draw_Params.fenceHeight = 50

			draw_Params.fenceClose = true

		}

		folder.add(draw_Params, 'fenceHeight').name('围栏高度').onChange(() => setMeshFromPoints(scene, draw_Params))

		folder.add(draw_Params, 'fenceClose').name('围栏闭合').onChange(() => setMeshFromPoints(scene, draw_Params))

	}

	else if (draw_Params.mode === '立体描边') {

		if (!params) {

			draw_Params.wallHeight = 20

			draw_Params.wallThickness = 2

			draw_Params.wallClose = false

		}

		folder.add(draw_Params, 'wallHeight').name('墙壁高度').onChange(() => setMeshFromPoints(scene, draw_Params))

		folder.add(draw_Params, 'wallThickness').name('墙壁厚度').onChange(() => setMeshFromPoints(scene, draw_Params))

		folder.add(draw_Params, 'wallClose').name('墙壁闭合').onChange(() => setMeshFromPoints(scene, draw_Params))

	}

	else if (draw_Params.mode === '曲线路径') {

		if (!params) {

			draw_Params.height = 10

			draw_Params.axial = 'y'

			draw_Params.tubularSegments = 64

			draw_Params.radius = 0.08

			draw_Params.radialSegments = 8

			draw_Params.closed = false

		}

		const curveFolder = folder.addFolder('曲线配置')

		curveFolder.add(draw_Params, 'height').name('高度').onChange(() => setMeshFromPoints(scene, draw_Params))

		curveFolder.add(draw_Params, 'axial', ['x', 'y', 'z']).name('轴向').onChange(() => setMeshFromPoints(scene, draw_Params))

		curveFolder.add(draw_Params, 'tubularSegments', 1).name('管道分段').onChange(() => setMeshFromPoints(scene, draw_Params)).step(1)

		curveFolder.add(draw_Params, 'radius', 0.01).name('管道半径').onChange(() => setMeshFromPoints(scene, draw_Params))

		curveFolder.add(draw_Params, 'radialSegments', 1).name('管道半径分段').onChange(() => setMeshFromPoints(scene, draw_Params)).step(1)

		curveFolder.add(draw_Params, 'closed').name('管道闭合').onChange(() => setMeshFromPoints(scene, draw_Params))

	} else if (draw_Params.mode === '直线路径') {

		if (!params) {

			draw_Params.scale = 1

		}

		const lengthFolder = folder.addFolder('长度信息');

		folder.add(draw_Params, 'scale').name('比例尺').onChange(() => setMeshFromPoints(scene, draw_Params, lengthFolder)).step(1)

		if (draw_Params.lineEdgeLengths) setMeshFromPoints(scene, draw_Params, lengthFolder);

	} else if (draw_Params.mode === '平面绘制') {

		if (!params) {

			draw_Params.scaleConfig = {
				enabled: false,           // 是否启用比例尺
				realWorldUnit: '米',      // 真实世界单位
				conversionFactor: 1,      // 转换因子：1场景单位 = ? 真实单位
				precision: 2              // 精度
			}

		}

		const scaleAreaFolder = folder.addFolder('比例尺配置');

		const areaFolder = folder.addFolder('面积信息');

		scaleAreaFolder.add(draw_Params.scaleConfig, 'enabled').name('启用比例尺').onChange(() => setMeshFromPoints(scene, draw_Params, areaFolder));

		scaleAreaFolder.add(draw_Params.scaleConfig, 'realWorldUnit', ['米', '厘米', '毫米', '千米', '英尺', '英寸']).name('真实单位').onChange(() => setMeshFromPoints(scene, draw_Params, areaFolder));

		scaleAreaFolder.add(draw_Params.scaleConfig, 'conversionFactor', 0.001, 1000).name('转换因子').onChange(() => setMeshFromPoints(scene, draw_Params, areaFolder));

		scaleAreaFolder.add(draw_Params.scaleConfig, 'precision', 0, 6).step(1).name('显示精度').onChange(() => setMeshFromPoints(scene, draw_Params, areaFolder));

		if (draw_Params.drawPointList.length > 2) setMeshFromPoints(scene, draw_Params, areaFolder)

	}
}

/* 生成绘制物体 */
function setMeshFromPoints(scene, params, folder) {

	switch (params.mode) {

		case '围栏物体':

			setUpdateFenceMesh(scene, params)

			break;

		case '平面绘制':

			setUpdateFaceMesh(scene, params)

			setTimeout(() => {
				if (folder && params.drawPointList.length > 2) {
					folder.open();
					updateAreaDisplay(folder, params);
				}
			}, 0);

			break;

		case '曲线路径':

			setUpdateCurveLineMesh(scene, params)

			break;

		case '直线路径':

			setUpdateLineMesh(scene, params)

			setTimeout(() => {
				if (folder && params.lineEdgeLengths) {
					folder.open();
					updateLengthDisplay(folder, params);
				}
			}, 0);

			break;

		case '立体描边':

			setUpdateWallMesh(scene, params)

			break;

	}

}

export function getDrawMeshStorage(mesh) {

	const draw_Params = {}

	Object.keys(mesh.drawParams).forEach(k => {

		if (!['mesh', 'folder', 'callback'].includes(k)) {

			draw_Params[k] = mesh.drawParams[k]

		}

	})

	return {

		...getMeshStorage(mesh),

		material: getMaterialStorage(mesh.material),

		draw_Params

	}

}

/* 立体描边 - 墙壁生成 */




export function setDrawMeshStorage(scene, CommonFrameList, storage) {

	if (!storage) return

	const { draw_Params } = storage

	setMeshFromPoints(scene, draw_Params)

	setMeshStorage(draw_Params.mesh, storage)

	setMaterialStorage(scene, CommonFrameList, draw_Params.mesh.material, storage.material)

	return draw_Params

}
