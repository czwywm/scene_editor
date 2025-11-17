import { loadModel } from './Model/loader.js'
import { resolveGroup, getGroupStorage, setGroupStorage, setGroupPanel } from './Group/Group.js'
import { animationPlay } from './Model/Animation.js'

export const modelControls = {

    rootFolder: null,

    sceneInsertModel: null,

    animationPlay

}

/* install */
export function modelControlsInstall(scene, controls, transformControls, Composer, MixerList) {

    modelControls.sceneInsertModel = (dracoPath, rootInfo, params) => {

        const { url, type, point, name } = rootInfo

        return loadModel(url, type, point, dracoPath, model => {

            scene.add(resolveGroup(model))

            model.rootInfo = rootInfo

            setGroupStorage(MixerList, model, params)

            modelControls.rootFolder && setGroupPanel(controls, transformControls, Composer, MixerList, model, modelControls.rootFolder.addFolder((name || model.name) + model.id))

        })

    }

}

export function getModelControlsStorage(list) {

    return list.map(i => getGroupStorage(i))

}

/* 模型控制 */
export function setModelControlsPanel(modelControls, folder) {

    modelControls.rootFolder = folder

}

