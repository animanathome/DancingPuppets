import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import {
    L_ARM,
    L_LEG,
    R_ARM,
    R_LEG,
    C_BODY,
    C_CHEST_KP,
    C_HEAD_KP,
    C_HIP_KP,
    L_ANKLE_KP,
    L_ELBOW_KP,
    L_FINGER_KP,
    L_HEEL_KP,
    L_HIP_KP,
    L_KNEE_KP,
    L_SHOULDER_KP,
    L_WRIST_KP,
    R_ANKLE_KP,
    R_ELBOW_KP,
    R_FINGER_KP,
    R_HEEL_KP,
    R_HIP_KP,
    R_KNEE_KP,
    R_SHOULDER_KP,
    R_WRIST_KP,
    PoseSolver, R_BP_ARM
} from "./poseSolver";

const L_ULEG_GEO = 0;
const L_LLEG_GEO = 1;
const L_FOOT_GEO = 2;
const R_ULEG_GEO = 3;
const R_LLEG_GEO = 4;
const R_FOOT_GEO = 5;
const L_UARM_GEO = 6;
const L_LARM_GEO = 7;
const L_HAND_GEO = 8;
const R_UARM_GEO = 9;
const R_LARM_GEO = 10;
const R_HAND_GEO = 11;
const C_BODY_GEO = 12;
const C_HEAD_GEO = 13;

/**
 * A Puppet creates a poseable model with a outfit and face texture. The puppet can be posed either by passing in a
 * blaze pose or by copying a pose from another puppet. The outfut is randomized and the face texture is specified
 * during construction.
 */
export class Puppet {
    path = '../../resources/';
    modelExtension = 'glb';
    textureExtension = 'png';
    #root = undefined;
    #geo = [];
    #lines = [];
    #axes = [];
    #scene = undefined;
    #texture = {};
    #solver = new PoseSolver();
    #loaded = false;
    #face = 'lani';

    constructor(scene, face='lani') {
        this.#scene = scene;
        this.#face = face;
    }

    get scene() {
        return this.#scene;
    }

    get geo() {
        return this.#geo;
    }

    get root() {
        return this.#root;
    }

    get loaded() {
        return this.#loaded;
    }

    async load() {
        this.#loaded = false;

        await Promise.all([
            this.loadModel('puppet_10'),
            this.loadTexture('outfit_1', 'outfit'),
            this.loadTexture('outfit_2', 'outfit'),
            this.loadTexture('outfit_3', 'outfit'),
            this.loadTexture('outfit_4', 'outfit'),
            this.loadTexture('outfit_5', 'outfit'),
            this.loadTexture('outfit_6', 'outfit'),
            this.loadTexture(this.#face, 'face'),
        ]);

        this.randomlyAssignTexturesToModel();
        this.#loaded = true;
    }

    async loadModel(fileName) {
        return await new Promise((resolve, reject) => {
            const loader = new GLTFLoader().setPath(this.path);
            loader.load(`${fileName}.${this.modelExtension}`,  (gltf) => {
                gltf.scene.visible = false;
                this.#root = gltf.scene;
                this.scene.add(gltf.scene);
                gltf.scene.traverse((child) => {
                    if (child.isMesh) {
                        this.#geo.push(child);
                    }
                });
                resolve();
            }, undefined, (err) => {
                reject(err);
            });
        });
    }

    async loadTexture(fileName, type='outfit') {
        // TODO: optimize textures
        return await new Promise((resolve, reject) => {
            const textureLoader = new THREE.TextureLoader();
            const texturePath = `${this.path}${fileName}.${this.textureExtension}`;
            textureLoader.load(texturePath, (texture) => {
                const material = new THREE.MeshBasicMaterial({
                    map: texture,
                    side: THREE.DoubleSide,
                    alphaTest: 0.5
                });
                if (!this.#texture.hasOwnProperty(type)) {
                    this.#texture[type] = {};
                }
                this.#texture[type][fileName] = material;
                resolve();
            }, undefined, (err) => {
                reject(err)
            })
        });
    }

    #getRandomMaterial(type='outfit') {
        const textures = Object.keys(this.#texture[type]);
        const nMaterials = textures.length;
        const randomInt = Math.floor(Math.random() * nMaterials);
        const randomTexture = textures[randomInt];
        return this.#getMaterial(type, randomTexture);
    }

    #getMaterial(type='face', filename='lani') {
        return this.#texture[type][filename];
    }

    randomlyAssignTexturesToModel() {
        const randomMaterial = this.#getRandomMaterial('outfit');
        this.geo.forEach(item => item.material = randomMaterial);
        this.geo[C_HEAD_GEO].material = this.#getMaterial('face', this.#face);
    }

    set pose(poses) {
        this.#solver.poses = poses;
    }

    applyPoseToGeo() {
        this.#poseGeometry();
        this.#scaleHead();
    }

    visualizeAxes(poses, size= 0.1) {
        this.#createAxes(size);
        this.#poseAxes();
    }

    #createAxes(size) {
        if (this.#axes.length !== 0) {
            return;
        }
        for (let i = 0; i < this.geo.length; i++) {
            const axesHelper = new THREE.AxesHelper( size );
            this.#axes.push(axesHelper);
            this.scene.add(axesHelper);
        }
    }

    #removeAxes() {
        this.#axes.forEach(axis => axis.parent.remove(axis));
        this.#axes = [];
    }

    #poseAxes() {
        this.#solver.attachObject(this.#axes[0], L_HIP_KP, L_KNEE_KP, true, true, false);
        this.#solver.attachObject(this.#axes[1], L_KNEE_KP, L_ANKLE_KP, true, true, false);
        this.#solver.attachObject(this.#axes[2], L_ANKLE_KP, L_HEEL_KP, true, true, false);
        this.#solver.attachObject(this.#axes[3], R_HIP_KP, R_KNEE_KP, true, true, false);
        this.#solver.attachObject(this.#axes[4], R_KNEE_KP, R_ANKLE_KP, true, true, false);
        this.#solver.attachObject(this.#axes[5], R_ANKLE_KP, R_HEEL_KP, true, true, false);
        this.#solver.attachObject(this.#axes[6], L_SHOULDER_KP, L_ELBOW_KP, true, true, false);
        this.#solver.attachObject(this.#axes[7], L_ELBOW_KP, L_WRIST_KP, true, true, false);
        this.#solver.attachObject(this.#axes[8], L_WRIST_KP, L_FINGER_KP, true, true, false);
        this.#solver.attachObject(this.#axes[9], R_SHOULDER_KP, R_ELBOW_KP, true, true, false);
        this.#solver.attachObject(this.#axes[10], R_ELBOW_KP, R_WRIST_KP, true, true, false);
        this.#solver.attachObject(this.#axes[11], R_WRIST_KP, R_FINGER_KP, true, true, false);
        this.#solver.attachObject(this.#axes[12], C_HIP_KP, C_CHEST_KP, true, true, false);
        this.#solver.attachObject(this.#axes[13], C_CHEST_KP, C_HEAD_KP, true, true, false);
    }

    visualizePose() {
        this.#cleanupVisualizedPose();
        this.#createVisualizedPose();
    }

    #createVisualizedPose() {
        this.#lines.push(this.#solver.drawLine(L_ARM, this.#scene));
        this.#lines.push(this.#solver.drawLine(R_ARM, this.#scene));
        this.#lines.push(this.#solver.drawLine(C_BODY, this.#scene));
        this.#lines.push(this.#solver.drawLine(L_LEG, this.#scene));
        this.#lines.push(this.#solver.drawLine(R_LEG, this.#scene));
    }

    #cleanupVisualizedPose() {
        this.#lines.forEach(line => line.parent.remove(line));
        this.#lines = [];
    }

    #poseGeometry() {
        // TODO: add orientation of the body/torso
        // TODO: specify connection points per texture
        this.#solver.attachObject(this.geo[L_ULEG_GEO], L_HIP_KP, L_KNEE_KP);
        this.#solver.attachObject(this.geo[L_LLEG_GEO], L_KNEE_KP, L_ANKLE_KP);
        this.#solver.attachObject(this.geo[L_FOOT_GEO], L_ANKLE_KP, L_HEEL_KP);

        this.#solver.attachObject(this.geo[R_ULEG_GEO], R_HIP_KP, R_KNEE_KP);
        this.#solver.attachObject(this.geo[R_LLEG_GEO], R_KNEE_KP, R_ANKLE_KP);
        this.#solver.attachObject(this.geo[R_FOOT_GEO], R_ANKLE_KP, R_HEEL_KP);

        this.#solver.attachObject(this.geo[L_UARM_GEO], L_SHOULDER_KP, L_ELBOW_KP);
        this.#solver.attachObject(this.geo[L_LARM_GEO], L_ELBOW_KP, L_WRIST_KP);
        this.#solver.attachObject(this.geo[L_HAND_GEO], L_WRIST_KP, L_FINGER_KP);

        this.#solver.attachObject(this.geo[R_UARM_GEO], R_SHOULDER_KP, R_ELBOW_KP);
        this.#solver.attachObject(this.geo[R_LARM_GEO], R_ELBOW_KP, R_WRIST_KP);
        this.#solver.attachObject(this.geo[R_HAND_GEO], R_WRIST_KP, R_FINGER_KP);

        this.#solver.attachObject(this.geo[C_BODY_GEO], C_HIP_KP, C_CHEST_KP);
        this.#solver.attachObject(this.geo[C_HEAD_GEO], C_CHEST_KP, C_HEAD_KP);
    }

    #scaleHead() {
        this.geo[C_HEAD_GEO].position.y -= .1;
        this.geo[C_HEAD_GEO].scale.x = 2.5;
        this.geo[C_HEAD_GEO].scale.y = 2.5;
        this.geo[C_HEAD_GEO].scale.z = 2.5;
    }

    copyPoseToGeo(puppet) {
        puppet.geo.forEach((source, index) => {
            this.geo[index].position.set(...source.position);
            this.geo[index].quaternion.set(source.quaternion.x, source.quaternion.y, source.quaternion.z, source.quaternion.w);
            this.geo[index].scale.set(...source.scale);
        })
    }
}
