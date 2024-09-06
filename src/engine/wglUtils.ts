import { AttribBuffers, Uniform, Package, RenderTarget } from './types';

export const setUpProgram = (gl: WebGLRenderingContext | WebGL2RenderingContext, vertexShader: string, fragmentShader: string, buffers: AttribBuffers, uniforms: Uniform[]): WebGLProgram => {
    // Sets a WebGL program based on attribute, uniform, and shader data

    // Compile the vertex shader
    const vShader = gl.createShader( gl['VERTEX_SHADER'] );
    if (vShader === null) {throw Error('Cannot create vertex shader');}
    gl.shaderSource(vShader, vertexShader);
    gl.compileShader(vShader);
    const vLog = gl.getShaderInfoLog(vShader)
    if (vLog != "") { console.log(vLog) } 

    // Compile the fragment shaders
    const fShader = gl.createShader( gl['FRAGMENT_SHADER'] );
    if (fShader === null) {throw Error('Cannot create fragment shader');}
    gl.shaderSource(fShader, fragmentShader);
    gl.compileShader(fShader);
    const fLog = gl.getShaderInfoLog(fShader)
    if (fLog != "") { console.log(fLog) } 
    
    let program = gl.createProgram();
    if (program === null) {throw Error('Cannot create program');}
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);
    gl.useProgram(program);
    
    // Instruct Program how to use attribute data
    // Position
    const posAttribLocation = gl.getAttribLocation(program, 'aPosition');
    buffers.aPosition.location = posAttribLocation;

    // Normal
    const normAttribLocation = gl.getAttribLocation(program, 'aNormal');
    buffers.aNormal.location = normAttribLocation;

    uniforms.forEach((uniform) => {
        uniform.location = gl.getUniformLocation(program, uniform.name)
        setUniform(gl, uniform);
    })

    return program
}

export const setUniform = (gl: WebGLRenderingContext | WebGL2RenderingContext, uniform: Uniform): void => {
    // Sets a WebGL uniform based on type
    switch (uniform.type) {
        case 'float':
            if (typeof uniform.val != 'number') { throw Error('float assigned to non-float value'); }
            gl.uniform1f(uniform.location, uniform.val);
            break;
        case 'vec2':
            if (typeof uniform.val == 'number' || uniform.val.length != 2 ) { throw Error('vec2 assigned to non-vec2 value'); }
            gl.uniform2f(uniform.location, uniform.val[0], uniform.val[1]);
            break;
        case 'vec3':
            if (typeof uniform.val == 'number' || uniform.val.length != 3 ) { throw Error('vec3 assigned to non-vec3 value'); }
            gl.uniform3f(uniform.location, uniform.val[0], uniform.val[1], uniform.val[2]);
            break;
        case 'vec4':
            if (typeof uniform.val == 'number' || uniform.val.length != 4 ) { throw Error('vec4 assigned to non-vec4 value'); }
            gl.uniform4f(uniform.location, uniform.val[0], uniform.val[1], uniform.val[2], uniform.val[3]);
            break;
        default:
            throw Error('Unknown Type for Uniform');
    }
}

export const setAttributes = (gl: WebGLRenderingContext | WebGL2RenderingContext, positions: number[], normals: number[]): AttribBuffers => {
    // Set up attributes and metadata
    
    let attribs: AttribBuffers = {
        aPosition: {
            numComponents: 2,
            type: gl.FLOAT,
            attribBuffer: gl.createBuffer(),
            count: Math.floor(positions.length/2),
            location: null
        },
        aNormal: {
            numComponents: 2,
            type: gl.FLOAT,
            attribBuffer: gl.createBuffer(),
            count: Math.floor(positions.length/2),
            location: null
        }
    };

    // Bind Positions
    gl.bindBuffer(gl.ARRAY_BUFFER, attribs.aPosition.attribBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // Bind Normals
    gl.bindBuffer(gl.ARRAY_BUFFER, attribs.aNormal.attribBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    return attribs
}

export const updateAttributes = (gl: WebGLRenderingContext | WebGL2RenderingContext, attribs: AttribBuffers, positions: number[], normals: number[]) => {
    // Update attributes and metadata
    // attribs must be of type returned from setAttributes
    
    // Update counts
    attribs.aPosition.count = Math.floor(positions.length/2);
    attribs.aNormal.count = Math.floor(normals.length/2);
  
    attribs.aPosition.attribBuffer = gl.createBuffer();
    attribs.aNormal.attribBuffer = gl.createBuffer();
  
    // Bind Positions
    gl.bindBuffer(gl.ARRAY_BUFFER, attribs.aPosition.attribBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW); 
  
    // Bind Normals
    gl.bindBuffer(gl.ARRAY_BUFFER, attribs.aNormal.attribBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.DYNAMIC_DRAW); 
  
    return attribs
}

export const getUniform = (packages: Package[], packageName: string, uniformName: string) => {
    let pckIndex = packages.map(pck => pck.name).indexOf(packageName);
    let uniIndex = packages[pckIndex].uniforms.map(uni => uni.name).indexOf(uniformName);
    return packages[pckIndex].uniforms[uniIndex];
}

export const makeTexture = (gl: WebGLRenderingContext | WebGL2RenderingContext, width: number, height: number, level: number = 0, data: ArrayBufferView | null = null, format: number = gl.RGBA, type: number = gl.UNSIGNED_BYTE, scaling: number = gl.LINEAR, wrap: number = gl.CLAMP_TO_EDGE): WebGLTexture => {
    // makes a texture and performs bindings
    if (data == null && format == gl.RGBA) {
      // make empty buffer
      data = new Uint8Array(width * height * 4); // RGBA format
    }
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, level, format, type, data) // tex, level, internalFormat, width, height, border, format, type, data
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, scaling);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);

    // Make sure everything is not null
    if (!texture) {
        throw new Error("Failed to create WebGL texture");
    }

    return texture;
}
  
export const makeRenderTarget = (gl: WebGLRenderingContext | WebGL2RenderingContext, width: number, height: number, level: number = 0, attachPoint: number = gl.COLOR_ATTACHMENT0, data: ArrayBufferView | null = null, format: number = gl.RGBA, type: number = gl.UNSIGNED_BYTE, scaling: number = gl.LINEAR, wrap: number = gl.CLAMP_TO_EDGE): RenderTarget => {
    // Render Targets are useful ways to render to a texture directly without rendering to canvas
    
    // Make a texture
    const texture = makeTexture(gl, width, height, level, data, format, type, scaling, wrap);
  
    // Make a framebuffer and attach render target texture
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachPoint, gl.TEXTURE_2D, texture, level);
  
    // Make a stencil buffer and attach it to the framebuffer
    const stencilBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, stencilBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.STENCIL_INDEX8, width, height);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.STENCIL_ATTACHMENT, gl.RENDERBUFFER, stencilBuffer);
  
    // Make sure everything is not null
    if (!texture || !framebuffer || !stencilBuffer) {
        throw new Error("Failed to create WebGL resources");
    }

    return {
        texture,
        framebuffer,
        stencilBuffer
    }
  
}
  
export const updateRenderTarget = (gl: WebGLRenderingContext | WebGL2RenderingContext, renderTarget: RenderTarget, width: number, height: number, level: number = 0, attachPoint: number = gl.COLOR_ATTACHMENT0, data: ArrayBufferView | null = null, format: number = gl.RGBA, type: number = gl.UNSIGNED_BYTE, scaling: number = gl.LINEAR, wrap: number = gl.CLAMP_TO_EDGE) => {
    // Updates the render target, allowing for size or other changes
    renderTarget.texture = makeTexture(gl, width, height, level, data, format, type, scaling, wrap);
    gl.bindFramebuffer(gl.FRAMEBUFFER, renderTarget.framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachPoint, gl.TEXTURE_2D, renderTarget.texture, level);
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderTarget.stencilBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.STENCIL_INDEX8, width, height);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.STENCIL_ATTACHMENT, gl.RENDERBUFFER, renderTarget.stencilBuffer);
}

export const getGLState = (gl: WebGLRenderingContext | WebGL2RenderingContext) => {
    return {
        currentProgram: gl.getParameter(gl.CURRENT_PROGRAM),
        currentBlendSrc: gl.getParameter(gl.BLEND_SRC_RGB),
        currentBlendDst: gl.getParameter(gl.BLEND_DST_RGB),
        currentBlendEquation: gl.getParameter(gl.BLEND_EQUATION_RGB),
        currentArrayBuffer: gl.getParameter(gl.ARRAY_BUFFER_BINDING),
        currentTexture: gl.getParameter(gl.TEXTURE_BINDING_2D),
        currentActiveTexture: gl.getParameter(gl.ACTIVE_TEXTURE),
        currentStencilFunc: gl.getParameter(gl.STENCIL_FUNC),
        currentStencilRef: gl.getParameter(gl.STENCIL_REF),
        currentStencilValueMask: gl.getParameter(gl.STENCIL_VALUE_MASK),
        currentStencilFail: gl.getParameter(gl.STENCIL_FAIL),
        currentStencilPassDepthFail: gl.getParameter(gl.STENCIL_PASS_DEPTH_FAIL),
        currentStencilPassDepthPass: gl.getParameter(gl.STENCIL_PASS_DEPTH_PASS),
        currentColorMask: gl.getParameter(gl.COLOR_WRITEMASK)
    }
}
  
export const setGLState = (gl: WebGLRenderingContext | WebGL2RenderingContext, glState: any) => {
    gl.useProgram(glState.currentProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, glState.currentArrayBuffer);
    gl.blendFunc(glState.currentBlendSrc, glState.currentBlendDst);
    gl.blendEquation(glState.currentBlendEquation);
    gl.bindTexture(gl.TEXTURE_2D, glState.currentTexture);
    gl.activeTexture(glState.currentActiveTexture);
    gl.stencilFunc(glState.currentStencilFunc, glState.currentStencilRef, glState.currentStencilValueMask);
    gl.stencilOp(glState.currentStencilFail, glState.currentStencilPassDepthFail, glState.currentStencilPassDepthPass);
    gl.colorMask(glState.currentColorMask[0], glState.currentColorMask[1], glState.currentColorMask[2], glState.currentColorMask[3]);
}