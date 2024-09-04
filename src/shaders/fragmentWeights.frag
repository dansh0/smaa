// Adapted from:
// https://github.com/dmnsgn/glsl-smaa/blob/main/smaa-weights.frag

precision highp float;
precision highp int;

#define SMAA_THRESHOLD 0.1
#define SMAA_MAX_SEARCH_STEPS 16
#define SMAA_MAX_SEARCH_STEPS_DIAG 8
#define SMAA_CORNER_ROUNDING 25
#define SMAA_DISABLE_CORNER_DETECTION false
#define SMAA_DISABLE_DIAG_DETECTION false

#define SMAA_AREATEX_MAX_DISTANCE 16
#define SMAA_AREATEX_MAX_DISTANCE_DIAG 20
#define SMAA_AREATEX_PIXEL_SIZE (1.0 / vec2(160.0, 560.0))
#define SMAA_AREATEX_SUBTEX_SIZE (1.0 / 7.0)
#define SMAA_SEARCHTEX_SIZE vec2(66.0, 33.0)
#define SMAA_SEARCHTEX_PACKED_SIZE vec2(64.0, 16.0)
#define SMAA_CORNER_ROUNDING_NORM (float(SMAA_CORNER_ROUNDING) / 100.0)

#define mad(a, b, c) (a * b + c)
#define round(v) floor(v + 0.5)

uniform vec2 uResolution;
uniform sampler2D uEdgeTexture;
uniform sampler2D uAreaTexture;
uniform sampler2D uSearchTexture;

varying vec2 vTexCoord;
varying vec4 vOffset[3];
varying vec2 vPixCoord;

vec2 areaTextureSelect(vec4 sample) { return sample.rg; }
float searchTextureSelect(vec4 sample) { return sample.r; }

vec2 resVals = vec2(1.0 / uResolution.x, 1.0 / uResolution.y);

vec4 SMAASampleLevelZeroOffset(sampler2D tex, vec2 coord, vec2 offset) {
    return texture2D(tex, coord + offset * resVals);
}

// Conditional move
void SMAAMovc(bvec2 cond, inout vec2 variable, vec2 value) {
    if (cond.x) variable.x = value.x;
    if (cond.y) variable.y = value.y;
}

void SMAAMovc(bvec4 cond, inout vec4 variable, vec4 value) {
    SMAAMovc(cond.xy, variable.xy, value.xy);
    SMAAMovc(cond.zw, variable.zw, value.zw);
}

// Allows to decode two binary values from a bilinear-filtered access
vec2 SMAADecodeDiagBilinearAccess(vec2 e) {
    e.r = e.r * abs(5.0 * e.r - 5.0 * 0.75);
    return round(e);
}

vec4 SMAADecodeDiagBilinearAccess(vec4 e) {
    e.rb = e.rb * abs(5.0 * e.rb - 5.0 * 0.75);
    return round(e);
}

// These functions allows to perform diagonal pattern searches
vec2 SMAASearchDiag1(sampler2D uEdgeTexture, vec2 texcoord, vec2 dir, out vec2 e) {
    vec4 coord = vec4(texcoord, -1.0, 1.0);
    vec3 t = vec3(resVals.xy, 1.0);

    for (int i = 0; i < SMAA_MAX_SEARCH_STEPS; i++) {
        if (!(coord.z < float(SMAA_MAX_SEARCH_STEPS_DIAG - 1) && coord.w > 0.9)) break;
        coord.xyz = mad(t, vec3(dir, 1.0), coord.xyz);
        e = texture2D(uEdgeTexture, coord.xy).rg; // LinearSampler
        coord.w = dot(e, vec2(0.5, 0.5));
    }
    return coord.zw;
}

vec2 SMAASearchDiag2(sampler2D uEdgeTexture, vec2 texcoord, vec2 dir, out vec2 e) {
    vec4 coord = vec4(texcoord, -1.0, 1.0);
    coord.x += 0.25 * resVals.x;
    vec3 t = vec3(resVals.xy, 1.0);

    for (int i = 0; i < SMAA_MAX_SEARCH_STEPS; i++) {
        if (!(coord.z < float(SMAA_MAX_SEARCH_STEPS_DIAG - 1) && coord.w > 0.9)) break;
        coord.xyz = mad(t, vec3(dir, 1.0), coord.xyz);
        coord.w = dot(e, vec2(0.5, 0.5));
    }
    return coord.zw;
}

// Similar to SMAAArea, this calculates the area corresponding to a certain diagonal distance and crossing edges 'e'
vec2 SMAAAreaDiag(sampler2D uAreaTexture, vec2 dist, vec2 e, float offset) {
    vec2 texcoord = mad(vec2(SMAA_AREATEX_MAX_DISTANCE_DIAG, SMAA_AREATEX_MAX_DISTANCE_DIAG), e, dist);
    texcoord = mad(SMAA_AREATEX_PIXEL_SIZE, texcoord, 0.5 * SMAA_AREATEX_PIXEL_SIZE); // Do a scale and bias for mapping to texel space
    texcoord.x += 0.5; // Diagonal areas are on the second half of the texture
    texcoord.y += SMAA_AREATEX_SUBTEX_SIZE * offset; // Move to proper place, according to the subpixel offset
    return areaTextureSelect(texture2D(uAreaTexture, texcoord)); // LinearSampler
}

// This searches for diagonal patterns and returns the corresponding weights
vec2 SMAACalculateDiagWeights(sampler2D uEdgeTexture, sampler2D uAreaTexture, vec2 texcoord, vec2 e, vec4 subsampleIndices) {
    vec2 weights = vec2(0.0, 0.0);

    // Search for the line ends
    vec4 d;
    vec2 end;
    if (e.r > 0.0) {
        d.xz = SMAASearchDiag1(uEdgeTexture, texcoord, vec2(-1.0,  1.0), end);
        d.x += float(end.y > 0.9);
    } else
        d.xz = vec2(0.0, 0.0);
    d.yw = SMAASearchDiag1(uEdgeTexture, texcoord, vec2(1.0, -1.0), end);

    if (d.x + d.y > 2.0) { // d.x + d.y + 1 > 3
        // Fetch the crossing edges
        vec4 coords = mad(vec4(-d.x + 0.25, d.x, d.y, -d.y - 0.25), resVals.xyxy, texcoord.xyxy);
        vec4 c;
        c.xy = SMAASampleLevelZeroOffset(uEdgeTexture, coords.xy, vec2(-1,  0)).rg;
        c.zw = SMAASampleLevelZeroOffset(uEdgeTexture, coords.zw, vec2( 1,  0)).rg;
        c.yxwz = SMAADecodeDiagBilinearAccess(c.xyzw);

        // Merge crossing edges at each side into a single value
        vec2 cc = mad(vec2(2.0, 2.0), c.xz, c.yw);

        // Remove the crossing edge if we didn't found the end of the line
        SMAAMovc(bvec2(step(0.9, d.zw)), cc, vec2(0.0, 0.0));

        // Fetch the areas for this line
        weights += SMAAAreaDiag(uAreaTexture, d.xy, cc, subsampleIndices.z);
    }

    // Search for the line ends
    d.xz = SMAASearchDiag2(uEdgeTexture, texcoord, vec2(-1.0, -1.0), end);
    if (SMAASampleLevelZeroOffset(uEdgeTexture, texcoord, vec2(1, 0)).r > 0.0) {
        d.yw = SMAASearchDiag2(uEdgeTexture, texcoord, vec2(1.0, 1.0), end);
        d.y += float(end.y > 0.9);
    } else {
        d.yw = vec2(0.0, 0.0);
    }

    if (d.x + d.y > 2.0) { // d.x + d.y + 1 > 3
        // Fetch the crossing edges
        vec4 coords = mad(vec4(-d.x, -d.x, d.y, d.y), resVals.xyxy, texcoord.xyxy);
        vec4 c;
        c.x  = SMAASampleLevelZeroOffset(uEdgeTexture, coords.xy, vec2(-1,  0)).g;
        c.y  = SMAASampleLevelZeroOffset(uEdgeTexture, coords.xy, vec2( 0, -1)).r;
        c.zw = SMAASampleLevelZeroOffset(uEdgeTexture, coords.zw, vec2( 1,  0)).gr;
        vec2 cc = mad(vec2(2.0, 2.0), c.xz, c.yw);

        // Remove the crossing edge if we didn't found the end of the line
        SMAAMovc(bvec2(step(0.9, d.zw)), cc, vec2(0.0, 0.0));

        // Fetch the areas for this line
        weights += SMAAAreaDiag(uAreaTexture, d.xy, cc, subsampleIndices.w).gr;
    }

    return weights;
}

// This allows to determine how much length should we add in the last step of the searches
// It takes the bilinearly interpolated edge, and adds 0, 1 or 2, depending on which edges and crossing edges are active
float SMAASearchLength(sampler2D uSearchTexture, vec2 e, float offset) {
    // The texture is flipped vertically, with left and right cases taking half of the space horizontally
    vec2 scale = SMAA_SEARCHTEX_SIZE * vec2(0.5, -1.0);
    vec2 bias = SMAA_SEARCHTEX_SIZE * vec2(offset, 1.0);

    // Scale and bias to access texel centers
    scale += vec2(-1.0,  1.0);
    bias  += vec2( 0.5, -0.5);

    // Convert from pixel coordinates to texcoords
    scale *= 1.0 / SMAA_SEARCHTEX_PACKED_SIZE;
    bias *= 1.0 / SMAA_SEARCHTEX_PACKED_SIZE;

    // Lookup the search texture
    return searchTextureSelect(texture2D(uSearchTexture, mad(scale, e, bias))); // LinearSampler
}

// Horizontal/vertical search functions for the 2nd pass
float SMAASearchXLeft(sampler2D uEdgeTexture, sampler2D uSearchTexture, vec2 texcoord, float end) {
    // This texcoord has been offset by (-0.25, -0.125) in the vertex shader to sample between edge, thus fetching four edges in a row
    // Sampling with different offsets in each direction allows to disambiguate which edges are active from the four fetched ones.
    vec2 e = vec2(0.0, 1.0);
    for (int i = 0; i < SMAA_MAX_SEARCH_STEPS; i++) {
        if (!(texcoord.x > end && e.g > 0.8281 && e.r == 0.0)) break;
        e = texture2D(uEdgeTexture, texcoord).rg; // LinearSampler
        texcoord = mad(-vec2(2.0, 0.0), resVals.xy, texcoord);
    }

    float offset = mad(-(255.0 / 127.0), SMAASearchLength(uSearchTexture, e, 0.0), 3.25);
    return mad(resVals.x, offset, texcoord.x);
}

float SMAASearchXRight(sampler2D uEdgeTexture, sampler2D uSearchTexture, vec2 texcoord, float end) {
    vec2 e = vec2(0.0, 1.0);
    for (int i = 0; i < SMAA_MAX_SEARCH_STEPS; i++) { 
        if (!(texcoord.x < end && e.g > 0.8281 && e.r == 0.0)) break;
        e = texture2D(uEdgeTexture, texcoord).rg; // LinearSampler
        texcoord = mad(vec2(2.0, 0.0), resVals.xy, texcoord);
    }
    float offset = mad(-(255.0 / 127.0), SMAASearchLength(uSearchTexture, e, 0.5), 3.25);
    return mad(-resVals.x, offset, texcoord.x);
}

float SMAASearchYUp(sampler2D uEdgeTexture, sampler2D uSearchTexture, vec2 texcoord, float end) {
    vec2 e = vec2(1.0, 0.0);
    for (int i = 0; i < SMAA_MAX_SEARCH_STEPS; i++) { 
        if (!(texcoord.y > end && e.r > 0.8281 && e.g == 0.0)) break;
        e = texture2D(uEdgeTexture, texcoord).rg; // LinearSampler
        texcoord = mad(-vec2(0.0, 2.0), resVals.xy, texcoord);
    }
    float offset = mad(-(255.0 / 127.0), SMAASearchLength(uSearchTexture, e.gr, 0.0), 3.25);
    return mad(resVals.y, offset, texcoord.y);
}

float SMAASearchYDown(sampler2D uEdgeTexture, sampler2D uSearchTexture, vec2 texcoord, float end) {
    vec2 e = vec2(1.0, 0.0);
    for (int i = 0; i < SMAA_MAX_SEARCH_STEPS; i++) { 
        if (!(texcoord.y < end && e.r > 0.8281 && e.g == 0.0)) break;
        e = texture2D(uEdgeTexture, texcoord).rg; // LinearSampler
        texcoord = mad(vec2(0.0, 2.0), resVals.xy, texcoord);
    }
    float offset = mad(-(255.0 / 127.0), SMAASearchLength(uSearchTexture, e.gr, 0.5), 3.25);
    return mad(-resVals.y, offset, texcoord.y);
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

// // Corner Detection Functions
// void SMAADetectHorizontalCornerPattern(sampler2D uEdgeTexture, inout vec2 weights, vec4 texcoord, vec2 d) {
//     if(!SMAA_DISABLE_CORNER_DETECTION) {
//         vec2 leftRight = step(d.xy, d.yx);
//         vec2 rounding = (1.0 - SMAA_CORNER_ROUNDING_NORM) * leftRight;

//         rounding /= leftRight.x + leftRight.y; // Reduce blending for pixels in the center of a line.

//         vec2 factor = vec2(1.0, 1.0);
//         factor.x -= rounding.x * SMAASampleLevelZeroOffset(uEdgeTexture, texcoord.xy, vec2(0,  1)).r;
//         factor.x -= rounding.y * SMAASampleLevelZeroOffset(uEdgeTexture, texcoord.zw, vec2(1,  1)).r;
//         factor.y -= rounding.x * SMAASampleLevelZeroOffset(uEdgeTexture, texcoord.xy, vec2(0, -2)).r;
//         factor.y -= rounding.y * SMAASampleLevelZeroOffset(uEdgeTexture, texcoord.zw, vec2(1, -2)).r;

//         weights *= clamp(factor, 0.0, 1.0);
//     }
// }

// void SMAADetectVerticalCornerPattern(sampler2D uEdgeTexture, inout vec2 weights, vec4 texcoord, vec2 d) {
//     if(!SMAA_DISABLE_CORNER_DETECTION) {
//         vec2 leftRight = step(d.xy, d.yx);
//         vec2 rounding = (1.0 - SMAA_CORNER_ROUNDING_NORM) * leftRight;

//         rounding /= leftRight.x + leftRight.y;

//         vec2 factor = vec2(1.0, 1.0);
//         factor.x -= rounding.x * SMAASampleLevelZeroOffset(uEdgeTexture, texcoord.xy, vec2( 1, 0)).g;
//         factor.x -= rounding.y * SMAASampleLevelZeroOffset(uEdgeTexture, texcoord.zw, vec2( 1, 1)).g;
//         factor.y -= rounding.x * SMAASampleLevelZeroOffset(uEdgeTexture, texcoord.xy, vec2(-2, 0)).g;
//         factor.y -= rounding.y * SMAASampleLevelZeroOffset(uEdgeTexture, texcoord.zw, vec2(-2, 1)).g;

//         weights *= clamp(factor, 0.0, 1.0);
//     }
// }

void main() {
    vec4 subsampleIndices = vec4(0.0); // Just pass zero for SMAA 1x
    vec4 weights = vec4(0.0, 0.0, 0.0, 0.0);
    vec2 e = texture2D(uEdgeTexture, vTexCoord).rg;

    if (e.g > 0.0) { // Edge at north

        // if (!SMAA_DISABLE_DIAG_DETECTION) {
        //     // Diagonals have both north and west edges, so searching for them in one of the boundaries is enough
        //     weights.rg = SMAACalculateDiagWeights(uEdgeTexture, uAreaTexture, vTexCoord, e, subsampleIndices);

        //     // We give priority to diagonals, so if we find a diagonal we skip horizontal/vertical processing
        //     if (weights.r == -weights.g) { // weights.r + weights.g == 0.0
        // }

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

        // We want the distances to be in pixel units (doing this here allow to better interleave arithmetic and memory accesses)
        d = abs(round(mad(uResolution.xx, d, -vPixCoord.xx)));

        // SMAAArea below needs a sqrt, as the areas texture is compressed quadratically
        vec2 sqrt_d = sqrt(d);

        // Fetch the right crossing edges
        float e2 = SMAASampleLevelZeroOffset(uEdgeTexture, coords.zy, vec2(1, 0)).r;

        // Find the area
        weights.rg = SMAAArea(uAreaTexture, sqrt_d, e1, e2, subsampleIndices.y);

        // Fix corners
        // coords.y = vTexCoord.y;
        // SMAADetectHorizontalCornerPattern(uEdgeTexture, weights.rg, coords.xyzy, d);

        // #if !defined(SMAA_DISABLE_DIAG_DETECTION)
        // } else
        // e.r = 0.0; // Skip vertical processing.
        // #endif
    }

    if (e.r > 0.0) { // Edge at west
        vec2 d;

        // Find the distance to the top:
        vec3 coords;
        coords.y = SMAASearchYUp(uEdgeTexture, uSearchTexture, vOffset[1].xy, vOffset[2].z);
        coords.x = vOffset[0].x; // vOffset[1].x = vTexCoord.x - 0.25 * resVals.x;
        d.x = coords.y;

        // Fetch the top crossing edges:
        float e1 = texture2D(uEdgeTexture, coords.xy).g; // LinearSampler

        // Find the distance to the bottom:
        coords.z = SMAASearchYDown(uEdgeTexture, uSearchTexture, vOffset[1].zw, vOffset[2].w);
        d.y = coords.z;

        // We want the distances to be in pixel units:
        d = abs(round(mad(uResolution.yy, d, -vPixCoord.yy)));

        // SMAAArea below needs a sqrt, as the areas texture is compressed
        // quadratically:
        vec2 sqrt_d = sqrt(d);

        // Fetch the bottom crossing edges:
        float e2 = SMAASampleLevelZeroOffset(uEdgeTexture, coords.xz, vec2(0, 1)).g;

        // Get the area for this direction:
        weights.ba = SMAAArea(uAreaTexture, sqrt_d, e1, e2, subsampleIndices.x);

        // Fix corners:
        // coords.x = vTexCoord.x;
        // SMAADetectVerticalCornerPattern(uEdgeTexture, weights.ba, coords.xyxz, d);
    }

    gl_FragColor = weights;
}