precision highp float;


uniform sampler2D uRenderTex;
uniform float uThreshold;
uniform float uContrastFactor;

varying vec2 vTexCoord;
varying vec4 vOffset[3];

float calcColDelta(vec3 col, vec2 offset) {
    // Calculates the max difference of color from one direction from the fragment
    vec3 colDir = texture2D(uRenderTex, offset).rgb;
    vec3 tDiff = abs(col - colDir);
    return max(max(tDiff.r, tDiff.g), tDiff.b);
}

void main() {

    // Get the base color at fragment position
    vec4 delta;
    vec3 col = texture2D(uRenderTex, vTexCoord).rgb;

    // Get the color deltas for the left and top positions
    delta.x = calcColDelta(col, vOffset[0].xy);
    delta.y = calcColDelta(col, vOffset[0].zw);

    // Threshold check to leave when there is no edge
    vec2 edges = step(uThreshold, delta.xy);
    if (dot(edges, vec2(1.0, 1.0)) == 0.0) { discard; }

    // Get the color deltas for the right and bottom positions
    delta.z = calcColDelta(col, vOffset[1].xy);
    delta.w = calcColDelta(col, vOffset[1].zw);

    // Get the max color delta of these four positions
    vec2 maxDelta = max(delta.xy, delta.zw);

    // Get the color deltas for the pixels next positions further left and top
    delta.z = calcColDelta(col, vOffset[2].xy);
    delta.w = calcColDelta(col, vOffset[2].zw);

    // Get the max color delta from all of these
    maxDelta = max(maxDelta.xy, delta.zw);
    float finalDelta = max(maxDelta.x, maxDelta.y);

    // Adjust for local contrast
    edges.xy *= step(finalDelta, uContrastFactor * delta.xy);

    gl_FragColor = vec4(edges, 0.0, 1.0);
}