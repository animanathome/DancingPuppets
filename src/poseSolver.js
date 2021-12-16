import * as THREE from "three";
import {line} from "./utils/draw";
import {orientToVector, averageVector, scaleToVector, buildRotationMatrix} from "./utils/math";

// BlazePose has 32 key points
export const L_HIP_KP = 23
export const L_KNEE_KP = 25
export const L_ANKLE_KP = 27
export const L_HEEL_KP = 29
export const L_TOE_KP = 31

export const R_HIP_KP = 24
export const R_KNEE_KP = 26
export const R_ANKLE_KP = 28
export const R_HEEL_KP = 30
export const R_TOE_KP = 32

export const L_SHOULDER_KP = 11
export const L_ELBOW_KP = 13
export const L_WRIST_KP = 15
export const L_PINKY_KP = 17
export const L_INDEX_KP = 19

export const R_SHOULDER_KP = 12
export const R_ELBOW_KP = 14
export const R_WRIST_KP = 16
export const R_PINKY_KP = 18
export const R_INDEX_KP = 20

// additional inferred "key" points
export const C_HIP_KP = 33;
export const C_CHEST_KP = 34;
export const C_HEAD_KP = 35;
export const L_FINGER_KP = 36;
export const R_FINGER_KP = 37;

export const L_LEG = [
    L_HIP_KP,
    L_KNEE_KP,
    L_ANKLE_KP,
    L_HEEL_KP,
    L_TOE_KP,
]

export const R_LEG = [
    R_HIP_KP,
    R_KNEE_KP,
    R_ANKLE_KP,
    R_HEEL_KP,
    R_TOE_KP,
]

export const C_BODY = [
    L_SHOULDER_KP,
    L_HIP_KP,
    R_HIP_KP,
    R_SHOULDER_KP,
    C_CHEST_KP,
    C_HEAD_KP,
    C_CHEST_KP,
    L_SHOULDER_KP,
]

export const L_ARM = [
    L_SHOULDER_KP,
    L_ELBOW_KP,
    L_WRIST_KP,
    L_FINGER_KP,
]

export const R_ARM = [
    R_SHOULDER_KP,
    R_ELBOW_KP,
    R_WRIST_KP,
    R_FINGER_KP,
]

/**
 * A PoseSolver takes in an estimated Blaze pose, which is a collection of 32 points that make up a posed biped, and
 * allows us to attach objects to them. When attaching an object we specify two points, the origin and look at. From
 * those two point we than position, orient and scale the object so it matches the vector between the two points.
 */
export class PoseSolver {
    #keypoints3D = []
    #points = []
    set poses(poses) {
        console.log('point count', poses[0].keypoints3D.length);

        this.#preparePoses(poses);
        this.#createLocalData(poses);
        this.#stickShouldersAndHipsToBody();
    }

    #preparePoses(poses) {
        poses[0].keypoints3D.forEach(point => {
            point.y = (point.y * -1) + 1; // flip in Y and move above the origin
			point.z = point.z * -1; // invert z so the user is looking towards the camera
        })
        // move the pose to the ground -- this value should probably be determined during init in case the user jumps
		// during their performance
		const feet = [L_HEEL_KP, L_TOE_KP, R_HEEL_KP, R_TOE_KP];
		const floorY = Math.min(...feet.map(index => poses[0].keypoints3D[index].y));
		poses[0].keypoints3D.forEach(point => {
			point.y -= floorY
		})

        return poses[0];
    }

    // TODO: add scale ratio line to geo
    #createLocalData(poses) {
        // since we're using THREE we need to transform our pose data into a format it understands
        this.#points = [];
        poses[0].keypoints3D.forEach(point => {
            this.#points.push(new THREE.Vector3(point.x, point.y, point.z));
        });

        // a blaze pose doesn't contain certain points we need to be able to easily position our geometry
        // here we generate those -- mainly by averaging out points.
        const hip = averageVector(this.points[L_HIP_KP], this.points[R_HIP_KP]);
        this.#points.push(hip);

        const chest = averageVector(this.points[L_SHOULDER_KP], this.points[R_SHOULDER_KP]);
        this.#points.push(chest);

        const head = new THREE.Vector3(chest.x, chest.y + 0.3, chest.z);
        this.#points.push(head);

        const lFinger = averageVector(this.points[L_PINKY_KP], this.points[L_INDEX_KP]);
        this.#points.push(lFinger);

        const rFinger = averageVector(this.points[R_PINKY_KP], this.points[R_INDEX_KP]);
        this.#points.push(rFinger);
    }

    #stickShouldersAndHipsToBody() {
        // The location of our hips and shoulders don't match with that of our blaze poses.
        // Here we attach them to the body. Note, that we need custom values for each texture since
        // it will have different proportions. It might have narrower hips or broader shoulders.
        this.#setDistanceTo(C_CHEST_KP, L_SHOULDER_KP, L_ARM, 0.1);
        this.#setDistanceTo(C_CHEST_KP, R_SHOULDER_KP, R_ARM, 0.1);
        this.#setDistanceTo(C_HIP_KP, L_HIP_KP, L_LEG, 0.075);
        this.#setDistanceTo(C_HIP_KP, R_HIP_KP, R_LEG, 0.075);
    }

    #setDistanceTo(startIndex, endIndex, vectorArray, distance = 0.4) {
        // Helper method to set a fix distance between 2 points by moving the end point.
        const currentDistance = this.points[startIndex].distanceTo(this.points[endIndex]);
        const scaleMulti = distance / currentDistance;
        const scaleFactor = new THREE.Vector3(1, 1, scaleMulti);
        // TODO: we should use move instead of scale here so we don't change the distance between the points in the
        //  array as we only want to change the distance into relation to the start (index) point
        this.scaleVectorArray(startIndex, endIndex, vectorArray, scaleFactor);
    }

    get keypoints() {
        // returns the blaze pose keypoints
        return this.#keypoints3D;
    }

    get points() {
        // returns the transformed points as a vector array
        return this.#points;
    }

    drawLine(indexArray, scene, color = 0x0000ff) {
        const pointArray = indexArray.map(index => this.points[index])
        return line(pointArray, scene, color);
    }

    calculateVector(startPointIndex = 0, endPointIndex = 1, normalize = false) {
        // calculate vector from 2 pose points
        const start = this.points[startPointIndex];
        const end = this.points[endPointIndex];
        const vector = new THREE.Vector3().subVectors(end, start)
        if (!normalize) {
            return vector;
        }
        return vector.multiplyScalar(1 / vector.length());
    }

    drawAxis(startPointIndex, endPointIndex, scene, size = 0.25) {
        // helper method to visualize the generated transformation matrix
        const axesHelper = new THREE.AxesHelper( size );
        scene.add(axesHelper);
        this.attachObject(axesHelper, startPointIndex, endPointIndex, true, true, false);
    }

    scaleVectorArray(startIndex, endIndex, vectorArray = [], scaleVector = new THREE.Vector3(1, 1, 0.5)) {
        // scale the vector array using the generated transformation matrix from the start and end index
        const vector = this.calculateVector(startIndex, endIndex);
        const position = this.points[startIndex];

        const rotationMatrix = buildRotationMatrix(vector)
        const quaternion = new THREE.Quaternion().setFromRotationMatrix(rotationMatrix);
        const scale = new THREE.Vector3(1, 1, 1);
        const matrix = new THREE.Matrix4().compose(position, quaternion, scale);
        const invMatrix = new THREE.Matrix4().copy(matrix).invert();

        vectorArray.forEach(index => {
            const point = this.points[index];
            point.applyMatrix4(invMatrix);
            point.multiply(scaleVector);
            point.applyMatrix4(matrix);
        })
    }

    attachObject(object, startIndex, endIndex, position=true, orient=true, scale = true) {
        // attach the object using the generated rotation matrix from the start and end index
        const vector = this.calculateVector(startIndex, endIndex);
        const point = this.points[startIndex];
        if (scale) {
            scaleToVector(object, vector);
        }
        if (orient) {
            orientToVector(object, vector);
        }
        if (position) {
            object.position.set(...point);
        }
    }
}
