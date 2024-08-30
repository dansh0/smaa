precision mediump float;
uniform vec2 uResolution;
uniform float uTime;
uniform sampler2D uRenderTexture;

void main()
{
    vec2 uv = gl_FragCoord.xy / uResolution;
    vec4 renderTarget = texture2D(uRenderTexture, uv);
    gl_FragColor = step(0.75, uv.x) + renderTarget;
}