var Ring = function(engine, player, level) {
	var ring = new engine.world.MeshEntity(engine.resources.get("mesh/ring.jsonmesh"));
	var speed = $V([0,0,0]);
//	var speed = $V([(Math.random()-0.5)*10,Math.random()-0.5,(Math.random()-0.5)*10]);
	var time = 0;
	var grv = 0.09375 * 60.0 * 60.0
	var i = Math.floor(Math.random() * 5);
	var creationTime = engine.world.time();
	
	ring.speed = function(newSpeed) {
		if (newSpeed) {
			speed = newSpeed;
		}
		return speed;
	}
	
	ring.update = function(timeDelta) {
		time+= timeDelta;
//		ring.rotation(ring.rotation().x(Matrix.RotationY(1.875 * Math.PI * timeDelta).ensure4x4()));
		speed = speed.add($V([0,-grv*timeDelta,0]));
		ring.position(ring.position().add(speed.x(timeDelta)));
		i++;
		if (i == 5) {
			i = 0;
			var intersect = level.rayIntersect(ring.position(), speed.toUnitVector(), 16, 0);		
			if (isFinite(intersect.distance) && intersect.normal.dot(speed) <= 0) {
				ring.position(ring.position().subtract(speed.toUnitVector().x(16-intersect.distance)));
				var length = intersect.normal.dot(speed);
				speed = speed.subtract(intersect.normal.x(length*2));
				speed.elements[1] *= 0.75;
			}
		}
		if (engine.world.time() > creationTime + 4.26) {
			engine.world.remove(ring);
		}

	}
	ring.isStatic = true;
	var superRender = ring.render;
	ring.render = function(renderParams) {
//		ring.rotation(Matrix.RotationY(1.875 * Math.PI * renderParams.uniforms[0].u_time).ensure4x4());
//		if (engine.world.time() < creationTime + 3) {
		superRender(renderParams);
//		} else {
//			if (Math.floor(engine.world.time() * 20) % 2 == 0)
//				superRender(renderParams);		
//		}
	}	
	
	return ring;
}