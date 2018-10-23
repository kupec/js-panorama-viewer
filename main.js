const scope = {
	N: 1000,
	horizontalAngle: 0,
	verticalAngle: 0,
	hov: 45,
};

start();

function start() {
	const gl = window.canvas.getContext('webgl');
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);

	const vsSource = `
    attribute vec2 aVertexPosition;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    varying highp vec2 vTextureCoord;

		#define PI 3.14

    void main() {
			float phi = aVertexPosition.x;
			float theta = aVertexPosition.y;
			float x = cos(phi) * cos(theta);
			float y = sin(theta);
			float z = sin(phi) * cos(theta);
			vec4 pos = vec4(x, y, z, 1.0);
			gl_Position = uProjectionMatrix * uModelViewMatrix * pos;

			vTextureCoord = vec2(phi / 2.0 / PI, 0.5 - theta / PI);
    }
  `;

  // Fragment shader program

  const fsSource = `
    precision mediump float;

    uniform sampler2D uSampler;
    varying highp vec2 vTextureCoord;

    void main() {
			gl_FragColor = texture2D(uSampler, vTextureCoord);
    }
  `;

  const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

  const programInfo = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
      modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
      uSampler: gl.getUniformLocation(shaderProgram, 'uSampler_'),
    },
  };

  // Here's where we call the routine that builds all the
  // objects we'll be drawing.
  const buffers = initBuffers(gl);

	const texture = loadTexture(gl, 'pano.jpg');

	scope.startTime = Date.now();

  function render() {
	  requestAnimationFrame(render);
		drawScene(gl, programInfo, buffers, texture);
  }
	render();

	listenEvents();
}

function listenEvents() {
	window.addEventListener('keydown', event => {
		if (event.key === 'ArrowLeft')
			increaseHorizontalAngle(-0.05);
		if (event.key === 'ArrowRight')
			increaseHorizontalAngle(0.05);
		if (event.key === 'ArrowUp')
			increaseVerticalAngle(0.05);
		if (event.key === 'ArrowDown')
			increaseVerticalAngle(-0.05);
		if (event.key === '+')
			increaseHOV(-1);
		if (event.key === '-')
			increaseHOV(1);
	});
}

function increaseHorizontalAngle(inc) {
	scope.horizontalAngle = (scope.horizontalAngle + inc) % (2*Math.PI);
}
function increaseVerticalAngle(inc) {
	scope.verticalAngle = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, scope.verticalAngle + inc));
}
function increaseHOV(inc) {
	scope.hov = Math.max(15, Math.min(90, scope.hov + inc));
}
//
// initBuffers
//
// Initialize the buffers we'll need. For this demo, we just
// have one object -- a simple two-dimensional square.
//
function initBuffers(gl) {

  // Create a buffer for the square's positions.

  const positionBuffer = gl.createBuffer();

  // Select the positionBuffer as the one to apply buffer
  // operations to from here out.

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // Now create an array of positions for the square.

  const positions = [
  ];

  const I = scope.N;
  const J = scope.N;
	const {sin, cos} = Math;

  for (let i = 0; i < I; i++)
  for (let j = 0; j < J; j++)
  {
	const phi = x => x / I * Math.PI * 2;
	const theta = x => x / J * Math.PI - Math.PI/2;
//	const X = (p, t) => cos(phi(p)) * cos(theta(t));
//	const Y = (p, t) => sin(phi(p)) * cos(theta(t));
//	const Z = (p, t) => sin(theta(t));
	const pushPoint = (p, t) => {
		//positions.push(X(p, t), Y(p, t), Z(p, t));
		positions.push(phi(p), theta(t));
	};

	pushPoint(i, j);
	pushPoint(i+1, j+1);
	pushPoint(i+1, j);
	pushPoint(i, j);
	pushPoint(i, j+1);
	pushPoint(i+1, j+1);
  }

  // Now pass the list of positions into WebGL to build the
  // shape. We do this by creating a Float32Array from the
  // JavaScript array, then use it to fill the current buffer.

  gl.bufferData(gl.ARRAY_BUFFER,
                new Float32Array(positions),
                gl.STATIC_DRAW);

  return {
    position: positionBuffer,
  };
}

//
// Draw the scene.
//
function drawScene(gl, programInfo, buffers, texture) {
  gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
  gl.clearDepth(1.0);                 // Clear everything
  gl.enable(gl.DEPTH_TEST);           // Enable depth testing
  gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

  // Clear the canvas before we start drawing on it.

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Create a perspective matrix, a special matrix that is
  // used to simulate the distortion of perspective in a camera.
  // Our field of view is 45 degrees, with a width/height
  // ratio that matches the display size of the canvas
  // and we only want to see objects between 0.1 units
  // and 100 units away from the camera.

  const fieldOfView = scope.hov * Math.PI / 180;   // in radians
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const zNear = 0.1;
  const zFar = 100.0;
  const projectionMatrix = mat4.create();

  // note: glmatrix.js always has the first argument
  // as the destination to receive the result.
  mat4.perspective(projectionMatrix,
                   fieldOfView,
                   aspect,
                   zNear,
                   zFar);

  // Set the drawing position to the "identity" point, which is
  // the center of the scene.
  const modelViewMatrix = mat4.create();
	mat4.rotate(modelViewMatrix, modelViewMatrix, scope.verticalAngle, vec3.fromValues(-1, 0, 0));
	mat4.rotate(modelViewMatrix, modelViewMatrix, scope.horizontalAngle, vec3.fromValues(0, 1, 0));
 

  // Now move the drawing position a bit to where we want to
  // start drawing the square.

  //mat4.translate(modelViewMatrix,     // destination matrix
    //             modelViewMatrix,     // matrix to translate
      //           [-0.0, 0.0, -3.0]);  // amount to translate

  // Tell WebGL how to pull out the positions from the position
  // buffer into the vertexPosition attribute.
  {
    const numComponents = 2;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        numComponents,
        type,
        normalize,
        stride,
        offset);
    gl.enableVertexAttribArray(
        programInfo.attribLocations.vertexPosition);
  }

  // Tell WebGL to use our program when drawing

  gl.useProgram(programInfo.program);

  // Set the shader uniforms

  gl.uniformMatrix4fv(
      programInfo.uniformLocations.projectionMatrix,
      false,
      projectionMatrix);
  gl.uniformMatrix4fv(
      programInfo.uniformLocations.modelViewMatrix,
      false,
      modelViewMatrix);

// Tell WebGL we want to affect texture unit 0
  gl.activeTexture(gl.TEXTURE0);

  // Bind the texture to texture unit 0
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Tell the shader we bound the texture to texture unit 0
  gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

  {
    const offset = 0;
    const vertexCount = 3 * 2 * scope.N * scope.N;
    gl.drawArrays(gl.TRIANGLES, offset, vertexCount);
  }
}

//
// Initialize a shader program, so WebGL knows how to draw our data
//
function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  // Create the shader program

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    return null;
  }

  return shaderProgram;
}

//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(gl, type, source) {
  const shader = gl.createShader(type);

  // Send the source to the shader object

  gl.shaderSource(shader, source);

  // Compile the shader program

  gl.compileShader(shader);

  // See if it compiled successfully

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function loadTexture(gl, url) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Because images have to be download over the internet
  // they might take a moment until they are ready.
  // Until then put a single pixel in the texture so we can
  // use it immediately. When the image has finished downloading
  // we'll update the texture with the contents of the image.
  const level = 0;
  const internalFormat = gl.RGBA;
  const width = 1;
  const height = 1;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
  const pixel = new Uint8Array([0, 255, 255, 255]);  // opaque blue
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                width, height, border, srcFormat, srcType,
                pixel);

  const image = new Image();
  image.onload = function() {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                  srcFormat, srcType, image);

    // WebGL1 has different requirements for power of 2 images
    // vs non power of 2 images so check if the image is a
    // power of 2 in both dimensions.
    if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
       // Yes, it's a power of 2. Generate mips.
       gl.generateMipmap(gl.TEXTURE_2D);
    } else {
       // No, it's not a power of 2. Turn of mips and set
       // wrapping to clamp to edge
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  };
  image.src = url;

  return texture;
}

function isPowerOf2(value) {
  return (value & (value - 1)) == 0;
}
