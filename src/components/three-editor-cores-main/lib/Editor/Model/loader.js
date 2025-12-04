import { loadFBX, loadGLTF, loadOBJ } from '../../Api/ThreeApi'

/* 加载物体  设置物体参数 GUI管理 */
export function loadModel(url, type, point, dracoPath, callback = () => { }) {

    switch (type) {

        case 'gltf':

            return loadGLTF(url, point, dracoPath, mesh => callback(mesh))

        case 'fbx':

            return loadFBX(url, mesh => callback(mesh))

        case 'obj':

            return loadOBJ(url, mesh => callback(mesh))

        case 'glb':

            return loadGLTF(url, point, dracoPath, mesh => callback(mesh))

    }

}