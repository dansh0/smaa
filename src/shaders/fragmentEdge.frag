precision highp float;

#define SMAA_THRESHOLD 0.1
#define SMAA_LOCAL_CONTRAST_ADAPTATION_FACTOR 2.0

uniform sampler2D uRenderTex;

varying vec2 vTexCoord;
varying vec4 vOffset[3];

float calcColDelta(vec3 col, vec2 offset) {
    // Calculates the max difference of color from one direction from the fragment
    vec3 colDir = texture2D(uRenderTex, offset).rgb;
    vec3 tDiff = abs(col - colDir);
    return max(max(tDiff.r, tDiff.g), tDiff.b);
}

void main() {
    // Set threshold
    vec2 threshold = vec2(SMAA_THRESHOLD);

    // Calculate color deltas
    vec4 delta;
    vec3 col = texture2D(uRenderTex, vTexCoord).rgb;

    // Calculate left and top color deltas
    delta.x = calcColDelta(col, vOffset[0].xy);
    delta.y = calcColDelta(col, vOffset[0].zw);

    // Threshold check to leave when no edge
    vec2 edges = step(threshold, delta.xy);
    if (dot(edges, vec2(1.0, 1.0)) == 0.0) {
        discard;
    }

    // Calculate right and bottom deltas
    delta.z = calcColDelta(col, vOffset[1].xy);
    delta.w = calcColDelta(col, vOffset[1].zw);

    // Calculate the maximum delta of the direct neighborhood
    vec2 maxDelta = max(delta.xy, delta.zw);

    // Calculate left-left and top-top deltas
    delta.z = calcColDelta(col, vOffset[2].xy);
    delta.w = calcColDelta(col, vOffset[2].zw);

    // Calculate the final maximum delta
    maxDelta = max(maxDelta.xy, delta.zw);
    float finalDelta = max(maxDelta.x, maxDelta.y);

    // Local contrast adaptation
    edges.xy *= step(finalDelta, SMAA_LOCAL_CONTRAST_ADAPTATION_FACTOR * delta.xy);

    gl_FragColor = vec4(edges, 0.0, 1.0);
}