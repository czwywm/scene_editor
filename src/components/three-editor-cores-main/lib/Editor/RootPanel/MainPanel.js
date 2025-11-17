import * as dat from 'dat.gui'

let dialogInstance = null;
let guiInstance = null;
let guiComponent = null;

export function setMainPanel(proxy, autoPlace) {

    dat.GUI.TEXT_CLOSED = '收起场景配置'

    dat.GUI.TEXT_OPEN = '展开场景配置'

    const ProxyGUI = {
        open: () => ProxyGUI,

        close: () => ProxyGUI,

        destroy: () => ProxyGUI,

        add: () => ProxyGUI,

        remove: () => ProxyGUI,

        addFolder: () => ProxyGUI,

        removeFolder: () => ProxyGUI,

        addColor: () => ProxyGUI,

        removeColor: () => ProxyGUI,

        min: () => ProxyGUI,

        max: () => ProxyGUI,

        step: () => ProxyGUI,

        name: () => ProxyGUI,

        listen: () => ProxyGUI,

        onChange: () => ProxyGUI,

        onFinishChange: () => ProxyGUI,

        addFolder: () => ProxyGUI,

        updateDisplay: () => ProxyGUI,

        domElement: () => ProxyGUI,
        // domElement: document.createElement('div'),

    }

    const GUI = proxy ? ProxyGUI : new dat.GUI({ autoPlace })

    if (!proxy) {
        GUI.__closeButton?.remove()
    }

    guiInstance = GUI;
    guiComponent = GUI.domElement;

    guiComponent.style.display = 'none';

    return GUI;

}

export function openControlPanel() {
    if (!guiComponent) {
        console.error('GUI组件未初始化，请先调用setMainPanel');
        return;
    }

    if (dialogInstance) {
        dialogInstance.style.display = 'block';
        if (guiComponent) guiComponent.style.display = 'block';
        return;
    }

    guiComponent.style.display = 'block';
    createDialog(guiComponent);
}

export function hideControlPanel() {
    if (dialogInstance && guiComponent) {
        dialogInstance.style.display = 'none';
    }
    if (guiComponent) {
        guiComponent.style.display = 'none';
    }
}

const createDialog = (component) => {

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '60px';
    container.style.right = '60px';
    container.style.zIndex = '1000';
    container.style.minWidth = '245px';
    container.style.backgroundColor = '#1a1a1a';
    container.style.border = '0.5px solid #6f6f6f';
    container.style.borderRadius = '4px';
    container.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    container.style.overflow = 'hidden';
    container.style.cursor = 'move';

    // 创建标题栏
    const titleBar = document.createElement('div');
    titleBar.style.padding = '4px 8px';
    titleBar.style.backgroundColor = '#2c2c2c';
    titleBar.style.color = 'white';
    titleBar.style.fontSize = '12px';
    titleBar.style.userSelect = 'none';
    titleBar.style.cursor = 'move';
    titleBar.style.display = 'flex';
    titleBar.style.justifyContent = 'space-between';
    titleBar.style.alignItems = 'center';

    // 标题文本
    const titleText = document.createElement('span');
    titleText.textContent = '3D-配置';
    titleBar.appendChild(titleText);

    // 关闭按钮
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;'; // × 符号
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.color = 'white';
    closeButton.style.fontSize = '16px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.padding = '0';
    closeButton.style.width = '24px';
    closeButton.style.height = '24px';
    closeButton.style.display = 'flex';
    closeButton.style.alignItems = 'center';
    closeButton.style.justifyContent = 'center';
    closeButton.style.borderRadius = '50%';

    // 关闭按钮悬停效果
    closeButton.addEventListener('mouseenter', () => {
        closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    });
    closeButton.addEventListener('mouseleave', () => {
        closeButton.style.backgroundColor = 'transparent';
    });

    // 点击关闭功能
    closeButton.addEventListener('click', (e) => {
        e.stopPropagation(); // 防止触发拖拽
        closeDialog(); // 调用关闭函数
    });

    titleBar.appendChild(closeButton);

    // 内容区域
    const content = document.createElement('div');
    content.style.padding = '0px';
    content.style.maxHeight = '400px';
    content.style.overflowY = 'auto';

    content.appendChild(component);
    container.appendChild(titleBar);
    container.appendChild(content);
    document.body.appendChild(container);

    dialogInstance = container;

    // 添加拖拽功能
    makeDraggable(container, titleBar);

    // 关闭对话框的函数
    function closeDialog() {
        if (dialogInstance) {
            // 隐藏而不是移除，以便下次可以快速显示
            hideControlPanel();
        }
    }
};

// 拖拽功能实现
const makeDraggable = (container, handle) => {
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    handle.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
        // 如果点击的是关闭按钮，不触发拖拽
        if (e.target.tagName === 'BUTTON' || e.target.parentElement?.tagName === 'BUTTON') {
            return;
        }

        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;

        if (e.target === handle || handle.contains(e.target)) {
            isDragging = true;
        }
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;

            xOffset = currentX;
            yOffset = currentY;

            setTranslate(currentX, currentY, container);
        }
    }

    function dragEnd(e) {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
    }

    function setTranslate(xPos, yPos, el) {
        el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
    }
};

// 提供外部函数来检查和控制拖拽框状态
export const controlPanelManager = {
    // 检查控制面板是否打开
    isOpen: () => dialogInstance && dialogInstance.style.display !== 'none',

    // 显示控制面板
    open: () => openControlPanel(),

    // 隐藏控制面板
    hide: () => hideControlPanel(),

    // 获取GUI实例
    getGUI: () => guiInstance,

    // 完全销毁（移除DOM元素）
    destroy: () => {
        if (dialogInstance) {
            dialogInstance.remove();
            dialogInstance = null;
        }
        if (guiInstance && typeof guiInstance.destroy === 'function') {
            guiInstance.destroy();
        }
        guiInstance = null;
        guiComponent = null;
    }
};