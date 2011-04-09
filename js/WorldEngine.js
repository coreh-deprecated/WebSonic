var WorldEngine = function(engine) {
	var worldEngine = {}
	var gameTime = 0.0;
	var realTime = 0.0;
	var timeDelta;
	var TARGET_FPS = 60;
	var MIN_FPS = 2;
	var SUBSTEPS_PER_FRAME = 1;
	var BUCKET_WIDTH = 128.0;
	
	var stepCount = 0;
	var entities = [];
	var cameras = [];
	var buckets = {};
	var fps = 0.0;
	var removalFlag = false;
	
	var uniforms = 
		{ u_lightColor: $V([1.0,1.0,1.0,1.0]),
			u_lightDirection: $V([-0.05, 1, -0.1]).toUnitVector(),
			u_ambientLightColor: $V([0.2,0.2,0.25,1.0])};
			
	var calculateBucketId = function(position) {
		return [Math.floor(position.elements[0]/BUCKET_WIDTH), Math.floor(position.elements[1]/BUCKET_WIDTH), Math.floor(position.elements[2]/BUCKET_WIDTH)].toString();
	}
	
	worldEngine.uniforms = function(value) {
		if (value !== undefined) {
			uniforms = value;
		}
		return uniforms;
	}
	
	worldEngine.update = function() {
		var newRealTime = new Date().getTime() * 0.001;
		timeDelta = newRealTime - realTime;
		if (timeDelta > 1.0/MIN_FPS) {
			timeDelta = 1.0/MIN_FPS;
		}
		
		timeDelta *= 1.0;
		
		var substeps;
		if (timeDelta > 1.0/TARGET_FPS) {
			substeps = Math.ceil(timeDelta / (1.0/TARGET_FPS)) * SUBSTEPS_PER_FRAME;
		} else {
			substeps = SUBSTEPS_PER_FRAME;
		}

		fps = fps * 0.9 + (1/timeDelta) * 0.1;
					
		for (var i = 0; i < substeps; i++) {
			gameTime += timeDelta / substeps;
			
			uniforms.u_time = gameTime;
		
			removalFlag = false;
			for (var j = 0; j < entities.length; j++) {
				entities[j].update(timeDelta / substeps);
				if (removalFlag) {
					j--;
					removalFlag = false;
				}
			};
			
			cameras.forEach(function(camera) {
				var cameraCenter = camera.modelView().x($V([0,0,-4*BUCKET_WIDTH,1.0]));
				var xmin = Math.floor(cameraCenter.elements[0] / BUCKET_WIDTH) - 3;
				var ymin = Math.floor(cameraCenter.elements[1] / BUCKET_WIDTH) - 6;
				var zmin = Math.floor(cameraCenter.elements[2] / BUCKET_WIDTH) - 3;
				var xmax = xmin + 6;
				var ymax = ymin + 15;
				var zmax = zmin + 6;
				for (var x = xmin; x <= xmax; x++) {
					for (var y = ymin; y <= ymax; y++) {
						for (var z = zmin; z <= zmax; z++) {
							var bucket = buckets[[x,y,z]];
							if (bucket) {
								for (var j = 0; j < bucket.length; j++) {
									if (bucket[j].lastStep != stepCount) {
										bucket[j].lastStep = stepCount;
										bucket[j].update(timeDelta / substeps);
									}
									if (!removalFlag) {
										var entity = bucket[j];
										var newBucketId = calculateBucketId(entity.position());
										if (entity.bucketId != newBucketId) {
											// Entity is changing bucket
											worldEngine.remove(entity);
											worldEngine.add(entity);
										}
									}
									if (removalFlag) {
										j--;
										removalFlag = false;
									}
								}
							}
						}
					}
				}
			});
		
			engine.input.resetPressed();
			stepCount++;
		}
		realTime = newRealTime;
	}
	
	var shadowMapTarget = null;
	var shadowMapPosition = null;
	var renderShadows = function(camera) {
		var SHADOW_MAP_HEIGHT = 512;
		var SHADOW_MAP_WIDTH = 512;
		engine.gfx.clear();
		if (!shadowMapTarget) {
			shadowMapTarget = new engine.gfx.RenderTarget(SHADOW_MAP_WIDTH, SHADOW_MAP_HEIGHT);
		}
		shadowMapTarget.activate();
		shadowMapPosition = camera.modelView().x($V([0,0,-300,1.0])).xyz();
		var oldCameraPosition = camera.position();
		var oldCameraRotation = camera.rotation();
		camera.position(shadowMapPosition.add($V([0,550,0])));
		camera.rotation(Matrix.RotationX(-Math.PI/1.99).ensure4x4());
		var renderParams = {
			camera: camera,
			projection: camera.projection(shadowMapTarget.aspectRatio()),
			projectionFlat: camera.projection(shadowMapTarget.aspectRatio()).flatten(),
			cameraView: camera.modelView().inverse(),
			cameraViewFlat: camera.modelView().inverse().flatten(),
			uniforms: [uniforms],
			shader: engine.resources.get("shader/depth.jsonshader") 
		}		
		removalFlag = false;
		for (var i = 0; i < entities.length; i++) {
			if (entities[i].castsShadows) {
				entities[i].render(renderParams);//inversedCameraModelView);
				if (removalFlag) {
					i--;
					removalFlag = false;
				}
			}
		}
		var cameraCenter = camera.modelView().x($V([0,0,-4*BUCKET_WIDTH,1.0]));
		var xmin = Math.floor(cameraCenter.elements[0] / BUCKET_WIDTH) - 3;
		var ymin = Math.floor(cameraCenter.elements[1] / BUCKET_WIDTH) - 3;
		var zmin = Math.floor(cameraCenter.elements[2] / BUCKET_WIDTH) - 3;
		var xmax = xmin + 6;
		var ymax = ymin + 5;
		var zmax = zmin + 6;
		for (var x = xmin; x <= xmax; x++) {
			for (var y = ymin; y <= ymax; y++) {
				for (var z = zmin; z <= zmax; z++) {
					var bucket = buckets[[x,y,z]];
					if (bucket) {
						for (var i = 0; i < bucket.length; i++) {
							if (bucket[i].castsShadows) {
								bucket[i].render(renderParams);
								if (removalFlag) {
									i--;
									removalFlag = false;
								}
							}
						}
					}
				}
			}
		}
		
		camera.position(oldCameraPosition);
		camera.rotation(oldCameraRotation);
		
		shadowMapTarget.deactivate();
	}

	var colorTarget = null;
	worldEngine.render = function() {
		if (!colorTarget) {
			colorTarget = new engine.gfx.RenderTarget();
		}

		cameras.forEach(function(camera) {
			renderShadows(camera);
//			colorTarget.activate();
//			engine.gfx.gl.clearColor(40/256.0,124/256.0,235/256.0,1.0);
			engine.gfx.clear();
			engine.gfx.gl.clearColor(0.0, 0.0, 0.0, 0.0);
			uniforms.u_dynamicShadowMap = shadowMapTarget.texture();
			uniforms.u_dynamicShadowMapPosition = shadowMapPosition;
			var renderParams = {
				camera: camera,
				projection: camera.projection(colorTarget.aspectRatio()),
				projectionFlat: camera.projection(colorTarget.aspectRatio()).flatten(),
				cameraView: camera.modelView().inverse(),
				cameraViewFlat: camera.modelView().inverse().flatten(),
				uniforms: [uniforms],
//				shader: engine.resources.get("shader/depth.jsonshader")
			};
			removalFlag = false;
			var renderList = [];

			for (var i = 0; i < entities.length; i++) {
				renderList.push(entities[i]);
				//entities[i].render(renderParams);//inversedCameraModelView);
				if (removalFlag) {
					i--;
					removalFlag = false;
				}
			}
			var cameraCenter = camera.modelView().x($V([0,0,-4*BUCKET_WIDTH,1.0]));
			var xmin = Math.floor(cameraCenter.elements[0] / BUCKET_WIDTH) - 3;
			var ymin = Math.floor(cameraCenter.elements[1] / BUCKET_WIDTH) - 3;
			var zmin = Math.floor(cameraCenter.elements[2] / BUCKET_WIDTH) - 3;
			var xmax = xmin + 6;
			var ymax = ymin + 5;
			var zmax = zmin + 6;
			for (var x = xmin; x <= xmax; x++) {
				for (var y = ymin; y <= ymax; y++) {
					for (var z = zmin; z <= zmax; z++) {
						var bucket = buckets[[x,y,z]];
						if (bucket) {
							for (var i = 0; i < bucket.length; i++) {
								renderList.push(bucket[i]);
								//bucket[i].render(renderParams);
								if (removalFlag) {
									i--;
									removalFlag = false;
								}								
							}
						}
					}
				}
			}

			renderList.sort(function(a,b){
				if (!a.layer)
					a.layer = 0;
				if (!b.layer)
					b.layer = 0;
				return a.layer - b.layer;
			})

			if (renderList.length > 0) {
				var lastLayer = renderList[0].layer;
				for (var i in renderList) {
					if (lastLayer != renderList[i].layer) {
						engine.gfx.clearDepth();
						lastLayer = renderList[i].layer;
					}
					renderList[i].render(renderParams);
				}
			}

//			colorTarget.deactivate();	
//			engine.gfx.clear();		
//			colorTarget.renderToScreen();

			engine.gfx.gl.finish();
		});
	}
	
	worldEngine.time = function() {
		return gameTime;
	}
	
	worldEngine.add = function(entity) {
		if (!entity.isStatic) {
			entities.push(entity);	
			if (entity.isCamera) {
				cameras.push(entity);
			}
		} else {
			var position = entity.position();
			var bucketId = calculateBucketId(position);
			if (!buckets[bucketId]) {
				buckets[bucketId] = [];
			}
			buckets[bucketId].push(entity);
			entity.bucketId = bucketId;
		}
	}
	
	worldEngine.remove = function(entity) {
		var i;
		if (!entity.isStatic) {
			for (i in entities) {
				if (entities[i] === entity) {
					break;
				}
			}
			entities.splice(i, 1);
		} else {
			bucket = buckets[entity.bucketId];
			for (i in bucket) {
				if (bucket[i] === entity) {
					break;
				}
			}		
			bucket.splice(i, 1);
			removalFlag = true;
		}
	}
	
	worldEngine.Entity = function() {
		
		var entity = {};
		var position = $V([0, 0, 0]);
		var rotation = Matrix.I(4);
		var scale = $V([1, 1, 1]);
		var modelView = null;
		var normalModelView = null;

		var computeModelView = function() {
			modelView = Matrix.Translation(position)
				.x(rotation)
				.x(scale.toDiagonalMatrix().ensure4x4());
			normalModelView = null;
		}
		
		var computeNormalModelView = function() {
			normalModelView = modelView.inverse().transpose();
		}
		
		entity.isEntity = true;
		entity.position = function(value) {
			if (value !== undefined) {
				position = value;
				modelView = null;
			}
			return position;
		}

		entity.rotation = function(value) {
			if (value !== undefined && value != null) {
				rotation = value;
				modelView = null;
			}
			return rotation;
		}

		entity.scale = function(value) {
			if (value !== undefined) {
				scale = value;
				modelView = null;
			}
			return scale;
		}

		entity.modelView = function() {
			if (modelView === null) {
				computeModelView();
			}
			return modelView;
		}
		
		entity.normalModelView = function() {
			if (modelView === null) {
				computeModelView();
				computeNormalModelView();
				return normalModelView;
			}
			if (normalModelView === null) {
				computeNormalModelView();
			}
			return entity.modelView().inverse().transpose();	
		}
		
		entity.render = function(projection, inversedCameraModelView) {
		}
		
		entity.update = function(timeDelta) {
		}
		
		return entity;
	}
	
	worldEngine.Camera = function() {
		
		var camera = worldEngine.Entity();
		
		var fov = 45;
		var minZ = 50;
		var maxZ = 5000;
		
		camera.isCamera = true;
		camera.fov = function(value) {
			if (value !== undefined) {
				fov = value;
				projection = null;
			}
			return fov;
		}

		camera.minZ = function(value) {
			if (value !== undefined) {
				minZ = value;
				projection = null;
			}
			return minZ;
		}

		camera.maxZ = function(value) {
			if (value !== undefined) {
				maxZ = value;
				projection = null;
			}
			return maxZ;
		}
		
		camera.projection = function(aspectRatio) {
			if (!aspectRatio) {
				aspectRatio = engine.gfx.aspectRatio();
			}
			return Matrix.Perspective(fov, aspectRatio, minZ, maxZ);	
		}
		
		return camera;
	}

	worldEngine.MeshEntity = function(mesh) {
		var meshEntity = worldEngine.Entity();
		
		meshEntity.isMeshEntity = true;
		meshEntity.castsShadows = true;
		meshEntity.frame = 0;
		meshEntity.render = function(renderParams) {
			renderParams.modelView = meshEntity.modelView();
			renderParams.normalModelView = meshEntity.normalModelView();
			mesh.render(renderParams, Math.floor(meshEntity.frame));
		}
		
		return meshEntity;
	}
	
	worldEngine.LevelEntity = function(level) {
		var levelEntity = worldEngine.Entity();
		
		levelEntity.render = function(renderParams) {
			var shadowMap = level.shadowMap();
			if (shadowMap) {
				uniforms.u_levelShadowMap = shadowMap;
			}
			uniforms.u_levelSize = level.levelSize();
			renderParams.modelView = levelEntity.modelView();
			renderParams.normalModelView = levelEntity.normalModelView();
			var cameraCenter = renderParams.camera.modelView().x($V([0,0,-730,1.0]));
			level.render(renderParams, cameraCenter);
		}
		
		levelEntity.rayIntersect = function(point, direction, maxDist, minDist) {
			return level.rayIntersect(point, direction, maxDist, minDist);
		}
				
		return levelEntity;
	}
	
	return worldEngine;
}