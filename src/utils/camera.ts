import Mat4 from "./matrix";

interface Vec3 {
    x: number;
    y: number;
    z: number;
}

class Camera {
    FOV: number
    aspectRatio: number
    near: number
    far: number
    perspective: Mat4
    cameraMatrix: Mat4
    viewMatrix: Mat4
    viewProjectionMatrix: Mat4

    constructor(FOV: number, aspectRatio: number, near: number, far: number) {
        this.FOV = FOV;
        this.aspectRatio = aspectRatio;
        this.near = near;
        this.far = far;
        this.perspective = new Mat4();
        this.cameraMatrix = new Mat4();
        this.viewMatrix = new Mat4();
        this.viewProjectionMatrix = new Mat4();
        this.setPerspective();
    }

    setPerspective(): void {
        // Creates the original perspective matrix
        const f = Math.tan((Math.PI * 0.5) - (this.FOV * 0.5)); //1.0 / Math.tan(this.FOV / 2)
        const rangeInv = 1 / (this.near - this.far);
        const matElems = [
            f / this.aspectRatio, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (this.near + this.far) * rangeInv, -1,
            0, 0, this.near * this.far * rangeInv * 2, 0
        ];
        this.perspective.setFromElements(matElems);
    }

    setCameraMat(): void {
        // Creates the camera matrix

    }

    updateCamera(height: number, forward: number, rotation: Vec3) {
        // updates the height and rotation of the camera
        let phi = rotation.x * (Math.PI/180);
        let theta = rotation.y * (Math.PI/180);
        this.setPerspective(); // reset perspective
        this.cameraMatrix.setIdentity();
        this.cameraMatrix.translate(0, height, forward);
        this.cameraMatrix.rotationX(phi);
        this.cameraMatrix.rotation(theta, [0, Math.cos(phi), Math.sin(phi)]);
        // this.cameraMatrix.rotationZ(rotation.z * (Math.PI/180));

        // Get inverse matrix of camera and set to view matrix
        const invCamera = this.cameraMatrix.inverse();
        this.viewMatrix.setFromElements(invCamera.matrix);

        // Get view projection matrix
        this.viewProjectionMatrix.setFromElements(this.perspective.matrix);
        this.viewProjectionMatrix.multiply(this.viewMatrix);

    }
}

export default Camera