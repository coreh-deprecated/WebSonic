var ResourceManager = function(engine){
	var resourceManager = {};
	var loadedResources = {};
	var totalPending = 0;
	
	resourceManager.load = function(path) {
		if (loadedResources[path] !== undefined) {
			// resource already loaded or loading
			return;
		}
		
		console.log("Requesting remote resource file: " + path);
		
		var extension = path.split(".")[1];
		switch(extension) {
			case "bmp": // I don't think we'll be using BMP, but who knows?
			case "gif":
			case "png":
			case "jpeg":
			case "jpg":
				var image = document.createElement("img");
				image.onload = function() {
					var texture = engine.gfx.gl.createTexture();
					engine.gfx.gl.bindTexture( engine.gfx.gl.TEXTURE_2D, texture);
					engine.gfx.gl.texImage2D( engine.gfx.gl.TEXTURE_2D, 0,  engine.gfx.gl.RGBA, engine.gfx.gl.RGBA, engine.gfx.gl.UNSIGNED_BYTE, image);
					engine.gfx.gl.texParameteri( engine.gfx.gl.TEXTURE_2D,  engine.gfx.gl.TEXTURE_MAG_FILTER,  engine.gfx.gl.LINEAR);
					engine.gfx.gl.texParameteri( engine.gfx.gl.TEXTURE_2D,  engine.gfx.gl.TEXTURE_MIN_FILTER,  engine.gfx.gl.LINEAR);
					engine.gfx.gl.generateMipmap(engine.gfx.gl.TEXTURE_2D);
//					if (Math.floor((Math.log(image.width) / Math.log( 2 ))) != (Math.log(image.width) / Math.log( 2 ))) {
//						console.warn("Texture " + path + " is not square and/or doesn't have power of two dimensions.");
//					}
					loadedResources[path] = texture;
					totalPending--;
					console.log("Resource loaded: " + path);
				};
				totalPending++;
				image.src = path;
			break;
			case "jsonmesh":
				totalPending++;
				$.ajax({ url: path, dataType: "text", success: function(data) {
					console.log("Resource loaded: " + path);
					try {
						data = JSON.parse(data);
					} catch (e) {
						try {
							data = JSON.forgivingParse(data);
							console.warn("Falling back to non-standard JSON parsing. (Have you escaped all control characters and removed all comments?)");
						} catch (e) {
							console.error("Malformed JSON.");
							throw e;
						}
					}
					try {
						var mesh = new engine.gfx.Mesh(data);
						loadedResources[path] = mesh;
						totalPending--;	
					} catch (e) {
						console.error(e.message + e.stack)
						throw e;
					}
				} });
			break;
			case "jsonshader":
				totalPending++;
				$.ajax({ url: path, dataType: "text", success: function(data) {
					console.log("Resource loaded: " + path);
					try {
						data = JSON.parse(data);
					} catch (e) {
						try {
							data = JSON.forgivingParse(data);
							console.warn("Falling back to non-standard JSON parsing. (Have you escaped all control characters and removed all comments?)");
						} catch (e) {
							console.error("Malformed JSON.");
							throw e;
						}
					}
					try {
						var shader = new engine.gfx.Shader(data, path);
						loadedResources[path] = shader;
						totalPending--;
					} catch (e) {
						console.error(e.message + e.stack)
						throw e;
					}
				} });				
			break;
			case "jsonlevel":
				totalPending++;
				$.ajax({ url: path, dataType: "text", success: function(data) {
					console.log("Resource loaded: " + path);
					try {
						data = JSON.parse(data);
					} catch (e) {
						try {
							data = JSON.forgivingParse(data);
							console.warn("Falling back to non-standard JSON parsing. (Have you escaped all control characters and comments?)");
						} catch (e) {
							console.error("Malformed JSON.");
							throw e;
						}
					}
					try {
						var level = new engine.gfx.Level(data, path);
						loadedResources[path] = level;
						totalPending--;
					} catch (e) {
						console.error(e.message + e.stack)
						throw e;
					}
				} });
			break;
		}
		loadedResources[path] = null;
	}
	
	resourceManager.hasLoaded = function(path) {
		if (loadedResources[path]) {
			return true;
		}
		return false;
	}
	
	resourceManager.get = function(path) {
		var resource = loadedResources[path];
		if (resource === undefined) {
			throw new Error("Tried to use a resource that hasn't been requested: " + path);
		} else if (resource === null) {
			throw new Error("Tried to use a resource that hasn't finished loading: " + path);
		}
		return resource;
	}
	
	resourceManager.totalPending = function() { 
		return totalPending;
	}
	
	return resourceManager;
}