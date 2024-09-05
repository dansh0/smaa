import bgndVertexShader from '../shaders/vertexBgnd.vert';
import bgndFragmentShader from '../shaders/fragmentBgnd.frag';
import edgeVertexShader from '../shaders/vertexEdge.vert';
import edgeFragmentShader from '../shaders/fragmentEdge.frag';
import weightsVertexShader from '../shaders/vertexWeights.vert';
import weightsFragmentShader from '../shaders/fragmentWeights.frag';
import blendVertexShader from '../shaders/vertexBlend.vert';
import blendFragmentShader from '../shaders/fragmentBlend.frag';
import { Dispatch, SetStateAction } from 'react';
import { setUpProgram, setUniform, setAttributes, getUniform, makeRenderTarget, updateRenderTarget } from './wglUtils';
import { Vec3, Uniform, Package, RenderTarget } from './types';
import { getAreaTexture, getSearchTexture } from './SMAAtextures';


class Engine {
    canvas: HTMLCanvasElement;
    // gl: WebGLRenderingContext | null;
    gl: any;
    bgndRenderTarget: RenderTarget | null = null;
    edgeRenderTarget: RenderTarget | null = null;
    weightsRenderTarget: RenderTarget | null = null;
    packages: Package[];
    vector: Vec3;
    floatVar1: number;
    floatVar2: number;
    startTime: number;
    frameCount: number;
    lastFrameCount: number;
    lastFrameTime: DOMHighResTimeStamp;
    setFPS: Dispatch<SetStateAction<number>>;
    renderCount: number;
    areaTexture: WebGLTexture | null = null;
    searchTexture: WebGLTexture | null = null;
    areaImage: HTMLImageElement;
    searchImage: HTMLImageElement;
    imgLoadCount: number = 0;
    smaaActive: boolean = true;

    constructor(canvas: HTMLCanvasElement, setFPS: Dispatch<SetStateAction<number>>) {
        this.packages = [];
        this.startTime = Date.now();
        this.canvas = canvas;
        this.gl = this.canvas!.getContext('webgl2', {stencil: true});
        this.vector = {x: 0, y: 0, z: 0};
        this.floatVar1 = 0;
        this.floatVar2 = 0;
        this.frameCount = 0;
        this.lastFrameTime = performance.now();
        this.lastFrameCount = 0;
        this.setFPS = setFPS;
        this.renderCount = 0;

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
            this.init();
        } 
        // else wait for other images
    }

    init(): void {

        const gl = this.gl;
        const canvas = this.canvas;

        // Scale to screen size (windows scale)
        const deviceScaling = true;
        const deviceScaleRatio = (deviceScaling) ? window.devicePixelRatio : 1; 
        
        // Check Null
        if (canvas === null) { throw Error('Cannot get canvas'); }
        if (gl===null) { throw Error("Cannot get webgl context from canvas"); }
        
        // Clear Canvas
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        // Enable Depth Test
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        
        // Cull back faces
        gl.enable(gl.CULL_FACE);
                
        // Set Canvas Size
        canvas.width = canvas.clientWidth * deviceScaleRatio; // resize to client canvas
        canvas.height = canvas.clientHeight * deviceScaleRatio; // resize to client canvas
        gl.viewport(0, 0, canvas.width, canvas.height);
        console.log('CANVAS DIMENSIONS:')
        console.log(canvas.width, canvas.height);      

        // Init render targets to draw to until the final pass
        this.bgndRenderTarget = makeRenderTarget(gl, canvas.width, canvas.height);
        this.edgeRenderTarget = makeRenderTarget(gl, canvas.width, canvas.height);
        this.weightsRenderTarget = makeRenderTarget(gl, canvas.width, canvas.height);

        // Textures
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

        // const uImage = gl.getUniformLocation(bgndProgram, 'uImage');
        // gl.activeTexture(gl.TEXTURE0);
        // gl.bindTexture(gl.TEXTURE_2D, areaTexture);
        // gl.uniform1i(uImage, 0);

        // BACKGROUND PROGRAM
        let quadPositions = [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, ];
        let quadNormals = [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ];
        
        // Set up Position Attribute
        let bgndBuffers = setAttributes(gl, quadPositions, quadNormals);

        // Define Uniforms
        let bgndUniforms: Uniform[] = [
            {
                name: 'uTime',
                val: this.getTime(),
                type: 'float',
                location: null
            },
            {
                name: 'uResolution',
                val: [canvas.width, canvas.height],
                type: 'vec2',
                location: null
            }
        ];

        // Create Program
        let bgndProgram = setUpProgram(gl, bgndVertexShader, bgndFragmentShader, bgndBuffers, bgndUniforms);

        // Package Program with Attributes and Uniforms
        let bgndPackage: Package = {
            name: 'background',
            active: true,
            attribs: bgndBuffers,
            uniforms: bgndUniforms,
            program: bgndProgram,
            hasNormals: false,
            renderTarget: this.bgndRenderTarget
        }
        this.packages.push(bgndPackage);


        // EDGE PROGRAM
     
        // Set up Position Attribute
        let edgeBuffers = setAttributes(gl, quadPositions, quadNormals);

        // Define Uniforms
        let edgeUniforms: Uniform[] = [
            {
                name: 'uResolution',
                val: [canvas.width, canvas.height],
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
                val: [canvas.width, canvas.height],
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
                name: 'uTime',
                val: this.getTime(),
                type: 'float',
                location: null
            },
            {
                name: 'uResolution',
                val: [canvas.width, canvas.height],
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
            renderTarget: null
        }
        this.packages.push(blendPackage);

        

        // function to resize window properly
        const resizeWindow = () => {
            if (!this.gl) { throw Error('Lost WebGL Render Context'); }
            let width = window.innerWidth * deviceScaleRatio;
            let height = window.innerHeight * deviceScaleRatio;
            canvas.style.width = window.innerWidth + 'px';
            canvas.style.height = window.innerHeight + 'px';
            canvas.width = width; // resize to client canvas
            canvas.height = height; // resize to client canvas
            gl.viewport(0, 0, canvas.width, canvas.height);
            if (this.bgndRenderTarget) {
                updateRenderTarget(gl, this.bgndRenderTarget, canvas.width, canvas.height)
            }
            if (this.edgeRenderTarget) {
                updateRenderTarget(gl, this.edgeRenderTarget, canvas.width, canvas.height)
            }
            if (this.weightsRenderTarget) {
                updateRenderTarget(gl, this.weightsRenderTarget, canvas.width, canvas.height)
            }
            let updatePrograms = ['background', 'edge', 'weights', 'blend'];
            updatePrograms.forEach((programName) => {
                let uResolution = getUniform(this.packages, programName, 'uResolution');
                uResolution.val = [canvas.width, canvas.height];
                let packageIndex = this.packages.map(pck => pck.name).indexOf(programName);
                gl.useProgram(this.packages[packageIndex].program);
                setUniform(this.gl, uResolution);
            });
        }

        // Run resize immediately after init and anytime a resize event triggers
        setTimeout(resizeWindow, 0);
        window.addEventListener("resize", resizeWindow);

        // Start animation loop
        this.animate();
    }

    // Animate!
    animate(): void {
        // update stats
        this.frameCount++;
        this.updateFPS();
        this.renderCount = 0; // reset number of renders per animate frame

        if (!this.gl) { throw Error('Lost WebGL Render Context') }
        const gl: WebGLRenderingContext = this.gl;

        if (!this.bgndRenderTarget?.framebuffer) { return; }
        if (!this.edgeRenderTarget?.framebuffer) { return; }
        if (!this.weightsRenderTarget?.framebuffer) { return; }

        // update time
        let time = this.getTime()/1000; // update uTime
        let uTime = getUniform(this.packages, 'background', 'uTime');
        uTime.val = time;
        
        let backgroundIndex = this.packages.map(pck => pck.name).indexOf('background');
        let edgeIndex = this.packages.map(pck => pck.name).indexOf('edge');
        let weightsIndex = this.packages.map(pck => pck.name).indexOf('weights');
        let blendIndex = this.packages.map(pck => pck.name).indexOf('blend');

        let debug = false
        if (!debug) {
            // turn on and off
            // if (time % 10 < 5) {
            //     this.smaaActive = true;
            // } else {
            //     this.smaaActive = false;
            // }
            if (this.smaaActive) {
                this.packages[backgroundIndex].renderTarget = this.bgndRenderTarget;
                this.packages[edgeIndex].active = true;
                this.packages[weightsIndex].active = true;
                this.packages[blendIndex].active = true;
            } else {
                this.packages[backgroundIndex].renderTarget = null;
                this.packages[edgeIndex].active = false;
                this.packages[weightsIndex].active = false;
                this.packages[blendIndex].active = false;
            }
        } else {
            // DEBUG PASSES
            if (time % 10 < 2) {
                this.packages[backgroundIndex].renderTarget = null;
                this.packages[edgeIndex].active = false;
                this.packages[weightsIndex].active = false;
                this.packages[blendIndex].active = false;
            } else if (time % 10 < 4) {
                this.packages[backgroundIndex].renderTarget = this.bgndRenderTarget;
                this.packages[edgeIndex].renderTarget = null;
                this.packages[edgeIndex].active = true;
            } else if (time % 10 < 7) {
                this.packages[edgeIndex].renderTarget = this.edgeRenderTarget;
                this.packages[weightsIndex].renderTarget = null;
                this.packages[weightsIndex].active = true;
            } else {
                this.packages[weightsIndex].renderTarget = this.weightsRenderTarget;
                this.packages[blendIndex].renderTarget = null;
                this.packages[blendIndex].active = true;
            }
        }

            
        
        // Uniform References
        // let uVector = getUniform(this.packages, 'effect', 'uVector');
        // uVector.val = [this.vector.x, this.vector.y, this.vector.z];
        // let uFloatVar1 = getUniform(this.packages, 'effect', 'uFloatVar1');
        // uFloatVar1.val = this.floatVar1;
        // let uFloatVar2 = getUniform(this.packages, 'effect', 'uFloatVar2');
        // uFloatVar2.val = this.floatVar2;
     
        // Draw packages
        for (let iPackage = 0; iPackage < this.packages.length; iPackage++) {
            this.drawPackage(gl, this.packages[iPackage]);
        }
       
        requestAnimationFrame(this.animate.bind(this));
    }

    drawPackage(gl: WebGLRenderingContext, pck: Package): void {
        if (!pck.active) { return }

        this.renderCount++;

        // Set Program
        gl.useProgram(pck.program);

        // Draw to frame buffer instead of canvas
        gl.bindFramebuffer(gl.FRAMEBUFFER, pck.renderTarget?.framebuffer);
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
        if (pck.name == 'background') {
            setUniform(gl, getUniform(this.packages, pck.name, 'uTime')); 
        }
        else if (pck.name == 'edge') {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.bgndRenderTarget!.texture);
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
            gl.bindTexture(gl.TEXTURE_2D, this.bgndRenderTarget!.texture);
            gl.uniform1i(gl.getUniformLocation(pck.program, "uRenderTexture"), 1);
        }

        // Draw
        gl.drawArrays(gl.TRIANGLES, 0, pck.attribs.aPosition.count); //primitive, offset, count
    }

    getTime(): number {
        return Date.now() - this.startTime;
    }

    updatePosition(floatVar1: number, floatVar2: number, vector: Vec3): void {
       this.smaaActive = !!+floatVar1;
    }

    updateFPS(): void {
        let currentTime = performance.now();
        let deltaTime = currentTime - this.lastFrameTime;
        let testTime = 1000;
        // only update after a second (or testTime if changed)
        if (deltaTime >= testTime) {
            // figure out how many frames passed and divide by time passed
            let deltaFrames = this.frameCount - this.lastFrameCount;
            let fps = (deltaFrames / deltaTime) * 1000;
            this.setFPS(fps);

            // reset
            this.lastFrameTime = currentTime;
            this.lastFrameCount = this.frameCount;
        }
    }
}

export default Engine
