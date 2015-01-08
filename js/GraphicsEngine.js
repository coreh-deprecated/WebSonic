var GraphicsEngine = function(engine, canvas) {	
	var graphicsEngine = {};
	var gl;
	var glParams = {}//{premultipliedAlpha: false, alpha: false};
	var activeShader = null;
	
	console.log("Initializing WebGl...");
	
	// Try to initialize WebGL
	if (!(gl = canvas.getContext("webgl", glParams))) {
		// Initialization failed, try experimental mode
		if (gl = canvas.getContext("experimental-webgl", glParams)) {
			// Tell the user WebGL is running in experimental mode
			console.info("WebGL is running in experimental mode. Performance and stability may suffer.") 
		} else {
			// Experimental mode failed, WebGL not supported or disabled
			throw new Error("Could not initialize WebGL. Are you running a modern browser with WebGL enabled?");
		}
	}
	
	gl.enable(gl.DEPTH_TEST);
//	gl.enable(gl.CULL_FACE);
//	gl.cullFace(gl.FRONT);
	gl.depthFunc(gl.LESS);	
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		
	// expose the WebGL context
	graphicsEngine.gl = gl;
	
	graphicsEngine.clear = function(){
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);	
	}
	
	graphicsEngine.clearColor = function(){
		gl.clear(gl.COLOR_BUFFER_BIT);	
	}
	
	graphicsEngine.clearDepth = function(){
		gl.clear(gl.DEPTH_BUFFER_BIT);	
	}
	
	
	graphicsEngine.width = function() {
		return canvas.width;
	}
	
	graphicsEngine.height = function() {
		return canvas.height;
	}
	
	graphicsEngine.aspectRatio = function() {
		return canvas.width / canvas.height;
	}
		
	graphicsEngine.Shader = function(shaderData, shaderName) {
		var shader = {}
		
		// Compile the vertex shader
		console.log("Compiling vertex shader...");		
		var vertexShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vertexShader, shaderData.vertexShader);
		gl.compileShader(vertexShader);
	
		if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
			throw new Error("Error compiling vertex shader: " + gl.getShaderInfoLog(vertexShader));
		}
	
		// Compile the fragment shader
		console.log("Compiling fragment shader...");
		var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fragmentShader, shaderData.fragmentShader);
		gl.compileShader(fragmentShader);
	
		if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
			throw new Error("Error compiling fragment shader: " + gl.getShaderInfoLog(fragmentShader));
		}
	
		// Link the program
		console.log("Linking shader program...");
		var program = gl.createProgram();		
		gl.attachShader(program, fragmentShader);
		gl.attachShader(program, vertexShader);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			throw new Error("Error linking shader program: " + gl.getProgramInfoLog(program));
		}
	
		// Obtain uniform locations
		console.log("Extracting uniform locations...");
		var uniforms = {};
		shaderData.uniforms.forEach(function(uniform){
			uniforms[uniform] = gl.getUniformLocation(program, uniform);
			if (!uniforms[uniform]) {
				console.warn("Nonexistent or unused uniform in the description of shader " + shaderName + ": " + uniform);
			}
		});
	
		// Obtain attribute locations
		console.log("Extracting attribute locations...");
		var attributes = {};
		shaderData.attributes.forEach(function(attribute){
			attributes[attribute] = gl.getAttribLocation(program, attribute);
			if (attributes[attribute] == -1) {
				console.warn("Nonexistent or unused attribute in the description of shader " + shaderName + ": " + attribute);
			}
		});
	
		// Use the program
		shader.use = function() {
			if (activeShader != shader) {
				gl.useProgram(program);
				activeShader = shader;
//				console.log("ShaderSwap");
			}
		}
	
		// Get a uniform location
		shader.uniform = function(name) {
			if (!uniforms[name])
				throw new Error("Shader " + shaderName + " has no uniform named " + name);
			return uniforms[name];
		}		
	
		// Get an attribute location
		shader.attribute = function(name) {
			if (attributes[name] === undefined)
				throw new Error("Shader " + shaderName + " has no attribute named " + name);			
			return attributes[name];
		}
		
		shader.hasAttribute = function(name) {
			return attributes[name] != null;
		}

		shader.hasUniform = function(name) {
			return uniforms[name] != null;
		}
		return shader;
	}

	graphicsEngine.Mesh = function(meshData) {
		var mesh = {};
		var surfaces = [];
		var __uniformArray = [null];
		
		// bake the surfaces
		meshData.surfaces.forEach(function(surface){
			var bakedSurface = {};
			bakedSurface.name = surface.name;
			bakedSurface.frames = [];
			bakedSurface.shader = surface.shader;
			engine.resources.load(bakedSurface.shader);
			bakedSurface.samplers = surface.samplers;
			for (var name in bakedSurface.samplers) {
				engine.resources.load(bakedSurface.samplers[name]);
			}
			
			// No frames (single frame mode)
			if (!surface.frames) {
				// Create a single frame for baking
				surface.frames = [{normals: surface.normals, vertices: surface.vertices}];
			}
			
			// bake the frames
			console.log("Baking vertices and normals...");			
			surface.frames.forEach(function(frame){
				var bakedFrame = {};
				
				// bake the vertices
				bakedFrame.vertices = new Float32Array(frame.vertices);
				bakedFrame.vertexBuffer = gl.createBuffer();
				gl.bindBuffer(gl.ARRAY_BUFFER, bakedFrame.vertexBuffer);
				gl.bufferData(gl.ARRAY_BUFFER, bakedFrame.vertices, gl.STATIC_DRAW);
				
				// bake the normals
				bakedFrame.normals = new Float32Array(frame.normals);
				bakedFrame.normalBuffer = gl.createBuffer();
				gl.bindBuffer(gl.ARRAY_BUFFER, bakedFrame.normalBuffer);
				gl.bufferData(gl.ARRAY_BUFFER, bakedFrame.normals, gl.STATIC_DRAW);
				
				// add the newly baked frame to the surface
				bakedSurface.frames.push(bakedFrame);
			});
			
			// bake the texture coordinates
			console.log("Baking texture coordinates...");
			bakedSurface.textureCoordinates = new Float32Array(surface.textureCoordinates)
			bakedSurface.textureCoordinateBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, bakedSurface.textureCoordinateBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, bakedSurface.textureCoordinates, gl.STATIC_DRAW);
			
			// add the newly baked surface to the mesh's surface list
			surfaces.push(bakedSurface);
			surfaces[bakedSurface.name] = bakedSurface;
		});
		
		if (surfaces.length > 0) {		
			mesh.render = function(renderParams, frame) {
				for (var i = 0; i < surfaces.length; i++) {
					mesh.renderSurface(renderParams, i, frame);
				}
			}
		} else {
			mesh.render = function(renderParams, frame) {
				mesh.renderSurface(renderParams, 0, frame);
			}
		}
		
		mesh.renderSurface = function(renderParams, surfaceIndex, frame) {
			
			var uniformsList = renderParams.uniforms;
			var surface = surfaces[surfaceIndex];
			var shader = renderParams.shader ? renderParams.shader : engine.resources.get(surface.shader);
			
			shader.use();
			
			if (!renderParams.cameraView.flat) {
				renderParams.cameraView.flat = renderParams.cameraView.flatten();
			}
			gl.uniformMatrix4fv(shader.uniform("u_cameraView"), false, renderParams.cameraView.flat);
			if (!renderParams.modelView.flat) {
				renderParams.modelView.flat = renderParams.modelView.flatten();
			}
			gl.uniformMatrix4fv(shader.uniform("u_modelView"), false, renderParams.modelView.flat);
			if (!renderParams.projection.flat) {
				renderParams.projection.flat = renderParams.projection.flatten();
			}
			if (shader.hasUniform("u_projection")) {
				gl.uniformMatrix4fv(shader.uniform("u_projection"), false, renderParams.projection.flat);
			}
			
			if (shader.hasUniform("u_normalModelView")) {
				/*try {
					var normalModelViewFlat = 
						(renderParams.modelView)
							.inverse()
							.transpose()
							.flatten();
					gl.uniformMatrix4fv(
						shader.uniform("u_normalModelView"),
						false,
						normalModelViewFlat
					);
				} catch (e) {
					// We could not invert the matrix for some reason (singular?)*/
					if (!(renderParams.normalModelView.flat)) {
						renderParams.normalModelView.flat = renderParams.normalModelView.flatten();
					}
//					console.log(renderParams.normalModelView.inspect());
					gl.uniformMatrix4fv(
						shader.uniform("u_normalModelView"),
						false,
						renderParams.normalModelView.flatten()
					);
//				}
			}
			
			if (shader.hasUniform("u_normalCameraView")) {
				try {
					var normalModelViewFlat = 
						(renderParams.cameraView)
							.inverse()
							.transpose()
							.flatten();
					gl.uniformMatrix4fv(
						shader.uniform("u_normalCameraView"),
						false,
						normalModelViewFlat
					);
				} catch (e) {
					// We could not invert the matrix for some reason (singular?)
					gl.uniformMatrix4fv(
						shader.uniform("u_normalCameraView"),
						false,
						((renderParams.cameraView)).flatten()
					);
				}
			}
			
			//var textureNumber = 0;
			var unitsUsed = 0x0;
			for (var sampler in surface.samplers) {
				var texture = engine.resources.get(surface.samplers[sampler]);
				var textureUnit;
				if (unitsUsed & (1 << texture.lastUnit)) {
					textureUnit = 0;
					while(unitsUsed & (1 << textureUnit)) {
						textureUnit++;
					}
				} else {
					textureUnit = (texture.lastUnit << 0);
				}
				texture.lastUnit = textureUnit;
				unitsUsed |= (1 << textureUnit)
//				console.log(textureUnit);
				
				gl.activeTexture(gl.TEXTURE0 + textureUnit);
				gl.bindTexture(gl.TEXTURE_2D, texture);
				if (shader.hasUniform(sampler)) {
					gl.uniform1i(shader.uniform(sampler), textureUnit)
				}
				//textureNumber++;
			}
		/*	for (var sampler in surface.samplers) {
				if (textureNumber < 2) {
					gl.activeTexture(gl.TEXTURE0 + textureNumber);
					gl.bindTexture(gl.TEXTURE_2D, engine.resources.get(surface.samplers[sampler]));
					if (shader.hasUniform(sampler)) {
						gl.uniform1i(shader.uniform(sampler), textureNumber)
						console.log(textureNumber);
					}
					lastTexture = engine.resources.get(surface.samplers[sampler]);
					textureNumber+=2;
				}
			}*/	
			/*for (var sampler in surface.samplers) {
				gl.activeTexture(gl.TEXTURE0 + textureNumber);
				gl.bindTexture(gl.TEXTURE_2D, engine.resources.get(surface.samplers[sampler]));
				if (shader.hasUniform(sampler)) {
					gl.uniform1i(shader.uniform(sampler), textureNumber)
				}
				lastTexture = engine.resources.get(surface.samplers[sampler]);
				textureNumber++;
			}*/			
			
			//gl.activeTexture(gl.TEXTURE0 + textureNumber);
			//gl.bindTexture(gl.TEXTURE_2D, lastTexture);
			//if (shader.hasUniform("u_diffuseMap")) {
			//	gl.uniform1i(shader.uniform("u_diffuseMap"), textureNumber)
			//}
			//textureNumber++;
			
			/*			
			gl.activeTexture(gl.TEXTURE0 + textureNumber);
			gl.bindTexture(gl.TEXTURE_2D, lastTexture);
			gl.uniform1i(shader.uniform("u_diffuseMap"), textureNumber)
			textureNumber++;*/
			
			
			//if (uniforms) {
				//if (!(uniforms instanceof Array)) {
				//	__uniformArray[0] = uniforms;
				//	uniforms = __uniformArray;
				//}
				for (var uniformsListIndex in uniformsList) {
					var uniforms = uniformsList[uniformsListIndex];
					for (var uniformName in uniforms) {
						var uniform = uniforms[uniformName];
						if (!shader.hasUniform(uniformName))
							continue;
						switch(true) {
							case uniform instanceof Matrix:
								//if (!uniform.isSquare()) {
								//	throw new Error("Uniform matrix " + uniformName + " is not square.");
								//}
								//if (uniform.rows() > 4) {
								//	throw new Error("Uniform matrix " + uniformName + " is too large.");
								//}
								if (!uniform.flat) {
									uniform.flat = uniform.flatten();
								}
								gl["uniformMatrix"+uniform.elements.length+"fv"](shader.uniform(uniformName), false, uniform.flat);
							break;
							case uniform instanceof Vector:
								//if (uniform.dimensions() > 4) {
								//	throw new Error("Uniform vector " + uniformName + " is too large.");
								//}
								if (!uniform.flat) {
									uniform.flat = uniform.flatten();
								}			
								gl["uniform"+uniform.elements.length+"fv"](shader.uniform(uniformName), uniform.flat);
							break;					
							case (typeof uniform) == "number" || uniform instanceof Number:
								gl.uniform1f(shader.uniform(uniformName), uniform);
							break;
							default:
								if (!uniform)
									break;
								var textureUnit;
								if (unitsUsed & (1 << uniform.lastUnit)) {
									textureUnit = 0;
									while(unitsUsed & (1 << textureUnit)) {
										textureUnit++;
									}
								} else {
									textureUnit = (uniform.lastUnit << 0);
								}
								uniform.lastUnit = textureUnit;
								unitsUsed |= (1 << textureUnit)

								gl.activeTexture(gl.TEXTURE0 + textureUnit);
								gl.bindTexture(gl.TEXTURE_2D, uniform);
								gl.uniform1i(shader.uniform(uniformName), textureUnit)
							break;
						}
					}
				};
			//	console.log(textureNumber);
			//}
			
			gl.bindBuffer(gl.ARRAY_BUFFER, surface.frames[frame].vertexBuffer);
			gl.enableVertexAttribArray(shader.attribute("a_position"));
			gl.vertexAttribPointer(shader.attribute("a_position"), 3, gl.FLOAT, false, 0, 0);
			
			if (shader.hasAttribute("a_normal")) {
				gl.bindBuffer(gl.ARRAY_BUFFER, surface.frames[frame].normalBuffer);
				gl.enableVertexAttribArray(shader.attribute("a_normal"));			
				gl.vertexAttribPointer(shader.attribute("a_normal"), 3, gl.FLOAT, false, 0, 0);
			}
			
			if (shader.hasAttribute("a_texCoords")) {
				gl.bindBuffer(gl.ARRAY_BUFFER, surface.textureCoordinateBuffer);
				gl.vertexAttribPointer(shader.attribute("a_texCoords"), 2, gl.FLOAT, false, 0, 0);
				gl.enableVertexAttribArray(shader.attribute("a_texCoords"));
			}
			
			gl.drawArrays(gl.TRIANGLES, 0, surface.frames[frame].vertices.length / 3);
			
			/*for (var i = 0; i < textureNumber; i++) {
				gl.activeTexture(gl.TEXTURE0 + i);
				gl.bindTexture(gl.TEXTURE_2D, null);
			}*/
			
//			gl.flush();
		}
		
		mesh.rayIntersect = function(surfaceIndex, point, direction, maxDist, minDist) {
			var Ox = point.elements[0]; // Point
			var Oy = point.elements[1];
			var Oz = point.elements[2];
			var Dx = direction.elements[0]; // Direction
			var Dy = direction.elements[1];
			var Dz = direction.elements[2];
			var surface = surfaces[surfaceIndex];
			var vertices = surface.frames[0].vertices;
			var numVertices = vertices.length;
			var closestIntersect = Infinity;
			var closestNx = Infinity;
			var closestNy = Infinity;
			var closestNz = Infinity;			
			for (var i = 0; i < numVertices; i+= 9) {
				var Ax = vertices[i]; // Vertex A
				var Ay = vertices[i+1];
				var Az = vertices[i+2];
				var Bx = vertices[i+3]; // Vertex B
				var By = vertices[i+4];
				var Bz = vertices[i+5];
				var Cx = vertices[i+6]; // Vertex C
				var Cy = vertices[i+7];
				var Cz = vertices[i+8];
				var ABx = Bx - Ax; // B - A
				var ABy = By - Ay;
				var ABz = Bz - Az;
				var ACx = Cx - Ax; // C - A
				var ACy = Cy - Ay;
				var ACz = Cz - Az;
				var Nx = -((ABy * ACz) - (ABz * ACy));	// Triangle Normal (Cross Product)
				var Ny = ((ABx * ACz) - (ABz * ACx));
				var Nz = -((ABx * ACy) - (ABy * ACx));
				var lowerDot = Dx * Nx + Dy * Ny + Dz * Nz;
				if (lowerDot >= 0) {
					continue;
				}
				var AOx = Ox - Ax; // O - A
				var AOy = Oy - Ay;
				var AOz = Oz - Az;
				var upperDot = AOx * Nx + AOy * Ny + AOz * Nz; // Point - Plane Distance				
				var distance = -(upperDot/lowerDot);
				var Px, Py, Pz; // Point of intersection with the triangle plane
				var u, v; // Barycentric coordinates (w is implied)
				
				if (distance > maxDist) {	// No need to find a collision this far
					continue;
				}
				if (distance < minDist) {	// No need to find a collision this close
					continue;
				}
				if (distance > closestIntersect) { // No need to find a collision further
					continue;
				}
				
				// Figure out the dominant axis of the triangle normal
				var absNx = Nx > 0? Nx : -Nx;
				var absNy = Ny > 0? Ny : -Ny;
				var absNz = Nz > 0? Nz : -Nz;
				if (absNx > absNy) {
					if (absNx > absNz) {
						// x is the dominant normal axis
						Py = (Oy + distance * Dy) - Ay;
						Pz = (Oz + distance * Dz) - Az;
						u = (Pz*ACy - Py*ACz) / (ABz * ACy - ABy * ACz);
						if (u < 0) {
							continue;
						}
						v = (Pz*ABy - Py*ABz) / (ACz * ABy - ACy * ABz);
					} else {
						// z is the dominant normal axis
						Px = (Ox + distance * Dx) - Ax;
						Py = (Oy + distance * Dy) - Ay;
						u = (Py*ACx - Px*ACy) / (ABy * ACx - ABx * ACy);
						if (u < 0) {
							continue;
						}
						v = (Py*ABx - Px*ABy) / (ACy * ABx - ACx * ABy);
					}
				} else {
					if (absNy > absNz) {
						// y is the dominant axis
						Px = (Ox + distance * Dx) - Ax;
						Pz = (Oz + distance * Dz) - Az;
						u = (Pz*ACx - Px*ACz) / (ABz * ACx - ABx * ACz);
						if (u < 0) {
							continue;
						}
						v = (Pz*ABx - Px*ABz) / (ACz * ABx - ACx * ABz);
					} else {
						// z is the dominant axis
						Px = (Ox + distance * Dx) - Ax;
						Py = (Oy + distance * Dy) - Ay;
						u = (Py*ACx - Px*ACy) / (ABy * ACx - ABx * ACy);
						if (u < 0) {
							continue;
						}
						v = (Py*ABx - Px*ABy) / (ACy * ABx - ACx * ABy);
					}
				}
			
				if (v < 0) {
					continue;
				}
				if (u + v > 1) {
					continue;
				}
				// We are inside the triangle
				closestIntersect = distance;
				closestNx = Nx;
				closestNy = Ny;
				closestNz = Nz;
								
				// For some reason, this line of code is required for the function
				// to work on TraceMonkey (!)
				window.moreMagic = true;
			}

			return {distance: closestIntersect, normal: $V([closestNx, closestNy, closestNz])};
		}
		
		return mesh;
	}
	
	graphicsEngine.Level = function(levelData) {
		var scaleFactor = 128.0;
		var scaleMatrix = $V([scaleFactor, scaleFactor, scaleFactor, 1.0]).toDiagonalMatrix();
		var level = {}
		engine.resources.load(levelData.mesh);
		var shadowMap = null;
		var size =  $V([levelData.data[0][0].length * scaleFactor,
			levelData.data.length * scaleFactor,
			levelData.data[0].length * scaleFactor]);
		
		var generateShadowMap = function() {
			var LIGHTMAP_WIDTH = 128;
			var LIGHTMAP_HEIGHT = 128;
			var canvas = document.createElement("canvas");
			canvas.width = LIGHTMAP_WIDTH;
			canvas.height = LIGHTMAP_HEIGHT;
			var height = size.elements[1];
			var depth = size.elements[2];
			var width = size.elements[0];
			var context = canvas.getContext("2d");
			context.fillStyle = "white";
			context.fillRect(0,0,LIGHTMAP_WIDTH,LIGHTMAP_HEIGHT);
			for (var x = 0; x < LIGHTMAP_WIDTH; x++) {
				for (var z = 0; z < LIGHTMAP_HEIGHT; z++) {
					var targetX = width * (x) / LIGHTMAP_WIDTH;
					var targetZ = depth * (z) / LIGHTMAP_HEIGHT;
					var intersect = level.rayIntersect($V([targetX,height,targetZ]), $V([0,-1,0]), height, 0);
					if (isFinite(intersect.distance)) {
						context.fillStyle = "rgba(0,0,0," + (intersect.distance / height) + ")"
					} else {
						context.fillStyle = "rgba(0,0,0,1.0)"						
					}
					context.fillRect(x, z, 1, 1);
				}				
			}
//			document.body.appendChild(canvas);
//			canvas.style.position = "absolute";
//			canvas.style.top = "0";
//			canvas.style.left = "0";
			
			shadowMap = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, shadowMap);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		}
		
		level.render = function(renderParams, cameraCenter) {
			//console.log(renderParams.modelView.eql(Matrix.I(4)));
			if (!shadowMap)
				generateShadowMap();
//			renderParams.uniforms.push({ 
//				u_lightMap: lightMap,
//				u_levelSize: size
//			});
			var mesh = engine.resources.get(levelData.mesh);
			var modelView = renderParams.modelView;
			var minX = Math.floor(cameraCenter.elements[0] / scaleFactor) - 6;
			var minY = Math.floor(cameraCenter.elements[1] / scaleFactor) - 2;
			var minZ = Math.floor(cameraCenter.elements[2] / scaleFactor) - 6;		
			var maxX = minX + 12;
			var maxY = minY + 5;
			var maxZ = minZ + 12;			
			for (var y = minY; y < maxY; y ++) {
				if (levelData.data[y] === undefined) continue;
				for (var z = minZ; z < maxZ; z ++) {
					if (levelData.data[y][z] === undefined) continue;
					for (var x = minX; x < maxX; x ++) {
						if (levelData.data[y][z][x] === undefined) continue;
						if (levelData.data[y][z][x] !== null) {
							renderParams.modelView = modelView.x(scaleMatrix).x(Matrix.Translation($V([x,y,z])));
							mesh.renderSurface(renderParams, levelData.data[y][z][x], 0);
						}
					}
				}	
			}
//			renderParams.uniforms.pop();
		}
		
		level.levelSize = function() {
			return size;
		}
		
		level.shadowMap = function() {
			return shadowMap;
		}
		
		level.rayIntersect = function(point, direction, maxDist, minDist) {
			var mesh = engine.resources.get(levelData.mesh);
			var Px = Math.floor(point.elements[0] / scaleFactor);
			var Py = Math.floor(point.elements[1] / scaleFactor);
			var Pz = Math.floor(point.elements[2] / scaleFactor);
			var P2x = Math.floor((point.elements[0] + direction.elements[0] * maxDist) / scaleFactor);
			var P2y = Math.floor((point.elements[1] + direction.elements[1] * maxDist) / scaleFactor);
			var P2z = Math.floor((point.elements[2] + direction.elements[2] * maxDist) / scaleFactor);
			if (P2x < Px) { 
				var tmp = P2x;
				P2x = Px;
				Px = tmp;
			}
			if (P2y < Py) { 
				var tmp = P2y;
				P2y = Py;
				Py = tmp;
			}
			if (P2z < Pz) { 
				var tmp = P2z;
				P2z = Pz;
				Pz = tmp;
			}
			
			var numNeighboors = Math.ceil(maxDist/scaleFactor);
			var closestIntersect = Infinity;
			var closestResult = {distance: Infinity, normal: $V([Infinity, Infinity, Infinity])};;
			for (var y = Py; y <= P2y; y++) {
				if (levelData.data[y]) {
					for (var z = Pz; z <= P2z; z++) {
						if (levelData.data[y][z]) {
							for (var x = Px; x <= P2x; x++) {
								var surfaceIndex = levelData.data[y][z][x];
								if (surfaceIndex != null) {
									var intersect = mesh.rayIntersect(surfaceIndex, $V([point.elements[0]/scaleFactor - x, point.elements[1]/scaleFactor - y, point.elements[2]/scaleFactor - z]), direction, maxDist/scaleFactor, minDist/scaleFactor)
									if (intersect.distance < closestIntersect) {
										closestResult = intersect;
									}
								}
							}
						}
					}
				}
			}
			closestResult.distance *= scaleFactor;
			return closestResult;
		}
		
		return level;
	}
	
	graphicsEngine.RenderTarget = function(width, height){
		var renderTarget = {}
		var framebuffer;
		var target;
		var depth;
		var autoSize;
		                   
	  	var createFrameBuffer = function(width, height) {
			framebuffer = gl.createFramebuffer();
			gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

			target = gl.createTexture();	
			gl.bindTexture(gl.TEXTURE_2D, target);		
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	//		gl.generateMipmap(gl.TEXTURE_2D);
	//		var textureStorage = new Int8Array(width * height * 4);		
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);		
		
			depth = gl.createRenderbuffer();
			gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
			gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
		
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target, 0);
			gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);		
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);	
			gl.bindTexture(gl.TEXTURE_2D, null);
			gl.bindRenderbuffer(gl.RENDERBUFFER, null);
		}
		
		if (width !== undefined) {
			createFrameBuffer(width, height);
			autoSize = false;
		} else {
			autoSize = true;
		}
			
		renderTarget.activate = function() {
			if (autoSize) {
				if (width != canvas.width || height != canvas.height) {
					createFrameBuffer(canvas.width, canvas.height);
					width = canvas.width;
					height = canvas.height;
				}
			}
			gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
			gl.viewport(0, 0, width, height);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
		}
		
		renderTarget.deactivate = function() {
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.viewport(0, 0, canvas.width, canvas.height);
		}
		
		renderTarget.texture = function() {
			return target;
		}
		
		var vertices = null, texCoords, vertexBuffer, texCoordsBuffer, shader;
		
		renderTarget.renderToScreen = function() {
			if (!vertices) {
				vertices = new Float32Array(
					[-1.0, -1.0, 0.0,
					 -1.0, 1.0, 0.0,
					 1.0, -1.0, 0.0,
				
					 1.0, 1.0, 0.0,
					 -1.0, 1.0, 0.0,
					 1.0, -1.0, 0.0
					]);
				texCoords = new Float32Array(
					[0.0, 0.0,
					 0.0, 1.0,
					 1.0, 0.0,
	 	 	   	1.0, 1.0,
					 0.0, 1.0,
					 1.0, 0.0
					]);
				
				vertexBuffer = gl.createBuffer();
				gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
				gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

				texCoordsBuffer = gl.createBuffer();
				gl.bindBuffer(gl.ARRAY_BUFFER, texCoordsBuffer);
				gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
			
				shader = engine.resources.get("shader/glow.jsonshader");
			}
			
			shader.use();
			
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, target);
			gl.uniform1i(shader.uniform("u_image"), 0);
			
			gl.bindBuffer(gl.ARRAY_BUFFER, texCoordsBuffer);
			gl.vertexAttribPointer(shader.attribute("a_texCoords"), 2, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(shader.attribute("a_texCoords"));
			
			gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
			gl.vertexAttribPointer(shader.attribute("a_position"), 3, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(shader.attribute("a_position"));
			
			gl.drawArrays(gl.TRIANGLES, 0, 6);			
		}  
		
		renderTarget.aspectRatio = function() {
			return width / height;
		}
		
		return renderTarget;
	}
	
	return graphicsEngine;
}