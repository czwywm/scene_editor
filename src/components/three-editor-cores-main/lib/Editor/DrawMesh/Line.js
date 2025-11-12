import { createLine2FromPoints } from '../../Api/ThreeApi'

export function setUpdateLineMesh(scene, drawParams) {

    const { drawPointList } = drawParams

    if (drawPointList.length < 2) {

        if (drawParams.mesh) {

            scene.remove(drawParams.mesh)

            drawParams.mesh = null

            drawParams.callback?.('remove')

        }

        return

    }

    const formatPoints = drawParams.drawPointList.reduce((i, j) => [...i, j.x, j.y + 0.01, j.z], [])

    if (!drawParams.mesh && drawParams.drawPointList.length > 1) {

        const mesh = createLine2FromPoints(formatPoints)

        mesh.isDrawMesh = true

        mesh.drawParams = drawParams

        drawParams.mesh = mesh

        scene.add(drawParams.mesh)

        drawParams.callback?.('set')

    }

    else if (drawParams.mesh && drawParams.drawPointList.length > 0) {

        drawParams.mesh.geometry.dispose()

        drawParams.mesh.geometry.setPositions(formatPoints)

        drawParams.mesh.computeLineDistances()

        drawParams.mesh.geometry.attributes.position.needsUpdate = true

    }

    if (drawParams.drawPointList.length > 1) {
        const lengthData = calculateEdgeLengths(drawParams.drawPointList);
        drawParams.lineEdgeLengths = lengthData;
    }

}


function calculateEdgeLengths(points) {
    const edgeLengths = [];
    const totalLength = { value: 0 };

    for (let i = 0; i < points.length - 1; i++) {
        const start = points[i];
        const end = points[i + 1];
        const distance = start.distanceTo(end);
        edgeLengths.push({
            start: `点${i} (${start.x.toFixed(2)}, ${start.y.toFixed(2)}, ${start.z.toFixed(2)})`,
            end: `点${i + 1} (${end.x.toFixed(2)}, ${end.y.toFixed(2)}, ${end.z.toFixed(2)})`,
            length: distance,
            formattedLength: distance.toFixed(2)
        });

        totalLength.value += distance;
    }

    const lineEdgeLengths = {
        edges: edgeLengths,
        totalLength: totalLength.value,
        formattedTotalLength: totalLength.value.toFixed(2)
    };

    return lineEdgeLengths;
}