// Written by Vince Dinh
// CSE 160, Professor James Davis @ UCSC, Fall 2021
// asg4.js
// Modified from ColoredPoint.js (c) 2012 matsuda
// Vertex shader program

var VSHADER_SOURCE =`
  precision mediump float;
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  attribute vec3 a_Normal;
  varying vec2 v_UV;
  varying vec3 v_Normal;
  varying vec4 v_VertPos;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_NormalMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  void main() {
    gl_Position = u_ProjectionMatrix*u_ViewMatrix*u_GlobalRotateMatrix*u_ModelMatrix*a_Position;
    v_UV = a_UV;
    v_Normal = normalize(vec3(u_NormalMatrix * vec4(a_Normal,1)));
    v_VertPos = u_ModelMatrix * a_Position;
  }`

// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_UV;
  varying vec3 v_Normal;
  uniform vec4 u_FragColor;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform sampler2D u_Sampler2;
  uniform int u_whichTexture;
  uniform vec3 u_lightPos;
  uniform vec3 u_cameraPos;
  varying vec4 v_VertPos;
  uniform bool u_lightOn;

  uniform vec3 u_spotlightPos;
  uniform bool u_spotlightOn;
  uniform vec3 u_spotlightColor;

  void main() {

    if(u_whichTexture == -3) { // Use normal
      gl_FragColor = vec4((v_Normal+1.0)/2.0, 1.0);
    }
    else if(u_whichTexture == -2) { // Use color
      gl_FragColor = u_FragColor;
    }
    else if (u_whichTexture == -1) { // Use the UV debug color
      gl_FragColor = vec4(v_UV,1.0,1.0);
    }
    else if (u_whichTexture == 0) { // Use texture0
      gl_FragColor = texture2D(u_Sampler0, v_UV);
    }
    else if (u_whichTexture == 1) { // Use texture1
      gl_FragColor = texture2D(u_Sampler1, v_UV);
    }
    else if (u_whichTexture == 2) { // Use texture1
      gl_FragColor = texture2D(u_Sampler2, v_UV);
    }
    else { // Error, put Redish
      gl_FragColor = vec4(1,.2,.2,1);
    }


    vec3 lightVector = u_lightPos-vec3(v_VertPos);
    float r = length(lightVector);

    /** Red/Green distance visualization
    if(r<1.0) {
      gl_FragColor = vec4(1,0,0,1);
    } else if (r<2.0){
      gl_FragColor = vec4(0,1,0,1);
    }
    */

    // Light falloff visualization 1/r^2
    //gl_FragColor = vec4(vec3(gl_FragColor)/(r*r), 1);

    // N dot L
    vec3 L = normalize(lightVector);
    vec3 N = normalize(v_Normal);
    float nDotL = max(dot(N, L), 0.0);

    // Reflection 
    vec3 R = reflect(-L, N);

    // Eye
    vec3 E = normalize(u_cameraPos-vec3(v_VertPos));

    // Specular
    float specular = pow(max(dot(E,R), 0.0), 5.0);

    // Diffuse
    vec3 diffuse = vec3(gl_FragColor)*nDotL*0.7;

    // Ambient
    vec3 ambient = vec3(gl_FragColor)*0.3;

    // Light Toggle
    if(u_lightOn)
    {
      if(u_whichTexture >= 0){
        gl_FragColor = vec4(specular+diffuse+ambient, 1.0);
      }
      else
      {
        gl_FragColor = vec4(diffuse+ambient, 1.0);
      }
    }
    
    // Spotlight 
    // Spotlight derived and adapted from:
    // https://webglfundamentals.org/webgl/lessons/webgl-3d-lighting-spot.html?fbclid=IwAR2i8MSZM3TpkGNbZMpcKv6ZfNSNfxfJ4XwvblGBBJsN8pzOUJKhd7z0z38
    // TO-DO: figure out how to combine effects of spotlight and light so one doesn't override the other on surfaces
    vec3 spotlightVector = u_spotlightPos - vec3(v_VertPos);
    vec3 spotlightLocation = normalize(spotlightVector);
    vec3 spotlightDirection = -normalize(vec3(0.0,-1.0,0.0));

    float spotlight = 0.0;
    float spotlightSpecular = 0.0;
    float spotlightDotFromDirection = dot(spotlightLocation, spotlightDirection);
    if (spotlightDotFromDirection >= 0.9) {
        spotlight = dot(N, spotlightLocation);
        if (spotlight > 0.0) {
            spotlightSpecular = pow(dot(N, spotlightLocation), 5.0) * 0.9;
        }
    }

    // Spotlight Toggle
    if(u_spotlightOn)
    {
      if(u_whichTexture >= 0){
        gl_FragColor = vec4(spotlightSpecular*u_spotlightColor+diffuse+ambient, 1.0);
      }
      else
      {
        gl_FragColor = vec4(spotlightSpecular*u_spotlightColor+diffuse, 1.0);
      }
    }

  }`

// Global Variables
let canvas;
let gl;
let a_Position;
let a_UV;
let a_Normal;
let u_FragColor;
let u_lightPos;
let u_lightOn;
let u_spotlightPos;
let u_spotlightOn;
let u_spotlightColor;
let u_cameraPos;
let u_Size;
let u_ModelMatrix;
let u_NormalMatrix;
let u_GlobalRotateMatrix;
let u_ProjectionMatrix;
let u_ViewMatrix;
let u_Sampler0; // factory background
let u_Sampler1; // tnt texture
let u_Sampler2; // slate texture
let u_whichTexture;

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

  // Get the storage location of a_Normal
  a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  if (a_Normal < 0) {
    console.log('Failed to get the storage location of a_Normal');
    return;
  }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  // Get the storage location of u_lightOn
  u_lightOn = gl.getUniformLocation(gl.program, 'u_lightOn');
  if (!u_lightOn) {
    console.log('Failed to get the storage location of u_lightOn');
    return;
  }

  // Get the storage location of u_lightPos
  u_lightPos = gl.getUniformLocation(gl.program, 'u_lightPos');
  if (!u_lightPos) {
    console.log('Failed to get the storage location of u_lightPos');
    return;
  }

  // Get the storage location of u_cameraPos
  u_cameraPos = gl.getUniformLocation(gl.program, 'u_cameraPos');
  if (!u_cameraPos) {
    console.log('Failed to get the storage location of u_cameraPos');
    return;
  }

  // Get the storage location of u_whichTexture
  u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');
  if(!u_whichTexture) {
    console.log('Failed to get the storage location of u_whichTexture');
    return;
  }

  // Get the storage location of u_spotlightPos
  u_spotlightPos = gl.getUniformLocation(gl.program, 'u_spotlightPos');
  if (!u_spotlightPos) {
    console.log('Failed to get the storage location of u_spotlightPos');
    return;
  }

  // Get the storage location of u_spotlightOn
  u_spotlightOn = gl.getUniformLocation(gl.program, 'u_spotlightOn');
  if (!u_spotlightOn) {
    console.log('Failed to get the storage location of u_spotlightOn');
    return;
  }

  // Get the storage location of u_spotlightColor
  u_spotlightColor = gl.getUniformLocation(gl.program, 'u_spotlightColor');
  if (!u_spotlightColor) {
    console.log('Failed to get the storage location of u_spotlightColor');
    return;
  }

  // Get the storage location of u_ModelMatrix
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }

  // Get the storage location of u_NormalMatrix
  u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  if (!u_NormalMatrix) {
    console.log('Failed to get the storage location of u_NormalMatrix');
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

  // Get the storage location of u_ProjectionMatrix
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  if(!u_ProjectionMatrix) {
    console.log('Failed to get the storage location of u_ProjectionMatrix');
    return;
  }

  // Get the storage location of u_Sampler0 
  u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
  if(!u_Sampler0) {
    console.log('Failed to get the storage location of u_Sampler0');
    return;
  }

  // Get the storage location of u_Sampler1
  u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
  if(!u_Sampler1) {
    console.log('Failed to get the storage location of u_Sampler1');
    return;
  }

  // Get the storage location of u_Sampler2
  u_Sampler2 = gl.getUniformLocation(gl.program, 'u_Sampler2');
  if(!u_Sampler2) {
    console.log('Failed to get the storage location of u_Sampler2');
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
let g_globalAngle=0;

let g_normalsOn=false;
let g_lightOn=true;
let g_lightPos=[2.2,1,-2];

// Lime-green spotlight
let g_spotlightOn=false;
let g_spotlightPos=[0,1.5,0];
let g_spotlightColor=[173/255,255/255,47/255];

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
  document.getElementById('NormalsOn').onclick = function() { g_normalsOn = true; renderScene(); };
  document.getElementById('NormalsOff').onclick = function() { g_normalsOn = false; renderScene(); };

  document.getElementById('lightOn').onclick = function() { g_lightOn = true; renderScene(); };
  document.getElementById('lightOff').onclick = function() { g_lightOn = false; renderScene(); };

  document.getElementById('spotlightOn').onclick = function() { g_spotlightOn = true; renderScene(); };
  document.getElementById('spotlightOff').onclick = function() { g_spotlightOn = false; renderScene(); };

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

  document.getElementById('lightSlideX').addEventListener('mousemove', function() { g_lightPos[0] = this.value/100; renderScene(); } );
  document.getElementById('lightSlideY').addEventListener('mousemove', function() { g_lightPos[1] = this.value/100; renderScene(); } );
  document.getElementById('lightSlideZ').addEventListener('mousemove', function() { g_lightPos[2] = this.value/100; renderScene(); } );
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

function initTextures() {
  // Create a texture object
  var texture0 = gl.createTexture(); 
  var texture1 = gl.createTexture();
  var texture2 = gl.createTexture();
  if (!texture0 || !texture1 || !texture2) {
    console.log('Failed to create the texture object');
    return false;
  }

  // Get the storage location of samplers
  var u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
  var u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
  var u_Sampler2 = gl.getUniformLocation(gl.program, 'u_Sampler2');
  if (!u_Sampler0 || !u_Sampler1 || !u_Sampler2) {
    console.log('Failed to get the storage location of u_Sampler(n)');
    return false;
  }

  // Create the image object
  var image0 = new Image();
  var image1 = new Image();
  var image2 = new Image();
  if (!image0 || !image1 || !image2) {
    console.log('Failed to create the image object');
    return false;
  }
  // Register the event handler to be called when image loading is completed
  image0.onload = function(){ sendImageToTEXTURE(texture0, u_Sampler0, image0, 0); }; // factory background
  image1.onload = function(){ sendImageToTEXTURE(texture1, u_Sampler1, image1, 1); }; // tnt texture
  image2.onload = function(){ sendImageToTEXTURE(texture2, u_Sampler2, image2, 2); }; // slate texture
  // Tell the browser to load the images
  image0.src = '../resources/factory.jpg';
  image1.src = '../resources/tnt.png';
  image2.src = '../resources/slate.jpg';
  

  return true;
}


function sendImageToTEXTURE(texture, u_Sampler, image, texUnit){
  var texture = gl.createTexture();
  if( !texture) {
    console.log('Failed to create the texture object');
    return false;
  }

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);// Flip the image's y-axis
  // Make the texture unit active
  if (texUnit == 0) {
    gl.activeTexture(gl.TEXTURE0);
  } else if(texUnit == 1){
    gl.activeTexture(gl.TEXTURE1);
  }
  else{
    gl.activeTexture(gl.TEXTURE2);
  }
  // Bind the texture object to the target
  gl.bindTexture(gl.TEXTURE_2D, texture);   

  // Set texture parameters
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  // Set the image to texture
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  
  gl.uniform1i(u_Sampler, texUnit);   // Pass the texure unit to u_Sampler
  
}

function main() {

  setupWebGL();
  connectVariablesToGLSL();

  // Set up actions for the HTML UI elements
  addActionsForHtmlUI();

  document.onkeydown = keydown;

  initTextures();

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  
  // Clear <canvas>
  //gl.clear(gl.COLOR_BUFFER_BIT);
  //renderScene();
  requestAnimationFrame(tick);

}

var g_startTime=performance.now()/1000.0;
var g_seconds=performance.now()/1000.0-g_startTime;
 
// Called by browser repeatedly whenever it's time
function tick() {
  g_seconds=performance.now()/1000.0-g_startTime;
  // debugging
  //console.log(g_seconds);

  // update animation angles
  updateAnimationAngles();

  // draw everything
  renderScene();

  // tell browser to update again when it has time
  requestAnimationFrame(tick);

}

// Update the angles of everything if currently animated
function updateAnimationAngles() {
  g_lightPos[2] = Math.cos(g_seconds);
}


//var g_eye=[0,0,-1];
//var g_at=[0,0,-100];
//var g_up=[0,1,0];
var g_camera = new Camera();

function keydown(ev) {
  if (ev.keyCode == 38) { // Up arrow
    g_camera.moveForward();
  }
  else if (ev.keyCode == 40) { // Down arrow
    g_camera.moveBackwards();
  }
  else if (ev.keyCode == 39) { // Right arrow
    g_camera.moveRight();
  }
  else if (ev.keyCode == 37) { // Left arrow
    g_camera.moveLeft();
  }
  else if (ev.keyCode == 81) { // Q: Rotate left
    g_camera.panLeft();
  }
  else if (ev.keyCode == 69) { // E: Rotate right
    g_camera.panRight();
  }
  
  renderScene();
  console.log(ev.keyCode);
}

var g_map=[
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // Harry is around [2][4] (left to right to up to down)
  [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

function drawMap() {
 for(x=0;x<32;x++){
   for(y=0;y<32;y++){
     if(g_map[x][y] > 0){
       var body = new Cube();
       body.color = [1,1,1,1];
       body.matrix.translate(x-4, -.75, y-4);
       if(x==0 || x==31 || y == 0 || y==31)
       {
        body.textureNum=2;
       }
       else
       {
         body.textureNum=1;
       }
       body.renderFast();
     }
   }
 }

}

// Draw every shape that is supposed to be in the canvas
function renderScene(){

  // Check the time at the start of this function
  var startTime = performance.now();

  // Pass the projection matrix
  var projMat = new Matrix4();
  projMat.setPerspective(60, 1*canvas.width/canvas.height, .1, 1000);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, projMat.elements);


  // Pass the view matrix
  var viewMat = new Matrix4();
  //viewMat.setLookAt(g_eye[0],g_eye[1],g_eye[2], g_at[0],g_at[1],g_at[2], g_up[0],g_up[1],g_up[2]); // (eye, at, up)
  viewMat.setLookAt(
    g_camera.eye.elements[0],g_camera.eye.elements[1],g_camera.eye.elements[2], 
    g_camera.at.elements[0],g_camera.at.elements[1], g_camera.at.elements[2],
    g_camera.up.elements[0],g_camera.up.elements[1],g_camera.up.elements[2]); 
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMat.elements);
  
  // Pass the matrix to u_ModelMatrix attribute
  var globalRotMat = new Matrix4().rotate(g_globalAngle,0,1,0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.clear(gl.COLOR_BUFFER_BIT);

  /** World Building **/
  
  //Pass lightOn to GLSL
  gl.uniform1i(u_lightOn, g_lightOn);

  // Pass the light position to GLSL
  gl.uniform3f(u_lightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);

  // Pass the camera position to GLSL
  gl.uniform3f(u_cameraPos, g_camera.eye.elements[0], g_camera.eye.elements[1], g_camera.eye.elements[2]);

  //Pass spotlightOn to GLSL
  gl.uniform1i(u_spotlightOn, g_spotlightOn);

  // Pass the spotlight position to GLSL
  gl.uniform3f(u_spotlightPos, g_spotlightPos[0], g_spotlightPos[1], g_spotlightPos[2]);

  // Pass the spotlight color to GLSL
  gl.uniform3f(u_spotlightColor, g_spotlightColor[0], g_spotlightColor[1], g_spotlightColor[2]);

  // Draw the ground
  var ground = new Cube();
  ground.color = [156/255, 156/255, 156/255,1];
  ground.matrix.translate(-4, -.75, 50);
  ground.matrix.scale(100,0,100);
  ground.matrix.translate(-.1, 0, 0);
  ground.textureNum=-2; //change back to 2 after
  if(g_normalsOn) { ground.textureNum = -3; }
  else { ground.textureNum=-2; }//change back to 2 after
  ground.normalMatrix.setInverseOf(ground.matrix).transpose();
  ground.render();

  // Draw the sky
  var sky = new Cube();
  sky.color = [0,0,0.3,1];
  sky.textureNum=-2; //change back to 0 after
  if(g_normalsOn) { sky.textureNum = -3; }
  else { sky.textureNum=-2; }//change back to 0 after
  sky.matrix.scale(-5,-5,-5); //inverted
  sky.matrix.translate(-1, -.5, .5);
  sky.matrix.scale(4,4,4);
  sky.matrix.translate(-.1, -.7, .5);
  sky.normalMatrix.setInverseOf(sky.matrix).transpose();
  sky.render();

  // Draw light
  var light = new Cube();
  light.color = [2,2,0,1];
  light.matrix.translate(g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  light.matrix.scale(-.1,-.1,-.1);
  light.matrix.translate(-.5,-.5,-.5);
  light.render();

  // Draw spotlight
  var spotlight = new Cube();
  spotlight.color = [173/255,255/255,47/255,1];
  spotlight.matrix.translate(g_spotlightPos[0], g_spotlightPos[1], g_spotlightPos[2]);
  spotlight.matrix.scale(-.1,-.1,-.1);
  spotlight.matrix.translate(-.5,-.5,-.5);
  spotlight.render();

  // Draw a Sphere
  var sp = new Sphere();
  sp.matrix.translate(-.4, 1.0, -1.5); //-.2, 1.5, -.2 centered over harry
  if(g_normalsOn) { sp.textureNum = -3; }
  else { sp.textureNum=1; }
  sp.render();

  //drawMap();
  // reimplement after testing

  /** Harry the Platypus **/

  // Draw the body 
  var body = new Cube();
  body.color = [162/255,125/255,99/255,1];
  body.matrix.scale(0.8, .4, .4);
  body.matrix.translate(-.5, 0, 0.0);
  if(g_normalsOn) { body.textureNum = -3; }
  else { body.textureNum=-2; }
  body.normalMatrix.setInverseOf(body.matrix).transpose();
  body.render();

  // Draw the tail
  var tail = new Cube();
  tail.color = [67/255,68/255,70/255,1];
  tail.matrix.scale(0.8, .4, 0); //.4
  tail.matrix.translate(-1.1, .1, .05); //.05
  tail.matrix.scale(0.8, .2, 1.1); //1.1
  if(g_normalsOn) { tail.textureNum = -3; }
  else { tail.textureNum=-2; }
  tail.normalMatrix.setInverseOf(tail.matrix).transpose();
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
  if(g_normalsOn) { head.textureNum = -3; }
  else { head.textureNum=-2; }
  head.normalMatrix.setInverseOf(head.matrix).transpose();
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
  if(g_normalsOn) { rightEye.textureNum = -3; }
  else { rightEye.textureNum=-2; }
  rightEye.normalMatrix.setInverseOf(rightEye.matrix).transpose();
  rightEye.render();

  var leftEye = new Cube();
  leftEye.color = [67/255,68/255,70/255,1];
  leftEye.matrix = leftEyeCoordinatesMat;
  leftEye.matrix.scale(0.2, 0.2, 0.45);
  leftEye.matrix.translate(0.8, 0.5,0.3);
  if(g_normalsOn) { leftEye.textureNum = -3; }
  else { leftEye.textureNum=-2; }
  leftEye.normalMatrix.setInverseOf(leftEye.matrix).transpose();
  leftEye.render();
  
  // Draw the bill
  var bill = new Cube();
  bill.color = [67/255,68/255,70/255,1];
  bill.matrix = billCoordinatesMat;
  bill.matrix.scale(1, .2, .4);
  bill.matrix.translate(1, -.5, 0.0);
  bill.matrix.scale(0.4, 1, 1.5);
  bill.matrix.translate(0, 0.7, -0.3);
  if(g_normalsOn) { bill.textureNum = -3; }
  else { bill.textureNum=-2; }
  bill.normalMatrix.setInverseOf(bill.matrix).transpose();
  bill.render();

  // Draw the legs & flippers
  // Right Legs & Flippers
  var rightFrontLeg = new Cube();
  rightFrontLeg.color = [127/255,98/255,79/255, 1];
  rightFrontLeg.matrix.scale(0.6, 0.4, 0.25);
  rightFrontLeg.matrix.translate(0.2, -0.5, -0.1);
  rightFrontLeg.matrix.scale(0.2, .5, .4);
  if(g_normalsOn) { rightFrontLeg.textureNum = -3; }
  else { rightFrontLeg.textureNum=-2; }
  if(g_legsAnimation){
    rightFrontLeg.matrix.translate(0, 0.3*Math.abs(Math.sin(g_seconds)), 0);
    rightFrontLeg.matrix.rotate(10*Math.sin(g_seconds), 0, 0, 1);
    rightFrontLeg.matrix.translate(0, -0.1*Math.abs(Math.sin(g_seconds)), 0);
  }
  else{
    rightFrontLeg.matrix.rotate(g_rightLegsAngle, 0, 0, 1);
  }
  rightFrontFlipperMat = new Matrix4(rightFrontLeg.matrix);
  rightFrontLeg.normalMatrix.setInverseOf(rightFrontLeg.matrix).transpose();
  rightFrontLeg.render();

  var rightFrontFlipper = new Cube();
  rightFrontFlipper.color = [67/255,68/255,70/255, 1];
  rightFrontFlipper.matrix = rightFrontFlipperMat;
  rightFrontFlipper.matrix.translate(0.2, -0.2, -0.1);
  rightFrontFlipper.matrix.scale(1.2, .2, 1.5);
  rightFrontFlipper.matrix.translate(0.2, 1.15, 0.2);
  if(g_normalsOn) { rightFrontFlipper.textureNum = -3; }
  else { rightFrontFlipper.textureNum=-2; }
  if(g_flippersAnimation){
    rightFrontFlipper.matrix.rotate(-150*Math.abs(Math.cos(0.2*g_seconds)), 0, 0, 1);
  }
  else{
  rightFrontFlipper.matrix.rotate(g_rightFlippersAngle, 0, 0, 1);
  }
  rightFrontFlipper.normalMatrix.setInverseOf(rightFrontFlipper.matrix).transpose();
  rightFrontFlipper.render();

  var rightBackLeg = new Cube();
  rightBackLeg.color = [127/255,98/255,79/255, 1];
  rightBackLeg.matrix.scale(0.6, 0.4, 0.25);
  rightBackLeg.matrix.translate(-0.5, -0.5, -0.1);
  rightBackLeg.matrix.scale(0.2, .5, .4);
  if(g_normalsOn) { rightBackLeg.textureNum = -3; }
  else { rightBackLeg.textureNum=-2; }
  if(g_legsAnimation){
    rightBackLeg.matrix.translate(0, 0.3*Math.abs(Math.sin(g_seconds)), 0);
    rightBackLeg.matrix.rotate(10*Math.sin(g_seconds), 0, 0, 1);
    rightBackLeg.matrix.translate(0, -0.1*Math.abs(Math.sin(g_seconds)), 0);
  }
  else{
    rightBackLeg.matrix.rotate(g_rightLegsAngle, 0, 0, 1);
  }
  rightBackFlipperMat = new Matrix4(rightBackLeg.matrix);
  rightBackLeg.normalMatrix.setInverseOf(rightBackLeg.matrix).transpose();
  rightBackLeg.render();

  var rightBackFlipper = new Cube();
  rightBackFlipper.color = [67/255,68/255,70/255, 1];
  rightBackFlipper.matrix = rightBackFlipperMat;
  rightBackFlipper.matrix.translate(0.2, -0.2, -0.1);
  rightBackFlipper.matrix.scale(1.2, 0.2, 1.5);
  rightBackFlipper.matrix.translate(0.2, 1.15, 0.2);
  if(g_normalsOn) { rightBackFlipper.textureNum = -3; }
  else { rightBackFlipper.textureNum=-2; }
  if(g_flippersAnimation){
    rightBackFlipper.matrix.rotate(-45*Math.abs(Math.cos(g_seconds)), 0, 0, 1);
  }
  else{
    rightBackFlipper.matrix.rotate(g_rightFlippersAngle, 0, 0, 1);
  }
  rightBackFlipper.normalMatrix.setInverseOf(rightBackFlipper.matrix).transpose();
  rightBackFlipper.render();

  // Left Legs & Flippers
  var leftFrontLeg = new Cube();
  leftFrontLeg.color = [127/255,98/255,79/255, 1];
  leftFrontLeg.matrix.scale(0.6, 0.4, 0.25);
  leftFrontLeg.matrix.translate(0.2, -0.5, -1.0);
  leftFrontLeg.matrix.scale(0.2, .5, .4);
  if(g_normalsOn) { leftFrontLeg.textureNum = -3; }
  else { leftFrontLeg.textureNum=-2; }
  if(g_legsAnimation){
    leftFrontLeg.matrix.translate(0, -0.1*Math.abs(Math.sin(g_seconds)), 0);
    leftFrontLeg.matrix.rotate(-10*Math.sin(g_seconds), 0, 0, 1);
    leftFrontLeg.matrix.translate(0, 0.3*Math.abs(Math.sin(g_seconds)), 0);
  }
  else{
    leftFrontLeg.matrix.rotate(g_leftLegsAngle, 0, 0, 1);
  }
  leftFrontFlipperMat = new Matrix4(leftFrontLeg.matrix);
  leftFrontLeg.normalMatrix.setInverseOf(leftFrontLeg.matrix).transpose();
  leftFrontLeg.render();

  var leftFrontFlipper = new Cube();
  leftFrontFlipper.color = [67/255,68/255,70/255, 1];
  leftFrontFlipper.matrix = leftFrontFlipperMat;
  leftFrontFlipper.matrix.translate(0.2, -0.2, -0.1);
  leftFrontFlipper.matrix.scale(1.2, 0.2, 1.5);
  leftFrontFlipper.matrix.translate(0.2, 1.15, 0.2);
  if(g_normalsOn) { leftFrontFlipper.textureNum = -3; }
  else { leftFrontFlipper.textureNum=-2; }
  if(g_flippersAnimation){
    leftFrontFlipper.matrix.rotate(-270*Math.abs(Math.sin(g_seconds)), 0, 0, 1);
  }
  else{
  leftFrontFlipper.matrix.rotate(g_leftFlippersAngle, 0, 0, 1);
  }
  leftFrontFlipper.normalMatrix.setInverseOf(leftFrontFlipper.matrix).transpose();
  leftFrontFlipper.render();
  
  var leftBackLeg = new Cube();
  leftBackLeg.color = [127/255,98/255,79/255, 1];
  leftBackLeg.matrix.scale(0.6, 0.4, 0.25);
  leftBackLeg.matrix.translate(-0.5, -0.5, -1.0);
  leftBackLeg.matrix.scale(0.2, .5, .4);
  if(g_normalsOn) { leftBackLeg.textureNum = -3; }
  else { leftBackLeg.textureNum=-2; }
  if(g_legsAnimation){
    leftBackLeg.matrix.translate(0, -0.1*Math.abs(Math.sin(g_seconds)), 0);
    leftBackLeg.matrix.rotate(-10*Math.sin(g_seconds), 0, 0, 1);
    leftBackLeg.matrix.translate(0, 0.3*Math.abs(Math.sin(g_seconds)), 0);
  }
  else{
    leftBackLeg.matrix.rotate(g_leftLegsAngle, 0, 0, 1);
  }
  leftBackFlipperMat = new Matrix4(leftBackLeg.matrix);
  leftBackLeg.normalMatrix.setInverseOf(leftBackLeg.matrix).transpose();
  leftBackLeg.render();

  var leftBackFlipper = new Cube();
  leftBackFlipper.color = [67/255,68/255,70/255, 1];
  leftBackFlipper.matrix = leftBackFlipperMat;
  leftBackFlipper.matrix.translate(0.2, -0.2, -0.1);
  leftBackFlipper.matrix.scale(1.2, 0.2, 1.5);
  leftBackFlipper.matrix.translate(0.2, 1.15, 0.2);
  if(g_normalsOn) { leftBackFlipper.textureNum = -3; }
  else { leftBackFlipper.textureNum=-2; }
  if(g_flippersAnimation){
    leftBackFlipper.matrix.rotate(-45*Math.abs(Math.sin(g_seconds)), 0, 0, 1);
  }
  else{
    leftBackFlipper.matrix.rotate(g_leftFlippersAngle, 0, 0, 1);
  }
  leftBackFlipper.normalMatrix.setInverseOf(leftBackFlipper.matrix).transpose();
  leftBackFlipper.render();

  var tntpedestal = new Cube();
  tntpedestal.color = [1,1,1, 1];
  tntpedestal.matrix.translate(0.2, -0.2, -0.1);
  tntpedestal.matrix.scale(1.2, 0.5, 1.2);
  tntpedestal.matrix.translate(-.75, -1, 0.4);
  tntpedestal.textureNum=-2; // change back to 1 after
  if(g_normalsOn) { tntpedestal.textureNum = -3; }
  else { tntpedestal.textureNum=-2; } // change back to 1 after
  tntpedestal.normalMatrix.setInverseOf(tntpedestal.matrix).transpose();
  tntpedestal.render();

  
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

