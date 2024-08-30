class Mat4 {
    matrix: number[]

    constructor() {
        this.matrix = [];
        this.setIdentity()
    }

    setIdentity(): void {
        this.matrix = [
            1,0,0,0,
            0,1,0,0,
            0,0,1,0,
            0,0,0,1
        ]
    }

    setFromElements(elements: number[]): void {
        // better than assignment to keep reference
        elements.forEach((elem, count) => {
            this.matrix[count] = elem;
        })
    }

    multiply(matrixB:Mat4): void {
        let matA = this.matrix;
        // let matB = (matrixB.matrix) ? matrixB.matrix : matrixB; // compatible with Mat4 or just the array
        let matB = matrixB.matrix;
        if (matB.length!=16) { throw Error('Cannot multiply by this matrix'); }

        // multiply element by element
        let matrix = [
            matA[0]*matB[0] + matA[4]*matB[1] + matA[8]*matB[2] + matA[12]*matB[3],
            matA[1]*matB[0] + matA[5]*matB[1] + matA[9]*matB[2] + matA[13]*matB[3],
            matA[2]*matB[0] + matA[6]*matB[1] + matA[10]*matB[2] + matA[14]*matB[3],
            matA[3]*matB[0] + matA[7]*matB[1] + matA[11]*matB[2] + matA[15]*matB[3],

            matA[0]*matB[4] + matA[4]*matB[5] + matA[8]*matB[6] + matA[12]*matB[7],
            matA[1]*matB[4] + matA[5]*matB[5] + matA[9]*matB[6] + matA[13]*matB[7],
            matA[2]*matB[4] + matA[6]*matB[5] + matA[10]*matB[6] + matA[14]*matB[7],
            matA[3]*matB[4] + matA[7]*matB[5] + matA[11]*matB[6] + matA[15]*matB[7],

            matA[0]*matB[8] + matA[4]*matB[9] + matA[8]*matB[10] + matA[12]*matB[11],
            matA[1]*matB[8] + matA[5]*matB[9] + matA[9]*matB[10] + matA[13]*matB[11],
            matA[2]*matB[8] + matA[6]*matB[9] + matA[10]*matB[10] + matA[14]*matB[11],
            matA[3]*matB[8] + matA[7]*matB[9] + matA[11]*matB[10] + matA[15]*matB[11],

            matA[0]*matB[12] + matA[4]*matB[13] + matA[8]*matB[14] + matA[12]*matB[15],
            matA[1]*matB[12] + matA[5]*matB[13] + matA[9]*matB[14] + matA[13]*matB[15],
            matA[2]*matB[12] + matA[6]*matB[13] + matA[10]*matB[14] + matA[14]*matB[15],
            matA[3]*matB[12] + matA[7]*matB[13] + matA[11]*matB[14] + matA[15]*matB[15],
        ];

        // set matrix
        this.setFromElements(matrix);
    }

    add(matrixB:Mat4): void {
        // let matB: number[] = (matrixB.matrix) ? matrixB.matrix : matrixB; // compatible with Mat4 or just the array
        let matB = matrixB.matrix
        if (matB.length!=16) { throw Error('Cannot multiply by this matrix'); }
        matB.forEach((elem, count) => {
            this.matrix[count] += elem;
        })
    }

    translate(x: number, y: number, z: number): void {
        // set translation matrix
        let translationMat = [
            0,0,0,0,
            0,0,0,0,
            0,0,0,0,
            x,y,z,0
        ];

        // add self
        let newMat = new Mat4();
        newMat.setFromElements(translationMat);
        this.add(newMat);
    }

    rotation(angle: number, axis: number[]): void {
        // Rodriguez rotation
        let c = Math.cos(angle);
        let s = Math.sin(angle);
        let d = 1 - c; //simplifies 1-c term in formula

        // find unit vector
        let length = Math.sqrt(axis[0]*axis[0] + axis[1]*axis[1] + axis[2]*axis[2])
        if (length==0) { throw Error('zero length vector distance during rotation') }
        let x = axis[0]/length;
        let y = axis[1]/length;
        let z = axis[2]/length;

        // rotation matrix
        let rotationMatrix = [
            d*x*x + c,   d*x*y - z*s, d*x*z + y*s, 0,
            d*x*y + z*s, d*y*y + c,   d*y*z - x*s, 0,
            d*x*z - y*s, d*y*z + x*s, d*z*z + c,   0,
            0,           0,           0,           1
        ];

        // multiply self
        let newMat = new Mat4();
        newMat.setFromElements(rotationMatrix);
        this.multiply(newMat);

    }

    rotationX(angle: number):void {
        this.rotation(angle, [1,0,0]);
    }

    rotationY(angle: number):void {
        this.rotation(angle, [0,1,0]);
    }

    rotationZ(angle: number):void {
        this.rotation(angle, [0,0,1]);
    }

    getDeterminant(): number {
        // Returns the determinant of this matrix

        const m = this.matrix;
        const determinant = 
            ( m[0] * m[5] * m[10] * m[15] ) - ( m[0] * m[5] * m[11] * m[14] ) -
            ( m[0] * m[6] * m[9] * m[15] ) + ( m[0] * m[6] * m[11] * m[13] ) +
            ( m[0] * m[7] * m[9] * m[14] ) - ( m[0] * m[7] * m[10] * m[13] ) -
            ( m[1] * m[4] * m[10] * m[15] ) + ( m[1] * m[4] * m[11] * m[14] ) +
            ( m[1] * m[6] * m[8] * m[15] ) - ( m[1] * m[6] * m[11] * m[12] ) -
            ( m[1] * m[7] * m[8] * m[14] ) + ( m[1] * m[7] * m[10] * m[12] ) +
            ( m[2] * m[4] * m[9] * m[15] ) - ( m[2] * m[4] * m[11] * m[13] ) -
            ( m[2] * m[5] * m[8] * m[15] ) + ( m[2] * m[5] * m[11] * m[12] ) +
            ( m[2] * m[7] * m[8] * m[13] ) - ( m[2] * m[7] * m[9] * m[12] ) -
            ( m[3] * m[4] * m[9] * m[14] ) + ( m[3] * m[4] * m[10] * m[13] ) +
            ( m[3] * m[5] * m[8] * m[14] ) - ( m[3] * m[5] * m[10] * m[12] ) -
            ( m[3] * m[6] * m[8] * m[13] ) + ( m[3] * m[6] * m[9] * m[12]) ;
        return determinant;
    }

    getInverseDet(): number {
        // Returns the inverse of the determinant of the matrix

        const determinant = this.getDeterminant();

        // Test for divide by zero
        if (determinant == 0) { throw "No Inverse Determinant Exists" }

        return 1 / determinant;
    }

    inverse(): Mat4 {
        // Returns the inverse of this matrix
        
        const m = this.matrix;
        let inverseDet = this.getInverseDet();
        let inv = [
            (m[5] * m[10] * m[15] - m[5] * m[11] * m[14] - m[9] * m[6] * m[15] + m[9] * m[7] * m[14] + m[13] * m[6] * m[11] - m[13] * m[7] * m[10]) * inverseDet,
            (-m[1] * m[10] * m[15] + m[1] * m[11] * m[14] + m[9] * m[2] * m[15] - m[9] * m[3] * m[14] - m[13] * m[2] * m[11] + m[13] * m[3] * m[10]) * inverseDet,
            (m[1] * m[6] * m[15] - m[1] * m[7] * m[14] - m[5] * m[2] * m[15] + m[5] * m[3] * m[14] + m[13] * m[2] * m[7] - m[13] * m[3] * m[6]) * inverseDet,
            (-m[1] * m[6] * m[11] + m[1] * m[7] * m[10] + m[5] * m[2] * m[11] - m[5] * m[3] * m[10] - m[9] * m[2] * m[7] + m[9] * m[3] * m[6]) * inverseDet,
            (-m[4] * m[10] * m[15] + m[4] * m[11] * m[14] + m[8] * m[6] * m[15] - m[8] * m[7] * m[14] - m[12] * m[6] * m[11] + m[12] * m[7] * m[10]) * inverseDet,
            (m[0] * m[10] * m[15] - m[0] * m[11] * m[14] - m[8] * m[2] * m[15] + m[8] * m[3] * m[14] + m[12] * m[2] * m[11] - m[12] * m[3] * m[10]) * inverseDet,
            (-m[0] * m[6] * m[15] + m[0] * m[7] * m[14] + m[4] * m[2] * m[15] - m[4] * m[3] * m[14] - m[12] * m[2] * m[7] + m[12] * m[3] * m[6]) * inverseDet,
            (m[0] * m[6] * m[11] - m[0] * m[7] * m[10] - m[4] * m[2] * m[11] + m[4] * m[3] * m[10] + m[8] * m[2] * m[7] - m[8] * m[3] * m[6]) * inverseDet,
            (m[4] * m[9] * m[15] - m[4] * m[11] * m[13] - m[8] * m[5] * m[15] + m[8] * m[7] * m[13] + m[12] * m[5] * m[11] - m[12] * m[7] * m[9]) * inverseDet,
            (-m[0] * m[9] * m[15] + m[0] * m[11] * m[13] + m[8] * m[1] * m[15] - m[8] * m[3] * m[13] - m[12] * m[1] * m[11] + m[12] * m[3] * m[9]) * inverseDet,
            (m[0] * m[5] * m[15] - m[0] * m[7] * m[13] - m[4] * m[1] * m[15] + m[4] * m[3] * m[13] + m[12] * m[1] * m[7] - m[12] * m[3] * m[5]) * inverseDet,
            (-m[0] * m[5] * m[11] + m[0] * m[7] * m[9] + m[4] * m[1] * m[11] - m[4] * m[3] * m[9] - m[8] * m[1] * m[7] + m[8] * m[3] * m[5]) * inverseDet,
            (-m[4] * m[9] * m[14] + m[4] * m[10] * m[13] + m[8] * m[5] * m[14] - m[8] * m[6] * m[13] - m[12] * m[5] * m[10] + m[12] * m[6] * m[9]) * inverseDet,
            (m[0] * m[9] * m[14] - m[0] * m[10] * m[13] - m[8] * m[1] * m[14] + m[8] * m[2] * m[13] + m[12] * m[1] * m[10] - m[12] * m[2] * m[9]) * inverseDet,
            (-m[0] * m[5] * m[14] + m[0] * m[6] * m[13] + m[4] * m[1] * m[14] - m[4] * m[2] * m[13] - m[12] * m[1] * m[6] + m[12] * m[2] * m[5]) * inverseDet,
            (m[0] * m[5] * m[10] - m[0] * m[6] * m[9] - m[4] * m[1] * m[10] + m[4] * m[2] * m[9] + m[8] * m[1] * m[6] - m[8] * m[2] * m[5]) * inverseDet
        ]

        // Make a new Mat4 and set from this array
        let retMat = new Mat4()
        retMat.setFromElements(inv);
        return retMat;
    
    }


}

export default Mat4