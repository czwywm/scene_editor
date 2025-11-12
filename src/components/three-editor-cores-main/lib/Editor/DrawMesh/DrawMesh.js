import { setUpdateFenceMesh } from './Fence.js'
import { setUpdateFaceMesh } from './Face.js'
import { setUpdateCurveLineMesh } from './CurveLine.js'
import { setUpdateLineMesh } from './Line.js'
import { getMeshStorage, setMeshPanel, setMeshStorage } from '../Group/Mesh.js'
import { getMaterialStorage, setMaterialPanel, setMaterialStorage } from '../Group/Mesh/Material.js'
import { ref } from 'vue'

/* 绘制面板 */
export function setDrawMeshPanel(drawControls, scene, transformControls, CommonFrameList, folder, params) {

    const meshFolder = folder.addFolder('相关控制')
    meshFolder.open()

    const lengthFolder = ref(null);
    if (drawControls.mode === '直线路径') {
        lengthFolder.value = folder.addFolder('长度信息');
        lengthFolder.value.open();
    }


    const scaleAreaFolder = ref(null);
    const areaFolder = ref(null);
    if (drawControls.mode === '平面绘制') {
        scaleAreaFolder.value = folder.addFolder('比例尺配置');
        scaleAreaFolder.value.open();
        areaFolder.value = folder.addFolder('面积信息');
        areaFolder.value.open();
    }

    // 初始化绘制参数
    const draw_Params = params || {

        mode: drawControls.mode,

        materialType: drawControls.materialType,

        drawPointList: [],

        mesh: null,

        lineEdgeLengths: [],

        areaData: null,

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

            if (this.mode === '平面绘制') {
                updateScaleDisplay(scene, scaleAreaFolder.value, draw_Params, areaFolder.value);
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

        setMeshFromPoints(scene, draw_Params)

        setPointPanel(scene, draw_Params, point, folder)

        if (draw_Params.mode === '直线路径' && draw_Params.lineEdgeLengths) {
            updateLengthDisplay(lengthFolder.value, draw_Params.lineEdgeLengths, draw_Params.scale);
        }

        if (draw_Params.mode === '平面绘制') {
            updateScaleDisplay(scene, scaleAreaFolder.value, draw_Params, areaFolder.value);

            if (draw_Params.drawPointList.length > 2 && draw_Params.areaData) {
                updateAreaDisplay(areaFolder.value, draw_Params.areaData);
            } else {
                clearAreaDisplay(areaFolder.value);
            }
        }
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

/* 平面绘制 - 清空比例尺显示   */
function clearScaleAreaDisplay(folder) {
    if (!folder) return;
    if (folder.__scaleControllers) {
        folder.__scaleControllers.forEach(controller => {
            try {
                folder.remove(controller);
            } catch (e) {
                console.log('移除比例尺控制器时出错:', e);
            }
        });
    }
    folder.__scaleControllers = [];
}

/* 平面绘制 - 更新比例尺显示   */
function updateScaleDisplay(scene, folder, draw_Params, areaFolder) {
    clearScaleAreaDisplay(folder);

    if (draw_Params.drawPointList.length < 3) return;

    folder.__scaleControllers = [];

    const enabledController = folder.add(draw_Params.scaleConfig, 'enabled').name('启用比例尺').onChange(() => {
        setMeshFromPoints(scene, draw_Params);
        updateAreaDisplay(areaFolder, draw_Params.areaData);
    });
    folder.__scaleControllers.push(enabledController);

    const unitController = folder.add(draw_Params.scaleConfig, 'realWorldUnit', ['米', '厘米', '毫米', '千米', '英尺', '英寸']).name('真实单位').onChange(() => {
        setMeshFromPoints(scene, draw_Params);
        updateAreaDisplay(areaFolder, draw_Params.areaData);
    });
    folder.__scaleControllers.push(unitController);

    const factorController = folder.add(draw_Params.scaleConfig, 'conversionFactor', 0.001, 1000).name('转换因子').onChange(() => {
        setMeshFromPoints(scene, draw_Params);
        updateAreaDisplay(areaFolder, draw_Params.areaData);
    });
    folder.__scaleControllers.push(factorController);

    const precisionController = folder.add(draw_Params.scaleConfig, 'precision', 0, 6).step(1).name('显示精度').onChange(() => {
        setMeshFromPoints(scene, draw_Params);
        updateAreaDisplay(areaFolder, draw_Params.areaData);
    });
    folder.__scaleControllers.push(precisionController);
}

/* 平面绘制 - 清空面积显示   */
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

/* 平面绘制 - 更新面积显示   */
function updateAreaDisplay(folder, areaData) {
    clearAreaDisplay(folder);
    if (areaData.isValid) {
        const areaController = folder.add(
            { area: areaData.formattedRealArea },
            'area'
        ).name('平面面积').listen();
        folder.__areaControllers.push(areaController);
    }
}

/* 直线路径 - 清空长度显示   */
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

/* 直线路径 - 更新长度显示   */
function updateLengthDisplay(folder, lengthData, scale) {
    let scaleFactor = scale || 1;

    clearLengthDisplay(folder);

    lengthData.edges.forEach((edge, index) => {
        const controller = folder.add(
            { length: (edge.formattedLength * scaleFactor).toFixed(2) },
            'length'
        ).name(`边 ${index + 1} 长度`).listen();
        folder.__lengthControllers.push(controller);
    });

    const totalController = folder.add(
        { total: (lengthData.formattedTotalLength * scaleFactor).toFixed(2) },
        'total'
    ).name('总长度').listen();
    folder.__lengthControllers.push(totalController);
}

/* 添加点面板  */
function setPointPanel(scene, draw_Params, point, folder) {

    const drawPointList = draw_Params.drawPointList

    const pointController = folder.add({

        fn: () => {

            const index = drawPointList.indexOf(point)

            drawPointList.splice(index, 1)

            setMeshFromPoints(scene, draw_Params)

            if (draw_Params.mode === '直线路径' && draw_Params.lineEdgeLengths) {
                const lengthFolder = folder.__folders['长度信息'];
                updateLengthDisplay(lengthFolder, draw_Params.lineEdgeLengths, draw_Params.scale);
                if (drawPointList.length < 2) {
                    clearLengthDisplay(lengthFolder);
                }
            }

            if (draw_Params.mode === '平面绘制') {
                const scaleAreaFolder = folder.__folders['比例尺配置'];
                const areaFolder = folder.__folders['面积信息'];
                updateScaleDisplay(scene, scaleAreaFolder, draw_Params, areaFolder);
                if (draw_Params.drawPointList.length > 2 && draw_Params.areaData) {
                    updateAreaDisplay(areaFolder, draw_Params.areaData);
                } else {
                    clearAreaDisplay(areaFolder);
                }
            }

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

        folder.add(draw_Params, 'scale').name('比例尺').onChange(() => { setLineScale(draw_Params, folder) }).step(1)

    } else if (draw_Params.mode === '平面绘制') {

        if (!params) {

            draw_Params.scaleConfig = {
                enabled: false,           // 是否启用比例尺
                realWorldUnit: '米',      // 真实世界单位
                conversionFactor: 1,      // 转换因子：1场景单位 = ? 真实单位
                precision: 2              // 精度
            }

        }

        const scaleAreaFolder = folder.__folders['比例尺配置'];
        const areaFolder = folder.__folders['面积信息'];
        updateScaleDisplay(scene, scaleAreaFolder, draw_Params, areaFolder);

    }
}

function setLineScale(draw_Params, folder) {
    const lengthFolder = folder.__folders['长度信息'];
    updateLengthDisplay(lengthFolder, draw_Params.lineEdgeLengths, draw_Params.scale);
}

/* 生成绘制物体 */
function setMeshFromPoints(scene, params) {

    switch (params.mode) {

        case '围栏物体':

            setUpdateFenceMesh(scene, params)

            break;

        case '平面绘制':

            setUpdateFaceMesh(scene, params)

            setTimeout(() => {
                const areaFolder = params.folder?.__folders?.['面积信息'];
                const scaleAreaFolder = params.folder?.__folders?.['比例尺配置'];
                if (areaFolder && scaleAreaFolder) {
                    updateScaleDisplay(scene, scaleAreaFolder, params, areaFolder);
                }
            }, 0);

            break;

        case '曲线路径':

            setUpdateCurveLineMesh(scene, params)

            break;

        case '直线路径':

            setUpdateLineMesh(scene, params)

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

export function setDrawMeshStorage(scene, CommonFrameList, storage) {

    if (!storage) return

    const { draw_Params } = storage

    setMeshFromPoints(scene, draw_Params)

    setMeshStorage(draw_Params.mesh, storage)

    setMaterialStorage(scene, CommonFrameList, draw_Params.mesh.material, storage.material)

    return draw_Params

}