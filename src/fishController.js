import * as THREE from 'three';

/**
 * Represents a fish and takes care of its animation.
 * 
 * @param fish        Root model of a fish, Object3D
 * @param controller  Instance of a MouseController
 *                    needed to get mouse position
 * @param clips       Animation clips
 */
export class FishController{
    constructor(fish, controller, clips, {speed, interval, maxDistance, followDistance, rotationSpeed}){
        // Resources
        this.fish           = fish;
        this.controller     = controller;
        this.clips          = (typeof clips !== 'undefined') ? clips : [];
        // Tweakable parameters
        this.speed          = speed          ?? 0.1  + Math.random() * 0.5;
        this.interval       = interval       ?? 2    + Math.random();
        this.followDistance = followDistance ?? 3    + Math.random() * 5;
        this.maxDistance    = maxDistance    ?? 20;
        this.rotationSpeed  = rotationSpeed  ?? 0.1  + Math.random() * 0.05;

        // Determines fish's behaviour state
        this.isFollowing    = false;
        // Variables for transformation
        this.velocity       = new THREE.Vector3(0, 0, 0);
        // Variables for rotation
        this._targetQuat    = new THREE.Quaternion();
        this.zAxis          = new THREE.Vector3();
        this.yAxis          = new THREE.Vector3();
        this.matrix         = new THREE.Matrix4();
        this.vectorForward = new THREE.Vector3(1, 0, 0); // Axis representing model's forward direction
        this.vectorUp       = new THREE.Vector3(0, 1, 0);
        this.fish.rotation.order = 'YXZ';

        // Animations
        const swim     = clips[0];
        const swimLoop = clips[1];
        this.mixer     = new THREE.AnimationMixer( fish );

        this.actionSwim = this.mixer.clipAction( swim );
        this.actionSwim.loop = THREE.LoopOnce;
        this.actionSwim.clampWhenFinished = true;
        this.actionSwim.setDuration(this.interval);
        this.actionSwim.play();

        this.actionSwimLoop = this.mixer.clipAction( swimLoop );
        this.actionSwimLoop.timeScale = 0.1+ Math.random();
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
        const d = this.distanceToTarget();

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
            this.velocity.set( this.speed*10
                               * (1-Math.sqrt(( swim / this.interval )))**2 
                               + 1, 
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
                                            *( 0.2  + Math.random() * 0.1 ) 
                                            +  0.01 + Math.random() * 0.2;

            const target = this.controller.targetPoint;
            const current = this.fish.position;
            // Update position
            const dx = target.x - current.x;
            const dy = target.y - current.y;
            const dz = target.z - current.z;
            this.velocity.set(dx, dy, dz);
            this.velocity.normalize();
            this.velocity.multiplyScalar(this.speed*d**1.2*0.5);

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

        // First compute Z perpendicular to X and worldUp
        let zAxis = this.zAxis.crossVectors(xAxis, this.vectorUp);

        if (zAxis.lengthSq() === 0) {
            // forward parallel to up -> choose fallback axis
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