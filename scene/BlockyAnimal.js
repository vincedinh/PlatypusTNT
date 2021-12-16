// Written by Vince Dinh
// CSE 160, Professor James Davis @ UCSC, Fall 2021
// asg2.js
// Modified from ColoredPoint.js (c) 2012 matsuda
// Vertex shader program

var VSHADER_SOURCE =`
  precision mediump float;
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  varying vec2 v_UV;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  void main() {
    gl_Position = u_ProjectionMatrix*u_ViewMatrix*u_GlobalRotateMatrix*u_ModelMatrix*a_Position;
    v_UV = a_UV;
  }`

// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_UV;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
    gl_FragColor = vec4(v_UV,1.0,1.0);
  }`

// Global Variables
let canvas;
let gl;
let a_Position;
let a_UV;
let u_FragColor;
let u_Size;
let u_ModelMatrix;
let u_GlobalRotateMatrix;
let u_ProjectionMatrix;
let u_ViewMatrix;

function setupWebGL(){
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  //gl = getWebGLContext("webgl", {preserveDrawingBuffer: true} );
  gl = getWebGLContext(canvas, { alpha: false } );
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  gl.enable(gl.DEPTH_TEST);
}

function connectVariablesToGLSL(){
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  // Get the storage location of a_UV
  a_UV = gl.getAttribLocation(gl.program, 'a_UV');
  if (a_UV < 0) {
    console.log('Failed to get the storage location of a_UV');
    return;
  }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  // Get the storage location of u_ModelMatrix
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }

  // Get the storage location of u_GlobalRotateMatrix
  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  if(!u_GlobalRotateMatrix) {
    console.log('Failed to get the storage location of u_GlobalRotateMatrix');
    return;
  }

  // Get the storage location of u_ViewMatrix
  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  if(!u_ViewMatrix) {
    console.log('Failed to get the storage location of u_ViewMatrix');
    return;
  }

  // Set an initial value for this matrix to identity
  var identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);

}

// Constants
const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;

// Global variables for UI elements
let g_opacity=1;
let g_selectedColor=[0.0,0.0,1.0,1.0];
let g_selectedSize=5;
let g_selectedType=POINT;
let g_globalAngle=35;

let g_headAngle = 0;
let g_rightLegsAngle = 0;
let g_leftLegsAngle = 0;
let g_tailAngle = 0;
let g_rightFlippersAngle = 0;
let g_leftFlippersAngle = 0;


let g_headAnimation = true;
let g_legsAnimation = true;
let g_tailAnimation = true;
let g_flippersAnimation = true;

// Set up actions for the HTML UI elements
function addActionsForHtmlUI(){

  // Button Events (Shape Type)
  document.getElementById('headAnimOn').onclick = function() { g_headAnimation = true; renderScene(); };
  document.getElementById('headAnimOff').onclick = function() { g_headAnimation = false; renderScene(); };

  document.getElementById('legsAnimOn').onclick = function() { g_legsAnimation = true; renderScene(); };
  document.getElementById('legsAnimOff').onclick = function() { g_legsAnimation = false; renderScene(); };

  document.getElementById('tailAnimOn').onclick = function() { g_tailAnimation = true; renderScene(); };
  document.getElementById('tailAnimOff').onclick = function() { g_tailAnimation = false; renderScene(); };

  document.getElementById('flipAnimOn').onclick = function() { g_flippersAnimation = true; renderScene(); };
  document.getElementById('flipAnimOff').onclick = function() { g_flippersAnimation = false; renderScene(); };
  // Slider Events
  document.getElementById('headAngle').addEventListener('mousemove', function() { g_headAngle=this.value; renderScene(); } );
  document.getElementById('rightLegsAngle').addEventListener('mousemove', function() { g_rightLegsAngle=this.value; renderScene(); } );
  document.getElementById('rightFlippersAngle').addEventListener('mousemove', function() { g_rightFlippersAngle=this.value; renderScene(); } );
  document.getElementById('leftLegsAngle').addEventListener('mousemove', function() { g_leftLegsAngle=this.value; renderScene(); } );
  document.getElementById('leftFlippersAngle').addEventListener('mousemove', function() { g_leftFlippersAngle=this.value; renderScene(); } );
  document.getElementById('tailAngle').addEventListener('mousemove', function() { g_tailAngle=this.value; renderScene(); } );

  document.getElementById('angleSlide').addEventListener('mousemove', function() { g_globalAngle = this.value; renderScene(); } );

}

// Extract the event click and return it in WebGL coordinates
function convertCoordinatesEventToGL(ev){
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
  y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

  return([x, y]);
}

function main() {

  setupWebGL();
  connectVariablesToGLSL();

  // Set up actions for the HTML UI elements
  addActionsForHtmlUI();

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  
  // Clear <canvas>
  //gl.clear(gl.COLOR_BUFFER_BIT);
  renderScene();
  requestAnimationFrame(tick);

}

var g_startTime=performance.now()/1000.0;
var g_seconds=performance.now()/1000.0-g_startTime;
 
// Called by browser repeatedly whenever it's time
function tick() {
  g_seconds=performance.now()/1000.0-g_startTime;
  // debugging
  console.log(g_seconds);

  // update animation angles
  // updateAnimationAngles();

  // draw everything
  renderScene();

  // tell browser to update again when it has time
  requestAnimationFrame(tick);

}

var g_shapesList = [];

// Update the angles of everything if currently animated
/**
function updateAnimationAngles() {
  if (g_headAnimation) {
    g_headAngle = (10*Math.sin(g_seconds));
  }
}
*/

// Draw every shape that is supposed to be in the canvas
function renderScene(){

  // Check the time at the start of this function
  var startTime = performance.now();

  // Pass the matrix to u_ModelMatrix attribute
  var globalRotMat = new Matrix4().rotate(g_globalAngle,0,1,0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Draw the body 
  var body = new Cube();
  body.color = [162/255,125/255,99/255,1];
  body.matrix.scale(0.8, .4, .4);
  body.matrix.translate(-.5, 0, 0.0);
  body.render();

  // Draw the tail
  var tail = new Cube();
  tail.color = [67/255,68/255,70/255,1];
  tail.matrix.scale(0.8, .4, 0); //.4
  tail.matrix.translate(-1.1, .1, .05); //.05
  tail.matrix.scale(0.8, .2, 1.1); //1.1
  // why does the tail look like it skews when animated/rotated?
  if(g_tailAnimation){
    tail.matrix.translate(0, 0.1*Math.abs(Math.sin(g_seconds)), 0);
    tail.matrix.rotate(3*Math.abs(Math.sin(g_seconds)), 0, 0, 30);
    tail.matrix.translate(0, -0.4*Math.abs(Math.sin(g_seconds)), 0);
  }
  else{
    tail.matrix.rotate(g_tailAngle, 0, 0, 1);
  }
  tail.render();

  // Draw the head
  var head = new Cube();
  head.color = [154/255,117/255,91/255,1];
  head.matrix.scale(0.8, .4, .4);
  head.matrix.translate(0.5, -.5, 0.0);
  head.matrix.scale(0.4, 0.8, 0.8);
  head.matrix.translate(0, 0.65, -0.1);
  if(g_headAnimation){
    head.matrix.translate(0, 0.1*Math.abs(Math.sin(g_seconds)), 0);
    head.matrix.rotate(3*Math.sin(g_seconds), 0, 0, 1);
    head.matrix.translate(-0.05*Math.abs(Math.sin(g_seconds)), -0.05*Math.abs(Math.sin(g_seconds)), 0);
  }
  else{
    head.matrix.rotate(g_headAngle, 0, 0, 1);
  }

  var billCoordinatesMat = new Matrix4(head.matrix);
  var rightEyeCoordinatesMat = new Matrix4(head.matrix);
  var leftEyeCoordinatesMat = new Matrix4(head.matrix);
  head.render();

  // Draw the eyes
  var rightEye = new Cube();
  rightEye.color = [67/255,68/255,70/255,1];
  rightEye.matrix = rightEyeCoordinatesMat;
  rightEye.matrix.scale(0.2, 0.2, 0.45);
  rightEye.matrix.translate(0.8, 0.5,-1.5);
  rightEye.render();

  var leftEye = new Cube();
  leftEye.color = [67/255,68/255,70/255,1];
  leftEye.matrix = leftEyeCoordinatesMat;
  leftEye.matrix.scale(0.2, 0.2, 0.45);
  leftEye.matrix.translate(0.8, 0.5,0.3);
  leftEye.render();
  
  // Draw the bill
  var bill = new Cube();
  bill.color = [67/255,68/255,70/255,1];
  bill.matrix = billCoordinatesMat;
  bill.matrix.scale(1, .2, .4);
  bill.matrix.translate(1, -.5, 0.0);
  bill.matrix.scale(0.4, 1, 1.5);
  bill.matrix.translate(0, 0.7, -0.3);
  bill.render();

  // Draw the legs & flippers
  // Right Legs & Flippers
  var rightFrontLeg = new Cube();
  rightFrontLeg.color = [127/255,98/255,79/255, 1];
  rightFrontLeg.matrix.scale(0.6, 0.4, 0.25);
  rightFrontLeg.matrix.translate(0.2, -0.5, -0.1);
  rightFrontLeg.matrix.scale(0.2, .5, .4);
  if(g_legsAnimation){
    rightFrontLeg.matrix.translate(0, 0.3*Math.abs(Math.sin(g_seconds)), 0);
    rightFrontLeg.matrix.rotate(10*Math.sin(g_seconds), 0, 0, 1);
    rightFrontLeg.matrix.translate(0, -0.1*Math.abs(Math.sin(g_seconds)), 0);
  }
  else{
    rightFrontLeg.matrix.rotate(g_rightLegsAngle, 0, 0, 1);
  }
  rightFrontFlipperMat = new Matrix4(rightFrontLeg.matrix);
  rightFrontLeg.render();

  var rightFrontFlipper = new Cube();
  rightFrontFlipper.color = [67/255,68/255,70/255, 1];
  rightFrontFlipper.matrix = rightFrontFlipperMat;
  rightFrontFlipper.matrix.translate(0.2, -0.2, -0.1);
  rightFrontFlipper.matrix.scale(1.2, .2, 1.5);
  rightFrontFlipper.matrix.translate(0.2, 1.15, 0.2);
  if(g_flippersAnimation){
    rightFrontFlipper.matrix.rotate(-150*Math.abs(Math.cos(0.2*g_seconds)), 0, 0, 1);
  }
  else{
  rightFrontFlipper.matrix.rotate(g_rightFlippersAngle, 0, 0, 1);
  }
  rightFrontFlipper.render();

  var rightBackLeg = new Cube();
  rightBackLeg.color = [127/255,98/255,79/255, 1];
  rightBackLeg.matrix.scale(0.6, 0.4, 0.25);
  rightBackLeg.matrix.translate(-0.5, -0.5, -0.1);
  rightBackLeg.matrix.scale(0.2, .5, .4);
  if(g_legsAnimation){
    rightBackLeg.matrix.translate(0, 0.3*Math.abs(Math.sin(g_seconds)), 0);
    rightBackLeg.matrix.rotate(10*Math.sin(g_seconds), 0, 0, 1);
    rightBackLeg.matrix.translate(0, -0.1*Math.abs(Math.sin(g_seconds)), 0);
  }
  else{
    rightBackLeg.matrix.rotate(g_rightLegsAngle, 0, 0, 1);
  }
  rightBackFlipperMat = new Matrix4(rightBackLeg.matrix);
  rightBackLeg.render();

  var rightBackFlipper = new Cube();
  rightBackFlipper.color = [67/255,68/255,70/255, 1];
  rightBackFlipper.matrix = rightBackFlipperMat;
  rightBackFlipper.matrix.translate(0.2, -0.2, -0.1);
  rightBackFlipper.matrix.scale(1.2, 0.2, 1.5);
  rightBackFlipper.matrix.translate(0.2, 1.15, 0.2);
  if(g_flippersAnimation){
    rightBackFlipper.matrix.rotate(-45*Math.abs(Math.cos(g_seconds)), 0, 0, 1);
  }
  else{
    rightBackFlipper.matrix.rotate(g_rightFlippersAngle, 0, 0, 1);
  }
  rightBackFlipper.render();

  // Left Legs & Flippers
  var leftFrontLeg = new Cube();
  leftFrontLeg.color = [127/255,98/255,79/255, 1];
  leftFrontLeg.matrix.scale(0.6, 0.4, 0.25);
  leftFrontLeg.matrix.translate(0.2, -0.5, -1.0);
  leftFrontLeg.matrix.scale(0.2, .5, .4);
  if(g_legsAnimation){
    leftFrontLeg.matrix.translate(0, -0.1*Math.abs(Math.sin(g_seconds)), 0);
    leftFrontLeg.matrix.rotate(-10*Math.sin(g_seconds), 0, 0, 1);
    leftFrontLeg.matrix.translate(0, 0.3*Math.abs(Math.sin(g_seconds)), 0);
  }
  else{
    leftFrontLeg.matrix.rotate(g_leftLegsAngle, 0, 0, 1);
  }
  leftFrontFlipperMat = new Matrix4(leftFrontLeg.matrix);
  leftFrontLeg.render();

  var leftFrontFlipper = new Cube();
  leftFrontFlipper.color = [67/255,68/255,70/255, 1];
  leftFrontFlipper.matrix = leftFrontFlipperMat;
  leftFrontFlipper.matrix.translate(0.2, -0.2, -0.1);
  leftFrontFlipper.matrix.scale(1.2, 0.2, 1.5);
  leftFrontFlipper.matrix.translate(0.2, 1.15, 0.2);
  if(g_flippersAnimation){
    leftFrontFlipper.matrix.rotate(-270*Math.abs(Math.sin(g_seconds)), 0, 0, 1);
  }
  else{
  leftFrontFlipper.matrix.rotate(g_leftFlippersAngle, 0, 0, 1);
  }
  leftFrontFlipper.render();
  
  var leftBackLeg = new Cube();
  leftBackLeg.color = [127/255,98/255,79/255, 1];
  leftBackLeg.matrix.scale(0.6, 0.4, 0.25);
  leftBackLeg.matrix.translate(-0.5, -0.5, -1.0);
  leftBackLeg.matrix.scale(0.2, .5, .4);
  if(g_legsAnimation){
    leftBackLeg.matrix.translate(0, -0.1*Math.abs(Math.sin(g_seconds)), 0);
    leftBackLeg.matrix.rotate(-10*Math.sin(g_seconds), 0, 0, 1);
    leftBackLeg.matrix.translate(0, 0.3*Math.abs(Math.sin(g_seconds)), 0);
  }
  else{
    leftBackLeg.matrix.rotate(g_leftLegsAngle, 0, 0, 1);
  }
  leftBackFlipperMat = new Matrix4(leftBackLeg.matrix);
  leftBackLeg.render();

  var leftBackFlipper = new Cube();
  leftBackFlipper.color = [67/255,68/255,70/255, 1];
  leftBackFlipper.matrix = leftBackFlipperMat;
  leftBackFlipper.matrix.translate(0.2, -0.2, -0.1);
  leftBackFlipper.matrix.scale(1.2, 0.2, 1.5);
  leftBackFlipper.matrix.translate(0.2, 1.15, 0.2);
  if(g_flippersAnimation){
    leftBackFlipper.matrix.rotate(-45*Math.abs(Math.sin(g_seconds)), 0, 0, 1);
  }
  else{
    leftBackFlipper.matrix.rotate(g_leftFlippersAngle, 0, 0, 1);
  }
  leftBackFlipper.render();



  var duration = performance.now() - startTime;
  sendTextToHTML(" ms: " + Math.floor(duration) + " fps: " + Math.floor(10000/duration), "numdot");
  

}

// Set the text of a HTML element
function sendTextToHTML(text, htmlID){
  var htmlElm = document.getElementById(htmlID);
  if(!htmlElm){
    console.log("Failed to get " + htmlID + " from HTML");
    return;
  }
  htmlElm.innerHTML = text;

}

