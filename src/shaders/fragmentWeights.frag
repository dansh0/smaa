precision mediump float;
uniform vec2 uResolution;
uniform float uTime;
uniform sampler2D uEdgeTexture;
uniform sampler2D uAreaTexture;
uniform sampler2D uSearchTexture;

void main()
{
    vec2 uv = gl_FragCoord.xy / uResolution;
    vec4 renderTarget = texture2D(uEdgeTexture, uv);
    gl_FragColor = step(0.75, uv.y) + renderTarget;
}