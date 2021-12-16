// Written by Vince Dinh
// CSE 160, Professor James Davis @ UCSC, Fall 2021
// Cube.js
// Modified from Prof. James' Youtube lecture
// Vertex shader program
class Cube{
  constructor(){
    this.type='cube';
    //this.position=[0.0,0.0,0.0];
    this.color=[1.0,1.0,1.0, 1.0];
    //this.size=5.0;
    //this.segments = 10;
    this.matrix = new Matrix4();
    this.normalMatrix = new Matrix4();
    this.textureNum=-2;
  }

  render() {
    //var xy = this.position;
    var rgba = this.color;
    //var size = this.size;

    // Pass the texture number
    gl.uniform1i(u_whichTexture, this.textureNum);

    // Pass the color of a point to u_FragColor variable
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    // Pass the matrix to the u_ModelMatrix attribute
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    gl.uniformMatrix4fv(u_NormalMatrix, false, this.normalMatrix.elements);

    // Front face of cube
    //drawTriangle3DUV( [0,0,0, 1,1,0, 1,0,0 ], [0,0, 1,1, 1,0]);
    //drawTriangle3DUV( [0,0,0, 0,1,0, 1,1,0 ], [0,0, 0,1, 1,1]);
    drawTriangle3DUVNormal([0,0,0, 1,1,0, 1,0,0], [0,0, 1,1, 1,0], [0,0,-1, 0,0,-1, 0,0,-1]);
    drawTriangle3DUVNormal([0,0,0, 0,1,0, 1,1,0], [0,0, 0,1, 1,1], [0,0,-1, 0,0,-1, 0,0,-1]);

    // Other sides of cube top, bottom, left, right, back
    // Top face of cube
    //drawTriangle3DUV( [0,1,0, 1,1,-1, 1,1,0], [0,0, 1,1, 1,0]);
    //drawTriangle3DUV( [0,1,0, 0,1,-1, 1,1,-1], [0,0, 0,1, 1,1]);
    drawTriangle3DUVNormal( [0,1,0, 1,1,-1, 1,1,0], [0,0, 1,1, 1,0], [0,1,0, 0,1,0, 0,1,0]);
    drawTriangle3DUVNormal( [0,1,0, 0,1,-1, 1,1,-1], [0,0, 0,1, 1,1], [0,1,0, 0,1,0, 0,1,0]);

    // Bottom face of cube
    //drawTriangle3DUV( [0,0,0, 1,0,-1, 1,0,0], [0,0, 1,1, 1,0]);
    //drawTriangle3DUV( [0,0,0, 0,0,-1, 1,0,-1], [0,0, 0,1, 1,1]);
    drawTriangle3DUVNormal( [0,0,0, 1,0,-1, 1,0,0], [0,0, 1,1, 1,0], [0,-1,0, 0,-1,0, 0,-1,0]);
    drawTriangle3DUVNormal( [0,0,0, 0,0,-1, 1,0,-1], [0,0, 0,1, 1,1], [0,-1,0, 0,-1,0, 0,-1,0]);

    // Left face of cube
    //drawTriangle3DUV( [0,0,0, 0,1,-1, 0,0,-1], [0,0, 1,1, 1,0]);
    //drawTriangle3DUV( [0,0,0, 0,1,0, 0,1,-1], [0,0, 0,1, 1,1]);
    drawTriangle3DUVNormal( [0,0,0, 0,1,-1, 0,0,-1], [0,0, 1,1, 1,0], [-1,0,0, -1,0,0, -1,0,0]);
    drawTriangle3DUVNormal([0,0,0, 0,1,0, 0,1,-1], [0,0, 0,1, 1,1], [-1,0,0, -1,0,0, -1,0,0]);

    // Right face of cube
    //drawTriangle3DUV( [1,0,0, 1,1,-1, 1,0,-1], [0,0, 1,1, 1,0]);
    //drawTriangle3DUV( [1,0,0, 1,1,0, 1,1,-1], [0,0, 0,1, 1,1]);
    drawTriangle3DUVNormal( [1,0,0, 1,1,-1, 1,0,-1], [0,0, 1,1, 1,0], [1,0,0, 1,0,0, 1,0,0]);
    drawTriangle3DUVNormal( [1,0,0, 1,1,0, 1,1,-1], [0,0, 0,1, 1,1], [1,0,0, 1,0,0, 1,0,0]);

    // Back face of cube
    //drawTriangle3DUV( [0,0,-1, 1,1,-1, 1,0,-1], [0,0, 1,1, 1,0]);
    //drawTriangle3DUV( [0,0,-1, 0,1,-1, 1,1,-1], [0,0, 0,1, 1,1]);
    drawTriangle3DUVNormal( [0,0,-1, 1,1,-1, 1,0,-1], [0,0, 1,1, 1,0], [0,0,1, 0,0,1, 0,0,1]);
    drawTriangle3DUVNormal( [0,0,-1, 0,1,-1, 1,1,-1], [0,0, 0,1, 1,1], [0,0,1, 0,0,1, 0,0,1]);
  }

  renderFast(){
		var rgba = this.color;
    gl.uniform1i(u_whichTexture, this.textureNum);
		gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
		gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
		//gl.disableVertexAttribArray(a_UV);

		var allverts=[];
		var uvverts= [];

    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

		//Front
		allverts=allverts.concat( [0,0,0, 1,1,0, 1,0,0 ] ); uvverts=uvverts.concat([0,0, 1,1, 1,0]);
		allverts=allverts.concat( [0,0,0, 0,1,0, 1,1,0 ] ); uvverts=uvverts.concat([0,0, 0,1, 1,1]);

		//Top
		allverts=allverts.concat( [0,1,0, 0,1,1, 1,1,1 ] ); uvverts=uvverts.concat([0,0, 0,1, 1,1]);
		allverts=allverts.concat( [0,1,0, 1,1,1, 1,1,0 ] ); uvverts=uvverts.concat([0,0, 1,1, 1,0]);

		gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    //Bottom
		allverts=allverts.concat( [0,0,0, 1,0,1, 1,0,0 ] ); uvverts=uvverts.concat([0,1, 1,0, 1,1]);
		allverts=allverts.concat( [0,0,0, 0,0,1, 1,0,1 ] ); uvverts=uvverts.concat([0,1, 0,0, 1,0]);

		//Right
		allverts=allverts.concat( [1,0,0, 1,1,0, 1,1,1 ] ); uvverts=uvverts.concat([0,0, 0,1, 1,1]);
		allverts=allverts.concat( [1,0,0, 1,0,1, 1,1,1 ] ); uvverts=uvverts.concat([0,0, 1,0, 1,1]);

		//Left
		allverts=allverts.concat( [0,0,0, 0,0,1, 0,1,1 ] ); uvverts=uvverts.concat([1,0, 0,0, 0,1]);
		allverts=allverts.concat( [0,0,0, 0,1,0, 0,1,1 ] ); uvverts=uvverts.concat([1,0, 1,1, 0,1]);

    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

		//Back
		allverts=allverts.concat( [0,0,1, 0,1,1, 1,1,1 ] ); uvverts=uvverts.concat([1,0, 1,1, 0,1]);
		allverts=allverts.concat( [0,0,1, 1,1,1, 1,0,1 ] ); uvverts=uvverts.concat([1,0, 0,1, 0,0]);
		drawTriangle3DUV(allverts, uvverts);
	}

}
