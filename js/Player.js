var Player = function(engine, camera, level){
	var acc = 0.046875 * 3600.0;	// Acceleration
	var air = 0.09375 * 3600.0;		// Air Acceleration
	var dec = 0.5 * 3600.0;			// Deceleration
	var max = 6 * 60.0;				// Max speed
	var frc = 0.046875 * 3600.0;	// Friction
	var grv = 0.21875 * 3600.0;		// Gravity
	var jmp = 6.5 * 60.0;				// Jump Stength
	var ljp = 4.0 * 60.0;				// Low Jump Strength (for variable jump)
	var slp = 0.125 * 3600.0;		// Slope Acceleration
	var mgs = 2.5 * 60.0;				// Minimum Ground Speed to Stick on Walls
	var mrs = 1.03125 * 60.0;			// Mininum Rolling Speed
	var mrr = 0.5 * 60.0;			// Mininum Rolling Speed After Already Rolling
	var sru = 0.078125 * 60.0 * 60.0;
	var srd = 0.3125 * 60.0 * 60.0;
	
	var mesh = engine.resources.get("mesh/sonic.jsonmesh");
	var spinball = engine.resources.get("mesh/spinball.jsonmesh");
	var player = new engine.world.MeshEntity(mesh);
	var speed = $V([0,0,0]);
	var targetCameraAngle = Math.PI/2;
	var cameraAngle = Math.PI/2;
	var cameraDistance = 256+64;
	var cameraHeight = 64;
	var targetCameraHeight = 100;

	var onGround = false;
	var onLedge = false;
	var isHoldingJump = false;
	var cameraBoxPosition = player.position();
	var cameraBoxWidth = 16;
	var cameraBoxHeight = 64;
	var cameraBoxYOffset = 32; // 128 - 96
	var cameraOffsetY = 16; // 128 - 112
	
	var animations = {
		stopped: {
			start: 0,
			end: 0,
			speed: 1
		},
		walking: {
			start: 1,
			end: 8,
			speed: 10
		},
		running: {
			start: 9,
			end: 12,
			speed: 20
		},
		spinning: {
			start: 13,
			end: 13,
			speed: 0
		},
		lookUp: {
			start: 14,
			end: 14,
			speed: 0
		},
		spring: {
			start: 15,
			end: 15,
			speed: 0
		},
		hit: {
			start: 16,
			end: 16,
			speed: 0
		},
		crouchDown: {
			start: 17,
			end: 17,
			speed: 0
		},
		hold: {
			start: 18,
			end: 18,
			speed: 0
		},
		waiting: {
			start: 19,
			end: 20,
			speed: 3
		},
		dying: {
			start: 21,
			end: 21,
			speed: 2
		},
		balancing: {
			start: 22,
			end: 23,
			speed: 4
		},
		pushing: {
			start: 24,
			end: 26,
			speed: 4
		},
		breathing: {
			start: 28,
			end: 28,
			speed: 0
		}
	};
	var currentAnimation = "stopped";
	var lastAnimation = "stopped";
	var animationTransform = Matrix.I(4);

	var SPEED_BASED_ANIMATION_GAP = 0.2;
	
	var timeWaiting = 0.0;
	var isPushing = false;

	var STATE_NORMAL = 1;
	var STATE_JUMPING = 2;
	var STATE_ROLLING = 3;
	var STATE_CROUCH_DOWN = 4;
	var STATE_SPINDASH = 5;
	var STATE_LOOK_UP = 6;
	var STATE_SPRING = 7;
	player.STATE_NORMAL = STATE_NORMAL;
	player.STATE_JUMPING = STATE_JUMPING;	
	player.STATE_ROLLING = STATE_ROLLING;
	player.STATE_CROUCH_DOWN = STATE_CROUCH_DOWN;
	player.STATE_SPINDASH = STATE_SPINDASH;
	player.STATE_LOOK_UP = STATE_LOOK_UP;
	player.STATE_SPRING = STATE_SPRING;
		
	var state = STATE_NORMAL;
	
	player.state = function(newState) {	
		if (newState !== undefined) {
			state = newState;
		}
		return state;
	}
	
	var spindashCharge = 0;
	
	var direction = $V([0,0,0]);
	
	var angle = 0.0;
	var angleOverride = false;
	
	camera.fov(35);
//	player.scale($V([0.20,0.41,0.20]));
//player.scale($V([3,3,3]));
	
	var convertMotionToAir = function() {
		speed = player.rotation().make3x3().x(speed);
		onGround = false;
	}
	
	var convertMotionToGround = function() {
		speed = player.rotation().inverse().make3x3().x(speed);
		onGround = true;	
	}
	
	var alignPlayerToNormal = function(normal, timeDelta) {
		if (speed.modulus() < mgs) {
			player.rotation(player.rotation().AlignYAxis(normal, 1.0 - Math.pow(0.0001, timeDelta)));
		} else {
			player.rotation(player.rotation().AlignYAxis(normal, 1.0));			
		}
	}
	
	var updateCamera = function(timeDelta) {
		
		if (engine.input.pressed("Q".charCodeAt(0)))
			targetCameraAngle += Math.PI/4;
		if (engine.input.pressed("W".charCodeAt(0)))
			targetCameraAngle -= Math.PI/4;
			
		cameraAngle -= (cameraAngle - targetCameraAngle) * 4.0 * timeDelta;
		cameraHeight -= (cameraHeight - (targetCameraHeight - 0.0 * Math.min(0, speed.elements[1]))) * 1.0 * timeDelta;
		
		var transformedSpeed = player.rotation().make3x3().x(speed).x(timeDelta);
		
		// Horizontal movement
		if (player.position().elements[0] > (cameraBoxPosition.elements[0] + cameraBoxWidth / 2)) {
			cameraBoxPosition.elements[0] += Math.min(player.position().elements[0] - (cameraBoxPosition.elements[0] + cameraBoxWidth / 2), 16 * 60 * timeDelta);
		}
		
		if (player.position().elements[0] < (cameraBoxPosition.elements[0] - cameraBoxWidth / 2)) {
			cameraBoxPosition.elements[0] += Math.max(player.position().elements[0] - (cameraBoxPosition.elements[0] - cameraBoxWidth / 2), -16 * 60 * timeDelta);
		}
				
		if (player.position().elements[2] > (cameraBoxPosition.elements[2] + cameraBoxWidth / 2)) {
			cameraBoxPosition.elements[2] += Math.min(player.position().elements[2] - (cameraBoxPosition.elements[2] + cameraBoxWidth / 2), 16 * 60 * timeDelta);
		}
		
		if (player.position().elements[2] < (cameraBoxPosition.elements[2] - cameraBoxWidth / 2)) {
			cameraBoxPosition.elements[2] += Math.max(player.position().elements[2] - (cameraBoxPosition.elements[2] - cameraBoxWidth / 2), -16 * 60 * timeDelta);
		}
		
		// Vertical movement
		if (!onGround) {
			if (player.position().elements[1] > cameraBoxPosition.elements[1] + cameraBoxHeight ) {
				cameraBoxPosition.elements[1] += Math.min(player.position().elements[1] - (cameraBoxPosition.elements[1] + cameraBoxHeight), 16 * 60 * timeDelta);
			}
			if (player.position().elements[1] < cameraBoxPosition.elements[1]) {
				cameraBoxPosition.elements[1] += Math.max(player.position().elements[1] - (cameraBoxPosition.elements[1]), - 16 * 60 * timeDelta);
			}			
		} else {
			if (player.position().elements[1] > cameraBoxPosition.elements[1] + cameraBoxYOffset ) {
				if (Math.abs(transformedSpeed.elements[1]) > 6 * timeDelta) {
					// Fast catch up
					cameraBoxPosition.elements[1] += Math.min(player.position().elements[1] - (cameraBoxPosition.elements[1] + cameraBoxYOffset), 16 * 60 * timeDelta);
				} else {
					// Slow catch up
					cameraBoxPosition.elements[1] += Math.min(player.position().elements[1] - (cameraBoxPosition.elements[1] + cameraBoxYOffset), 6 * 60 * timeDelta);					
				}
			}			
			if (player.position().elements[1] < cameraBoxPosition.elements[1] + cameraBoxYOffset ) {
				if (Math.abs(transformedSpeed.elements[1]) > 6 * timeDelta) {
					// Fast catch up
					cameraBoxPosition.elements[1] += Math.max(player.position().elements[1] - (cameraBoxPosition.elements[1] + cameraBoxYOffset), -16 * 60 * timeDelta);
				} else {
					// Slow catch up
					cameraBoxPosition.elements[1] += Math.max(player.position().elements[1] - (cameraBoxPosition.elements[1] + cameraBoxYOffset), -6 * 60 * timeDelta);					
				}
			}
		}
		
		camera.position(cameraBoxPosition.add($V([Math.cos(cameraAngle) * cameraDistance, cameraHeight + cameraOffsetY, Math.sin(cameraAngle) * cameraDistance])));
		camera.rotation(Matrix.LookAt(camera.position(), cameraBoxPosition.add($V([0,cameraOffsetY,0]))).inverse());			
	}
	
	var handleControls = function(timeDelta) {
		
		timeWaiting += timeDelta;
		
		// Controls aligned to camera
		var canMove = true;
		var moveX = camera.rotation().x($V([1.0,0.0,0.0,0.0])).xyz();
		var moveZ = camera.rotation().x($V([0.0,0.0,1.0,0.0])).xyz();
		
		moveX.elements[1] = 0.0;
		moveZ.elements[1] = 0.0;
		
		moveX = moveX.toUnitVector();
		moveZ = moveZ.toUnitVector();
		
		direction = $V([0,0,0]);
		
		if (engine.input.heldLeft())
			direction = direction.add(moveX.x(-1));

		if (engine.input.heldRight())
			direction = direction.add(moveX.x(1));

		if (engine.input.heldUp())
			direction = direction.add(moveZ.x(-1));

		if (engine.input.heldDown())
			direction = direction.add(moveZ.x(1));
			
		if (state == STATE_CROUCH_DOWN || state == STATE_SPINDASH || state == STATE_LOOK_UP) {
			canMove = false;
		}
			
		if (state != STATE_ROLLING) {			
			if (direction.modulus() > 0 && canMove) {
			
				timeWaiting = 0;
			
				// The player is holding the arrow keys on some direction
				direction = direction.toUnitVector();
			
				if ($V([speed.elements[0], 0, speed.elements[2]]).dot(direction) >= 0) {
					// The direction pressed is similar to the direction Sonic's facing
				
					if (speed.xz().modulus() > 2 && !angleOverride) {
						angle = Math.atan2(speed.elements[0], speed.elements[2]);
//						console.log(angle);
					}
				
					// Store the old speed (for max speed check)
					var oldSpeedModulus = speed.xz().modulus();
				
					if (onGround) {
						// Ground acc
						speed = speed.add((direction) .x (acc * timeDelta));
					} else {
						// Air acc
						speed = speed.add((direction) .x (air * timeDelta));
					}
					// Store the new speed
					var newSpeedModulus = speed.xz().modulus();
				
					if (newSpeedModulus > max) {
						// We're faster than the max speed
						if (oldSpeedModulus < max) {
							// We got here by "natural means". Get back to the max speed, but allow handling
							speed.elements[0] = (speed.elements[0] / newSpeedModulus) * max;
							speed.elements[2] = (speed.elements[2] / newSpeedModulus) * max;
						} else {
							// We got here by "supernatural means" (e.g. a Spring). 
							if (newSpeedModulus > oldSpeedModulus) {
								// We're faster than we were before: Get back to as fast as we already were, but allow handling
								speed.elements[0] = (speed.elements[0] / newSpeedModulus) * oldSpeedModulus;
								speed.elements[2] = (speed.elements[2] / newSpeedModulus) * oldSpeedModulus;
							}
						}
					}
				
				} else {
					// The direction pressed is opposite to the direction Sonic's facing
					if (onGround) {	
						// Ground deceleration
						speed = speed.add((direction) .x (dec * timeDelta));
					} else {
						// Air deceleration ( = the same as acceleration)
						speed = speed.add((direction) .x (air * timeDelta));
					}
				}
			} else {
				// The player is not holding on any direction
				if (onGround) {
					// We're on the floor. Enters friction.
					direction = $V([-speed.elements[0], 0, -speed.elements[2]]).toUnitVector();
					speed = speed.add(direction.x(frc * timeDelta));
			
					// Stop when speed is lower than friction
					if (speed.modulus() < (frc * timeDelta)) {
						speed = $V([0,0,0]);
					}
				} else {
					// no friction on air (we calculate air drag later)
				}
			}
		} else {
			// Rolling physics
			
			// Reduced friction.
			var frictionDirection = $V([-speed.elements[0], 0, -speed.elements[2]]).toUnitVector();
			speed = speed.add(frictionDirection.x(frc / 2 * timeDelta));			
			
			// Stop when speed is lower than friction
			if (speed.modulus() < (frc * timeDelta)) {
				speed = $V([0,0,0]);
			} else {
				// Deceleration
				if ($V([speed.elements[0], 0, speed.elements[2]]).dot(direction) < 0) {
					speed = speed.add((direction) .x (dec / 4 * timeDelta));					
				}
			}
		}
		
		// Jump/Spindash/Spindash Rev
		if (onGround && engine.input.pressed("X".charCodeAt(0))) {
			if (state == STATE_NORMAL || state == STATE_ROLLING) {
				isHoldingJump = true;
				speed.elements[1] = jmp;
				onGround = false;
				timeWaiting = 0;
				state = STATE_JUMPING;
			} else if (state == STATE_CROUCH_DOWN) {
				state = STATE_SPINDASH;
				spindashCharge = 0;
			} else if (state == STATE_SPINDASH) {
				spindashCharge += 2;
				if (spindashCharge > 8) {
					spindashCharge = 8;
				}
			}
		}
		
		// Variable jump
		if (!engine.input.held("X".charCodeAt(0)) && isHoldingJump) {
			isHoldingJump = false;
			if (speed.elements[1] > ljp) {
				speed.elements[1] = ljp;
			}
		}
		
		// gratuitous speed
		if (engine.input.pressed("P".charCodeAt(0))) {
			if (speed.elements[0] != 0 || speed.elements[2] != 0) {
				var length = speed.xz().modulus();
				speed.elements[0] *= 12 * 60 / length;
				speed.elements[2] *= 12 * 60 / length;
			}
		}
		
		// Look Up 
		if (engine.input.held("S".charCodeAt(0))) {
			timeWaiting = 0;
			if (onGround && state == STATE_NORMAL) {
				if (speed.xz().modulus() < mrs) {
					state = STATE_LOOK_UP;
				}
			}
		} else {
			if (state == STATE_LOOK_UP) {
				state = STATE_NORMAL;
			}
		}
		
		// Roll/Crouch
		if (engine.input.held(" ".charCodeAt(0))) {
			timeWaiting = 0;
			// Only roll or crouch if we're on ground, and on normal state
			if (onGround && state == STATE_NORMAL || state == STATE_CROUCH_DOWN) {
				// We're moving. Roll
				if (speed.xz().modulus() > mrs) {
					if (state != STATE_ROLLING) {
						state = STATE_ROLLING;
					}
				} else {
					// We're not moving. Crouch.
					if (state != STATE_SPINDASH) {
						state = STATE_CROUCH_DOWN;
					}
				}
			}
		} else {
			// We've released the crouch button
			if (state == STATE_CROUCH_DOWN) {
				// We're crouching. Get back to normal.
				state = STATE_NORMAL;
			}
			if (state == STATE_SPINDASH) {
				// We're spindashing. Roll at the right speed.
				state = STATE_ROLLING;
				speed.elements[0] = (8 + Math.floor(Math.floor(spindashCharge) / 2)) * 60 * Math.sin(angle);
				speed.elements[2] = (8 + Math.floor(Math.floor(spindashCharge) / 2)) * 60 * Math.cos(angle);				
			}			
		}
		
		spindashCharge *= Math.pow(0.148834266, timeDelta);
		
		if (engine.input.pressed("R".charCodeAt(0))) {
			ringLoss();
		}
	}
	
	var handleGround = function(timeDelta) {		
		var normal = player.rotation().make3x3().x($V([0,1,0]));
		
		// Slope Acceleration
		if (state != STATE_ROLLING) {
			speed = speed.add($V([normal.elements[0] * slp * timeDelta, 0, normal.elements[2] * slp * timeDelta]))
		} else {
			if ($V([normal.elements[0], 0, normal.elements[2]]).dot($V([speed.elements[0], 0, speed.elements[2]])) >= 0) {
				// Rolling Downhill
				speed = speed.add($V([normal.elements[0] * srd * timeDelta, 0, normal.elements[2] * srd * timeDelta]))
			} else {
				// Rolling Uphill
				speed = speed.add($V([normal.elements[0] * sru * timeDelta, 0, normal.elements[2] * sru * timeDelta]))
			}
		}
		
		// Fall off from the walls if we're too slow
		if (normal.dot($V([0,1,0])) <= 0.0 && speed.xz().modulus() < mgs) {
			convertMotionToAir();
			player.rotation(Matrix.I(4));				
			return;
		}
		
		// Stop rolling if we're too slow.
		if (speed.modulus() <= mrr && state == STATE_ROLLING) {
			state = STATE_NORMAL;
		}
	}
	
	var handleAir = function(timeDelta) {
		// Add gravity to the player's y speed
		speed.elements[1] -= grv * timeDelta;	

		if (speed.elements[1] > 0 && speed.elements[1] < 4 * 60) {
			// We're going upwards, but no that much
			if (speed.xz().modulus() > 0.125 * 60.0) {
				// We're going fast. Air drag kicks in
				speed.elements[0] *= Math.pow(0.148834266, timeDelta);
				speed.elements[2] *= Math.pow(0.148834266, timeDelta);
			}
		}
		
		
		if (state == STATE_ROLLING) {
			state = STATE_JUMPING;
		} else if (state == STATE_SPRING) {
			if (speed.elements[1] < 0) {
				state = STATE_NORMAL;
			}
		}
	}
	
	var handleCollisions = function(timeDelta) {
		
		var didPush = false;
		for (var i = 0; i < 2*Math.PI; i+= 0.25*Math.PI) {
			var sensorDirection = $V([Math.sin(i), 0, Math.cos(i)]);
			var intersect = level.rayIntersect(player.position().add($V([0,0,-4])), player.rotation().make3x3().x(sensorDirection), 15, 0);
			var speedComponent = sensorDirection.xz().dot(speed.xz());
		
			if (isFinite(intersect.distance)) {
				if (speedComponent >= 0) {
					speed.elements[0] -= speedComponent * sensorDirection.elements[0];
					speed.elements[2] -= speedComponent * sensorDirection.elements[2];
				}
				if (direction.xz().dot(sensorDirection.xz()) > 0.8) {
					angle = i;
					didPush = true;
				}
				player.position(player.position().subtract(player.rotation().make3x3().x(sensorDirection.x(15-intersect.distance))));				
			}
		}
		if (isPushing && !didPush) {
			angleOverride = false;	
		}
		isPushing = didPush;
		if (isPushing) {
			angleOverride = true;
		}

		
		var modeMatrix = player.rotation().make3x3();//.makeModeMatrix();
		var modeVector = modeMatrix.x($V([0, -1, 0]));
		var intersectA1 = level.rayIntersect(player.position().add($V([-9,0,-9])), modeVector, 36, 0);
		var intersectA2 = level.rayIntersect(player.position().add($V([-9,0,9])), modeVector, 36, 0);
		var intersectB1 = level.rayIntersect(player.position().add($V([9,0,-9])), modeVector, 36, 0);
		var intersectB2 = level.rayIntersect(player.position().add($V([9,0,9])), modeVector, 36, 0);
		
		var minIntersectA = ((intersectA1.distance < intersectA2.distance)?intersectA1:intersectA2);
		var minIntersectB = ((intersectB1.distance < intersectB2.distance)?intersectB1:intersectB2);
		var minIntersect = ((minIntersectA.distance < minIntersectB.distance)?minIntersectA:minIntersectB)
/*		var minIntersect = {
			distance: 0.0,
			normal: $V([0,0,0])
		}*/
		minIntersect.normal = $V([0,0,0]);
		var count = 0;
		if (isFinite(intersectA1.distance)) {
//			minIntersect.distance += intersectA1.distance;
			minIntersect.normal = minIntersect.normal.add(intersectA1.normal);
			count++;
		}
		if (isFinite(intersectA2.distance)) {
//			minIntersect.distance += intersectA2.distance;
			minIntersect.normal = minIntersect.normal.add(intersectA2.normal);
			count++;
		}
		if (isFinite(intersectB1.distance)) {
//			minIntersect.distance += intersectB1.distance;
			minIntersect.normal = minIntersect.normal.add(intersectB1.normal);
			count++;
		}
		if (isFinite(intersectB2.distance)) {
//			minIntersect.distance += intersectB2.distance;
			minIntersect.normal = minIntersect.normal.add(intersectB2.normal);
			count++;
		}
//		minIntersect.distance /= count;
		minIntersect.normal = minIntersect.normal.x(1/count).toUnitVector(); 
		
		if (count != 4) {
			onLedge = true;
		} else {
			onLedge = false;
		}
		
		if (isFinite(minIntersect.distance)) {
			if ((minIntersect.distance <= 20 || onGround) && speed.elements[1] <= 0) {
				
				player.position(player.position().add(player.rotation().make3x3().x($V([0,20-minIntersect.distance,0]))));
				if (minIntersect.normal.dot(player.rotation().make3x3().x($V([0,1,0]))) > 0.0) {
					alignPlayerToNormal(minIntersect.normal, timeDelta);		
				}

				if (!onGround) {
					convertMotionToGround();
				}
				
				if (state == STATE_JUMPING || state == STATE_SPRING) {
					state = STATE_NORMAL;
				}
				
				speed.elements[1] = 0.0;
			}
		} else {
			convertMotionToAir();
			player.rotation(Matrix.I(4));	
		}

		var modeVector = modeMatrix.x($V([0, 1, 0]));
		var intersectA1 = level.rayIntersect(player.position().add($V([-9,0,-9])), modeVector, 36, 0);
		var intersectA2 = level.rayIntersect(player.position().add($V([-9,0,9])), modeVector, 36, 0);
		var intersectB1 = level.rayIntersect(player.position().add($V([9,0,-9])), modeVector, 36, 0);
		var intersectB2 = level.rayIntersect(player.position().add($V([9,0,9])), modeVector, 36, 0);

		var minIntersectA = ((intersectA1.distance < intersectA2.distance)?intersectA1:intersectA2);
		var minIntersectB = ((intersectB1.distance < intersectB2.distance)?intersectB1:intersectB2);
		var minIntersect = ((minIntersectA.distance < minIntersectB.distance)?minIntersectA:minIntersectB)
		
		if (isFinite(minIntersect.distance)) {
			if (minIntersect.distance <= 20 && speed.elements[1] >= 0) {
				player.position(player.position().subtract(player.rotation().make3x3().x($V([0,20-minIntersect.distance,0]))));				
				speed.elements[1] = 0.0;
			}
		}	
	}
	
	var repositionPlayer = function(timeDelta) {
		player.position(player.position().add(player.rotation().make3x3().x(speed).x(timeDelta)));		
	}
	
	var updateAnimations = function(timeDelta) {
		if (currentAnimation != lastAnimation) {
			player.frame = animations[currentAnimation].start;
			lastAnimation = currentAnimation;
		}
		
		player.frame += animations[currentAnimation].speed * timeDelta;
	
		if (player.frame >= animations[currentAnimation].end + 1) {
			player.frame -= animations[currentAnimation].end - animations[currentAnimation].start + 1;
		}	
	}
	
	var handleAnimations = function(timeDelta) {
	//	if (speed.xz().modulus() > frc * timeDelta) {
	//		angle = Math.atan2(speed.elements[0], speed.elements[2]);
	//	}
		var speedModulus = speed.xz().modulus();
		if (onGround) {
			if (state == STATE_ROLLING) {
				currentAnimation = "spinning";
			} else if (state == STATE_CROUCH_DOWN) {
				currentAnimation = "crouchDown";
			} else if (state == STATE_LOOK_UP) {
				currentAnimation = "lookUp";
			} else if (state == STATE_SPINDASH) {
				currentAnimation = "spinning";
			} else {
				if (speedModulus <= SPEED_BASED_ANIMATION_GAP) {
					if (onLedge) {
						currentAnimation = "balancing";
					} else {
						if (isPushing) {
							currentAnimation = "pushing";
						} else {
							if (timeWaiting > 5) {
								currentAnimation = "waiting";
							} else {
								currentAnimation = "stopped";	
							}
						}
					}
				} else if (speedModulus < max - SPEED_BASED_ANIMATION_GAP) {
					if (isPushing) {
						currentAnimation = "pushing";
					} else {
						currentAnimation = "walking";
					}
				} else {
					currentAnimation = "running";
				}
			}
		} else {
			if (state == STATE_JUMPING) {
				currentAnimation = "spinning";
			} else if (state == STATE_SPRING) { 
				currentAnimation = "spring";
			} else {
				if (speedModulus <= SPEED_BASED_ANIMATION_GAP) {
					currentAnimation = "stopped";
				} else if (speedModulus < max - SPEED_BASED_ANIMATION_GAP) {
					currentAnimation = "walking";
				} else {
					currentAnimation = "running";
				}
			}
		}
		updateAnimations(timeDelta);
		
		if (currentAnimation == "spinning") {
			animationTransform = Matrix.RotationX(-engine.world.time()*40.0).ensure4x4();	
			if (Math.floor(engine.world.time() * 40) % 2 == 0) {
				spinball.visible = true;
			} else {
				spinball.visible = false;
			}
		} else if (currentAnimation == "spring") { 
			animationTransform = Matrix.RotationZ(-engine.world.time()*10.0).ensure4x4();	
			spinball.visible = false;
		} else {
			spinball.visible = false;
			animationTransform = Matrix.I(4);	
		}
	}
	
	var ringLoss = function() {
		var rotation = Matrix.RotationY(-cameraAngle+Math.PI/2);
		var speed = 4 * 60.0;
		var angle = 101.25 / 360.0 * 2 * Math.PI;
		var n = false;
		for (var t = 0; t<32; t++) {
			var ring = Ring(engine, player, level);
			ring.position(player.position());
			if (n) {
				ring.speed(rotation.x($V([Math.sin(angle)*speed, -Math.cos(angle)*speed, -4])));
				angle += 22.5 / 360 * 2 * Math.PI;				
			} else {
				ring.speed(rotation.x($V([-Math.sin(angle)*speed, Math.cos(angle)*speed, +4])));
			}
			engine.world.add(ring);			
			n = !n;
			if (t == 15) {
				speed = 2 * 60;
				angle = 101.25 / 360 * 2 * Math.PI;
			}
		}	
	}
	
	var superUpdate = player.update;	
	
	player.update = function(timeDelta) {
	
		superUpdate(timeDelta);		

		handleControls(timeDelta);
		
		if (onGround) {
			handleGround(timeDelta);
		} else {
			handleAir(timeDelta);
		}
		
		repositionPlayer(timeDelta);

		handleCollisions(timeDelta);

		handleAnimations(timeDelta);

		if (player.position().elements[1] < -100) {
//			player.position(player.position().add($V([0,1000,0])));
			speed = $V([speed.elements[0],500,speed.elements[2]]);
		}

		updateCamera(timeDelta);

	}
	
	var superRender = player.render;
	player.render = function(renderParams) {

		var rotation = player.rotation();

		player.rotation(rotation.x(Matrix.RotationY(Math.PI + angle).ensure4x4()).x(animationTransform));

		renderParams.modelView = player.modelView();
		renderParams.normalModelView = player.normalModelView();
		if (spinball.visible) {
			spinball.render(renderParams, 0);
		} else {
			mesh.render(renderParams, Math.floor(player.frame));
		}
		player.rotation(rotation);		
	}
	
	player.speed = function(newSpeed) {
		if (newSpeed !== undefined) {
			speed = newSpeed;
		}
		return speed;
	}
	
	//player.isStatic = true;
			
	return player;
}