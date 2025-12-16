import * as THREE from 'three'
import { getMaterial } from '../Group/Mesh/Material/MaterialChunk'

/* 墙壁物体 */
export function setUpdateWallMesh(scene, drawParams) {

    const pointList = [...drawParams.drawPointList]

    if (pointList.length < 2) {

        if (drawParams.mesh) {

            scene.remove(drawParams.mesh)

            drawParams.mesh = null

            drawParams.callback?.('remove')

        }

        return

    }

    if (drawParams.wallClose && drawParams.drawPointList.length > 2) pointList.push(drawParams.drawPointList[0])

    // 创建墙壁的顶点列表，考虑墙壁厚度
    const formatPoints = []
    for (let i = 0; i < pointList.length - 1; i++) {
        const current = pointList[i]
        const next = pointList[i + 1]

        // 计算方向向量
        const direction = new THREE.Vector3().subVectors(next, current).normalize()
        // 计算垂直向量（墙壁厚度方向）
        const perpendicular = new THREE.Vector3(direction.z, 0, -direction.x).normalize()

        // 根据墙壁厚度计算偏移量
        const offset = perpendicular.multiplyScalar(drawParams.wallThickness / 2)

        // 创建8个顶点：每个线段生成一个完整的长方体片段
        // 顶部外点
        const v1 = new THREE.Vector3().copy(current).add(offset)
        v1.y += drawParams.wallHeight
        // 顶部外点
        const v2 = new THREE.Vector3().copy(next).add(offset)
        v2.y += drawParams.wallHeight
        // 顶部内点
        const v3 = new THREE.Vector3().copy(next).sub(offset)
        v3.y += drawParams.wallHeight
        // 顶部内点
        const v4 = new THREE.Vector3().copy(current).sub(offset)
        v4.y += drawParams.wallHeight
        // 底部外点
        const v5 = new THREE.Vector3().copy(current).add(offset)
        // 底部外点
        const v6 = new THREE.Vector3().copy(next).add(offset)
        // 底部内点
        const v7 = new THREE.Vector3().copy(next).sub(offset)
        // 底部内点
        const v8 = new THREE.Vector3().copy(current).sub(offset)

        // 添加到格式点列表
        formatPoints.push(v1, v2, v3, v4, v5, v6, v7, v8)
    }

    if (formatPoints.length > 3 && !drawParams.mesh) {

        const geometry = new THREE.BufferGeometry()
        const vertices = []
        const indices = []

        // 构建顶点和索引
        for (let i = 0; i < formatPoints.length; i += 8) {
            const v1 = formatPoints[i]
            const v2 = formatPoints[i + 1]
            const v3 = formatPoints[i + 2]
            const v4 = formatPoints[i + 3]
            const v5 = formatPoints[i + 4]
            const v6 = formatPoints[i + 5]
            const v7 = formatPoints[i + 6]
            const v8 = formatPoints[i + 7]

            // 添加所有8个顶点
            vertices.push(v1.x, v1.y, v1.z)
            vertices.push(v2.x, v2.y, v2.z)
            vertices.push(v3.x, v3.y, v3.z)
            vertices.push(v4.x, v4.y, v4.z)
            vertices.push(v5.x, v5.y, v5.z)
            vertices.push(v6.x, v6.y, v6.z)
            vertices.push(v7.x, v7.y, v7.z)
            vertices.push(v8.x, v8.y, v8.z)

            // 为每个长方体片段添加索引
            const baseIndex = (i / 8) * 8

            // 顶面
            indices.push(
                baseIndex, baseIndex + 1, baseIndex + 2,
                baseIndex, baseIndex + 2, baseIndex + 3
            )

            // 底面
            indices.push(
                baseIndex + 4, baseIndex + 5, baseIndex + 6,
                baseIndex + 4, baseIndex + 6, baseIndex + 7
            )

            // 前面（外部）
            indices.push(
                baseIndex, baseIndex + 1, baseIndex + 5,
                baseIndex, baseIndex + 5, baseIndex + 4
            )

            // 后面（内部）
            indices.push(
                baseIndex + 3, baseIndex + 2, baseIndex + 6,
                baseIndex + 3, baseIndex + 6, baseIndex + 7
            )

            // 左面（起始端）
            indices.push(
                baseIndex + 3, baseIndex, baseIndex + 4,
                baseIndex + 3, baseIndex + 4, baseIndex + 7
            )

            // 右面（结束端）
            indices.push(
                baseIndex + 2, baseIndex + 1, baseIndex + 5,
                baseIndex + 2, baseIndex + 5, baseIndex + 6
            )
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
        geometry.setIndex(indices)
        geometry.computeVertexNormals()

        const material = getMaterial(drawParams.materialType)

        const mesh = new THREE.Mesh(geometry, material)

        mesh.isDrawMesh = true

        mesh.drawParams = drawParams

        drawParams.mesh = mesh

        scene.add(drawParams.mesh)

        drawParams.callback?.('set')

    }

    else if (drawParams.mesh) {
        // 更新现有网格
        const geometry = drawParams.mesh.geometry
        const vertices = []
        const indices = []

        // 重新构建顶点和索引
        for (let i = 0; i < formatPoints.length; i += 8) {
            const v1 = formatPoints[i]
            const v2 = formatPoints[i + 1]
            const v3 = formatPoints[i + 2]
            const v4 = formatPoints[i + 3]
            const v5 = formatPoints[i + 4]
            const v6 = formatPoints[i + 5]
            const v7 = formatPoints[i + 6]
            const v8 = formatPoints[i + 7]

            // 添加所有8个顶点
            vertices.push(v1.x, v1.y, v1.z)
            vertices.push(v2.x, v2.y, v2.z)
            vertices.push(v3.x, v3.y, v3.z)
            vertices.push(v4.x, v4.y, v4.z)
            vertices.push(v5.x, v5.y, v5.z)
            vertices.push(v6.x, v6.y, v6.z)
            vertices.push(v7.x, v7.y, v7.z)
            vertices.push(v8.x, v8.y, v8.z)

            // 为每个长方体片段添加索引
            const baseIndex = (i / 8) * 8

            // 顶面
            indices.push(
                baseIndex, baseIndex + 1, baseIndex + 2,
                baseIndex, baseIndex + 2, baseIndex + 3
            )

            // 底面
            indices.push(
                baseIndex + 4, baseIndex + 5, baseIndex + 6,
                baseIndex + 4, baseIndex + 6, baseIndex + 7
            )

            // 前面（外部）
            indices.push(
                baseIndex, baseIndex + 1, baseIndex + 5,
                baseIndex, baseIndex + 5, baseIndex + 4
            )

            // 后面（内部）
            indices.push(
                baseIndex + 3, baseIndex + 2, baseIndex + 6,
                baseIndex + 3, baseIndex + 6, baseIndex + 7
            )

            // 左面（起始端）
            indices.push(
                baseIndex + 3, baseIndex, baseIndex + 4,
                baseIndex + 3, baseIndex + 4, baseIndex + 7
            )

            // 右面（结束端）
            indices.push(
                baseIndex + 2, baseIndex + 1, baseIndex + 5,
                baseIndex + 2, baseIndex + 5, baseIndex + 6
            )
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
        geometry.setIndex(indices)
        geometry.computeVertexNormals()
        geometry.attributes.position.needsUpdate = true
        geometry.attributes.normal.needsUpdate = true
        geometry.index.needsUpdate = true
    }
}