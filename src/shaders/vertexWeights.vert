precision highp float;

#define SMAA_MAX_SEARCH_STEPS 8

attribute vec2 aPosition;
uniform vec2 uResolution;
varying vec2 vTexCoord;
varying vec2 vPixCoord;
varying vec4 vOffset[3];

void main() {
    vec2 resVals = vec2(1.0 / uResolution.x, 1.0 / uResolution.y);

    vTexCoord = vec2((aPosition + 1.0) / 2.0);
    vPixCoord = vTexCoord * uResolution;

    vOffset[0] = vTexCoord.xyxy + resVals.xyxy * vec4(-0.25, -0.125,  1.25, -0.125);
    vOffset[1] = vTexCoord.xyxy + resVals.xyxy * vec4(-0.125, -0.25, -0.125, 1.25);
    vOffset[2] = vec4(vOffset[0].xz, vOffset[1].yw) + resVals.xxyy * vec4(-2.0, 2.0, -2.0, 2.0) * float(SMAA_MAX_SEARCH_STEPS);

    gl_Position = vec4(aPosition, 0.0, 1.0);
}