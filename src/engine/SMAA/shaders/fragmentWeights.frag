// Adapted from:
// https://github.com/dmnsgn/glsl-smaa/blob/main/smaa-weights.frag

precision highp float;
precision highp int;

#define MAX_SEARCH_STEPS 32
#define AREATEX_MAX_DISTANCE 16
#define AREATEX_PIXEL_SIZE (1.0 / vec2(160.0, 560.0))
#define AREATEX_SUBTEX_SIZE (1.0 / 7.0)
#define SEARCHTEX_SIZE vec2(66.0, 33.0)
#define SEARCHTEX_PACKED_SIZE vec2(64.0, 16.0)

#define mad(a, b, c) (a * b + c)

uniform vec2 uResolution;
uniform int uSearchSteps;
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

// Determines amount to add to final steps
// Find interpolated edge, adding 0-2 depending on what is active (on search texture)
float SMAASearchLength(sampler2D uSearchTexture, vec2 e, float offset) {
    // The texture is y-flipped, split horizontally for left and right cases
    // Coords are adjusted to get to the texel center, and converted from pixel to texture coordinates
    vec2 scale = (SEARCHTEX_SIZE * vec2(0.5, 1.0) + vec2(-1.0,  1.0)) / SEARCHTEX_PACKED_SIZE;
    vec2 bias = (SEARCHTEX_SIZE * vec2(offset, 1.0) + vec2( 0.5, -0.5)) / SEARCHTEX_PACKED_SIZE;

    // Lookup the search texture
    return searchTextureSelect(texture2D(uSearchTexture, mad(scale, e, bias)));

}

// Search functions in all directions using offset texcoords to fetch edges and determine which are active
float SMAASearchXLeft(sampler2D uEdgeTexture, sampler2D uSearchTexture, vec2 texcoord, float end) {
    vec2 e = vec2(0.0, 1.0);
    for (int i = 0; i < MAX_SEARCH_STEPS; i++) { 
        if (i >= uSearchSteps) break;
        if (!(texcoord.x > end && e.g > 0.8281 && e.r == 0.0)) break;
        e = texture2D(uEdgeTexture, texcoord).rg;
        texcoord = mad(-vec2(2.0, 0.0), INVRES.xy, texcoord);
    }

    float offset = mad(-(255.0 / 127.0), SMAASearchLength(uSearchTexture, e, 0.0), 3.25);
    return mad(INVRES.x, offset, texcoord.x);
}

float SMAASearchXRight(sampler2D uEdgeTexture, sampler2D uSearchTexture, vec2 texcoord, float end) {
    vec2 e = vec2(0.0, 1.0);
    for (int i = 0; i < MAX_SEARCH_STEPS; i++) { 
        if (i >= uSearchSteps) break;
        if (!(texcoord.x < end && e.g > 0.8281 && e.r == 0.0)) break;
        e = texture2D(uEdgeTexture, texcoord).rg;
        texcoord = mad(vec2(2.0, 0.0), INVRES.xy, texcoord);
    }
    float offset = mad(-(255.0 / 127.0), SMAASearchLength(uSearchTexture, e, 0.5), 3.25);
    return mad(-INVRES.x, offset, texcoord.x);
}

float SMAASearchYUp(sampler2D uEdgeTexture, sampler2D uSearchTexture, vec2 texcoord, float end) {
    vec2 e = vec2(1.0, 0.0);
    for (int i = 0; i < MAX_SEARCH_STEPS; i++) { 
        if (i >= uSearchSteps) break;
        if (!(texcoord.y > end && e.r > 0.8281 && e.g == 0.0)) break;
        e = texture2D(uEdgeTexture, texcoord).rg;
        texcoord = mad(-vec2(0.0, 2.0), INVRES.xy, texcoord);
    }
    float offset = mad(-(255.0 / 127.0), SMAASearchLength(uSearchTexture, e.gr, 0.0), 3.25);
    return mad(INVRES.y, offset, texcoord.y);
}

float SMAASearchYDown(sampler2D uEdgeTexture, sampler2D uSearchTexture, vec2 texcoord, float end) {
    vec2 e = vec2(1.0, 0.0);
    for (int i = 0; i < MAX_SEARCH_STEPS; i++) { 
        if (i >= uSearchSteps) break;
        if (!(texcoord.y < end && e.r > 0.8281 && e.g == 0.0)) break;
        e = texture2D(uEdgeTexture, texcoord).rg;
        texcoord = mad(vec2(0.0, 2.0), INVRES.xy, texcoord);
    }
    float offset = mad(-(255.0 / 127.0), SMAASearchLength(uSearchTexture, e.gr, 0.5), 3.25);
    return mad(-INVRES.y, offset, texcoord.y);
}

// Determine areas of each side of edge
vec2 SMAAArea(sampler2D uAreaTexture, vec2 dist, float e1, float e2, float offset) {
    vec2 texcoord = mad(vec2(AREATEX_MAX_DISTANCE, AREATEX_MAX_DISTANCE), floor(4.0 * vec2(e1, e2) + 0.5), dist);
    // Map to texel space
    texcoord = mad(AREATEX_PIXEL_SIZE, texcoord, 0.5 * AREATEX_PIXEL_SIZE);
    texcoord.y = mad(AREATEX_SUBTEX_SIZE, offset, texcoord.y);
    return areaTextureSelect(texture2D(uAreaTexture, texcoord));
}

void main() {
    vec4 subsampleIndices = vec4(0.0); 
    vec4 weights = vec4(0.0, 0.0, 0.0, 0.0);
    vec2 e = texture2D(uEdgeTexture, vTexCoord).rg;

    if (e.g > 0.0) { // Northern Edge

        vec2 d;

        // Get distance of left
        vec3 coords;
        coords.x = SMAASearchXLeft(uEdgeTexture, uSearchTexture, vOffset[0].xy, vOffset[2].x);
        coords.y = vOffset[1].y;
        d.x = coords.x;

        // Get the left crossing edges
        float e1 = texture2D(uEdgeTexture, coords.xy).r;

        // Get distance of right
        coords.z = SMAASearchXRight(uEdgeTexture, uSearchTexture, vOffset[0].zw, vOffset[2].y);
        d.y = coords.z;

        // Set to pixel units and find square root
        d = abs(mad(uResolution.xx, d, -vPixCoord.xx));
        vec2 sqrt_d = sqrt(d);

        // Get the left crossing edge
        float e2 = SMAASampleLevelZeroOffset(uEdgeTexture, coords.zy, vec2(1, 0)).r;

        // Get the area
        weights.rg = SMAAArea(uAreaTexture, sqrt_d, e1, e2, subsampleIndices.y);

    }

    if (e.r > 0.0) { // Western Edge
        vec2 d;

        // Get distance of top
        vec3 coords;
        coords.y = SMAASearchYUp(uEdgeTexture, uSearchTexture, vOffset[1].xy, vOffset[2].z);
        coords.x = vOffset[0].x; 
        d.x = coords.y;

        // Get the top crossing edge
        float e1 = texture2D(uEdgeTexture, coords.xy).g;

        // Get distance of bottom
        coords.z = SMAASearchYDown(uEdgeTexture, uSearchTexture, vOffset[1].zw, vOffset[2].w);
        d.y = coords.z;

        //  Set to pixel units and find square root
        d = abs(mad(uResolution.yy, d, -vPixCoord.yy));
        vec2 sqrt_d = sqrt(d);

        // Get the bottom crossing edge
        float e2 = SMAASampleLevelZeroOffset(uEdgeTexture, coords.xz, vec2(0, 1)).g;

        // Get the area 
        weights.ba = SMAAArea(uAreaTexture, sqrt_d, e1, e2, subsampleIndices.x);
    }

    gl_FragColor = weights;
}