import * as THREE from "three";
import {camera} from "../../camera/main.ts";
import {CLUSTER_DESTROY_X_LEFT, CLUSTER_SPAWN_X_RIGHT, MAX_CLUSTERS} from "../../definition/constant.ts";
import {createCluster} from "./factory.ts";

const cyberClusters: THREE.Group[] = [];

const animateCyberSpaceClusters = (
    timeValue: number,
    removeSceneObjectCallback: (object: THREE.Object3D) => void,
    addSceneObjectCallback: (object: THREE.Object3D) => void,
): void => {
    const clustersToRemove: THREE.Group[] = [];
    const baseGlowBoxOpacity = 0.12; // Store the base opacity for the glow box
    const tempClusterForward = new THREE.Vector3();
    const tempVecToCamera = new THREE.Vector3();
    const tempClusterWorldQuaternion = new THREE.Quaternion();

    cyberClusters.forEach(cluster => {
        cluster.position.x -= cluster.userData.moveSpeed;
        cluster.lookAt(camera.position.x, cluster.position.y, camera.position.z);

        // Dynamically adjust glowBox opacity based on orientation to camera
        if (cluster.userData.glowBoxMaterial) {
            const glowMaterial = cluster.userData.glowBoxMaterial as THREE.MeshBasicMaterial;

            // Get the cluster's forward direction (local -Z axis in world space)
            tempClusterForward.set(0, 0, -1);
            cluster.getWorldQuaternion(tempClusterWorldQuaternion);
            tempClusterForward.applyQuaternion(tempClusterWorldQuaternion);

            // Get the vector from cluster to camera
            tempVecToCamera.subVectors(camera.position, cluster.position).normalize();

            const dot = tempClusterForward.dot(tempVecToCamera);

            let opacityFactor = 1.0;
            if (dot > 0.5) { // If more than half of the "front" is facing the camera
                const t = (dot - 0.5) / 0.5; // Normalize dot from [0.5, 1] to [0, 1]
                opacityFactor = 1.0 - t * 0.95; // Reduce opacity by up to 95% (making it very faint)
            }
            glowMaterial.opacity = baseGlowBoxOpacity * Math.max(0, opacityFactor); // Ensure opacity is not negative
        }

        cluster.children.forEach(block => {
            if (block instanceof THREE.Mesh && block.userData && block.userData.baseColorForBrightness) {
                const material = block.material as THREE.MeshBasicMaterial;
                const ud = block.userData;
                const brightnessMultiplier = (ud.maxBrightnessFactor - ud.minBrightnessFactor) *
                    (0.5 + 0.5 * Math.sin(timeValue * ud.brightnessSpeed + ud.brightnessPhase)) +
                    ud.minBrightnessFactor;
                const currentBrightnessScale = ud.initialEmissiveIntensity * brightnessMultiplier;

                // Update material color based on calculated brightness
                material.color.copy(ud.baseColorForBrightness).multiplyScalar(currentBrightnessScale);
            }
        });

        if (cluster.position.x + cluster.userData.clusterWidth / 2 < CLUSTER_DESTROY_X_LEFT) {
            clustersToRemove.push(cluster);
        }
    });

    clustersToRemove.forEach(cluster => {
        // scene.remove(cluster);
        removeSceneObjectCallback(cluster);
        cluster.children.forEach(child => {
            if (child instanceof THREE.Mesh) {
                child.geometry.dispose();
                (child.material as THREE.Material).dispose();
            } else if (child instanceof THREE.LineSegments) { // Also dispose LineSegments
                child.geometry.dispose();
                (child.material as THREE.Material).dispose();
            }
        });
        const index = cyberClusters.indexOf(cluster);
        if (index > -1) cyberClusters.splice(index, 1);
    });

    if (cyberClusters.length < MAX_CLUSTERS) {
        if (Math.random() < 0.08) { // Slightly increased spawn chance
            const newCluster = createCluster(CLUSTER_SPAWN_X_RIGHT);
            // scene.add(newCluster);
            addSceneObjectCallback(newCluster);
            cyberClusters.push(newCluster);
        }
    }
}
export {cyberClusters, animateCyberSpaceClusters};