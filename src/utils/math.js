import * as THREE from "three";

export const orientToVector = (object, vector) => {
	const rm = buildRotationMatrix(vector)
	const q = new THREE.Quaternion().setFromRotationMatrix(rm);
	object.quaternion.set(q.x, q.y, q.z, q.w);
}

export const scaleToVector = (object, vector) => {
	const geoLength = getDimensions(object).z;
	const geoScaleMulti = vector.length() / geoLength;
	object.scale.setZ(geoScaleMulti);
}

// TODO: we should update this so we can pass in startPole as an argument. This would allow us to twist our puppet
export const buildRotationMatrix = (v1 = new THREE.Vector3(0, 1, 0), length = 1.0) => {
	v1.multiplyScalar(length / v1.length())

	const startPole = new THREE.Vector3(0, 0, 0 + length)

	const cross1 = new THREE.Vector3().crossVectors(startPole, v1)
	cross1.multiplyScalar(length / cross1.length());

	const cross2 = new THREE.Vector3().crossVectors(cross1, v1)
	cross2.multiplyScalar(length / cross2.length());

	const rotationMatrix = new THREE.Matrix4();
	rotationMatrix.makeBasis(cross2, cross1, v1); // xyz
	return rotationMatrix
}

const getDimensions = (object) => {
	const min = new THREE.Vector3(...object.geometry.boundingBox.min).multiplyScalar(-1);
	const max = object.geometry.boundingBox.max;
	return new THREE.Vector3().addVectors(max, min);
}

export const averageVector = (v1, v2) => {
	return new THREE.Vector3().addVectors(v1, v2).divideScalar(2.0)
}
