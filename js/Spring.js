var Spring = function(engine, player) {
	var spring = engine.world.MeshEntity(engine.resources.get("mesh/spring.jsonmesh"));
	var deformation = 0.0;
	
	spring.update = function(timeDelta) {
		if (player.position().subtract(spring.position()).modulus() < 32 && player.position().elements[1] > spring.position().elements[1]) {
			var oldSpeed = player.speed();
			player.speed($V([oldSpeed.elements[0], 12 * 60, oldSpeed.elements[2]]));
			player.state(player.STATE_SPRING);
			deformation = 0.5;
		}
		if (deformation > 0) {
			spring.frame = 1;
		} else {
			spring.frame = 0;
		}
		deformation -= timeDelta;
	}
	
	return spring;
}