precision mediump float;
uniform vec2 uResolution;
uniform float uTime;
uniform sampler2D uWeightsTarget;

void main()
{
    vec2 uv = gl_FragCoord.xy / uResolution;
    vec4 renderTarget = texture2D(uWeightsTarget, uv);
    gl_FragColor = renderTarget * vec4(1.0, 0.0, 0.0, 1.0);
}