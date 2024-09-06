import { Dispatch, SetStateAction } from 'react';
import bgndVertexShader from '../shaders/vertexBgnd.vert';
import bgndFragmentShader from '../shaders/fragmentBgnd.frag';
import bgnd3DFragmentShader from '../shaders/fragmentBgnd3D.frag';
import { setUpProgram, setUniform, setAttributes, getUniform, makeRenderTarget, updateRenderTarget } from './wglUtils';
import { Vec3, Uniform, Package, RenderTarget } from './types';
import SMAA from './SMAA/SMAA';

class Engine {
    canvas: HTMLCanvasElement;
    gl: WebGLRenderingContext | WebGL2RenderingContext | null;
    bgndRenderTarget: RenderTarget | null = null;
    packages: Package[];
    smaa: SMAA | null = null;
    vector: Vec3;
    floatVar1: number;
    floatVar2: number;
    startTime: number;
    frameCount: number;
    lastFrameCount: number;
    lastFPSFrameTime: DOMHighResTimeStamp;
    lastFrameTime: number = 0;
    setFPS: Dispatch<SetStateAction<number>>;
    renderCount: number;
    smaaActive: boolean = true;
    draw2D: boolean = false;
    rotateSpeed: number = 0.11;
    rotation: number = 0;
    animationFrameId: number | null = null;
    
    constructor(canvas: HTMLCanvasElement, setFPS: Dispatch<SetStateAction<number>>) {
        this.packages = [];
        this.startTime = Date.now();
        this.canvas = canvas;
        this.gl = this.canvas!.getContext('webgl2', {stencil: true});
        this.vector = {x: 0, y: 0, z: 0};
        this.floatVar1 = 0;
        this.floatVar2 = 0;
        this.frameCount = 0;
        this.lastFPSFrameTime = performance.now();
        this.lastFrameCount = 0;
        this.setFPS = setFPS;
        this.renderCount = 0;
        this.init();
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

        // BACKGROUND PROGRAM 1 - 3D
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
            },
            {
                name: 'uRotation',
                val: 0.5,
                type: 'float',
                location: null
            },
        ];

        // Create Program
        let bgndProgram = setUpProgram(gl, bgndVertexShader, bgnd3DFragmentShader, bgndBuffers, bgndUniforms);

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


        // BACKGROUND PROGRAM 1 - 2D

        // Set up Position Attribute
        let bgnd2DBuffers = setAttributes(gl, quadPositions, quadNormals);

        // Define Uniforms
        let bgnd2DUniforms: Uniform[] = [
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
            },
            {
                name: 'uRotation',
                val: 0.5,
                type: 'float',
                location: null
            },
        ];

        // Create Program
        let bgnd2DProgram = setUpProgram(gl, bgndVertexShader, bgndFragmentShader, bgnd2DBuffers, bgnd2DUniforms);

        // Package Program with Attributes and Uniforms
        let bgnd2DPackage: Package = {
            name: 'background2D',
            active: true,
            attribs: bgnd2DBuffers,
            uniforms: bgnd2DUniforms,
            program: bgnd2DProgram,
            hasNormals: false,
            renderTarget: this.bgndRenderTarget
        }
        this.packages.push(bgnd2DPackage);

        // Init the SMAA Post-Processing
        this.smaa = new SMAA(gl, canvas.width, canvas.height, this.bgndRenderTarget, null);

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
            let updatePrograms = ['background', 'background2D'];
            updatePrograms.forEach((programName) => {
                let uResolution = getUniform(this.packages, programName, 'uResolution');
                uResolution.val = [canvas.width, canvas.height];
                let packageIndex = this.packages.map(pck => pck.name).indexOf(programName);
                gl.useProgram(this.packages[packageIndex].program);
                setUniform(gl, uResolution);
            });
            if (this.smaa) {
                this.smaa.resizeWindow(canvas.width, canvas.height);
            }
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
        const gl: WebGLRenderingContext | WebGL2RenderingContext = this.gl;

        if (!this.bgndRenderTarget?.framebuffer) { return; }
        if (!this.smaa) { return; }

        // update time and speed
        let time = this.getTime()/1000; // update uTime
        
        this.rotation += (time - this.lastFrameTime) * this.rotateSpeed * 0.1;
        this.lastFrameTime = time;
        let uRotation = getUniform(this.packages, 'background', 'uRotation');
        uRotation.val = this.rotation;
        uRotation = getUniform(this.packages, 'background2D', 'uRotation');
        uRotation.val = this.rotation;

        let backgroundIndex = this.packages.map(pck => pck.name).indexOf('background');
        let background2DIndex = this.packages.map(pck => pck.name).indexOf('background2D');

        if (this.smaaActive) {
            this.smaa.setActive(true);
            this.packages[backgroundIndex].renderTarget = this.bgndRenderTarget;
            this.packages[background2DIndex].renderTarget = this.bgndRenderTarget;
        } else {
            this.smaa.setActive(false);
            this.packages[backgroundIndex].renderTarget = null;
            this.packages[background2DIndex].renderTarget = null;
        }
      
        // Draw scene
        if (this.draw2D) {
            this.drawPackage(gl, this.packages[background2DIndex]);
        } else {
            this.drawPackage(gl, this.packages[backgroundIndex]);
        }
        
        // Run Post-Processing SMAA
        this.smaa.render();
       
        this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    }

    drawPackage(gl: WebGLRenderingContext | WebGL2RenderingContext, pck: Package): void {
        if (!pck.active) { return }

        this.renderCount++;

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
        if (pck.name == 'background' || pck.name == 'background2D') {
            setUniform(gl, getUniform(this.packages, pck.name, 'uTime')); 
            setUniform(gl, getUniform(this.packages, pck.name, 'uRotation')); 
        }

        // Draw
        gl.drawArrays(gl.TRIANGLES, 0, pck.attribs.aPosition.count); //primitive, offset, count
    }

    getTime(): number {
        return Date.now() - this.startTime;
    }

    updatePosition(floatVar1: number, floatVar2: number, vector: Vec3): void {
       this.smaaActive = !!+floatVar1;
       this.draw2D = !!+floatVar2;
       this.rotateSpeed = vector.x;
    }

    updateFPS(): void {
        let currentTime = performance.now();
        let deltaTime = currentTime - this.lastFPSFrameTime;
        let testTime = 1000;
        // only update after a second (or testTime if changed)
        if (deltaTime >= testTime) {
            // figure out how many frames passed and divide by time passed
            let deltaFrames = this.frameCount - this.lastFrameCount;
            let fps = (deltaFrames / deltaTime) * 1000;
            this.setFPS(fps);

            // reset
            this.lastFPSFrameTime = currentTime;
            this.lastFrameCount = this.frameCount;
        }
    }

    cleanup(): void {
        // Stop previous loops
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId); // Stop the previous animation frame
            this.animationFrameId = null;
        }
    }
}

export default Engine
