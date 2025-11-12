import * as THREE from 'three';


/* 格式化面积显示（自动选择合适单位）  */
export function formatAreaWithUnit(area, baseUnit, precision) {
    let value = area;
    let unit = baseUnit;

    // 根据面积大小自动调整单位
    if (baseUnit === '米') {
        if (area >= 1000000) {
            value = area / 1000000;
            unit = '千米';
        } else if (area >= 10000) {
            value = area / 10000;
            unit = '公顷';
        } else if (area < 0.01) {
            value = area * 10000;
            unit = '厘米';
        }
    } else if (baseUnit === '厘米') {
        if (area >= 10000) {
            value = area / 10000;
            unit = '米';
        }
    } else if (baseUnit === '毫米') {
        if (area >= 1000000) {
            value = area / 1000000;
            unit = '米';
        } else if (area >= 100) {
            value = area / 100;
            unit = '厘米';
        }
    }

    return `${value.toFixed(precision)} ${unit}²`;
}


/* 检查点是否共面  */
export function arePointsCoplanar(points, tolerance = 0.001) {
    if (points.length < 4) return true;

    // 取前三个点确定平面
    const p0 = points[0];
    const p1 = points[1];
    const p2 = points[2];

    // 计算平面法向量
    const v1 = new THREE.Vector3().subVectors(p1, p0);
    const v2 = new THREE.Vector3().subVectors(p2, p0);
    const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();

    // 平面方程: normal · (p - p0) = 0
    // 检查其他点是否在平面上
    for (let i = 3; i < points.length; i++) {
        const v = new THREE.Vector3().subVectors(points[i], p0);
        const distance = Math.abs(v.dot(normal));
        if (distance > tolerance) {
            return false;
        }
    }

    return true;
}

/* 三角形剖分法计算面积  */
export function triangulationArea(points) {
    let totalArea = 0;
    const n = points.length;

    // 以第一个点为基准，将多边形剖分为三角形
    for (let i = 1; i < n - 1; i++) {
        const triangleArea = calculateTriangleArea(
            points[0],
            points[i],
            points[i + 1]
        );
        totalArea += triangleArea;
    }

    return totalArea;
}

// 计算三角形面积（使用向量叉积）
function calculateTriangleArea(a, b, c) {
    // 计算两个边向量
    const ab = new THREE.Vector3().subVectors(b, a);
    const ac = new THREE.Vector3().subVectors(c, a);

    // 计算叉积（得到面积向量的模）
    const cross = new THREE.Vector3().crossVectors(ab, ac);

    // 三角形面积 = 叉积模长的一半
    return cross.length() / 2;
}

/* 投影法计算面积  */
export function projectionArea(points) {
    // 计算多边形所在平面的法向量
    const normal = calculatePolygonNormal(points);

    // 选择投影平面（选择法向量分量最大的轴）
    const axis = getDominantAxis(normal);

    // 投影到选定的平面并计算面积
    const projectedPoints = projectPointsToPlane(points, axis);

    // 使用二维鞋带公式计算投影面积
    const projectedArea = calculate2DPolygonArea(projectedPoints);

    // 根据投影角度修正面积
    const correctionFactor = 1 / Math.abs(normal.dot(getAxisVector(axis)));
    return projectedArea * correctionFactor;
}

// 计算多边形法向量
function calculatePolygonNormal(points) {
    const normal = new THREE.Vector3(0, 0, 0);

    for (let i = 0; i < points.length; i++) {
        const current = points[i];
        const next = points[(i + 1) % points.length];
        const nextNext = points[(i + 2) % points.length];

        const v1 = new THREE.Vector3().subVectors(next, current);
        const v2 = new THREE.Vector3().subVectors(nextNext, next);

        const faceNormal = new THREE.Vector3().crossVectors(v1, v2);
        normal.add(faceNormal);
    }

    return normal.normalize();
}

// 获取主导轴
function getDominantAxis(normal) {
    const absX = Math.abs(normal.x);
    const absY = Math.abs(normal.y);
    const absZ = Math.abs(normal.z);

    if (absX >= absY && absX >= absZ) return 'x';
    if (absY >= absX && absY >= absZ) return 'y';
    return 'z';
}

// 投影点到平面
function projectPointsToPlane(points, axis) {
    return points.map(point => {
        switch (axis) {
            case 'x': return { x: point.y, y: point.z }; // 投影到YZ平面
            case 'y': return { x: point.x, y: point.z }; // 投影到XZ平面
            case 'z': return { x: point.x, y: point.y }; // 投影到XY平面
        }
    });
}

// 获取轴向量
function getAxisVector(axis) {
    switch (axis) {
        case 'x': return new THREE.Vector3(1, 0, 0);
        case 'y': return new THREE.Vector3(0, 1, 0);
        case 'z': return new THREE.Vector3(0, 0, 1);
    }
}

// 二维鞋带公式（用于投影法）
function calculate2DPolygonArea(points) {
    let area = 0;
    const n = points.length;

    for (let i = 0; i < n; i++) {
        const current = points[i];
        const next = points[(i + 1) % n];
        area += current.x * next.y - next.x * current.y;
    }

    return Math.abs(area) / 2;
}


/* 空间鞋带公式（基于法向量） */
export function spaceShoelaceFormula(points) {
    // 计算法向量
    const normal = calculatePolygonNormal(points);

    let area = 0;
    const n = points.length;

    for (let i = 0; i < n; i++) {
        const current = points[i];
        const next = points[(i + 1) % n];

        // 使用法向量和边向量的叉积
        const edge = new THREE.Vector3().subVectors(next, current);
        const cross = new THREE.Vector3().crossVectors(edge, normal);

        area += current.dot(cross);
    }

    return Math.abs(area) / 2;
}