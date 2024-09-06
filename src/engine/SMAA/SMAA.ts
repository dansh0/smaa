import edgeVertexShader from './shaders/vertexEdge.vert';
import edgeFragmentShader from './shaders/fragmentEdge.frag';
import weightsVertexShader from './shaders/vertexWeights.vert';
import weightsFragmentShader from './shaders/fragmentWeights.frag';
import blendVertexShader from './shaders/vertexBlend.vert';
import blendFragmentShader from './shaders/fragmentBlend.frag';
import { getAreaTexture, getSearchTexture } from './SMAAtextures';
import { setUpProgram, setUniform, setAttributes, getUniform, makeRenderTarget, updateRenderTarget } from '../wglUtils';
import { Vec3, Uniform, Package, RenderTarget } from '../types';

class SMAA {
    gl: WebGLRenderingContext | WebGL2RenderingContext;
    width: number;
    height: number;
    readTarget: RenderTarget;
    writeTarget: RenderTarget | null;
    edgeRenderTarget: RenderTarget;
    weightsRenderTarget: RenderTarget;
    packages: Package[];
    active: boolean;
    areaTexture: WebGLTexture | null = null;
    searchTexture: WebGLTexture | null = null;
    areaImage: HTMLImageElement;
    searchImage: HTMLImageElement;
    imgLoadCount: number = 0;

    constructor(gl: WebGLRenderingContext, width: number, height: number, readTarget: RenderTarget, writeTarget: RenderTarget) {
        this.gl = gl;
        this.width = width;
        this.height = height;
        this.readTarget = readTarget;
        this.writeTarget = writeTarget;
        this.edgeRenderTarget = makeRenderTarget(gl, width, height);
        this.weightsRenderTarget = makeRenderTarget(gl, width, height);
        this.packages = [];
        this.active = false;

        // Load images to start
        this.areaImage = new Image();
        this.areaImage.src = getAreaTexture();
        this.areaImage.onload = () => {
            this.imagesLoaded();
        }
        this.searchImage = new Image();
        this.searchImage.src = getSearchTexture();
        this.searchImage.onload = () => {
            this.imagesLoaded();
        }
    }

    imagesLoaded(): void {
        this.imgLoadCount++;
        if (this.imgLoadCount == 2) {
            // start
            this._init();
            this.active = true; // set ready
        } 
        // else wait for other images
    }
    
    _init(): void {

        const gl = this.gl;

        // Search and Area Textures (For Weight Render)
        this.areaTexture = gl.createTexture()
        gl.bindTexture(gl.TEXTURE_2D, this.areaTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, this.areaImage);

        this.searchTexture = gl.createTexture()
        gl.bindTexture(gl.TEXTURE_2D, this.searchTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, this.searchImage);


        // EDGE PROGRAM
     
        // Set up Position Attribute
        let quadPositions = [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, ];
        let quadNormals = [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ];
        let edgeBuffers = setAttributes(gl, quadPositions, quadNormals);

        // Define Uniforms
        let edgeUniforms: Uniform[] = [
            {
                name: 'uResolution',
                val: [this.width, this.height],
                type: 'vec2',
                location: null
            }
        ];

        // Create Program
        let edgeProgram = setUpProgram(gl, edgeVertexShader, edgeFragmentShader, edgeBuffers, edgeUniforms);

        // Package Program with Attributes and Uniforms
        let edgePackage: Package = {
            name: 'edge',
            active: true,
            attribs: edgeBuffers,
            uniforms: edgeUniforms,
            program: edgeProgram,
            hasNormals: false,
            renderTarget: this.edgeRenderTarget
        }
        this.packages.push(edgePackage);


         // WEIGHTS PROGRAM
     
        // Set up Position Attribute
        let weightsBuffers = setAttributes(gl, quadPositions, quadNormals);

        // Define Uniforms
        let weightsUniforms: Uniform[] = [
            {
                name: 'uResolution',
                val: [this.width, this.height],
                type: 'vec2',
                location: null
            }
        ];

        // Create Program
        let weightsProgram = setUpProgram(gl, weightsVertexShader, weightsFragmentShader, weightsBuffers, weightsUniforms);

        // Package Program with Attributes and Uniforms
        let weightsPackage: Package = {
            name: 'weights',
            active: true,
            attribs: weightsBuffers,
            uniforms: weightsUniforms,
            program: weightsProgram,
            hasNormals: false,
            renderTarget: this.weightsRenderTarget
        }
        this.packages.push(weightsPackage);


         // BLEND PROGRAM
     
        // Set up Position Attribute
        let blendBuffers = setAttributes(gl, quadPositions, quadNormals);

        // Define Uniforms
        let blendUniforms: Uniform[] = [
            {
                name: 'uResolution',
                val: [this.width, this.height],
                type: 'vec2',
                location: null
            }
        ];

        // Create Program
        let blendProgram = setUpProgram(gl, blendVertexShader, blendFragmentShader, blendBuffers, blendUniforms);

        // Package Program with Attributes and Uniforms
        let blendPackage: Package = {
            name: 'blend',
            active: true,
            attribs: blendBuffers,
            uniforms: blendUniforms,
            program: blendProgram,
            hasNormals: false,
            renderTarget: this.writeTarget
        }
        this.packages.push(blendPackage);

    }

    // Public function to update the window size, should be called whenever a resize trigger is called on the main rendering
    resizeWindow(width: number, height: number): void {
        const gl = this.gl;
        this.width = width;
        this.height = height;
        if (this.edgeRenderTarget) {
            updateRenderTarget(gl, this.edgeRenderTarget, this.width, this.height)
        }
        if (this.weightsRenderTarget) {
            updateRenderTarget(gl, this.weightsRenderTarget, this.width, this.height)
        }
        let updatePrograms = ['edge', 'weights', 'blend'];
        updatePrograms.forEach((programName) => {
            let packageIndex = this.packages.map(pck => pck.name).indexOf(programName);
            if (packageIndex == -1) { return } 
            let uResolution = getUniform(this.packages, programName, 'uResolution');
            uResolution.val = [this.width, this.height];
            gl.useProgram(this.packages[packageIndex].program);
            setUniform(this.gl, uResolution);
        });
    }

    // Public function to render the post-processing technique
    render(): void {
        // Gracefully return without post-processing until search and area textures are loaded, or if set to inactive
        if (!(this.active && this.imgLoadCount == 2)) { return; }
        if (!this.edgeRenderTarget?.framebuffer) { return; }
        if (!this.weightsRenderTarget?.framebuffer) { return; }

        // Draw Edge, Weight, and Blend Packages
        for (let iPackage=0; iPackage<this.packages.length; iPackage++) {
            this._drawPackage(this.gl, this.packages[iPackage]);
        }
    }

    // Public function to turn the post-processing technique on or off
    setActive(isActive: boolean): void {
        this.active = isActive;
    }

    _drawPackage(gl: WebGLRenderingContext | WebGL2RenderingContext, pck: Package): void {
        if (!pck.active) { return }

        // Set Program
        gl.useProgram(pck.program);

        // Draw to frame buffer instead of canvas, unless it's the last frame
        if (pck.renderTarget) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, pck.renderTarget.framebuffer);
        } else {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }

        // Clear
        gl.clearColor(0, 0, 0, 1); 
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.blendFunc(gl.ONE, gl.ZERO);

        // Position Attributes
        let location = pck.attribs.aPosition.location;
        if (typeof location != 'number') { throw Error('Faulty attribute location')}
        gl.enableVertexAttribArray(location);
        gl.bindBuffer(gl.ARRAY_BUFFER, pck.attribs.aPosition.attribBuffer);
        gl.vertexAttribPointer( location, pck.attribs.aPosition.numComponents, pck.attribs.aPosition.type, false, 0, 0);

        // Normal Attributes
        if (pck.hasNormals) {
            // only add normals if they are used
            location = pck.attribs.aNormal.location;
            if (typeof location != 'number') { throw Error('Faulty attribute location')}
            gl.enableVertexAttribArray(location);
            gl.bindBuffer(gl.ARRAY_BUFFER, pck.attribs.aNormal.attribBuffer);
            gl.vertexAttribPointer( location, pck.attribs.aNormal.numComponents, pck.attribs.aNormal.type, false, 0, 0);
        }

        // Update Uniforms
        if (pck.name == 'edge') {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.readTarget.texture);
            gl.uniform1i(gl.getUniformLocation(pck.program, "uRenderTexture"), 0);
        } else if (pck.name == 'weights') {
            const uAreaTexture = gl.getUniformLocation(pck.program, 'uAreaTexture');
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.areaTexture);
            gl.uniform1i(uAreaTexture, 0);
            const uSearchTexture = gl.getUniformLocation(pck.program, 'uSearchTexture');
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, this.searchTexture);
            gl.uniform1i(uSearchTexture, 1);
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, this.edgeRenderTarget!.texture);
            gl.uniform1i(gl.getUniformLocation(pck.program, "uEdgeTexture"), 2);
        } else if (pck.name == 'blend') {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.weightsRenderTarget!.texture);
            gl.uniform1i(gl.getUniformLocation(pck.program, "uWeightsTexture"), 0);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, this.readTarget.texture);
            gl.uniform1i(gl.getUniformLocation(pck.program, "uRenderTexture"), 1);
        }

        // Draw
        gl.drawArrays(gl.TRIANGLES, 0, pck.attribs.aPosition.count); //primitive, offset, count
    }


}


export default SMAA