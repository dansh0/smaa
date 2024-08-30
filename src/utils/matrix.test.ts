import Mat4 from './matrix';

test('Check Inverse', () => {
    let testMat = new Mat4();
    testMat.rotationX(Math.PI/4);
    testMat.rotationY(-Math.PI);
    testMat.rotationZ(1.12321);
    testMat.translate(1.43, -1.32, 0.02);
    let invMat = testMat.inverse();
    testMat.multiply(invMat);
    let expResult = [
        1, 0, 0, 0, 
        0, 1, 0, 0, 
        0, 0, 1, 0, 
        0, 0, 0, 1
    ]
    testMat.matrix.forEach((elem, count) => {
        expect(elem).toBeCloseTo(expResult[count])
    })
})

test('Check Rotation', () => {
    let testMat = new Mat4();
    testMat.rotation(Math.PI/4, [0.398, -0.775, 0.489])
    let expResult = [
        0.7535882292984808, -0.4366058600455648,
       -0.4914062511167854,                   0,
       0.25558514503677965,  0.8833518240657039,
       -0.3928941187601591,                   0,
        0.6056244829094253, 0.17048424529459158,
        0.7772735090089105,                   0,
                         0,                   0,
                         0,                   1
    ]
    testMat.matrix.forEach((elem, count) => {
        expect(elem).toBeCloseTo(expResult[count])
    })
})

test('Check Multiplication', () => {
    let testMat = new Mat4();
    testMat.setFromElements([    
        0.634, -0.278,  0.720, 0.123,   
        -0.421,  0.876, -0.238, 0.562,    
        0.524,  0.415,  0.744, 0.368,    
        0.112,  0.490, -0.356, 0.824
    ])
    let secondMat = new Mat4();
    secondMat.setFromElements([    
        0.258,  0.714, -0.652, 0.135,   
        -0.531,  0.473,  0.701, 0.324,    
        0.856, -0.192,  0.479, 0.452,    
        0.064,  0.383,  0.257, 0.921
    ])
    let expResult = [
        -0.46354999999999996,              0.34931,
                    -0.51732,  0.30430599999999997,
        -0.13217500000000004,             1.011641,
                   -0.088694,             0.725457,
                    0.925156, 0.014104999999999979,
                     0.85748,   0.5461039999999999,
         0.11715300000000002,             0.875661,
                   -0.181742,   1.0765980000000002
    ]
    testMat.multiply(secondMat);
    testMat.matrix.forEach((elem, count) => {
        expect(elem).toBeCloseTo(expResult[count])
    })
})