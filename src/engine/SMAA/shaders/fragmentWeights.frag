// Adapted from:
// https://github.com/dmnsgn/glsl-smaa/blob/main/smaa-weights.frag

precision highp float;
precision highp int;

#define SMAA_MAX_SEARCH_STEPS 8

#define SMAA_AREATEX_MAX_DISTANCE 16
#define SMAA_AREATEX_PIXEL_SIZE (1.0 / vec2(160.0, 560.0))
#define SMAA_AREATEX_SUBTEX_SIZE (1.0 / 7.0)
#define SMAA_SEARCHTEX_SIZE vec2(66.0, 33.0)
#define SMAA_SEARCHTEX_PACKED_SIZE vec2(64.0, 16.0)

#define mad(a, b, c) (a * b + c)
#define round(v) floor(v + 0.5)

uniform vec2 uResolution;
uniform sampler2D uEdgeTexture;
uniform sampler2D uAreaTexture;
uniform sampler2D uSearchTexture;

varying vec2 vTexCoord;
varying vec4 vOffset[3];
varying vec2 vPixCoord;

#define INVRES 1.0/uResolution

vec2 areaTextureSelect(vec4 sample) { return sample.rg; }
float searchTextureSelect(vec4 sample) { return sample.r; }

vec4 SMAASampleLevelZeroOffset(sampler2D tex, vec2 coord, vec2 offset) {
    return texture2D(tex, coord + offset * INVRES);
}

// This allows to determine how much length should we add in the last step of the searches
// It takes the bilinearly interpolated edge, and adds 0, 1 or 2, depending on which edges and crossing edges are active
float SMAASearchLength(sampler2D uSearchTexture, vec2 e, float offset) {
    // The texture is flipped vertically, with left and right cases taking half of the space horizontally
    vec2 scale = SMAA_SEARCHTEX_SIZE * vec2(0.5, 1.0);
    vec2 bias = SMAA_SEARCHTEX_SIZE * vec2(offset, 1.0);

    // Scale and bias to access texel centers
    scale += vec2(-1.0,  1.0);
    bias  += vec2( 0.5, -0.5);

    // Convert from pixel coordinates to texcoords
    scale *= 1.0 / SMAA_SEARCHTEX_PACKED_SIZE;
    bias *= 1.0 / SMAA_SEARCHTEX_PACKED_SIZE;

    // Lookup the search texture
    return searchTextureSelect(texture2D(uSearchTexture, mad(scale, e, bias))); // LinearSampler

    // float scale = 0.5;
    // float bias = offset;
    // e.r = bias + e.r * scale;
	// return 255.0 * texture2D( uSearchTexture, e, 0.0 ).r;
}

// Horizontal/vertical search functions for the 2nd pass
float SMAASearchXLeft(sampler2D uEdgeTexture, sampler2D uSearchTexture, vec2 texcoord, float end) {
    // This texcoord has been offset by (-0.25, -0.125) in the vertex shader to sample between edge, thus fetching four edges in a row
    // Sampling with different offsets in each direction allows to disambiguate which edges are active from the four fetched ones.
    vec2 e = vec2(0.0, 1.0);
    for (int i = 0; i < SMAA_MAX_SEARCH_STEPS; i++) {
        if (!(texcoord.x > end && e.g > 0.8281 && e.r == 0.0)) break;
        e = texture2D(uEdgeTexture, texcoord).rg; // LinearSampler
        texcoord = mad(-vec2(2.0, 0.0), INVRES.xy, texcoord);
    }

    float offset = mad(-(255.0 / 127.0), SMAASearchLength(uSearchTexture, e, 0.0), 3.25);
    return mad(INVRES.x, offset, texcoord.x);
}

float SMAASearchXRight(sampler2D uEdgeTexture, sampler2D uSearchTexture, vec2 texcoord, float end) {
    vec2 e = vec2(0.0, 1.0);
    for (int i = 0; i < SMAA_MAX_SEARCH_STEPS; i++) { 
        if (!(texcoord.x < end && e.g > 0.8281 && e.r == 0.0)) break;
        e = texture2D(uEdgeTexture, texcoord).rg; // LinearSampler
        texcoord = mad(vec2(2.0, 0.0), INVRES.xy, texcoord);
    }
    float offset = mad(-(255.0 / 127.0), SMAASearchLength(uSearchTexture, e, 0.5), 3.25);
    return mad(-INVRES.x, offset, texcoord.x);
}

float SMAASearchYUp(sampler2D uEdgeTexture, sampler2D uSearchTexture, vec2 texcoord, float end) {
    vec2 e = vec2(1.0, 0.0);
    for (int i = 0; i < SMAA_MAX_SEARCH_STEPS; i++) { 
        if (!(texcoord.y > end && e.r > 0.8281 && e.g == 0.0)) break;
        e = texture2D(uEdgeTexture, texcoord).rg; // LinearSampler
        texcoord = mad(-vec2(0.0, 2.0), INVRES.xy, texcoord);
    }
    float offset = mad(-(255.0 / 127.0), SMAASearchLength(uSearchTexture, e.gr, 0.0), 3.25);
    return mad(INVRES.y, offset, texcoord.y);
}

float SMAASearchYDown(sampler2D uEdgeTexture, sampler2D uSearchTexture, vec2 texcoord, float end) {
    vec2 e = vec2(1.0, 0.0);
    for (int i = 0; i < SMAA_MAX_SEARCH_STEPS; i++) { 
        if (!(texcoord.y < end && e.r > 0.8281 && e.g == 0.0)) break;
        e = texture2D(uEdgeTexture, texcoord).rg; // LinearSampler
        texcoord = mad(vec2(0.0, 2.0), INVRES.xy, texcoord);
    }
    float offset = mad(-(255.0 / 127.0), SMAASearchLength(uSearchTexture, e.gr, 0.5), 3.25);
    return mad(-INVRES.y, offset, texcoord.y);
}

// Find areas at each edge side of the current edge
vec2 SMAAArea(sampler2D uAreaTexture, vec2 dist, float e1, float e2, float offset) {
    // Rounding prevents precision errors of bilinear filtering
    vec2 texcoord = mad(vec2(SMAA_AREATEX_MAX_DISTANCE, SMAA_AREATEX_MAX_DISTANCE), round(4.0 * vec2(e1, e2)), dist);

    // Do a scale and bias for mapping to texel space
    texcoord = mad(SMAA_AREATEX_PIXEL_SIZE, texcoord, 0.5 * SMAA_AREATEX_PIXEL_SIZE);

    // Move to proper place, according to the subpixel offset
    texcoord.y = mad(SMAA_AREATEX_SUBTEX_SIZE, offset, texcoord.y);

    return areaTextureSelect(texture2D(uAreaTexture, texcoord)); // LinearSampler
}

void main() {
    vec4 subsampleIndices = vec4(0.0); // Just pass zero for SMAA 1x
    vec4 weights = vec4(0.0, 0.0, 0.0, 0.0);
    vec2 e = texture2D(uEdgeTexture, vTexCoord).rg;

    if (e.g > 0.0) { // Edge at north

        vec2 d;

        // Find the distance to the left
        vec3 coords;
        coords.x = SMAASearchXLeft(uEdgeTexture, uSearchTexture, vOffset[0].xy, vOffset[2].x);
        coords.y = vOffset[1].y;
        d.x = coords.x;

        // Now fetch the left crossing edges, two at a time using bilinear filtering 
        // Sampling at -0.25 enables to discern what value each edge has
        float e1 = texture2D(uEdgeTexture, coords.xy).r; // LinearSampler

        // Find the distance to the right
        coords.z = SMAASearchXRight(uEdgeTexture, uSearchTexture, vOffset[0].zw, vOffset[2].y);
        d.y = coords.z;

        // Set the distances to be in pixel units (doing this here allow to better interleave arithmetic and memory accesses)
        // d = abs(round(mad(uResolution.xx, d, -vPixCoord.xx)));
        d = abs(mad(uResolution.xx, d, -vPixCoord.xx));

        // SMAAArea below needs a sqrt, as the areas texture is compressed quadratically
        vec2 sqrt_d = sqrt(d);

        // Fetch the right crossing edges
        // coords.y -= 1.0 * uResolution.y;
        float e2 = SMAASampleLevelZeroOffset(uEdgeTexture, coords.zy, vec2(1, 0)).r;

        // Find the area
        weights.rg = SMAAArea(uAreaTexture, sqrt_d, e1, e2, subsampleIndices.y);

    }

    if (e.r > 0.0) { // Edge at west
        vec2 d;

        // Find the distance to the top
        vec3 coords;
        coords.y = SMAASearchYUp(uEdgeTexture, uSearchTexture, vOffset[1].xy, vOffset[2].z);
        coords.x = vOffset[0].x; // vOffset[1].x = vTexCoord.x - 0.25 * INVRES.x;
        d.x = coords.y;

        // Fetch the top crossing edges
        float e1 = texture2D(uEdgeTexture, coords.xy).g; // LinearSampler

        // Find the distance to the bottom
        coords.z = SMAASearchYDown(uEdgeTexture, uSearchTexture, vOffset[1].zw, vOffset[2].w);
        d.y = coords.z;

        // Set the distances to be in pixel units
        // d = abs(round(mad(uResolution.yy, d, -vPixCoord.yy)));
        d = abs(mad(uResolution.yy, d, -vPixCoord.yy));

        // SMAAArea below needs a sqrt, as the areas texture is compressed quadratically
        vec2 sqrt_d = sqrt(d);

        // Fetch the bottom crossing edges 
        // coords.z -= 1.0 * uResolution.y;
        float e2 = SMAASampleLevelZeroOffset(uEdgeTexture, coords.xz, vec2(0, 1)).g;

        // Get the area for this direction
        weights.ba = SMAAArea(uAreaTexture, sqrt_d, e1, e2, subsampleIndices.x);
    }

    gl_FragColor = weights;
    // gl_FragColor = vec4(weights.rg, 0.0, 1.0); // DEBUG HORIZONTAL WEIGHTS
    // gl_FragColor = vec4(weights.ba, 0.0, 1.0); // DEBUG VERTICAL WEIGHTS
    // gl_FragColor = vec4(texture2D(uEdgeTexture, vTexCoord).rg, 0.0, 1.0); // DEBUG VIEW EDGE
}