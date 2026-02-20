import * as THREE from 'https://unpkg.com/three@0.182.0/build/three.module.js';

/**
 * Updates camera movement and holds information about mouse coordinates.
 */
export class MouseController{
    constructor(camera, document, renderer, {speed, maxRot}){
        this.camera   = camera;
        this.document = document;
        this.renderer = renderer;
        this.speed    = speed  ? speed  : 0.05;
        this.maxRot   = maxRot ? maxRot : Math.PI/8;

        this.w                    = window.innerWidth;
        this.h                    = window.innerHeight;
        this.isActive             = true;
        this.mouse                = new THREE.Vector2(0, 0);
        this.targetPoint          = new THREE.Vector3(0, 0, 0);
        this.cameraRotationTarget = new THREE.Euler( 0, 0, 0, 'XYZ');
        this._targetQuat          = new THREE.Quaternion();      

        // Raycaster for finding a point in 3D space from 2D mouse point
        this.raycaster            = new THREE.Raycaster();
        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Invisible plane used for raycasting
        this.intersectionPlane    = new THREE.Object3D().add(
                                        new THREE.Mesh(
                                            new THREE.BoxGeometry(100, 100, 1)
                                        )
                                    );

        this.camPoint             = new THREE.Vector3(0, 0, 5);
        
        // Tracks mouse inactivity to ignore it if >coolDownTime
        this.coolDownTime         = 5000; //ms
        this.mouseInactivityTime  = 0;

        // Initialize controls
        this.setMouseInput();
        this.onResized();
    }

    update(t, dt){

        // Prevent fishes from gathering at a point when mouse is inactive
        if(this.mouseInactivityTime > this.coolDownTime){
            this.isActive = false;
        }

        // Update camera rotation
        this.updateRotationTarget();
        this._targetQuat.setFromEuler(this.cameraRotationTarget);
        this.camera.quaternion.slerp(this._targetQuat, this.speed);
        this.camera.updateMatrixWorld(true);

        // Sets intersection plane (for raycasting) further if mouse is closer to edge
        this.intersectionPlane.position.z = - Math.abs(this.mouse.x * this.mouse.y) * 10;
        this.intersectionPlane.updateMatrixWorld(true);

        // Get&set mouse point in 3D world using raycast
        this.raycaster.setFromCamera(this.mouse, this.camera);

        if(this.intersectionPlane){

            const intersect = this.raycaster.intersectObject(this.intersectionPlane, true);

            if(intersect.length > 0){
                this.targetPoint = intersect[0].point;
            }
        }

        this.mouseInactivityTime += dt
        
    }

    updateRotationTarget(){
        /* mouse coord as float 0-1: */
        let x = this.mouse.x;
        let y = this.mouse.y ;

        /* map coord to angles */
        this.cameraRotationTarget.set(y*this.maxRot, - x*this.maxRot, 0);
    }

    
    /**
     * Event handlers
     */

    onMouseMoved = (e) => {
        let x = (e.clientX - this.w/2)/(this.w/2);
        let y = (e.clientY - this.h/2)/(this.h/2);
        this.mouse.set(x, -y);

        this.mouseInactivityTime = 0;
        this.isActive = true;
    }

    onMouseEnter = (e) => {
        this.isActive = true;
    }

    onMouseLeave = (e) =>{
        this.isActive = false;
    }

    onResized = (e) => {
        const canvas = this.renderer.domElement;
        this.h = canvas.clientHeight;
        this.w = canvas.clientWidth;
        this.camera.aspect = this.w / this.h;
        this.camera.updateProjectionMatrix();
    }

    setMouseInput(){
        this.document.body.addEventListener("mousemove", this.onMouseMoved);
        this.document.body.addEventListener("mouseenter", this.onMouseEnter);
        this.document.body.addEventListener("mouseleave", this.onMouseLeave);
        window.addEventListener("resize", this.onResized);
    }
}