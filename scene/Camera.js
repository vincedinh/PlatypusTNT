// Written by Vince Dinh
// CSE 160, Professor James Davis @ UCSC, Fall 2021
// Camera.js
// Modified from Prof. James' Youtube lecture and Canvas assignment instructions
// Camera for navigating 3D world
class Camera{
    constructor(){
        this.eye=new Vector3([5,0,0]); //3, 0, 1
        this.at=new Vector3([0,0,0]); //-2,0,-1
         this.up=new Vector3([0,1,0]); 
    }

    moveForward() {
        let f = new Vector3([0,0,0]);
        f.set(this.at);
        f.sub(this.eye);
        f.normalize();
        f.mul(0.2);
        this.eye.add(f);
        this.at.add(f);
    }

    moveBackwards() {
		let f = new Vector3([0,0,0]);
    	f.set(this.at);
    	f.sub(this.eye);
    	f.normalize();
    	f.mul(0.2);
    	this.eye.sub(f);
    	this.at.sub(f);
    }
    
    moveLeft() {
        let f = new Vector3([0,0,0]);
        f.set(this.at);
        f.sub(this.eye);
        f.normalize();
        var s = Vector3.cross(this.up, f);
        s.mul(0.2);
        this.eye.add(s);
        this.at.add(s);
    }

    moveRight() {
        let f = new Vector3([0,0,0]);
        f.set(this.at);
        f.sub(this.eye);
        f.normalize();
        var s = Vector3.cross(f, this.up);
        s.mul(0.2);
        this.eye.add(s);
        this.at.add(s);
    }

    panLeft(){
		let f = new Vector3([0,0,0]);
		let tempEye = new Vector3([0,0,0]);
		f.set(this.at);
        f.sub(this.eye);
		let rotMat = new Matrix4();
		rotMat.setRotate(5, this.up.elements[0],this.up.elements[1],this.up.elements[2]);
    	let f_prime = rotMat.multiplyVector3(f);
    	tempEye.set(this.eye);
    	this.at = tempEye.add(f_prime);
    }

    panRight(){
		let f = new Vector3([0,0,0]);
		let tempEye = new Vector3([0,0,0]);
		f.set(this.at);
        f.sub(this.eye);
		let rotMat = new Matrix4();
		rotMat.setRotate(-5, this.up.elements[0],this.up.elements[1],this.up.elements[2]);
    	let f_prime = rotMat.multiplyVector3(f);
    	tempEye.set(this.eye);
    	this.at = tempEye.add(f_prime);
    }
}