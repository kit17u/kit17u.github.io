import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

/**
 * Represents a fish and takes care of its animation.
 * 
 * @param fish        Root model of a fish, Object3D
 * @param controller  Instance of a MouseController
 *                    needed to get mouse position
 * @param maxDistance Maximum distance at which a fish appears,
 *                    a number
 * @param clips       Animation clips
 */
export class FishController{
    constructor(fish, controller, clips, {speed, interval, maxDistance, followDistance, rotationSpeed}){
        this.fish           = fish;
        this.controller     = controller;
        this.clips          = (typeof clips !== 'undefined') ? clips : [];

        this.speed          = speed          ? speed          : 0.1  + Math.random() * 0.5;
        this.interval       = interval       ? interval       : 2000 + Math.random() * 1000;
        this.followDistance = followDistance ? followDistance : 3    + Math.random() * 5;
        this.maxDistance    = maxDistance    ? maxDistance    : 20;
        this.rotationSpeed  = rotationSpeed  ? rotationSpeed  : 0.1  + Math.random() * 0.05;

        this.velocity       = new THREE.Vector3(0, 0, 0);

        this._targetEuler   = new THREE.Euler(1, 0, 0, "YZX");
        this._targetQuat    = new THREE.Quaternion();
        this.vectorForward  = new THREE.Vector3(1, 0, 0);
        this.vectorUp       = new THREE.Vector3(0, 1, 0);
        this.zAxis          = new THREE.Vector3();
        this.yAxis          = new THREE.Vector3();
        this.matrix         = new THREE.Matrix4();
        
        this.mixer          = new THREE.AnimationMixer( fish );
        this.isFollowing    = false;

        const swim          = clips[0];
        const swimLoop      = clips[1];
        this.actionSwim     = this.mixer.clipAction( swim );
        this.actionSwim.loop= THREE.LoopOnce;
        this.actionSwim.clampWhenFinished = true;
        this.actionSwim.setDuration(this.interval);
        this.actionSwim.play();

        this.actionSwimLoop = this.mixer.clipAction( swimLoop );
        this.actionSwimLoop.timeScale = 0.0001+ Math.random()*0.001;
        this.fish.rotation.order = 'YXZ';
    }

    update(t, dt){

        // Animatoin update
        this.mixer.update(dt);

        // Position/rotation update
        this.updateVelocity(t);
        this.updatePosition(dt);
        this.rotate();

    }
    
    distanceToTarget(){
        const target = this.controller.targetPoint;
        const current = this.fish.position;

        // Returns euclidean distance
        return Math.sqrt( (target.x - current.x)**2 
                        + (target.y - current.y)**2 
                        + (target.z - current.z)**2)
    }

    updateVelocity(t){
        const target = this.controller.targetPoint;
        const current = this.fish.position;

        // Returns euclidean distance
        const d = Math.sqrt( (target.x - current.x)**2 
                           + (target.y - current.y)**2 
                           + (target.z - current.z)**2)

        /**
         * Default behaviour
         */
        if(!this.controller.isActive || d>this.followDistance){

            // Update animation state
            if( this.isFollowing ){
                this.isFollowing = false;
                this.actionSwimLoop.stop();
            }

            let swim = t % this.interval;

            // Update position
            this.velocity.set( this.speed*0.01
                               * (1-Math.sqrt(( swim / this.interval )))**2 
                               + 0.0001, 
                               0, 0);

            // Play swim animation once in an interval
            if(!this.isFollowing && this.actionSwim.paused && swim>this.interval*0.8 ){
                this.actionSwim.paused = false;
                this.actionSwim.reset();
                this.actionSwim.play();
            }

        /**
         * Behaviour when following the cursor
         */
        }else if(this.controller.isActive && d<this.followDistance){

            // Update animation state
            if(!this.isFollowing ){
                this.isFollowing = true;
                this.actionSwimLoop.play();
            }

            // Change animation speed based on distance
            this.actionSwimLoop.timeScale = this.speed * d**1.2
                                            *( 0.0002  + Math.random() * 0.0001 ) 
                                            +  0.00001 + Math.random() * 0.0002;

            // Update position
            const dx = target.x - current.x;
            const dy = target.y - current.y;
            const dz = target.z - current.z;
            this.velocity.set(dx, dy, dz);
            this.velocity.normalize();
            this.velocity.multiplyScalar(this.speed*d**1.2*0.0005);

        }
    }

    updatePosition(dt){
        this.fish.position.x += this.velocity.x*dt;
        this.fish.position.y += this.velocity.y*dt;
        this.fish.position.z += this.velocity.z*dt; 

        // Make them go around
        this.fish.position.x = (     this.fish.position.x 
                                +    this.maxDistance) 
                                % (2*this.maxDistance) 
                                -    this.maxDistance;
    }

    rotate(){
        let xAxis = this.velocity.clone().normalize();
        if (xAxis.lengthSq() === 0) return;

        const worldUp = this.vectorUp;

        // First compute Z perpendicular to X and worldUp
        let zAxis = this.zAxis.crossVectors(xAxis, worldUp);

        if (zAxis.lengthSq() === 0) {
            // forward parallel to up → choose fallback axis
            zAxis.set(0, 0, 1);
        }

        zAxis.normalize();

        // Now recompute true Y so it's orthogonal
        const yAxis = this.yAxis.crossVectors(zAxis, xAxis).normalize();

        const m = this.matrix.makeBasis(xAxis, yAxis, zAxis);
        this._targetQuat.setFromRotationMatrix(m);
        this.fish.quaternion.slerp(this._targetQuat, this.rotationSpeed);
    }

}