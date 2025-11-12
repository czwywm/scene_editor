import * as THREE from 'three'
import { getMaterial } from '../Group/Mesh/Material/MaterialChunk'
import { multShapeGroup, multShapePlaneGeometry, updateMultShapePlaneGeometry } from '../../Api/ThreeApi'
import { arePointsCoplanar, triangulationArea, projectionArea, spaceShoelaceFormula, formatAreaWithUnit } from './calculateArea'

/* 根据点去创建或更新面片物体 */
export function setUpdateFaceMesh(scene, drawParams) {

    const pointList = [...drawParams.drawPointList]

    if (pointList.length < 3) {

        if (drawParams.mesh) {

            scene.remove(drawParams.mesh)

            drawParams.mesh = null

            drawParams.callback?.('remove')

        }

        return

    }

    pointList.forEach(i => i.y)

    const { indexGroup, faceGroup, uvGroup } = multShapeGroup(pointList, 'face')

    if (drawParams.drawPointList.length > 2 && !drawParams.mesh) {

        const geometry = multShapePlaneGeometry(faceGroup, indexGroup, uvGroup)

        const material = getMaterial(drawParams.materialType, { color: 0xffffff })

        const mesh = new THREE.Mesh(geometry, material)

        mesh.isDrawMesh = true

        mesh.drawParams = drawParams

        drawParams.mesh = mesh

        scene.add(drawParams.mesh)

        drawParams.callback?.('set')

    }

    else if (drawParams.mesh) updateMultShapePlaneGeometry(drawParams.mesh.geometry, faceGroup, indexGroup, uvGroup)

    if (drawParams.drawPointList.length > 2) {
        drawParams.areaData = calculatePolygonAreaAndPerimeter(drawParams.drawPointList);
    }

    // 计算多边形面积
    function calculatePolygonAreaAndPerimeter(points) {
        if (points.length < 3) {
            console.warn('至少需要3个点才能形成平面!');
            return {
                isValid: false
            };
        }

        if (!arePointsCoplanar(points)) {
            console.warn('点不共面，使用三角形剖分法计算近似面积');
        }

        // 使用三角形剖分法（最准确）
        const triangleArea = triangulationArea(points);

        // 使用投影法作为验证
        const projectionAreaValue = projectionArea(points);

        // 使用空间鞋带公式
        const shoelaceArea = spaceShoelaceFormula(points);

        const avgArea = (triangleArea + projectionAreaValue + shoelaceArea) / 3;
        // 计算差异率
        const maxDiff = Math.max(
            Math.abs(triangleArea - avgArea) / avgArea,
            Math.abs(projectionAreaValue - avgArea) / avgArea,
            Math.abs(shoelaceArea - avgArea) / avgArea
        );

        let formattedRealArea = '';
        if (drawParams.scaleConfig.enabled) {
            // 实际面积 = 场景面积 * (转换因子)²
            formattedRealArea = formatAreaWithUnit(avgArea * Math.pow(drawParams.scaleConfig.conversionFactor, 2), drawParams.scaleConfig.realWorldUnit, drawParams.scaleConfig.precision);
        } else {
            formattedRealArea = avgArea.toFixed(drawParams.scaleConfig.precision) + '单位²';
        }
        // console.log('formattedRealArea', formattedRealArea);

        return {
            area: triangleArea, // 三角形剖分法
            projectionArea: projectionAreaValue, // 投影法
            shoelaceArea: shoelaceArea, // 空间鞋带公式
            isValid: true, // 面积有效
            pointCount: points.length, // 点的数量
            isCoplanar: arePointsCoplanar(points), // 是否共面
            accuracy: maxDiff < 0.01 ? 'high' : maxDiff < 0.05 ? 'medium' : 'low', // 精度等级
            formattedRealArea: formattedRealArea, // 格式化实际面积
            areaVariance: maxDiff // 面积差异率
        };
    }
}

