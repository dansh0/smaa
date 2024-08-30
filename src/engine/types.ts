export interface Vec3 {
    x: number;
    y: number;
    z: number;
}

export interface Vec2 {
    x: number,
    y: number
}

export interface AttribBuffers {
    aPosition: Attrib,
    aNormal: Attrib
}

export interface Attrib {
    attribBuffer: WebGLBuffer | null,
    numComponents: number,
    type: number,
    count: number,
    location: number | null
}

export interface Uniform {
    name: string,
    val: number | number[],
    type: string,
    location: WebGLUniformLocation | null
}

export interface Package {
    name: string,
    active: boolean,
    attribs: AttribBuffers,
    uniforms: Uniform[],
    program: WebGLProgram,
    hasNormals: boolean,
    renderTarget: RenderTarget | null
}

export interface RenderTarget {
    texture: WebGLTexture;
    framebuffer: WebGLFramebuffer;
    stencilBuffer: WebGLRenderbuffer;
}