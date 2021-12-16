import * as THREE from "three";

export const line = (vectorArray, scene, color = 0x0000ff) => {
    const material = new THREE.LineBasicMaterial({color});
    const geometry = new THREE.BufferGeometry().setFromPoints( vectorArray );
    const line = new THREE.Line( geometry, material );
    scene.add( line );
    return line;
}

export const cube = (vector, scene, size = 0.025) => {
    const geometry = new THREE.BoxGeometry( size, size, size );
    const material = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
    const cube = new THREE.Mesh( geometry, material );
    cube.position.set(...vector);
    scene.add( cube );
}
