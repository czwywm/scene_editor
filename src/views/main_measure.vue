<template>
  <div class="container">
    <div ref="container" class="three-container"></div>
    <div class="controls">
      <button @click="startDistanceMeasurement">距离测量</button>
      <button @click="startAreaMeasurement">面积测量</button>
      <button @click="clearMeasurements">清除所有</button>
      <div class="measurement-info">{{ measurementInfo }}</div>
    </div>
    <div class="instructions">{{ instructions }}</div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from "vue";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export default {
  name: "ModelMeasurementTool",
  setup() {
    const container = ref(null);
    let scene, camera, renderer, controls, raycaster, mouse;

    // 测量状态
    const isMeasuring = ref(false);
    const measurementType = ref("distance");
    const measurementPoints = ref([]);
    const measurementInfo = ref("");
    const instructions = ref("点击按钮开始测量");

    // 图形对象引用
    let measurementLine = null;
    let tempLine = null;
    let previewLine = null;
    const measurementMarkers = [];
    const measurementLabels = [];

    // 模型对象集合（用于射线检测）
    const modelObjects = [];

    // 初始化场景
    const initScene = () => {
      if (!container.value) return;

      // 创建场景
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x333333);

      // 创建相机
      camera = new THREE.PerspectiveCamera(
        45,
        container.value.clientWidth / container.value.clientHeight,
        1,
        10000
      );
      camera.position.set(300, 300, 300);

      // 创建渲染器
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(
        container.value.clientWidth,
        container.value.clientHeight
      );
      container.value.appendChild(renderer.domElement);

      // 添加控制器
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;

      // 添加光源
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(1, 1, 1);
      scene.add(directionalLight);

      // // 添加坐标轴辅助
      // const axesHelper = new THREE.AxesHelper(5);
      // scene.add(axesHelper);

      // // 创建一个测试模型（立方体）
      // const geometry = new THREE.BoxGeometry(4, 2, 3);
      // const material = new THREE.MeshStandardMaterial({
      //   color: 0x00ff00,
      //   side: THREE.DoubleSide,
      //   wireframe: false,
      // });
      // const cube = new THREE.Mesh(geometry, material);
      // scene.add(cube);
      // modelObjects.push(cube); // 添加到模型集合

      // 初始化测量工具
      raycaster = new THREE.Raycaster();
      mouse = new THREE.Vector2();

      // 开始动画循环
      animate();
    };

    const initGltf = (threepath) => {
      // scene = new THREE.Scene();
      var dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath("./draco/gltf/");
      //创建一个物体（形状）
      const loader = new GLTFLoader();
      loader.setDRACOLoader(dracoLoader);
      loader.load(threepath, function (gltf) {
        // modelGroup.push(gltf);
        // console.log("gltf", gltf);
        const group = new THREE.Group();
        group.add(gltf.scene);
        // 添加模型
        scene.add(gltf.scene);
        modelObjects.push(gltf.scene);
        // 计算模型尺寸
        let size = computerModelSize(gltf);
        // 重新设置模型的位置，使之居中。
        // gltf.scene.position.x = gltf.scene.position.x - size.center.x;
        // gltf.scene.position.y = gltf.scenep.position.y - size.center.y;
        // gltf.scene.position.z = group.position.z - size.center.z;
        gltf.scene.scale.set(300, 300, 300);
        // 修改材质
        changeMaterial(gltf);
      });
    };

    const changeMaterial = (gltf) => {
      gltf.scene.traverse(function (obj) {
        var material = new THREE.MeshBasicMaterial({
          color: 0x32a4e5, // 本身的颜色
          transparent: true, //开启透明
          opacity: 1, //设置透明度
          side: THREE.DoubleSide,
        });

        var material1 = new THREE.MeshBasicMaterial({
          color: 0x95fb98, // 本身的颜色
          transparent: true, //开启透明
          opacity: 0.6, //设置透明度
          side: THREE.DoubleSide,
        });

        var material2 = new THREE.MeshBasicMaterial({
          color: 0x8470ff, // 本身的颜色
          transparent: true, //开启透明
          opacity: 0.6, //设置透明度
          side: THREE.DoubleSide,
        });

        obj.children.forEach(function (child) {
          // console.log(child);
          // console.log(child.name.split("_")[1]);
          child.material = material;
          if (child.name.split("_")[1]) {
            let num = child.name.split("_")[1];
            // child.id = "C4" + num;
            // console.log("num", num);
            if (num === "29" || num === "28") {
              child.material = material;
            } else if (parseInt(num) % 3 === 0) {
              child.material = material1;
            } else {
              child.material = material2;
            }
          } else {
          }
        });

        // object 为要添加效果的object
        const geometry = new THREE.EdgesGeometry(obj.geometry);
        // 获取物体的世界坐标 旋转等
        const worldPosition = new THREE.Vector3();
        obj.getWorldPosition(worldPosition);
        // const lineMaterial = new THREE.LineBasicMaterial({
        //   color: 0x0a4091,
        //   linewidth: 1,
        //   linecap: "round", //ignored by WebGLRenderer
        //   linejoin: "round", //ignored by WebGLRenderer
        // });
        // const line = new THREE.LineSegments(geometry, lineMaterial);
        // line.name = "surroundLine";
        // line.scale.copy(obj.scale);
        // line.rotation.copy(obj.rotation);
        // line.position.copy(worldPosition);
        // scene.add(line);

        renderer.render(scene, camera);

        // document.body.addEventListener("mousedown", onMousedown, false);
        // document.body.addEventListener("mousemove", onMousemove, false);
      });
    };

    const computerModelSize = (gltf) => {
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const x = box.max.x - box.min.x;
      const y = box.max.y - box.min.y;
      const z = box.max.z - box.min.z;
      //scaleV3表示包围盒的几何体中心
      var center = new THREE.Vector3();
      // .getCenter()计算一个层级模型对应包围盒的几何体中心
      box.getCenter(center);
      // 查看控制台包围盒集合中心，作为lookAt()参数

      const modelSize = {
        x,
        y,
        z,
        center,
      };

      return modelSize;
    };

    // 动画循环
    const animate = () => {
      requestAnimationFrame(animate);

      // 更新预览线
      if (isMeasuring.value && measurementPoints.value.length > 0) {
        updatePreviewLine();
      }

      controls.update();
      renderer.render(scene, camera);
    };

    // 更新预览线
    const updatePreviewLine = () => {
      if (!mouse.x || !mouse.y) return;

      const intersectPoint = getIntersectPoint(mouse.x, mouse.y);
      if (!intersectPoint) return;

      const points = [...measurementPoints.value, intersectPoint];

      // 创建或更新预览线
      if (!previewLine) {
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineDashedMaterial({
          color: 0xffff00,
          dashSize: 0.2,
          gapSize: 0.1,
          linewidth: 2,
        });
        previewLine = new THREE.Line(geometry, material);
        previewLine.computeLineDistances();
        scene.add(previewLine);
      } else {
        previewLine.geometry.setFromPoints(points);
        previewLine.geometry.attributes.position.needsUpdate = true;
        previewLine.computeLineDistances();
      }

      // 更新当前距离显示
      if (
        measurementType.value === "distance" &&
        measurementPoints.value.length >= 1
      ) {
        const currentDistance =
          measurementPoints.value[
            measurementPoints.value.length - 1
          ].distanceTo(intersectPoint);
        measurementInfo.value = `当前距离: ${currentDistance.toFixed(2)} 单位`;
      }
    };

    // 获取鼠标与模型的交点
    const getIntersectPoint = (clientX, clientY) => {
      if (!container.value) return null;

      // 计算鼠标位置归一化坐标
      const rect = container.value.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      const intersects = raycaster.intersectObjects(modelObjects, true);

      return intersects.length > 0 ? intersects[0].point : null;
    };

    // 创建文本标签
    const createLabel = (text, position) => {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 128;
      const context = canvas.getContext("2d");

      context.fillStyle = "rgba(0, 0, 0, 0.7)";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.font = "24px Arial";
      context.fillStyle = "white";
      context.textAlign = "center";
      context.fillText(text, canvas.width / 2, canvas.height / 2);

      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(material);
      sprite.position.copy(position);
      sprite.scale.set(0.5, 0.25, 1);
      sprite.center.set(0.5, 0.5);
      scene.add(sprite);
      measurementLabels.push(sprite);
      return sprite;
    };

    // 创建测量线
    const createLine = (points, closed = false) => {
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0xff0000,
        linewidth: 2,
      });

      if (closed && points.length >= 3) {
        // 对于闭合区域，创建一个填充面
        const shape = new THREE.Shape();
        shape.moveTo(points[0].x, points[0].z);
        for (let i = 1; i < points.length; i++) {
          shape.lineTo(points[i].x, points[i].z);
        }
        shape.lineTo(points[0].x, points[0].z);

        const geometry = new THREE.ShapeGeometry(shape);
        const mesh = new THREE.Mesh(
          geometry,
          new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
          })
        );
        mesh.position.y = points[0].y;
        scene.add(mesh);
        return mesh;
      } else {
        return new THREE.Line(lineGeometry, lineMaterial);
      }
    };

    // 计算距离
    const calculateDistance = (points) => {
      let totalDistance = 0;
      for (let i = 1; i < points.length; i++) {
        totalDistance += points[i - 1].distanceTo(points[i]);
      }
      return totalDistance;
    };

    // 计算面积（使用鞋带公式）
    const calculateArea = (points) => {
      if (points.length < 3) return 0;

      let area = 0;
      const n = points.length;

      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += points[i].x * points[j].z;
        area -= points[j].x * points[i].z;
      }

      return Math.abs(area / 2);
    };

    // 清除所有测量
    const clearMeasurements = () => {
      if (measurementLine) {
        scene.remove(measurementLine);
        measurementLine = null;
      }

      if (previewLine) {
        scene.remove(previewLine);
        previewLine = null;
      }

      if (tempLine) {
        scene.remove(tempLine);
        tempLine = null;
      }

      measurementMarkers.forEach((marker) => scene.remove(marker));
      measurementMarkers.length = 0;

      measurementLabels.forEach((label) => scene.remove(label));
      measurementLabels.length = 0;

      measurementPoints.value = [];
      measurementInfo.value = "";
      instructions.value = "点击按钮开始测量";
      isMeasuring.value = false;
    };

    // 完成测量
    const completeMeasurement = () => {
      if (measurementPoints.value.length < 2) return;

      // 面积测量至少需要3个点
      if (
        measurementType.value === "area" &&
        measurementPoints.value.length < 3
      ) {
        instructions.value = "面积测量需要至少3个点";
        return;
      }

      // 移除预览线
      if (previewLine) {
        scene.remove(previewLine);
        previewLine = null;
      }

      // 计算并显示结果
      if (measurementType.value === "distance") {
        const totalDistance = calculateDistance(measurementPoints.value);
        measurementInfo.value = `总距离: ${totalDistance.toFixed(2)} 单位`;

        // 添加分段距离标签
        for (let i = 1; i < measurementPoints.value.length; i++) {
          const distance = measurementPoints.value[i - 1].distanceTo(
            measurementPoints.value[i]
          );
          const midPoint = new THREE.Vector3().lerpVectors(
            measurementPoints.value[i - 1],
            measurementPoints.value[i],
            0.5
          );
          createLabel(`${distance.toFixed(2)}`, midPoint);
        }
      } else if (measurementType.value === "area") {
        const area = calculateArea(measurementPoints.value);
        measurementInfo.value = `面积: ${area.toFixed(2)} 平方单位`;

        // 添加面积标签
        const center = new THREE.Vector3();
        measurementPoints.value.forEach((point) => center.add(point));
        center.divideScalar(measurementPoints.value.length);
        createLabel(`面积: ${area.toFixed(2)}`, center);
      }

      // 创建最终测量线
      const closed =
        measurementType.value === "area" && measurementPoints.value.length >= 3;
      measurementLine = createLine(measurementPoints.value, closed);
      scene.add(measurementLine);

      isMeasuring.value = false;
      instructions.value = "测量完成";
    };

    // 鼠标点击事件
    const onMouseClick = (event) => {
      if (!isMeasuring.value || !container.value) return;

      const intersectPoint = getIntersectPoint(event.clientX, event.clientY);
      if (!intersectPoint) return;

      measurementPoints.value.push(intersectPoint.clone());

      // 添加点标记
      const markerGeometry = new THREE.SphereGeometry(0.05, 16, 16);
      const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.copy(intersectPoint);
      scene.add(marker);
      measurementMarkers.push(marker);

      // 添加序号标签
      createLabel(
        `${measurementPoints.value.length}`,
        intersectPoint.clone().add(new THREE.Vector3(0, 0.1, 0))
      );

      // 更新临时线（已有点之间的连线）
      if (tempLine) scene.remove(tempLine);
      if (measurementPoints.value.length > 1) {
        tempLine = createLine(measurementPoints.value);
        scene.add(tempLine);
      }

      // 更新指令
      if (measurementType.value === "distance") {
        instructions.value = "继续点击添加点，双击完成测量";
      } else {
        instructions.value =
          measurementPoints.value.length < 3
            ? "继续点击添加点（至少3个），双击完成测量"
            : "继续点击添加点，双击完成测量";
      }
    };

    // 鼠标移动事件
    const onMouseMove = (event) => {
      if (!isMeasuring.value || !container.value) return;

      // 更新鼠标位置用于预览
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    };

    // 双击完成测量
    const onDoubleClick = (event) => {
      if (isMeasuring.value && measurementPoints.value.length >= 2) {
        completeMeasurement();
      }
    };

    // 窗口大小调整
    const onWindowResize = () => {
      if (!container.value) return;

      camera.aspect =
        container.value.clientWidth / container.value.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(
        container.value.clientWidth,
        container.value.clientHeight
      );
    };

    // 开始距离测量
    const startDistanceMeasurement = () => {
      clearMeasurements();
      isMeasuring.value = true;
      measurementType.value = "distance";
      instructions.value = "点击模型表面放置测量点，双击完成测量";
    };

    // 开始面积测量
    const startAreaMeasurement = () => {
      clearMeasurements();
      isMeasuring.value = true;
      measurementType.value = "area";
      instructions.value = "点击模型表面放置测量点（至少3个），双击完成测量";
    };

    // 组件挂载时初始化
    onMounted(() => {
      initScene();
      window.addEventListener("click", onMouseClick);
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("dblclick", onDoubleClick);
      window.addEventListener("resize", onWindowResize);
      initGltf(window.envConfig.oosUrl + "/static/model/c4-2.gltf");
    });

    // 组件卸载时清理
    onUnmounted(() => {
      window.removeEventListener("click", onMouseClick);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("dblclick", onDoubleClick);
      window.removeEventListener("resize", onWindowResize);
      if (container.value && renderer?.domElement) {
        container.value.removeChild(renderer.domElement);
      }
    });

    return {
      container,
      measurementInfo,
      instructions,
      startDistanceMeasurement,
      startAreaMeasurement,
      clearMeasurements,
    };
  },
};
</script>

<style scoped>
.container {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.three-container {
  width: 100%;
  height: 100%;
  cursor: crosshair;
}

.controls {
  position: absolute;
  top: 150px;
  left: 520px;
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  padding: 15px;
  border-radius: 12px;
  font-family: "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  z-index: 10;
  display: flex;
  /* flex-direction: column; */
  gap: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.controls button {
  /* padding: 12px; */
  /* padding: 10px 18px; */
  height: 45px;
  cursor: pointer;
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  color: white;
  border: none;
  border-radius: 8px;
  transition: all 0.3s ease;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.5px;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.controls button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.controls button:active {
  transform: translateY(0);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.controls button::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0));
  opacity: 0;
  transition: opacity 0.3s;
}

.controls button:hover::after {
  opacity: 1;
}

/* 为不同按钮设置不同颜色 */
.controls button:nth-child(1) {
  background: linear-gradient(135deg, #4facfe, #00f2fe);
}

.controls button:nth-child(2) {
  background: linear-gradient(135deg, #a6c1ee, #fbc2eb);
}

.controls button:nth-child(3) {
  background: linear-gradient(135deg, #ff758c, #ff7eb3);
}

.measurement-info {
  padding: 12px;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 8px;
  min-width: 220px;
  font-size: 14px;
  color: #333;
  /* margin-top: 10px; */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(0, 0, 0, 0.05);
  font-weight: 500;
}

.instructions {
  position: absolute;
  bottom: 25px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.75);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-family: "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  z-index: 10;
  pointer-events: none;
  white-space: nowrap;
  font-size: 14px;
  backdrop-filter: blur(5px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}
</style>