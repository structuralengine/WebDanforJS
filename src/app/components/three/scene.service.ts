import { LanguagesService } from 'src/app/providers/languages.service';
import { Injectable } from "@angular/core";
import * as THREE from "three";
import { GUI } from "./libs/dat.gui.module.js";
import { OrbitControls } from "./libs/OrbitControls.js";
import { CSS2DRenderer } from "./libs/CSS2DRenderer.js";
import { DataHelperModule } from "../../providers/data-helper.module";

@Injectable({
  providedIn: "root",
})
export class SceneService {
  // シーン
  public scene: THREE.Scene;

  // レンダラー
  private renderer: THREE.WebGLRenderer = null;
  private labelRenderer: CSS2DRenderer = null;
  private id = null;
  //private controlsGizmoParent: OrbitControlsGizmo;

  // カメラ
  private camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  private PerspectiveCamera: THREE.PerspectiveCamera;
  private OrthographicCamera: THREE.OrthographicCamera;
  private aspectRatio: number;
  private Width: number;
  private Height: number;
  private controls: OrbitControls;

  // helper
  private axisHelper: THREE.AxesHelper;
  private GridHelper: THREE.GridHelper;
  private GridDistance: number;
  // gui
  public gui: GUI;

  // 初期化
  public constructor(
    private helper: DataHelperModule,
    private language: LanguagesService
    ) {
    // シーンを作成
    this.scene = new THREE.Scene();
    // シーンの背景を白に設定
    // this.scene.background = new THREE.Color(0xf0f0f0);
    this.scene.background = new THREE.Color(0xffffff);
    // レンダラーをバインド
    this.render = this.render.bind(this);
  }

  public OnInit(
    aspectRatio: number,
    canvasElement: HTMLCanvasElement,
    deviceRatio: number,
    Width: number,
    Height: number
  ): void {   
    // カメラ
    this.aspectRatio = aspectRatio;
    this.Width = Width;
    this.Height = Height;
    // 3次元用カメラ
    this.PerspectiveCamera = new THREE.PerspectiveCamera(
      70,
      aspectRatio,
      0.1,
      1000
    );
    this.PerspectiveCamera.position.set(50, 50, -50);  // 3次元カメラのデフォルト位置

    // 2次元用カメラ
    this.OrthographicCamera = new THREE.OrthographicCamera(
      -Width / 10,
      Width / 10,
      Height / 10,
      -Height / 10,
      -1000,
      1000
    );
    this.camera = this.OrthographicCamera; // 初期化の時困るので、一旦 this.cameraに登録しておく（消すな！

    // 環境光源
    this.add(new THREE.AmbientLight(0xf0f0f0));
    // レンダラー
    this.createRender(canvasElement, deviceRatio, Width, Height);
    this.createHelper();
    // gui を生成する
    this.gui = new GUI();
    this.gui.domElement.id = "gui_css";    
    this.gui.open();
    this.render()
  } 
  // 床面を生成する
  private createHelper() {   
    this.GridHelper = new THREE.GridHelper(200, 50);
    this.GridHelper.geometry.rotateX(Math.PI / 2);
    this.GridHelper.material["opacity"] = 0.2;
    this.GridHelper.material["transparent"] = true;
    this.GridHelper.name = "GridHelper";
    this.scene.add(this.GridHelper);
  }

  public setNewHelper(max: number) {
    // GridHelperの範囲の最大値は最大長さを切り上げた長さ.
    const Distance = Math.ceil(max / 10) * 10;
    if (this.GridDistance !== Distance) {
      // maxDistanceをキーに大きさを設定する。
      this.createNewScale(Distance);
      this.GridDistance = Distance;
    }
  }
  private createNewScale(Distance: number): void {
    // AxisHelperをthis.sceneから取り除く.
    this.scene.remove(this.axisHelper);

    // AxisHelperを新たに作成し、追加する.
    this.axisHelper = new THREE.AxesHelper(Distance * 2);
    this.axisHelper.name = "axisHelper";
    this.scene.add(this.axisHelper);

    // GridHelperをthis.sceneから取り除く.
    this.scene.remove(this.GridHelper);

    // GridHelperを新たに作成し、追加する.
    this.GridHelper = new THREE.GridHelper(Distance * 2, 20);
    this.GridHelper.geometry.rotateX(Math.PI / 2);
    this.GridHelper.material["opacity"] = 0.2;
    this.GridHelper.material["transparent"] = true;
    this.GridHelper.name = "GridHelper";
    this.scene.add(this.GridHelper);
  }
  // 物体とマウスの交差判定に用いるレイキャスト
  public getRaycaster(mouse: THREE.Vector2): THREE.Raycaster {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);
    return raycaster;
  }

  // レンダラーを初期化する
  public createRender(
    canvasElement: HTMLCanvasElement,
    deviceRatio: number,
    Width: number,
    Height: number
  ): void {
    this.renderer = new THREE.WebGLRenderer({
      preserveDrawingBuffer: true,
      canvas: canvasElement,
      alpha: true, // transparent background
      antialias: true, // smooth edges
    });
    this.renderer.setPixelRatio(deviceRatio);
    this.renderer.setSize(Width, Height);
    this.renderer.shadowMap.enabled = true;
    // this.renderer.setClearColorHex( 0x000000, 1 );

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(Width, Height);
    this.labelRenderer.domElement.style.position = "absolute";

    //this.camera.lookAt(-10, 10, 0);
    this.camera.position.set(-20, -20, 0)
    //this.camera.zoom = 4.5;
  }

  public labelRendererDomElement(): Node {
    return this.labelRenderer.domElement;
  }

  public toScreenPosition(obj:any, camera:any)
  {
    var vector = new THREE.Vector3();

    var widthHalf = 0.5*this.Width;
    var heightHalf = 0.5*this.Height;

    obj.updateMatrixWorld();
    vector.setFromMatrixPosition(obj.matrixWorld);
    vector.project(camera);

    vector.x = ( vector.x * widthHalf ) + widthHalf;
    vector.y = - ( vector.y * heightHalf ) + heightHalf;

    return { 
        x: vector.x,
        y: vector.y
    };

  };

  public myMove(x:any,y:any) {
      var parent = document.getElementById("graphics-locator");
      var child = document.getElementById("graphics-locator-child");
      var pos = 50;
      parent.style.left = x + 'px';
      parent.style.top = y + 'px';
      parent.style.display = "block";
      clearInterval(this.id);
      this.id = setInterval(frame, 10);
      function frame() {
          if (pos <= 0) {
              clearInterval(this.id);
              parent.style.display = "none";
          } else {
              pos -= 1;
              child.style.width = pos + '%';
              child.style.height = pos + '%';
              child.style.top = 50 - pos/2 + '%';
              child.style.left = 50 - pos/2 + '%';
          }
      }
  }

  public getScreenPosition(obj){
    var position = this.toScreenPosition(obj,this.camera)
    // var header = document.querySelector('.header');
    // var body_container = document.querySelector('.body-container');
    this.myMove(position.x,(position.y + 84))
  }

  // リサイズ
  public onResize(deviceRatio: number, Width: number, Height: number): void {
    if ("aspect" in this.camera) {
      this.camera["aspect"] = deviceRatio;
    }
    if ("left" in this.camera) {
      this.camera["left"] = -Width / 2;
    }
    if ("right" in this.camera) {
      this.camera["right"] = Width / 2;
    }
    if ("top" in this.camera) {
      this.camera["top"] = Height / 2;
    }
    if ("bottom" in this.camera) {
      this.camera["bottom"] = -Height / 2;
    }

    this.camera.updateProjectionMatrix();
    this.renderer.setSize(Width, Height);
    this.labelRenderer.setSize(Width, Height);
    this.render();
  }

  // レンダリングする
  public render() {
    if (this.renderer === null) return;
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  }

  // レンダリングのサイズを取得する
  public getBoundingClientRect(): ClientRect | DOMRect {
    return this.renderer.domElement.getBoundingClientRect();
  }

  // シーンにオブジェクトを追加する
  public add(...threeObject: THREE.Object3D[]): void {
    for (const obj of threeObject) {
      this.scene.add(obj);
    }
  }

  // シーンのオブジェクトを削除する
  public remove(...threeObject: THREE.Object3D[]): void {
    for (const obj of threeObject) {
      this.scene.remove(obj);
    }
  }

  // シーンにオブジェクトを削除する
  public removeByName(...threeName: string[]): void {
    for (const name of threeName) {
      const target = this.scene.getObjectByName(name);
      if (target === undefined) {
        continue;
      }
      this.scene.remove(target);
    }
  }

  // ファイルに視点を保存する
  public getSettingJson(): any {
    return {
      camera: {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z,
        zoom: this.camera.zoom
      },
      target: {
        x: this.controls.target.x,
        y: this.controls.target.y,
        z: this.controls.target.z,
      },
    };
  }

  // 視点を読み込む
  public setSetting(jsonData: {}): void {

    if (!("three" in jsonData)) {
      return;
    }
    const setting: any = jsonData["three"];

    // カメラの位置
    if('camera' in setting){
      const camera = setting.camera;
      const x: number = this.helper.toNumber(camera.x);
      const y: number = this.helper.toNumber(camera.y);
      const z: number = this.helper.toNumber(camera.z);
      if (x !== null && y !== null && z !== null) {
          this.camera.position.set(x, y, z);
          if(this.helper.dimension == 2 ) {
            this.controls.target.x = x;
            this.controls.target.y = y;
          }
      }
      const zoom: number = this.helper.toNumber(camera.zoom);
      if (zoom !== null) {
        this.camera.zoom = zoom;
      }
    }

    // 視点の位置
    if('target' in setting){
      const target = setting.target;
      const x: number = this.helper.toNumber(target.x);
      const y: number = this.helper.toNumber(target.y);
      const z: number = this.helper.toNumber(target.z);
      if (x !== null && y !== null && z !== null) {
          this.controls.target.x = x;
          this.controls.target.y = y;
          this.controls.target.z = z;
      } 
    } 

  }
  public open() {
    this.gui.open();
  }

  public close() {
    this.gui.close();
  }
}
