precision highp float;

attribute vec2 aPosition;
uniform vec2 uResolution;
varying vec2 vTexCoord;
varying vec4 vOffset;

void main() {
    vec2 resVals = vec2(1.0 / uResolution.x, 1.0 / uResolution.y);

    vTexCoord = vec2((aPosition + 1.0) / 2.0);
    vOffset = vTexCoord.xyxy + resVals.xyxy * vec4( 1.0, 0.0, 0.0, 1.0);

    gl_Position = vec4(aPosition, 0.0, 1.0);
}