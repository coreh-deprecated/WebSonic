var Sky = function(engine, camera) {
	var sky = new engine.world.MeshEntity(engine.resources.get("mesh/sky.jsonmesh"));
	sky.layer = -99;
	
	sky.scale($V([20,2,20]));
	sky.castsShadows = false;
	
	sky.update = function(timeDelta) {
		sky.position(camera.position());
	}
	
	return sky;
}