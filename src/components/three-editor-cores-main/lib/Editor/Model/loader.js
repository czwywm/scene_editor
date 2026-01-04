import { loadFBX, loadGLTF, loadOBJ, loadCustomGeometry } from '../../Api/ThreeApi'

/* 加载物体  设置物体参数 GUI管理 */
export function loadModel(url, type, point, dracoPathOrRootInfo, callback = () => { }) {

    switch (type) {

        case 'gltf':

            return loadGLTF(url, point, dracoPathOrRootInfo, mesh => callback(mesh))

        case 'fbx':

            return loadFBX(url, mesh => callback(mesh))

        case 'obj':

            return loadOBJ(url, mesh => callback(mesh))

        case 'glb':

            return loadGLTF(url, point, dracoPathOrRootInfo, mesh => callback(mesh))

        case 'custom':
            // 自定义几何体需要特殊处理，第4个参数是rootInfo
            return loadCustomGeometry(dracoPathOrRootInfo, mesh => callback(mesh))

        default:
            // 对于不支持的模型类型，返回一个默认的loaderService对象
            // 避免在设置complete属性时出现TypeError
            return { progress: () => { }, complete: () => { } }

    }

}
