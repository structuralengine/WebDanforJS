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
  public sceneRebar: THREE.Scene;
  // レンダラー
  private renderer: THREE.WebGLRenderer = null;
  private labelRenderer: CSS2DRenderer = null;

  // カメラ
  private camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  private PerspectiveCamera: THREE.PerspectiveCamera;
  private OrthographicCamera: THREE.OrthographicCamera;
  // helper
  private GridHelper: THREE.GridHelper;
  // gui
  public gui: GUI;

  // 初期化
  public constructor(
    private helper: DataHelperModule,
    private language: LanguagesService
    ) {
    // シーンを作成
    this.scene = new THREE.Scene(); 
    this.scene.background = new THREE.Color(0xffffff);    
    this.sceneRebar = new THREE.Scene(); 
    this.sceneRebar.background = new THREE.Color(0xffffff);
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

  public OnInitRebar(
    aspectRatio: number,
    canvasElement: HTMLCanvasElement,
    deviceRatio: number,
    Width: number,
    Height: number
  ): void {  
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
    this.addRebar(new THREE.AmbientLight(0xf0f0f0));
    // レンダラー
    this.createRender(canvasElement, deviceRatio, Width, Height);
    this.createHelperRebar();
    // gui を生成する
    this.gui = new GUI();
    this.gui.domElement.id = "gui_css";    
    this.gui.open();
    this.renderRebar()
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
  private createHelperRebar() {   
    this.GridHelper = new THREE.GridHelper(200, 50);
    this.GridHelper.geometry.rotateX(Math.PI / 2);
    this.GridHelper.material["opacity"] = 0.2;
    this.GridHelper.material["transparent"] = true;
    this.GridHelper.name = "GridHelper";
    this.sceneRebar.add(this.GridHelper);
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
  }
  // レンダリングする
  public render() {
    if (this.renderer === null) return;
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  }
  public renderRebar() {
    if (this.renderer === null) return;
    this.renderer.render(this.sceneRebar, this.camera);
    this.labelRenderer.render(this.sceneRebar, this.camera);
  }

  // シーンにオブジェクトを追加する
  public add(...threeObject: THREE.Object3D[]): void {
    for (const obj of threeObject) {
      this.scene.add(obj);
    }
  }
  public addRebar(...threeObject: THREE.Object3D[]): void {
    for (const obj of threeObject) {
      this.sceneRebar.add(obj);
    }
  }

  // シーンのオブジェクトを削除する
  public remove(...threeObject: THREE.Object3D[]): void {
    for (const obj of threeObject) {
      this.scene.remove(obj);
    }
  }
  public removeRebar(...threeObject: THREE.Object3D[]): void {
    for (const obj of threeObject) {
      this.sceneRebar.remove(obj);
    }
  }  
  public open() {
    this.gui.open();
  }

  public close() {
    this.gui.close();
  }
}
